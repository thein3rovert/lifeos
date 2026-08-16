// Package config centralizes environment variable reads with sensible defaults.
// Read env vars ONCE at startup via Load(), then pass the resulting Config
// through constructors — do not call os.Getenv scattered across the codebase.
package config

import (
	"log"
	"os"
	"strings"
)

// Config holds all runtime configuration for the LifeOS backend.
type Config struct {
	// HTTP server
	Port          string   // LIFEOS_PORT
	CORSOrigins   []string // CORS_ORIGINS (comma-separated)
	PublicBaseURL string   // LIFEOS_PUBLIC_URL (used for MCP SSE / share links)

	// Storage
	DBPath string // LIFEOS_DB_PATH

	// External services
	SidecarURL string // SIDECAR_URL

	// GitHub
	GitHubToken string // GITHUB_TOKEN (required)
	GitHubOwner string // GITHUB_OWNER (required)
	GitHubRepo  string // GITHUB_REPO  (required)

	// Auth
	MCPAPIKey string // MCP_API_KEY

	// MCP file-tree exposure — comma-separated absolute paths the MCP
	// server is allowed to read from. Kept out of code so different
	// machines / users can point to their own vault locations.
	MCPAllowedDirs []string // MCP_ALLOWED_DIRS

	// Smart-board content paths (Obsidian vault subfolders the AI reads)
	MeetingsPath string // LIFEOS_MEETINGS_PATH
	JournalPath  string // LIFEOS_JOURNAL_PATH

	// Google Calendar OAuth (LOS-014)
	GoogleClientID     string // GOOGLE_CLIENT_ID
	GoogleClientSecret string // GOOGLE_CLIENT_SECRET
	GoogleRedirectURI  string // GOOGLE_REDIRECT_URI

	// Frontend URL the backend redirects the browser to (OAuth callback, etc.)
	// Mirror of API_URL: API_URL is frontend → backend, FRONTEND_URL is backend → browser.
	FrontendURL string // FRONTEND_URL
}

// Load reads configuration from environment variables.
// Missing required values cause a fatal error.
func Load() *Config {
	cfg := &Config{
		Port:           getEnv("LIFEOS_PORT", "6060"),
		SidecarURL:     getEnv("SIDECAR_URL", "http://localhost:3002"),
		CORSOrigins:    splitCSV(getEnv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")),
		PublicBaseURL:  getEnv("LIFEOS_PUBLIC_URL", ""),
		DBPath:         getEnv("LIFEOS_DB_PATH", "lifeos.db"),
		GitHubToken:    os.Getenv("GITHUB_TOKEN"),
		GitHubOwner:    os.Getenv("GITHUB_OWNER"),
		GitHubRepo:     os.Getenv("GITHUB_REPO"),
		MCPAPIKey:      os.Getenv("MCP_API_KEY"),
		MCPAllowedDirs: splitCSV(os.Getenv("MCP_ALLOWED_DIRS")),
		MeetingsPath:   os.Getenv("LIFEOS_MEETINGS_PATH"),
		JournalPath:    os.Getenv("LIFEOS_JOURNAL_PATH"),

		// Google Calendar OAuth (LOS-014)
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURI:  getEnv("GOOGLE_REDIRECT_URI", "http://localhost:6060/api/calendar/oauth/callback"),
		FrontendURL:        getEnv("FRONTEND_URL", "http://localhost:3001"),
	}

	if cfg.GitHubToken == "" || cfg.GitHubOwner == "" || cfg.GitHubRepo == "" {
		log.Fatal("GitHub credentials not configured. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables")
	}

	return cfg
}

// getEnv returns the value of an env var, or a fallback if unset/empty.
func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// splitCSV splits a comma-separated string, trimming whitespace, ignoring empty.
func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
