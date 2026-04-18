package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/thein3rovert/lifeos/internal/handler"
	"github.com/thein3rovert/lifeos/internal/middleware"
	"github.com/thein3rovert/lifeos/internal/store"
	"github.com/thein3rovert/lifeos/internal/store/github"
	"github.com/thein3rovert/lifeos/internal/store/notes"
)

// go run cmd/server/main.go
// Every Request: Middleware(customlogge) -> Handler
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

	skillStore := github.NewSkillStore(githubOwner, githubRepo, githubToken)
	noteStore := notes.New(db.DB())

	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("LifeOS is running"))
	})


	mux.HandleFunc("/home", handler.Home)

	mux.HandleFunc("/photos", handler.Photos)
	mux.HandleFunc("/photos/view", handler.ListPhotos(photoStore))
	mux.HandleFunc("/photos/upload", handler.UpdatePhoto(photoStore))
	mux.HandleFunc("/photos/search", handler.SearchPhotos(photoStore))

	// Static file server for serving local photo
	// Any request to eg. /static/photo/<filename> will server friom disk
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("."))))

	// mux.HandleFunc("/skills", handler.Skills)
	mux.HandleFunc("/skills", handler.ListSkills(skillStore))
	// Skill with trailing / get a single skills
	mux.HandleFunc("/skills/", handler.GetSkill(skillStore, noteStore))
	// Add note to skill buffer
mux.HandleFunc("/skills/notes/add", handler.AddNote(noteStore))
// Delete a single note
mux.HandleFunc("/skills/notes/delete", handler.DeleteNote(noteStore))
// Append notes to skill and clear buffer
mux.HandleFunc("/skills/notes/append", handler.AppendNotesToSkill(skillStore, noteStore))
	// Sync skills from GitHub (force refresh)
	mux.HandleFunc("/skills/sync", handler.SyncSkills(skillStore))


	port := os.Getenv("LIFEOS_PORT")
	if port == "" {
		port = "6060"
	}

	log.Printf("Server starting on %s", port)
	if err := http.ListenAndServe(":"+port, middleware.CustomLogger(mux)); err != nil {
		fmt.Printf("Failed to listen at port %s: %v\n", port, err)
		log.Fatal(err)
	}


}
