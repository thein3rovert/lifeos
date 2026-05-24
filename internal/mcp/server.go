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

// DirectoryInfo holds information about an allowed directory
type DirectoryInfo struct {
	Path        string
	Description string
}

// allowedDirectories: This restricts which folders the agents can read
// Each directory has a description to help the agent understand its purpose
var allowedDirectories = []DirectoryInfo{
	{
		Path:        "/home/thein3rovert/Documents/resources/work_Elanco/meeting",
		Description: "Meeting notes - All meeting notes and summaries organized by date/topic",
	},
	{
		Path:        "/home/thein3rovert/Documents/resources/work_Elanco/journal",
		Description: "Journal entries - Personal journal entries and reflections",
	},
}

// New MCP-Server create the mcp server file-reading tools
func NewMCPServer() *server.MCPServer {
	s := server.NewMCPServer(
		"lifeos-files", // TODO: Change based on file type [meeting, journals and more]
		"1.0.0",
		server.WithToolCapabilities(false),
		server.WithResourceCapabilities(true, false), // list=true, subscribe=false
	)

	// === Resource: allowed_directories ===
	// Lets the agent know which directories it can access
	allowedDirsResource := mcp.NewResource(
		"lifeos://allowed-directories",
		"Allowed Directories",
		mcp.WithResourceDescription("List of directories this MCP server has access to"),
		mcp.WithMIMEType("text/plain"),
	)
	s.AddResource(allowedDirsResource, allowedDirectoriesHandler)

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

// allowedDirectoriesHandler returns the list of allowed directories
func allowedDirectoriesHandler(ctx context.Context, req mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
	var lines []string
	lines = append(lines, "This MCP server has access to the following directories:")
	lines = append(lines, "")
	for _, dirInfo := range allowedDirectories {
		lines = append(lines, fmt.Sprintf("📁 %s", dirInfo.Path))
		lines = append(lines, fmt.Sprintf("   %s", dirInfo.Description))
		lines = append(lines, "")
	}
	lines = append(lines, "All subdirectories within these paths are also accessible.")
	lines = append(lines, "")
	lines = append(lines, "Usage tips:")
	lines = append(lines, "- For meeting notes: check /home/thein3rovert/Documents/meetings")
	lines = append(lines, "- For journal entries: check /home/thein3rovert/Documents/journals")
	lines = append(lines, "- For project code: check /home/thein3rovert/Documents/project")

	return []mcp.ResourceContents{
		mcp.TextResourceContents{
			URI:      "lifeos://allowed-directories",
			MIMEType: "text/plain",
			Text:     strings.Join(lines, "\n"),
		},
	}, nil
}

// Utils MCP File Handlers
func listFilesHandler(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
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
func readFileHandler(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {

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
	for _, dirInfo := range allowedDirectories {
		if strings.HasPrefix(absolutePath, dirInfo.Path) {
			return true
		}
	}
	return false
}
