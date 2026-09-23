package tests

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	lifeosmcp "github.com/thein3rovert/lifeos/server/internal/mcp"
)

const (
	testMCPAPIKey = "test-mcp-key"
	sessionHeader = "Mcp-Session-Id"
)

func TestMCPStreamableHTTPRequiresAuthenticationForAllMethods(t *testing.T) {
	t.Setenv("MCP_API_KEY", testMCPAPIKey)
	handler := lifeosmcp.NewHTTPHandler(t.TempDir())

	for _, method := range []string{http.MethodGet, http.MethodPost, http.MethodDelete} {
		t.Run(method, func(t *testing.T) {
			req := httptest.NewRequest(method, "/mcp", nil)
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, req)
			if response.Code != http.StatusUnauthorized {
				t.Fatalf("%s /mcp status = %d, want %d", method, response.Code, http.StatusUnauthorized)
			}
		})
	}
}

func TestMCPStreamableHTTPInitializeToolsAndFileCalls(t *testing.T) {
	t.Setenv("MCP_API_KEY", testMCPAPIKey)
	allowedDir := t.TempDir()
	filePath := filepath.Join(allowedDir, "example.txt")
	if err := os.WriteFile(filePath, []byte("LifeOS MCP content"), 0o600); err != nil {
		t.Fatal(err)
	}

	server := httptest.NewServer(lifeosmcp.NewHTTPHandler(allowedDir))
	defer server.Close()

	initialize := postMCP(t, server.URL+"/mcp", "", `{
		"jsonrpc":"2.0",
		"id":1,
		"method":"initialize",
		"params":{
			"protocolVersion":"2025-03-26",
			"capabilities":{},
			"clientInfo":{"name":"lifeos-test","version":"1.0.0"}
		}
	}`)
	defer initialize.Body.Close()
	if initialize.StatusCode != http.StatusOK {
		t.Fatalf("initialize status = %d, body = %s", initialize.StatusCode, readBody(t, initialize))
	}
	sessionID := initialize.Header.Get(sessionHeader)
	if sessionID == "" {
		t.Fatal("initialize did not return Mcp-Session-Id")
	}
	var initializeBody struct {
		Result struct {
			ServerInfo struct {
				Name string `json:"name"`
			} `json:"serverInfo"`
		} `json:"result"`
	}
	decodeResponse(t, initialize, &initializeBody)
	if initializeBody.Result.ServerInfo.Name != "lifeos-files" {
		t.Fatalf("server name = %q, want lifeos-files", initializeBody.Result.ServerInfo.Name)
	}

	withoutSession := postMCP(t, server.URL+"/mcp", "", `{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}`)
	defer withoutSession.Body.Close()
	if withoutSession.StatusCode == http.StatusOK {
		t.Fatalf("tools/list without returned session ID unexpectedly succeeded: %s", readBody(t, withoutSession))
	}

	initialized := postMCP(t, server.URL+"/mcp", sessionID, `{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}`)
	defer initialized.Body.Close()
	if initialized.StatusCode < 200 || initialized.StatusCode >= 300 {
		t.Fatalf("initialized notification status = %d, body = %s", initialized.StatusCode, readBody(t, initialized))
	}

	toolsResponse := postMCP(t, server.URL+"/mcp", sessionID, `{"jsonrpc":"2.0","id":3,"method":"tools/list","params":{}}`)
	defer toolsResponse.Body.Close()
	if toolsResponse.StatusCode != http.StatusOK {
		t.Fatalf("tools/list status = %d, body = %s", toolsResponse.StatusCode, readBody(t, toolsResponse))
	}
	var toolsBody struct {
		Result struct {
			Tools []struct {
				Name string `json:"name"`
			} `json:"tools"`
		} `json:"result"`
	}
	decodeResponse(t, toolsResponse, &toolsBody)
	toolNames := make(map[string]bool, len(toolsBody.Result.Tools))
	for _, tool := range toolsBody.Result.Tools {
		toolNames[tool.Name] = true
	}
	for _, name := range []string{"list_files", "read_file"} {
		if !toolNames[name] {
			t.Fatalf("tools/list missing %q: %#v", name, toolsBody.Result.Tools)
		}
	}

	listResponse := postMCP(t, server.URL+"/mcp", sessionID, toolCallJSON(t, 4, "list_files", allowedDir))
	assertToolTextContains(t, listResponse, "example.txt")

	readResponse := postMCP(t, server.URL+"/mcp", sessionID, toolCallJSON(t, 5, "read_file", filePath))
	assertToolTextContains(t, readResponse, "LifeOS MCP content")
}

func TestMCPLegacySSERoutesRemainAvailable(t *testing.T) {
	t.Setenv("MCP_API_KEY", testMCPAPIKey)
	handler := lifeosmcp.NewHTTPHandler(t.TempDir())

	sseRequest := httptest.NewRequest(http.MethodPost, "/mcp/sse", nil)
	sseRequest.Header.Set("Authorization", "Bearer "+testMCPAPIKey)
	sseResponse := httptest.NewRecorder()
	handler.ServeHTTP(sseResponse, sseRequest)
	if sseResponse.Code != http.StatusMethodNotAllowed {
		t.Fatalf("POST /mcp/sse status = %d, want legacy SSE method response %d", sseResponse.Code, http.StatusMethodNotAllowed)
	}

	messageRequest := httptest.NewRequest(http.MethodPost, "/message", strings.NewReader(`{"jsonrpc":"2.0","id":1,"method":"ping"}`))
	messageRequest.Header.Set("Authorization", "Bearer "+testMCPAPIKey)
	messageRequest.Header.Set("Content-Type", "application/json")
	messageResponse := httptest.NewRecorder()
	handler.ServeHTTP(messageResponse, messageRequest)
	if messageResponse.Code == http.StatusNotFound || messageResponse.Code == http.StatusOK && messageResponse.Body.String() == "LifeOS is running" {
		t.Fatalf("POST /message did not reach legacy MCP handler: status = %d, body = %q", messageResponse.Code, messageResponse.Body.String())
	}
}

func postMCP(t *testing.T, url, sessionID, body string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBufferString(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", "Bearer "+testMCPAPIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	if sessionID != "" {
		req.Header.Set(sessionHeader, sessionID)
	}
	response, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	return response
}

func toolCallJSON(t *testing.T, id int, name, path string) string {
	t.Helper()
	payload := map[string]any{
		"jsonrpc": "2.0",
		"id":      id,
		"method":  "tools/call",
		"params": map[string]any{
			"name":      name,
			"arguments": map[string]string{"path": path},
		},
	}
	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

func assertToolTextContains(t *testing.T, response *http.Response, expected string) {
	t.Helper()
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("tool call status = %d, body = %s", response.StatusCode, readBody(t, response))
	}
	var body struct {
		Result struct {
			Content []struct {
				Text string `json:"text"`
			} `json:"content"`
		} `json:"result"`
	}
	decodeResponse(t, response, &body)
	if len(body.Result.Content) == 0 || !strings.Contains(body.Result.Content[0].Text, expected) {
		t.Fatalf("tool content = %#v, want text containing %q", body.Result.Content, expected)
	}
}

func decodeResponse(t *testing.T, response *http.Response, target any) {
	t.Helper()
	if err := json.NewDecoder(response.Body).Decode(target); err != nil {
		t.Fatal(err)
	}
}

func readBody(t *testing.T, response *http.Response) string {
	t.Helper()
	data, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}
