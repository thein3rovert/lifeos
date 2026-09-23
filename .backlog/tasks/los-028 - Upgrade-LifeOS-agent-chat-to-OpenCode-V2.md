---
id: LOS-028
title: Upgrade LifeOS agent chat to OpenCode V2
status: In Progress
assignee:
  - opencode
created_date: '2026-09-23 22:19'
updated_date: '2026-09-23 23:01'
labels: []
dependencies: []
references:
  - sidecar/index.js
  - sidecar/routes/agent.js
  - server/internal/services/agent.go
  - web/src/components/agent/FloatingChat.tsx
documentation:
  - 'https://opencode.ai/v2/docs/migrate-v1'
  - 'https://opencode.ai/v2/docs/api'
  - 'https://opencode.ai/v2/docs/build/client'
priority: high
type: feature
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Modernize the LifeOS agent-chat integration for OpenCode V2 with authenticated service connectivity, native session APIs, live activity, prompt steering/queueing, permissions and forms, plus future agent/model/skill/context controls. Existing LifeOS conversation persistence and Smart Board context behavior must remain intact.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 LifeOS uses the supported OpenCode V2 client and API contracts
- [x] #2 The floating chat exposes live activity and interactive session requests
- [x] #3 Users can steer or queue follow-up prompts while work is running
- [ ] #4 Users can select agent model and skills and inspect session context
- [x] #5 Existing LifeOS chat history context attachments Markdown resizing and stopping continue to work
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Completed current stage: V2 client/API migration, live session activity, permissions/forms, and steer/queue prompts. Remaining optional tracked work is LOS-028.03 for agent/model/skill/context controls. Session stats/fork/export was removed from scope at the user's request.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
LOS-028.01 completed: sidecar now uses authenticated OpenCode V2 client/API contracts and was verified against the installed V2 service.

Current V2 stage verified and ready to commit. User removed stats/fork/export from scope; LOS-028.03 remains a future To Do item.
<!-- SECTION:NOTES:END -->
