---
id: LOS-010
title: Persist InlineCanvasEditor state across page navigation
status: To Do
assignee: []
created_date: '2026-08-16 00:23'
labels: []
dependencies:
  - LOS-002
references:
  - web/src/components/agent/AgentSmartBoard.tsx
  - web/src/components/agent/InlineCanvasEditor.tsx
  - web/src/routes/agent/index.tsx
priority: low
type: enhancement
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The InlineCanvasEditor's open state, content, title, and editor context (panelType + itemId) live in `useState` on `AgentSmartBoard` (`web/src/components/agent/AgentSmartBoard.tsx`, lines ~32-40). When the user navigates away from the `/agent` route and returns, all of this state is gone: the editor is closed, unsaved content is lost, and the editor context is null.

Persist the editor state so that navigating away from `/agent` and returning preserves the open editor with its content and context intact. Common approaches: TanStack Router search params / route state, a small persisted store (localStorage or sessionStorage), or lifting the editor session into a route-level loader. The implementer should choose the approach that best fits the existing stack (no TanStack Query/Zustand/Context is currently in use — plain useState + useApi hooks + TanStack Router loaders).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Open the editor on a /agent card, navigate to another route, return to /agent → editor is still open with the same content, title, panelType, and itemId
- [ ] #2 Switching state from the editor footer (LOS-002), navigating away, and returning preserves the new state in the editor
- [ ] #3 Closing the editor persists (navigating away after closing returns to a closed editor, not a stale open one)
- [ ] #4 Hard refresh on /agent restores the editor to its last-open state, OR a documented decision that hard refresh intentionally resets (with reasoning)
- [ ] #5 No regressions to existing editor open/close/save behavior
- [ ] #6 vite build succeeds and tsc --noEmit is clean for affected files
- [ ] #7 biome lint passes for affected files
<!-- AC:END -->
