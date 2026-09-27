---
id: LOS-032
title: Harden smartboard JSON parsing with retry and friendly errors
status: Done
assignee:
  - thein3rovert
created_date: '2026-09-27 08:04'
updated_date: '2026-09-27 08:23'
labels:
  - smartboard
  - sidecar
  - reliability
dependencies: []
priority: high
type: enhancement
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prompt-only JSON on OpenCode V2 is best-effort. When the model returns prose or malformed JSON, cleanJSONResponse + json.Unmarshal fails and users see a raw error. Currently failing on schedule, e.g. 'failed to parse AI response: AI returned non-JSON response for achievements panel'. Need strict system prompt contract, retry/repair path, friendly user message, and full raw response saved/logged for Samad to debug. Must cover both manual refresh and scheduled auto-refresh.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Prompts enforce valid-JSON-only contract per panel type
- [x] #2 Malformed responses trigger one repair retry before failing
- [x] #3 Users see a friendly fallback message, never raw parse errors
- [x] #4 Full raw AI response is logged/saved for owner review
- [x] #5 Scheduled auto-refresh failures also use friendly fallback and clear on next success
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Tighten getPromptForPanel JSON contract per panel in smartboard.go
2. Harden cleanJSONResponse + parseAIResponse with validation and raw logging
3. Add one repair retry via agentChatService on malformed JSON
4. Return friendly user error, keep raw for owner logs, ensure scheduler setError clears on success
5. Add/extend Go tests for parser + retry, run go test
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added repair retry + friendly error + raw logging, prompts now include strict JSON contract, unwrap helper handles {items:[...]}. go vet and go test pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Hardened smartboard JSON handling: strict JSON-only contract in all 4 prompts, clean + unwrap parser for markdown and {items:[...]} wrappers, one repair retry on bad JSON, friendly user error with raw output kept in logs. Scheduler already clears error on next success so both manual and auto-refresh stay friendly. Tests: 4 new Go tests pass (prompts, clean, unwrap, friendly), go vet and full go test pass.
<!-- SECTION:FINAL_SUMMARY:END -->
