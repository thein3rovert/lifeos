package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/mark3labs/mcp-go/server"
	"github.com/thein3rovert/lifeos/server/internal/api"
	agents "github.com/thein3rovert/lifeos/server/internal/api/agents"
	chats "github.com/thein3rovert/lifeos/server/internal/api/chats"
	skillsapi "github.com/thein3rovert/lifeos/server/internal/api/skills"
	smartboardapi "github.com/thein3rovert/lifeos/server/internal/api/smartboard"
	"github.com/thein3rovert/lifeos/server/internal/config"
	mcpServer "github.com/thein3rovert/lifeos/server/internal/mcp"
	"github.com/thein3rovert/lifeos/server/internal/middleware"
	service "github.com/thein3rovert/lifeos/server/internal/services"
	"github.com/thein3rovert/lifeos/server/internal/sidecar"
	"github.com/thein3rovert/lifeos/server/internal/store"
	"github.com/thein3rovert/lifeos/server/internal/store/github"
	"github.com/thein3rovert/lifeos/server/internal/store/notes"
	skillstore "github.com/thein3rovert/lifeos/server/internal/store/skills"
)

// go run server/cmd/server/main.go           -- runs HTTP server
// go run server/cmd/server/main.go --mcp     -- runs MCP stdio server
func main() {
	// Parse command line flags
	mcpMode := flag.Bool("mcp", false, "Run as MCP stdio server instead of HTTP server")
	flag.Parse()

	// If --mcp flag is set, run the MCP stdio server
	if *mcpMode {
		runMCPServer()
		return
	}

	// Otherwise, run the normal HTTP server
	runHTTPServer()
}

// runMCPServer starts the MCP stdio server for OpenCode.
// Reads config for the allowed-directories list.
func runMCPServer() {
	cfg := config.Load()
	s := mcpServer.NewMCPServer(cfg.MCPAllowedDirs...)
	if err := server.ServeStdio(s); err != nil {
		log.Fatalf("MCP server error: %v", err)
	}
}

// runHTTPServer starts the normal HTTP server for the web app
func runHTTPServer() {
	// Load configuration once at startup
	cfg := config.Load()

	// Initialise SQLite store
	db, err := store.NewSQLiteStore(cfg.DBPath)
	if err != nil {
		log.Fatalf("Failed to initialise store: %v", err)
	}

	// Create GitHub store for sync operations
	githubSkillStore := github.NewSkillStore(cfg.GitHubOwner, cfg.GitHubRepo, cfg.GitHubToken)

	// Create SQLite-backed skill store (primary source, GitHub for sync)
	skillStore, err := skillstore.NewSQLSkillStore(db.DB(), githubSkillStore)
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
	smartBoardStore := store.NewSmartBoardStore(db.DB())

	mux := http.NewServeMux()

	// ── Initialize sidecar client (one instance, injected everywhere) ──
	sidecarClient := sidecar.New(cfg.SidecarURL)

	// ── Initialize services ─────────────────────────────────────
	agentChatService := service.NewAgentChatService(skillStore, chatMsgStore, noteStore, smartBoardStore, sidecarClient)
	noteService := service.NewNoteService(noteStore, skillStore)
	skillAIService := service.NewSkillAIService(skillStore, noteStore, sidecarClient)
	smartBoardService := service.NewSmartBoardService(smartBoardStore, agentChatService, cfg.MeetingsPath, cfg.JournalPath)
	defer smartBoardService.Stop()

	// ── Initialize API handlers ─────────────────────────────────────
	skillAPI := skillsapi.NewSkillHandler(skillStore, noteStore)
	skillFileAPI := skillsapi.NewSkillFileHandler(skillStore)
	noteAPI := api.NewNoteHandler(noteService)
	aiAPI := api.NewAIHandler(skillAIService)
	chatAPI := chats.NewSkillChatHandler(agentChatService)
	agentAPI := agents.NewAgentChatHandler(agentChatService)
	smartBoardAPI := smartboardapi.NewSmartBoardHandler(smartBoardService)

	// ── JSON API endpoints (Go 1.22+ method-based routing) ─────────
	// Skills
	mux.HandleFunc("POST /api/skills/create", skillAPI.CreateNewSkill)
	mux.HandleFunc("GET /api/skills", skillAPI.ListSkills)
	mux.HandleFunc("GET /api/skills/sync", skillAPI.SyncSkills)
	mux.HandleFunc("POST /api/skills/push", skillAPI.PushSkills)
	mux.HandleFunc("POST /api/skills/{id}/push", skillAPI.PushSingleSkill)
	mux.HandleFunc("POST /api/skills/edit", skillAPI.EditSkill)
	mux.HandleFunc("GET /api/skills/{id}", skillAPI.GetSkill)
	mux.HandleFunc("GET /api/skills/{id}/files", skillFileAPI.ListFile)
	mux.HandleFunc("GET /api/skills/{id}/files/{path...}", skillFileAPI.GetFile)
	mux.HandleFunc("PUT /api/skills/{id}/files/{path...}", skillFileAPI.SaveFile)

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

	// Chat (persistent sessions)
	mux.HandleFunc("POST /api/skills/{id}/session", chatAPI.GetOrCreateSession)
	mux.HandleFunc("POST /api/skills/{id}/chat", chatAPI.SendChatMessage)
	mux.HandleFunc("GET /api/skills/{id}/messages", chatAPI.GetChatMessages)

	// Agent chat (general assistant with MCP tools)
	mux.HandleFunc("POST /api/agent/chat", agentAPI.AgentChatMessage)
	mux.HandleFunc("POST /api/agent/abort", agentAPI.AbortRequest)

	// Smart Board
	mux.HandleFunc("POST /api/smartboard/refresh/{panelType}", smartBoardAPI.RefreshPanel)
	mux.HandleFunc("GET /api/smartboard/schedule", smartBoardAPI.GetScheduleStatus)
	mux.HandleFunc("POST /api/smartboard/schedule/pause-all", smartBoardAPI.PauseAllPanels)
	mux.HandleFunc("POST /api/smartboard/schedule/resume-all", smartBoardAPI.ResumeAllPanels)
	mux.HandleFunc("POST /api/smartboard/schedule/{panelType}/pause", smartBoardAPI.PausePanel)
	mux.HandleFunc("POST /api/smartboard/schedule/{panelType}/resume", smartBoardAPI.ResumePanel)
	mux.HandleFunc("POST /api/smartboard/schedule/{panelType}", smartBoardAPI.SetPanelSchedule)
	mux.HandleFunc("GET /api/smartboard/{panelType}", smartBoardAPI.GetPanel)
	mux.HandleFunc("PATCH /api/smartboard/item/{itemId}", smartBoardAPI.UpdateItemStatus)
	mux.HandleFunc("PATCH /api/smartboard/item/{itemId}/content", smartBoardAPI.UpdateItemContent)

	// ==== MCP SSE Endpoints ====
	lifeosMCPServer := mcpServer.NewMCPServer(cfg.MCPAllowedDirs...)
	// Server sent event transport. Base URL falls back to localhost:PORT
	// but should be set via LIFEOS_PUBLIC_URL when running behind a
	// reverse proxy or a Tailscale hostname.
	baseURL := cfg.PublicBaseURL
	if baseURL == "" {
		baseURL = "http://localhost:" + cfg.Port
	}
	sse := server.NewSSEServer(lifeosMCPServer, server.WithBaseURL(baseURL))
	mux.Handle("/mcp/", middleware.MCPAuth(http.StripPrefix("/mcp", sse)))
	// Message endpoint for JSON-RPC requests (handles MCP initialize, tools, etc.)
	mux.Handle("/message", middleware.MCPAuth(sse))

	// Health check
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("LifeOS is running"))
	})

	// ── Start HTTP server with graceful shutdown ──────────────────────
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: middleware.CORS(cfg.CORSOrigins)(middleware.CustomLogger(mux)),
	}

	// Channel to capture shutdown signals
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("Server starting on %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("Failed to listen at port %s: %v", cfg.Port, err)
			log.Fatal(err)
		}
	}()

	// Block until signal received
	<-stop
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Server stopped")
}
