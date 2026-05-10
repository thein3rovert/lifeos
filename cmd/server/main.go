package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/thein3rovert/lifeos/internal/api"
	"github.com/thein3rovert/lifeos/internal/handler"
	"github.com/thein3rovert/lifeos/internal/middleware"
	service "github.com/thein3rovert/lifeos/internal/services"
	"github.com/thein3rovert/lifeos/internal/store"
	"github.com/thein3rovert/lifeos/internal/store/github"
	"github.com/thein3rovert/lifeos/internal/store/notes"
)

// go run cmd/server/main.go
// Every Request: Middleware(customLogger) -> CORS -> Handler
func main() {

	// Initialise store (Database store -> photos)
	db, err := store.NewSQLiteStore("lifeos.db")
	if err != nil {
		log.Fatalf("Failed to initialise store: %v", err)
	}

	// Initialise new photo store
	photoStore := store.NewPhotoStore(db.DB())

	// Initialise GitHub skills store
	githubToken := os.Getenv("GITHUB_TOKEN")
	githubOwner := os.Getenv("GITHUB_OWNER")
	githubRepo := os.Getenv("GITHUB_REPO")

	if githubToken == "" || githubOwner == "" || githubRepo == "" {
		log.Fatal("GitHub credentials not configured. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables")
	}

	// Create GitHub store for sync operations
	githubSkillStore := github.NewSkillStore(githubOwner, githubRepo, githubToken)

	// Create SQLite-backed skill store (primary source, GitHub for sync)
	skillStore, err := store.NewSQLSkillStore(db.DB(), githubSkillStore)
	if err != nil {
		log.Fatalf("Failed to initialise skill store: %v", err)
	}

	// Sync from GitHub only if SQLite is empty (first run)
	skills, _ := skillStore.ListSkills()
	if len(skills) == 0 {
		log.Println("SQLite empty, performing initial sync from GitHub...")
		if err := skillStore.Sync(); err != nil {
			log.Printf("Warning: initial sync failed: %v", err)
			log.Println("Continuing with empty skill cache - use manual sync button to retry")
		} else {
			log.Println("Initial skills sync complete")
		}
	} else {
		log.Printf("Loaded %d skills from SQLite (manual sync available)", len(skills))
	}

	noteStore := notes.New(db.DB())
	chatMsgStore := store.NewChatMessageStore(db.DB())

	mux := http.NewServeMux()

	// ── Initialize services ─────────────────────────────────────
	sidecarURL := os.Getenv("SIDECAR_URL")
	if sidecarURL == "" {
		sidecarURL = "http://127.0.0.1:3002"
	}
	chatService := service.NewChatService(skillStore, chatMsgStore, noteStore, sidecarURL)
	noteService := service.NewNoteService(noteStore, skillStore)

	// ── Initialize API handlers ─────────────────────────────────────
	photoAPI := api.NewPhotoHandler(photoStore)
	skillAPI := api.NewSkillHandler(skillStore, noteStore)
	noteAPI := api.NewNoteHandler(noteService)
	aiAPI := api.NewAIHandler(skillStore, noteStore)
	tagAPI := api.NewTagHandler(photoStore)
	chatAPI := api.NewChatHandler(chatService)

	// ── JSON API endpoints (Go 1.22+ method-based routing) ─────────
	// Photos
	mux.HandleFunc("GET /api/photos", photoAPI.ListPhotos)
	mux.HandleFunc("GET /api/photos/search", photoAPI.SearchPhotos)
	mux.HandleFunc("POST /api/photos/upload", photoAPI.UploadPhoto)
	mux.HandleFunc("GET /api/photos/{id}", photoAPI.GetPhoto)

	// Skills
	mux.HandleFunc("POST /api/skills/create", skillAPI.CreateNewSkill)
	mux.HandleFunc("GET /api/skills", skillAPI.ListSkills)
	mux.HandleFunc("GET /api/skills/sync", skillAPI.SyncSkills)
	mux.HandleFunc("POST /api/skills/push", skillAPI.PushSkills)
	mux.HandleFunc("POST /api/skills/{id}/push", skillAPI.PushSingleSkill)
	mux.HandleFunc("POST /api/skills/edit", skillAPI.EditSkill)
	mux.HandleFunc("GET /api/skills/{id}", skillAPI.GetSkill)

	// Notes
	mux.HandleFunc("GET /api/notes", noteAPI.GetAllNotes)
	mux.HandleFunc("GET /api/skills/{id}/notes", noteAPI.GetNotes)
	mux.HandleFunc("POST /api/skills/{id}/notes", noteAPI.AddNote)
	mux.HandleFunc("PUT /api/skills/{id}/notes/{noteId}", noteAPI.UpdateNote)
	mux.HandleFunc("PATCH /api/skills/{id}/notes/{noteId}", noteAPI.EditNote)
	mux.HandleFunc("DELETE /api/skills/{id}/notes/{noteId}", noteAPI.DeleteNote)

	// AI workflow
	mux.HandleFunc("POST /api/skills/{id}/preview", aiAPI.PreviewSkillUpdate)
	mux.HandleFunc("POST /api/skills/{id}/save", aiAPI.SaveSkillUpdate)
	mux.HandleFunc("POST /api/skills/{id}/notes/append", aiAPI.AppendNotesToSkill)
	mux.HandleFunc("POST /api/skills/preview-render", aiAPI.RenderMarkdown)

	// Tags
	mux.HandleFunc("GET /api/tags", tagAPI.ListTags)

	// Chat (persistent sessions)
	mux.HandleFunc("POST /api/skills/{id}/session", chatAPI.GetOrCreateSession)
	mux.HandleFunc("POST /api/skills/{id}/chat", chatAPI.SendChatMessage)
	mux.HandleFunc("GET /api/skills/{id}/messages", chatAPI.GetChatMessages)

	// ── HTML routes (existing, will be removed in Phase 4) ─────────
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("LifeOS is running"))
	})

	mux.HandleFunc("/home", handler.Home)

	mux.HandleFunc("/photos", handler.Photos)
	mux.HandleFunc("/photos/view", handler.ListPhotos(photoStore))
	mux.HandleFunc("/photos/upload", handler.UpdatePhoto(photoStore))
	mux.HandleFunc("/photos/search", handler.SearchPhotos(photoStore))

	// Static file server for serving local photos
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("."))))

	mux.HandleFunc("/skills", handler.ListSkills(skillStore))
	mux.HandleFunc("/skills/", handler.GetSkill(skillStore, noteStore))
	mux.HandleFunc("/skills/edit", handler.EditSkill(skillStore))
	mux.HandleFunc("/skills/notes/add", handler.AddNote(noteStore))
	mux.HandleFunc("/skills/notes/delete", handler.DeleteNote(noteStore))
	mux.HandleFunc("/skills/notes/append", handler.AppendNotesToSkill(skillStore, noteStore))
	mux.HandleFunc("/skills/preview", handler.PreviewSkillUpdate(skillStore, noteStore))
	mux.HandleFunc("/skills/save", handler.SaveSkillUpdate(skillStore, noteStore))
	mux.HandleFunc("/skills/preview-render", handler.RenderMarkdownPreview())
	mux.HandleFunc("/skills/sync", handler.SyncSkills(skillStore))

	port := os.Getenv("LIFEOS_PORT")
	if port == "" {
		port = "6060"
	}

	log.Printf("Server starting on %s", port)
	if err := http.ListenAndServe(":"+port, middleware.CORS(middleware.CustomLogger(mux))); err != nil {
		fmt.Printf("Failed to listen at port %s: %v\n", port, err)
		log.Fatal(err)
	}
}
