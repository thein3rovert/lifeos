---
id: LOS-033
title: Stop interaction-unavailable banner after successful replies
status: In Progress
assignee:
  - thein3rovert
created_date: '2026-09-27 08:15'
updated_date: '2026-09-27 08:38'
labels:
  - floating-chat
  - sidecar
  - ux
dependencies: []
priority: high
type: bug
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Floating chat shows 'Could not refresh agent requests. agent interaction unavailable' even after agent replies. Chat via /agent/session/chat succeeds but follow-up GET /permissions + /forms fails (session 404/expired) and Go masks it as 502. Interaction refresh should be best-effort and not error the UI when chat worked.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Successful replies do not show interaction-unavailable error
- [ ] #2 Missing/expired sessions return empty permissions and forms
- [ ] #3 Real sidecar failures still surface for debugging
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Make sidecar ListAgentInteractions best-effort: 404/session-missing returns empty, no error
2. Keep real failures as errors with server-side logs, friendly UI message
3. Move hardening unit tests to server/tests via public API tests
4. Add server/tests for 404-returns-empty interactions
5. Run go vet + go test
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Sidecar ListAgentInteractions returns empty on 404 so UI stays quiet after good replies, real errors still fail with server logs. Moved hardening tests to server/tests via new public helpers (PanelPrompt, CleanJSONResponse, UnwrapPanelJSONArray, FriendlyPanelError). All go vet + go test pass.
<!-- SECTION:NOTES:END -->
