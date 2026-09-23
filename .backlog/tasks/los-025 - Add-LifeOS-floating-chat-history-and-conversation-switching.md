---
id: LOS-025
title: Add LifeOS floating chat history and conversation switching
status: Done
assignee:
  - opencode
created_date: '2026-09-23 20:39'
updated_date: '2026-09-23 21:06'
labels: []
dependencies: []
references:
  - web/src/components/agent/FloatingChat.tsx
  - web/src/lib/api/agent.ts
  - server/internal/api/agents/agent.go
modified_files:
  - scripts/dev.sh
  - server/cmd/server/main.go
  - server/internal/api/agents/agent.go
  - server/internal/model/agent.go
  - server/internal/services/agent.go
  - server/internal/sidecar/client.go
  - server/internal/store/agent.go
  - server/internal/store/sqlite.go
  - server/tests/agent_test.go
  - sidecar/package.json
  - sidecar/routes/agent.js
  - sidecar/tests/agent.test.js
  - web/src/components/agent/FloatingChat.tsx
  - web/src/lib/api/agent.ts
  - web/src/test/FloatingChat.test.tsx
  - web/src/types/index.ts
priority: medium
type: feature
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Persist and display only conversations initiated from the LifeOS floating chat. Users need to see prior floating-chat conversations, reopen one, review its messages, and continue the same session; unrelated OpenCode sessions must not appear.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Floating chat provides a history view listing conversations created through the LifeOS floating chat only
- [x] #2 Selecting a history item loads its prior user and assistant messages
- [x] #3 A reopened conversation continues using its original session
- [x] #4 Users can start a new separate floating-chat conversation
- [x] #5 Conversation history remains available after refreshing the LifeOS page
- [x] #6 Empty loading and failure states are understandable and do not prevent starting a new chat
- [x] #7 Relevant server and web tests cover conversation listing loading and continuation
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the existing AgentChatService and agents/agent.go handler with persistent conversation operations; do not create a separate floating-chat service or handler. 2. Add agent-named SQLite model/store files and persist only source=floating-chat conversations and messages while keeping OpenCode session IDs private. 3. Add explicit sidecar session creation and strict continuation. 4. Add the floating chat history/transcript/new-chat UI and API client. 5. Keep LOS-025 tests in dedicated server/tests, sidecar/tests, and web/src/test folders. 6. Correct native dev sidecar startup to target local OpenCode and verify through automated tests, build, and manual runtime use.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented dedicated SQLite-backed floating-chat conversation registry and transcript persistence. OpenCode session IDs stay server-side, explicit sessions are created through the sidecar, and continuation strictly targets the stored session rather than silently replacing it.

Implemented history/transcript/new-chat UI and API client. Verification passed: go test ./server/...; sidecar npm test (3/3); focused FloatingChat Vitest (4/4); web production build; git diff --check.

Manual browser check exposed a runtime environment failure: native sidecar was not listening because .env.dev sets OPENCODE_URL=host.containers.internal, which is only valid inside containers. Backend returned 502 when creating a conversation. Reopened task to validate and correct dev runtime configuration.

Consolidated naming and structure per review: removed separate floating_chat.go files from API, service, model, and store; conversation behavior now lives in agent.go and reuses AgentChatService. Renamed persistence types to AgentConversation/AgentMessage/AgentConversationStore and database tables to agent_conversations/agent_messages. LOS-025 tests now live in dedicated server/tests, sidecar/tests, and web/src/test folders. Go, sidecar, and focused web tests pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added persistent LifeOS agent-chat history using the existing agent handler and AgentChatService. Agent conversations and messages are stored in SQLite, mapped privately to exact OpenCode sessions, and exposed through create/list/load/send endpoints. The floating panel lists prior LifeOS chats, reloads transcripts, continues existing sessions, starts separate chats, and handles loading/empty/error states. Consolidated all new tests into dedicated server/tests, sidecar/tests, and web/src/test folders, and fixed native sidecar startup to target local OpenCode. Verification: Go server tests passed, sidecar tests passed, focused FloatingChat tests passed, web production build passed, diff check passed, and the user confirmed runtime chat works.
<!-- SECTION:FINAL_SUMMARY:END -->
