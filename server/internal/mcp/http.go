package mcp

import (
	"net/http"

	"github.com/mark3labs/mcp-go/server"
	"github.com/thein3rovert/lifeos/server/internal/middleware"
)

// NewHTTPHandler exposes both the Streamable HTTP transport used by OpenCode
// V2 and the legacy SSE transport. The exact /mcp registration is important:
// /mcp/ remains a separate ServeMux subtree for legacy /mcp/sse requests.
func NewHTTPHandler(allowedDirectories ...string) http.Handler {
	mcpServer := NewMCPServer(allowedDirectories...)
	streamable := server.NewStreamableHTTPServer(mcpServer, server.WithStateful(true))
	legacySSE := server.NewSSEServer(mcpServer)

	mux := http.NewServeMux()
	mux.Handle("/mcp", middleware.MCPAuth(streamable))
	mux.Handle("/mcp/", middleware.MCPAuth(http.StripPrefix("/mcp", legacySSE)))
	mux.Handle("/message", middleware.MCPAuth(legacySSE))
	return mux
}
