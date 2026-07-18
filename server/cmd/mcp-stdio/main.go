package main

import (
	"log"

	"github.com/mark3labs/mcp-go/server"
	"github.com/thein3rovert/lifeos/server/internal/config"
	mcpServer "github.com/thein3rovert/lifeos/server/internal/mcp"
)

// This is the stdio version of the MCP server.
// It communicates via stdin/stdout instead of HTTP.
// OpenCode will launch this as a subprocess.
func main() {
	cfg := config.Load()
	s := mcpServer.NewMCPServer(cfg.MCPAllowedDirs...)

	// Serve using stdio transport (reads stdin, writes stdout)
	if err := server.ServeStdio(s); err != nil {
		log.Fatalf("MCP server error: %v", err)
	}
}
