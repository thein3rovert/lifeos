---
id: LOS-034
title: Return newest text reply instead of empty tool-only message
status: Done
assignee:
  - thein3rovert
created_date: '2026-09-27 09:08'
updated_date: '2026-09-27 09:10'
labels:
  - sidecar
  - floating-chat
dependencies: []
priority: high
type: bug
ordinal: 1500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Floating chat sometimes saves an empty assistant reply and the user must resend to get an answer. promptAndWait picks the earliest completed assistant after the user message, which can be a tool-only step with no text. It should prefer the newest completed assistant that has text.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Chat replies contain text even when the agent used tools mid-answer
- [x] #2 Existing steer and queue delivery behavior still works
- [x] #3 Sidecar tests cover the tool-only intermediate case
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Change promptAndWaitDetailed to prefer newest completed assistant with text
2. Add sidecar test with tool-only intermediate message
3. Run sidecar npm test
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause confirmed via lifeos.db: empty assistant rows saved after tool-only intermediate steps. Fix prefers newest completed assistant with text, keeps earliest-pick when a newer user message shares the run (steer/concurrent). All 24 sidecar tests pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed empty chat replies: promptAndWaitDetailed now prefers the newest completed assistant with text instead of the earliest (often tool-only). Steer/concurrent behavior preserved via earliest-pick when a newer user message exists. Added regression test; all 24 sidecar tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->
