package mcp

import (
	"github.com/mark3labs/mcp-go/server"
)

// allowDirs: This restricts which folders the agents can read
var allowedDirectories = []string {
	"/home/thein3rovert/Documents/project",
	"/home/thein3rovert/.config/opencode",
}

// New MCP-Server create the mcp server file-reading tools
func NewMCPServer() *server.MCPServer {
	s := server.NewMCPServer (

	)
}
