---
id: LOS-036
title: Delete floating-chat conversation history
status: Done
assignee:
  - '@thein3rovert'
created_date: '2026-09-27 10:24'
updated_date: '2026-09-27 10:45'
labels: []
dependencies: []
priority: medium
type: feature
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users can view and switch chat history but cannot remove unwanted conversations. Allow deleting a chosen conversation and its messages, without affecting other conversations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 User can delete a conversation from history after confirming
- [x] #2 Deleted conversation and its messages no longer appear on reload
- [x] #3 Other conversations remain unchanged and errors keep the item visible
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a scoped Go store delete for one agent conversation plus messages. 2. Remove its private OpenCode session through a sidecar endpoint and service orchestration. 3. Expose DELETE /api/agent/conversations/{id} and a confirmable history-row delete UI. 4. Test missing IDs, isolation, success and failures in server/tests and web tests.

5. Use the existing LifeOS Dialog and Button components for deletion confirmation rather than a browser window.confirm popup; keep the history list visible if deletion fails.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Used LifeOS Dialog and Button for confirmation instead of browser window.confirm. Scoped store deletion removes messages and conversation, Go service first deletes private OpenCode session, API returns 204/404/502 appropriately; failures leave history visible. Verified Go tests, sidecar tests 29/29 and web tests 52/52 including cancel/confirm/failure.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added per-conversation history deletion with native LifeOS confirmation, private OpenCode cleanup and transactional SQLite removal. Verified missing/error handling and other-conversation isolation in server/tests; Go suite, sidecar 29 tests and web 52 tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->
