---
id: LOS-030
title: Fix floating chat submit on non-HTTPS production origin
status: Done
assignee:
  - opencode
created_date: '2026-09-23 23:28'
updated_date: '2026-09-23 23:31'
labels: []
dependencies: []
references:
  - web/src/components/agent/FloatingChat.tsx
modified_files:
  - web/src/components/agent/FloatingChat.tsx
  - web/src/lib/clientId.ts
  - web/src/test/ClientId.test.ts
  - web/src/test/FloatingChat.test.tsx
priority: high
type: bug
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Floating chat submission crashes in production over plain HTTP because crypto.randomUUID is unavailable outside secure browser contexts. Generate request and optimistic message IDs without requiring a secure origin while preserving uniqueness and retry behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Submitting with Enter or the send button works when crypto.randomUUID is unavailable
- [x] #2 Generated request and optimistic message IDs remain unique enough for concurrent chat sends
- [x] #3 Native crypto.randomUUID is used when available
- [x] #4 Frontend tests cover the insecure-origin fallback and normal path
- [x] #5 Production frontend build passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a small browser-safe ID helper that prefers crypto.randomUUID when callable, falls back to crypto.getRandomValues when available, and finally combines timestamp/counter/random data for insecure or legacy contexts. 2. Replace direct randomUUID calls in FloatingChat. 3. Add unit and component coverage with randomUUID unavailable. 4. Run focused checks, tests, and production build, then deploy the frontend image.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced direct crypto.randomUUID calls with a browser-safe helper that prefers native randomUUID, falls back to getRandomValues UUID generation, then a timestamp/sequence/random fallback. Verified submit behavior with randomUUID unavailable. Focused tests passed 22/22 and production build passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed floating-chat submission on plain-HTTP production origins where crypto.randomUUID is unavailable. Request and optimistic message IDs now use a secure-context-aware helper with layered fallbacks while preserving native UUID behavior when supported. Added helper and end-to-end component tests; focused frontend tests and production build pass.
<!-- SECTION:FINAL_SUMMARY:END -->
