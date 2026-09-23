---
id: LOS-024
title: Fix FloatingChat transparent panel - replace no-op Atlas tokens
status: Done
assignee: []
created_date: '2026-09-23 20:27'
updated_date: '2026-09-23 20:37'
labels: []
dependencies: []
modified_files:
  - web/src/components/agent/FloatingChat.tsx
type: bug
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
FloatingChat panel is transparent — background page content bleeds through making text unreadable. Same root cause as LOS-009: uses Tailwind classes bg-secondary / bg-tertiary / bg-accent / text-on-accent that are NOT defined in global.css @theme and render as no-ops under Tailwind v4. Replace with real Atlas tokens following InlineCanvasEditor convention.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Chat panel and input bar render fully opaque with solid background — no background content bleeds through
- [x] #2 Assistant messages loading indicator and hover states use token-backed classes that render
- [x] #3 User messages render with codebase primary convention
- [x] #4 No remaining bg-secondary bg-tertiary bg-accent text-on-accent usages in FloatingChat.tsx
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the floating panel and input backgrounds with generated bg-[#0f0f0f] plus an inline #0f0f0f fallback. 2. Use bg-white/10 for assistant/loading/hover surfaces and bg-highlight text-white for user messages. 3. Verify generated CSS with Tailwind CLI, grep out old no-op classes, format the component, and obtain visual confirmation from the user.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced 6 no-op token usages in FloatingChat.tsx with Atlas-backed tokens (bg-raised, bg-active, bg-highlight). Grep clean, tsc shows only pre-existing ScheduleCard error. Needs visual check for opacity. Note: AgentChatPage.tsx has identical no-op tokens — flagged as follow-up, out of scope.

V2 fix: panel/input now bg-[#0f0f0f] + inline style fallback (verified generates CSS), bubbles bg-white/10, user bg-highlight. Grep clean, format fixed, lint shows only pre-existing warnings. Awaiting visual confirm.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the FloatingChat readability issue by replacing non-rendering background utilities with guaranteed generated colors and an explicit solid background fallback. The chat panel and input are now opaque; assistant/loading states use visible translucent surfaces; user messages use the existing highlight convention. Verification: user manually confirmed the panel is fixed; Tailwind CLI confirmed generated CSS for bg-[#0f0f0f], bg-white/10, and bg-highlight; prohibited no-op class grep returned no matches. Repository-wide typecheck/check still report unrelated pre-existing errors in ScheduleCard and other components.
<!-- SECTION:FINAL_SUMMARY:END -->
