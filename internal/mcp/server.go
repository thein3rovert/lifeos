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

// allowDirs: This restricts which folders the agents can read
var allowedDirectories = []string {
	"/home/thein3rovert/Documents/project",
	"/home/thein3rovert/.config/opencode",
}

// New MCP-Server create the mcp server file-reading tools
func NewMCPServer() *server.MCPServer {
	s := server.NewMCPServer (
		"lifeos-files", // TODO: Change based on file type [meeting, journals and more]
		"1.0.0",
			server.WithToolCapabilities(false),
	)

	// === First Tool: list_files ===
	// Let's the agent ask "what files are in the folder x?
	listTool := mcp.NewTool("list_files",
		mcp.WithDescription("List files and folders in a given directory"),
		mcp.WithString("path",
		mcp.Required(),
		mcp.Description("Absolute path to list"),
		),
	)

	s.AddTool(listTool, listFilesHandler)


// === Second Tool ===
// Lets the agents ask "show me the content of files Y"
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

// Utils MCP File Handlers
func listFilesHandler(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, err) {
	targetPath, err := req.RequireString("path")
	if err != nil {
		return mcp.NewToolResultError("path is required"), nil
	}

	// Secureity: reject for directrories not the specified dir (outside dir)
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

		// Get entries type
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

// readFileHandler responds to the read_file tool call
func readFileHandler(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolRequest, error) {

	// TODO: Add reusable to utils or one funtion
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
	for _, dir := range allowedDirectories {
		if strings.HasPrefix(absolutePath, dir) {
			return true
		}
	}
	return false
}
