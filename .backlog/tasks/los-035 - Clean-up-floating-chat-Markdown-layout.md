---
id: LOS-035
title: Clean up floating-chat Markdown layout
status: Done
assignee:
  - '@thein3rovert'
created_date: '2026-09-27 10:24'
updated_date: '2026-09-27 10:45'
labels: []
dependencies: []
priority: medium
type: bug
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Assistant answers render Markdown but spacing, typography and code/table wrapping look wrong inside narrow chat bubbles. Make Markdown readable without changing rendering elsewhere.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Assistant paragraphs, lists, headings, code and tables are readable in normal and expanded chat sizes
- [x] #2 User messages remain plain text and long content does not overflow the bubble
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Scope chat-specific Markdown styles to assistant bubble so global Markdown views stay unchanged. 2. Remove pre-wrap and fixed typography conflicts in assistant bubbles; handle narrow code/tables and long content. 3. Add focused web test and run Vitest + typecheck.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Used chat-only Markdown variant and removed whitespace-pre-wrap from assistant bubbles; tested headings, lists, fenced code, tables and plain user messages via FloatingChat DOM tests. Web suite: 52/52 passing; Biome check passes. Global tsc still reports two pre-existing errors in AgentChatPage.tsx and ScheduleCard.tsx.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Scoped Markdown spacing and wrapping to assistant bubbles without changing other renderers; user text remains plain. Verified with DOM tests for headings/lists/code/tables and full 52-test web suite; Biome passes.
<!-- SECTION:FINAL_SUMMARY:END -->
