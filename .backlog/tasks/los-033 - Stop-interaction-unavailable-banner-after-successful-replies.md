---
id: LOS-033
title: Stop interaction-unavailable banner after successful replies
status: To Do
assignee: []
created_date: '2026-09-27 08:15'
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
