package mcp

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// allowedDirs is the runtime allow-list of directory prefixes the MCP
// tools may read from. Populated by NewMCPServer from config; kept in a
// package variable so the handler funcs (which the SDK calls by value)
// can consult it without capture gymnastics.
var allowedDirs []string

// NewMCPServer creates the LifeOS MCP server. allowedDirectories is a
// list of absolute paths (comma-separated in the MCP_ALLOWED_DIRS env)
// that the MCP tools may read from. If empty, the MCP server can only
// read from directories with no restriction — but the handlers will
// reject everything, so pass at least one path in practice.
func NewMCPServer(allowedDirectories ...string) *server.MCPServer {
	allowedDirs = append(allowedDirs[:0], allowedDirectories...)

	s := server.NewMCPServer(
		"lifeos-files",
		"1.0.0",
		server.WithToolCapabilities(false),
		server.WithResourceCapabilities(true, false),
	)

	// === Resource: allowed_directories ===
	allowedDirsResource := mcp.NewResource(
		"lifeos://allowed-directories",
		"Allowed Directories",
		mcp.WithResourceDescription("List of directories this MCP server has access to"),
		mcp.WithMIMEType("text/plain"),
	)
	s.AddResource(allowedDirsResource, allowedDirectoriesHandler)

	// === list_files tool ===
	listTool := mcp.NewTool("list_files",
		mcp.WithDescription("List files and folders in a given directory"),
		mcp.WithString("path",
			mcp.Required(),
			mcp.Description("Absolute path to list"),
		),
	)
	s.AddTool(listTool, listFilesHandler)

	// === read_file tool ===
	readTool := mcp.NewTool("read_file",
		mcp.WithDescription("Read the content of a file"),
		mcp.WithString("path",
			mcp.Required(),
			mcp.Description("Absolute path to the file to read"),
		),
	)
	s.AddTool(readTool, readFileHandler)
	return s
}

// allowedDirectoriesHandler returns the list of allowed directories.
func allowedDirectoriesHandler(ctx context.Context, req mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
	var lines []string
	lines = append(lines, "This MCP server has access to the following directories:")
	lines = append(lines, "")
	if len(allowedDirs) == 0 {
		lines = append(lines, "(no directories configured — set MCP_ALLOWED_DIRS)")
	} else {
		for _, path := range allowedDirs {
			lines = append(lines, fmt.Sprintf("📁 %s", path))
		}
	}
	lines = append(lines, "")
	lines = append(lines, "All subdirectories within these paths are also accessible.")

	return []mcp.ResourceContents{
		mcp.TextResourceContents{
			URI:      "lifeos://allowed-directories",
			MIMEType: "text/plain",
			Text:     strings.Join(lines, "\n"),
		},
	}, nil
}

// listFilesHandler responds to the list_files tool call.
func listFilesHandler(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	targetPath, err := req.RequireString("path")
	if err != nil {
		return mcp.NewToolResultError("path is required"), nil
	}

	if !isAllowedDirectory(targetPath) {
		return mcp.NewToolResultError("access denied: path not in allowed list"), nil
	}

	entries, err := os.ReadDir(targetPath)
	if err != nil {
		return mcp.NewToolResultErrorFromErr("cannot read directory", err), nil
	}

	var lines []string
	for _, e := range entries {
		entriesInfo, _ := e.Info()
		entriesSize := ""
		if entriesInfo != nil && !e.IsDir() {
			entriesSize = fmt.Sprintf(" (%d bytes)", entriesInfo.Size())
		}

		entriesType := "file"
		if e.IsDir() {
			entriesType = "dir"
		}
		lines = append(lines, fmt.Sprintf("[%s] %s%s", entriesType, e.Name(), entriesSize))
	}

	if len(lines) == 0 {
		return mcp.NewToolResultText("directory is empty"), nil
	}
	return mcp.NewToolResultText(strings.Join(lines, "\n")), nil
}

// readFileHandler responds to the read_file tool call.
func readFileHandler(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	targetPath, err := req.RequireString("path")
	if err != nil {
		return mcp.NewToolResultError("path is required"), nil
	}

	if !isAllowedDirectory(targetPath) {
		return mcp.NewToolResultError("access denied: path not in allowed list"), nil
	}

	data, err := os.ReadFile(targetPath)
	if err != nil {
		return mcp.NewToolResultErrorFromErr("cannot read file", err), nil
	}

	return mcp.NewToolResultText(string(data)), nil
}

func isAllowedDirectory(path string) bool {
	absolutePath, err := filepath.Abs(path)
	if err != nil {
		return false
	}
	for _, dir := range allowedDirs {
		if strings.HasPrefix(absolutePath, dir) {
			return true
		}
	}
	return false
}
