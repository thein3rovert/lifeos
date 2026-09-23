---
id: LOS-026
title: Render Markdown and resize the agent chat panel
status: Done
assignee:
  - opencode
created_date: '2026-09-23 21:12'
updated_date: '2026-09-23 21:16'
labels: []
dependencies: []
references:
  - web/src/components/agent/FloatingChat.tsx
  - web/src/components/ui/RenderMarkdown.tsx
  - web/src/test/FloatingChat.test.tsx
modified_files:
  - web/src/components/agent/FloatingChat.tsx
  - web/src/test/FloatingChat.test.tsx
priority: medium
type: enhancement
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve the LifeOS floating agent chat so assistant responses render as formatted Markdown and the user can enlarge or shrink the open panel to suit long conversations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Assistant responses render Markdown formatting including emphasis lists and headings
- [x] #2 User messages remain plain text
- [x] #3 The expanded chat panel can be resized by the user within the viewport
- [x] #4 The panel retains usable minimum dimensions and the message area scrolls when content exceeds the selected size
- [x] #5 Frontend tests cover Markdown rendering and panel resize behavior
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Render assistant message content through the existing RenderMarkdown component while leaving user messages as plain text. 2. Add an accessible expand/restore control that toggles the chat panel between its default 600x400 layout and a viewport-bounded large layout; preserve scrolling and mobile constraints. 3. Extend the dedicated FloatingChat tests to verify semantic Markdown output, plain user text, and expand/restore sizing. 4. Run focused frontend tests, formatter/check, and production build.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Assistant bubbles now use the shared RenderMarkdown component with GFM support; user bubbles remain plain text. Added an expand/restore control that toggles between 600x400 and a viewport-bounded 1100px-wide/full-height panel while preserving a scrollable transcript. Focused Biome check passed, all 6 FloatingChat tests passed, and the production web build passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Improved the floating agent chat presentation by rendering assistant responses through the existing ReactMarkdown/remark-gfm renderer and adding an accessible expand/restore control. The enlarged panel remains constrained to the viewport with minimum usable dimensions and scrolling content. User messages remain plain text. Verification: focused Biome check passed, 6/6 FloatingChat tests passed, web production build passed, and git diff check passed.
<!-- SECTION:FINAL_SUMMARY:END -->
