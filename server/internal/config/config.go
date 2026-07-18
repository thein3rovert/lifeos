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
	Port         string   // LIFEOS_PORT
	CORSOrigins  []string // CORS_ORIGINS (comma-separated)

	// External services
	SidecarURL string // SIDECAR_URL

	// GitHub
	GitHubToken string // GITHUB_TOKEN (required)
	GitHubOwner string // GITHUB_OWNER (required)
	GitHubRepo  string // GITHUB_REPO  (required)

	// Auth
	MCPAPIKey string // MCP_API_KEY
}

// Load reads configuration from environment variables.
// Missing required values cause a fatal error.
func Load() *Config {
	cfg := &Config{
		Port:        getEnv("LIFEOS_PORT", "6060"),
		SidecarURL:  getEnv("SIDECAR_URL", "http://localhost:3002"),
		CORSOrigins: splitCSV(getEnv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")),
		GitHubToken: os.Getenv("GITHUB_TOKEN"),
		GitHubOwner: os.Getenv("GITHUB_OWNER"),
		GitHubRepo:  os.Getenv("GITHUB_REPO"),
		MCPAPIKey:   os.Getenv("MCP_API_KEY"),
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
