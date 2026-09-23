---
id: LOS-029
title: Add OpenCode V2 Streamable HTTP MCP endpoint
status: Done
assignee:
  - opencode
created_date: '2026-09-23 23:07'
updated_date: '2026-09-23 23:14'
labels:
  - mcp
  - backend
  - opencode-v2
dependencies: []
references:
  - server/cmd/server/main.go
  - server/internal/mcp/server.go
  - server/internal/middleware/mcp_auth.go
documentation:
  - 'https://opencode.ai/v2/docs/mcp-servers'
modified_files:
  - .env.example
  - doc/opencode-v2-mcp.md
  - server/agent.md
  - server/cmd/server/main.go
  - server/internal/mcp/http.go
  - server/internal/mcp/server.go
  - server/tests/mcp_http_test.go
priority: high
type: feature
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose the LifeOS MCP server over Streamable HTTP for OpenCode V2 remote MCP clients while retaining the existing legacy SSE and stdio transports for backward compatibility. The endpoint must preserve bearer-token authentication and the current directory allow-list security model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 POST /mcp accepts the MCP initialize handshake using Streamable HTTP
- [x] #2 OpenCode V2 can connect to the LifeOS remote MCP URL and list/call list_files and read_file
- [x] #3 Bearer authentication protects all Streamable HTTP methods
- [x] #4 Legacy /mcp/sse and /message endpoints continue to work
- [x] #5 Automated tests cover initialization authentication tool listing and legacy compatibility
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Mount mcp-go's StreamableHTTPServer at exact /mcp behind existing MCP bearer authentication, while keeping /mcp/sse and /message wired to the legacy SSE server. 2. Use stateful/session-capable Streamable HTTP behavior compatible with OpenCode V2's classic MCP initialize handshake and tool calls. 3. Add HTTP integration tests for auth, initialize, tools/list, tool calls, and legacy route availability. 4. Verify with Go tests and a real OpenCode V2 MCP connection/config check where practical; update endpoint docs.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added stateful MCP Streamable HTTP at exact /mcp behind bearer authentication while preserving legacy SSE and stdio transports. Removed package-global allow-list state so concurrent transports/tests remain isolated. Updated local OpenCode V2 configuration to /mcp with OAuth disabled. Verification: Go tests and vet passed; initialize/tools/list/list_files/read_file tests passed; opencode mcp list reports lifeos-files connected; live list_files tool smoke test succeeded.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added OpenCode V2-compatible MCP Streamable HTTP transport at /mcp while retaining /mcp/sse, /message, and stdio compatibility. All transport methods use existing bearer authentication and preserve directory allow-list enforcement. Added integration tests covering authentication, initialization/session IDs, tool discovery, file tools, and legacy routing, plus V2 configuration documentation. Verified a live OpenCode V2 connection and successful LifeOS list_files call.
<!-- SECTION:FINAL_SUMMARY:END -->
