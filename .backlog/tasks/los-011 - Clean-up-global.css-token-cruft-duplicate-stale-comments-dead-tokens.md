---
id: LOS-011
title: 'Clean up global.css token cruft (duplicate, stale comments, dead tokens)'
status: To Do
assignee: []
created_date: '2026-08-16 00:29'
labels: []
dependencies: []
references:
  - web/src/global.css
  - web/src/features/smartboard/components/SmartBoardPanel.tsx
  - doc/atlas-design-guide.md
priority: low
type: chore
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`web/src/global.css` has accumulated cruft from past token value changes. Three categories of issues:

1. **Duplicate declaration (BUG):** `--color-accent-highlight` is declared twice on consecutive lines (65: `#0070f3` blue, 66: `#414553` dark gray). The second wins silently. Meanwhile its siblings `--color-accent-highlight-hover: #3291ff` (line 67) and `--color-accent-highlight-muted: rgba(0, 112, 243, 0.12)` (line 68) still reference the OLD blue — so checked/hover states flash a blue color from a token that was supposedly migrated to dark gray. The duplication needs to be collapsed to a single value, and the hover/muted siblings updated to match.

2. **Stale commented-out tokens (NOISE):** Many leftover `/*--color-...: ...;*/` lines (lines 53, 61, 81-84, 86-92) from past value tweaks. These obscure intent; `git blame` preserves history so the comments can be removed.

3. **Dead/placeholder tokens:** `--color-bg-surface: #000000` (line 32) has zero usages in `web/src/`. `--color-text-accent: #ffff00` (line 49, pure yellow) is used exactly once — on the `Sparkles` loading icon in `SmartBoardPanel.tsx:119` — and looks like a placeholder color that overlaps with `--color-warning`. Either remove (if truly unused) or replace with a real Atlas status color and update the call site.

This task is a cleanup pass only — no new features. References: `web/src/global.css`, `web/src/features/smartboard/components/SmartBoardPanel.tsx`, `doc/atlas-design-guide.md`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Duplicate --color-accent-highlight declaration (lines 65-66) is resolved — a single value remains and the hover/muted siblings (--color-accent-highlight-hover, --color-accent-highlight-muted) are updated to match, so checked/hover states don't flash a stale blue
- [ ] #2 All stale commented-out token lines are removed (lines 53, 61, 81-84, 86-92 — the /*--color-*: ...;*/ leftovers). git blame preserves history
- [ ] #3 --color-text-accent (#ffff00) either removed (if unused) or replaced with a real status color (e.g. warning) and the single usage in SmartBoardPanel.tsx updated to match
- [ ] #4 --color-bg-surface (#000000, pure black) is removed if still unused, OR repurposed with a documented intent (zero usages today)
- [ ] #5 No behavior regression: select option:checked, atlas-input:focus, and the Sparkles icon in SmartBoardPanel.tsx still render sensible colors after the cleanup
- [ ] #6 vite build succeeds and tsc --noEmit is clean for affected files
- [ ] #7 biome lint passes for affected files
- [ ] #8 Visual spot-check by user: checkbox/checked states in selects, focus ring on inputs, and the SmartBoardPanel loading icon all look correct
<!-- AC:END -->
