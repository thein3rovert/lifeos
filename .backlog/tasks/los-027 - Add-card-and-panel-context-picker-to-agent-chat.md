---
id: LOS-027
title: Add @ card and / panel context picker to agent chat
status: Done
assignee:
  - opencode
created_date: '2026-09-23 21:28'
updated_date: '2026-09-23 21:35'
labels: []
dependencies: []
references:
  - web/src/components/agent/FloatingChat.tsx
  - server/internal/services/agent.go
  - server/internal/store/agent.go
modified_files:
  - server/internal/model/agent.go
  - server/internal/services/agent.go
  - server/internal/store/agent.go
  - server/internal/store/sqlite.go
  - server/tests/agent_test.go
  - web/src/components/agent/FloatingChat.tsx
  - web/src/lib/api/agent.ts
  - web/src/test/AgentApi.test.ts
  - web/src/test/FloatingChat.test.tsx
  - web/src/types/index.ts
priority: medium
type: feature
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Let users attach Smart Board context from the LifeOS agent chat input. Typing @ should offer individual cards and typing / should offer whole panels. Selected references must appear as compact context chips in the composer and saved conversation transcript, while their full structured content is sent invisibly to the agent rather than inserted into the visible user message.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Typing @ in the agent chat composer opens a searchable picker of current Smart Board cards
- [x] #2 Typing / in the agent chat composer opens a searchable picker of available Smart Board panels
- [x] #3 Selected cards and panels appear as removable context chips before sending
- [x] #4 The agent receives the selected items full structured context without adding that content to the visible user message
- [x] #5 Sent messages display their attached context references in the transcript and preserve them after refresh
- [x] #6 Keyboard navigation supports selecting and dismissing picker results
- [x] #7 Tests cover picker behavior context payload creation persistence and transcript display
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect Smart Board response shapes and existing agent persistence to define a compact context-reference payload. 2. Extend agent message persistence/API to store visible reference metadata separately from message content and append selected full card/panel data only to the hidden OpenCode prompt. 3. Add an @ card and / panel autocomplete in FloatingChat with filtering, keyboard navigation, removable composer chips, and transcript chips. 4. Add focused server and frontend tests, then run Go tests, frontend checks/build, and runtime verification.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented @ card and / panel autocomplete using live Smart Board API data, keyboard selection/dismissal, removable composer chips, and persisted transcript chips. Server validates references against current stored panel data, ignores client labels, persists compact metadata, and sends resolved full JSON to OpenCode only in the hidden prompt context. Verification: Go server tests passed; focused Biome check passed; 12/12 focused frontend tests passed; web production build passed; git diff check passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added Smart Board context attachment to the agent chat. Users can type @ to search and attach individual cards or / to attach complete panels, navigate results by keyboard, and remove selected chips. The visible message remains clean while the server securely resolves current card/panel content and supplies it to OpenCode. Compact context references are persisted with user messages and displayed when transcripts are reopened. Added safe SQLite migration coverage plus server and frontend contract/UI tests. Verification: all Go server tests passed, 12 focused frontend tests passed, Biome checks passed, production web build passed, and diff check passed.
<!-- SECTION:FINAL_SUMMARY:END -->
