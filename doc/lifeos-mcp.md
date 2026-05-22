# MCP Notes Server — Implementation Plan

> Embed an MCP server into your existing Go + TanStack app so any MCP-compatible agent (OpenCode, Claude, etc.) can append notes/findings directly to your skills app.

---

## Architecture Overview

```
OpenCode / any MCP agent
        ↓
  localhost:8080/mcp/sse   ← MCP endpoint (new)
        ↓
  Internal Go handler
        ↓
  POST /internal/notes     ← existing or new API route
        ↓
  Database / notes store
        ↓
  TanStack frontend updates
```

---

## Phase 1 — Install mcp-go

- [ ] Run `go get github.com/mark3labs/mcp-go`
- [ ] Confirm it appears in `go.mod` and `go.sum`
- [ ] Run `go mod tidy` to clean up

---

## Phase 2 — Create the notes API endpoint

> Skip if you already have one. Otherwise add this to your existing Go router.

- [ ] Create handler file `internal/handlers/notes.go`
- [ ] Define request struct:
    
    ```go
    type AddNoteRequest struct {    Content string `json:"content"`    Skill   string `json:"skill"`    Source  string `json:"source"` // e.g. "opencode", "claude"}
    ```
    
- [ ] Implement `POST /internal/notes` handler that appends the note to your DB/store
- [ ] Register the route in your main router
- [ ] Test it manually with curl:
    
    ```bash
    curl -X POST http://localhost:8080/internal/notes \  -H "Content-Type: application/json" \  -d '{"content":"test note","skill":"go-basics","source":"manual"}'
    ```
    

---

## Phase 3 — Create the MCP server file

- [ ] Create `mcp/server.go`
- [ ] Initialise the MCP server:
    
    ```go
    package mcpimport (    "github.com/mark3labs/mcp-go/mcp"    "github.com/mark3labs/mcp-go/server")func NewServer() *server.MCPServer {    s := server.NewMCPServer("skills-app", "1.0.0")    // tools registered here    return s}
    ```
    
- [ ] Define the `add_note` tool with input schema (content, skill, source)
- [ ] Define the `list_notes` tool (optional but useful for agents to check context)
- [ ] Wire each tool to call your internal `/internal/notes` endpoint

---

## Phase 4 — Register tools on the MCP server

- [ ] Register `add_note` tool:
    
    ```go
    s.AddTool(mcp.NewTool("add_note",    mcp.WithDescription("Append a finding or note to the skills app"),    mcp.WithString("content", mcp.Required(), mcp.Description("The note content")),    mcp.WithString("skill", mcp.Description("Related skill name (optional)")),), addNoteHandler)
    ```
    
- [ ] Implement `addNoteHandler` func that calls your internal notes API
- [ ] Register `list_notes` tool (optional):
    
    ```go
    s.AddTool(mcp.NewTool("list_notes",    mcp.WithDescription("List recent notes from the skills app"),), listNotesHandler)
    ```
    

---

## Phase 5 — Mount MCP onto your existing HTTP server

- [ ] Create the SSE handler from your MCP server:
    
    ```go
    sseHandler := server.NewSSEServer(mcpServer,    server.WithBaseURL("http://localhost:8080"),)
    ```
    
- [ ] Mount it on your existing router:
    
    ```go
    mux.Handle("/mcp/", sseHandler)
    ```
    
- [ ] Confirm your app starts without errors
- [ ] Visit `http://localhost:8080/mcp/sse` in the browser — should return an SSE stream (not a 404)

---

## Phase 6 — Add simple API key auth (recommended)

- [ ] Add an `MCP_API_KEY` env variable to your `.env`
- [ ] Create middleware that checks the `Authorization: Bearer <key>` header on `/mcp/` routes
- [ ] Return `401` if missing or wrong
- [ ] Test that requests without the key are rejected

---

## Phase 7 — Connect OpenCode

- [ ] Find your OpenCode config file (usually `~/.config/opencode/config.json`)
- [ ] Add your MCP server:
    
    ```json
    {  "mcpServers": {    "skills-app": {      "type": "sse",      "url": "http://localhost:8080/mcp/sse",      "headers": {        "Authorization": "Bearer your-api-key-here"      }    }  }}
    ```
    
- [ ] Start your Go app
- [ ] Restart OpenCode
- [ ] Confirm `add_note` appears as an available tool in OpenCode
- [ ] Run a test: ask OpenCode to call `add_note` with a dummy note
- [ ] Check your app's notes section to confirm it arrived

---

## Phase 8 — Verify end-to-end

- [ ] Start a real OpenCode session, build/explore something
- [ ] At the end of the session, ask the agent: _"Add a note to my skills app summarising what we found about X"_
- [ ] Agent calls `add_note` → note appears in your app
- [ ] Open your app, find the note, refine your skill as usual

---

## Notes

- **No hosting needed** — everything runs on localhost while you work
- **Any MCP agent works** — Claude Desktop, OpenCode, or any future tool that supports MCP
- **Start minimal** — just `add_note` first, add more tools later as you find the need
- **mcp-go docs** → https://github.com/mark3labs/mcp-go
