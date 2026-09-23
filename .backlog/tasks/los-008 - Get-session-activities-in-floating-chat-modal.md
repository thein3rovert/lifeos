---
id: LOS-008
title: Show live OpenCode V2 session activity in floating chat
status: Done
assignee:
  - opencode
created_date: '2026-08-15 21:55'
updated_date: '2026-09-23 22:45'
labels: []
dependencies:
  - LOS-028.01
references:
  - web/src/components/agent/FloatingChat.tsx
  - sidecar/routes/agent.js
documentation:
  - 'https://opencode.ai/v2/docs/api'
modified_files:
  - sidecar/activity.js
  - sidecar/routes/agent.js
  - sidecar/tests/activity.test.js
  - server/cmd/server/main.go
  - server/internal/api/agents/agent.go
  - server/internal/services/agent.go
  - server/internal/sidecar/client.go
  - server/tests/activity_test.go
  - web/src/components/agent/FloatingChat.tsx
  - web/src/lib/api/agent.ts
  - web/src/test/FloatingChat.test.tsx
  - web/src/types/index.ts
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stream activity for the active LifeOS floating-chat session so users can see what OpenCode is doing, including tool calls, file access, MCP activity, reasoning/status changes, and failures. Use the OpenCode V2 event stream and session log APIs after the sidecar migration is complete.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Live activity appears for the active LifeOS conversation while the agent is working
- [x] #2 Activity distinguishes tools file access MCP calls and status changes
- [x] #3 The activity view reconnects or recovers clearly after connection loss
- [x] #4 Activity from unrelated OpenCode sessions is not shown
- [x] #5 Tests cover event filtering rendering and failure states
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a sidecar SSE endpoint backed by OpenCode V2 event.subscribe and filter events to the requested OpenCode session. Normalize relevant session, assistant, tool, filesystem, MCP, permission, and error events into a stable LifeOS activity shape. 2. Add a Go endpoint that resolves a LifeOS conversation ID to its private OpenCode session ID and proxies the sidecar activity stream without exposing the session ID. 3. Add a compact activity view in FloatingChat with reconnect/error states and per-kind visual labels. 4. Test filtering, proxy streaming, UI rendering, and regressions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented OpenCode V2 event streaming through sidecar SSE, a secure Go proxy resolving private session IDs, and a toggleable FloatingChat activity view. Events are filtered by exact session ID and normalized into status/tool/file/MCP/reasoning/error entries; global unscoped events are deliberately excluded. Verification: 14 sidecar tests, all Go tests, and 14 focused web tests passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added live OpenCode V2 session activity to LifeOS floating chat. The sidecar subscribes to V2 events, filters them to the exact active session, normalizes meaningful activity, and streams it through a secure Go SSE proxy that never exposes OpenCode session IDs. FloatingChat presents a compact toggleable activity feed with connecting/reconnecting states and bounded history. Sidecar, Go, and frontend tests cover filtering, streaming, display, and failures.
<!-- SECTION:FINAL_SUMMARY:END -->
