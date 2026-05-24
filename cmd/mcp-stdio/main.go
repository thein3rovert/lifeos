package main

import (
	"log"

	"github.com/mark3labs/mcp-go/server"
	mcpServer "github.com/thein3rovert/lifeos/internal/mcp"
)

// This is the stdio version of the MCP server
// It communicates via stdin/stdout instead of HTTP
// OpenCode will launch this as a subprocess
func main() {
	// Create the MCP server with our tools
	s := mcpServer.NewMCPServer()

	// Serve using stdio transport (reads stdin, writes stdout)
	if err := server.ServeStdio(s); err != nil {
		log.Fatalf("MCP server error: %v", err)
	}
}
