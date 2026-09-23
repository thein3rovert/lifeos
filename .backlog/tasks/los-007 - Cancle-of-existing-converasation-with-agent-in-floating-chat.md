---
id: LOS-007
title: Stop an in-progress agent response in floating chat
status: Done
assignee:
  - opencode
created_date: '2026-08-15 21:54'
updated_date: '2026-09-23 21:19'
labels: []
dependencies: []
modified_files:
  - web/src/components/agent/FloatingChat.tsx
  - web/src/lib/api/agent.ts
  - web/src/test/FloatingChat.test.tsx
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow the user to stop a running agent response from the LifeOS floating chat so they can immediately revise or add context without waiting for completion. The current conversation and already-sent user message must remain usable after stopping.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A visible Stop control replaces the Send control while an agent response is running
- [x] #2 Stopping calls the existing agent abort endpoint for the exact in-flight request
- [x] #3 An intentionally stopped request does not show the generic send-failure message
- [x] #4 The current conversation remains open and accepts another message after stopping
- [x] #5 Frontend tests cover the stop request and post-stop usability
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the agent API client so conversation sends include a generated requestId and expose the existing /api/agent/abort endpoint. 2. Track the active request ID in FloatingChat and replace Send with an accessible Stop button while sending. 3. On stop, abort the exact sidecar request, retain the user message/conversation, suppress the generic failure state, and re-enable input. 4. Add focused tests for abort routing and post-stop usability; run formatter, tests, and production build.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added per-request IDs to persisted conversation sends and wired the existing /api/agent/abort endpoint into FloatingChat. While sending, the send icon becomes a Stop button; stopping immediately re-enables input, retains the optimistic user message, and suppresses generic failure handling for the intentionally aborted request. Focused frontend suite passes 7/7 and production build passes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added cancellation for in-progress floating-chat responses. Each send now carries a unique request ID, the UI displays a Stop control while waiting, and Stop targets the existing agent abort endpoint. Intentional cancellation leaves the conversation and user message available and allows another prompt without showing the generic failure state. Verification: 7/7 focused FloatingChat tests passed, web production build passed, and Go server tests passed.
<!-- SECTION:FINAL_SUMMARY:END -->
