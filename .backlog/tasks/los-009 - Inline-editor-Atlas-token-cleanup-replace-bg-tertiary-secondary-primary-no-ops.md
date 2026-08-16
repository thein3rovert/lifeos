---
id: LOS-009
title: >-
  Inline editor Atlas token cleanup (replace bg-tertiary/secondary/primary
  no-ops)
status: In Progress
assignee:
  - thein3rovert
created_date: '2026-08-16 00:23'
updated_date: '2026-08-16 00:28'
labels: []
dependencies: []
references:
  - web/src/components/agent/InlineCanvasEditor.tsx
  - web/src/global.css
  - doc/atlas-design-guide.md
priority: low
type: enhancement
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The InlineCanvasEditor (`web/src/components/agent/InlineCanvasEditor.tsx`) uses Tailwind classes `bg-tertiary`, `bg-secondary`, and `bg-primary` in its toolbar and content area. These tokens are NOT defined in the project's Tailwind v4 `@theme` block in `web/src/global.css`, so they produce no CSS under Tailwind v4 and render as no-ops (transparent / inheriting parent bg). The LOS-002 footer switcher already uses real Atlas tokens (`bg-raised`, `bg-input`, `bg-hover`); the rest of the editor is inconsistent.

Replace the no-op classes with the correct Atlas token-backed utilities so the editor's toolbar, content background, and button states actually render colors and match the design system documented in `doc/atlas-design-guide.md`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 InlineCanvasEditor toolbar background uses an Atlas token-backed class that renders (e.g. bg-raised, bg-input) instead of bg-tertiary
- [ ] #2 InlineCanvasEditor content area (Preview and Edit modes) uses Atlas token-backed classes that render instead of bg-primary / bg-secondary
- [ ] #3 Edit/Preview toggle button active and inactive states use Atlas token-backed classes (active state currently uses bg-secondary which renders nothing)
- [ ] #4 No remaining bg-tertiary, bg-secondary, or bg-primary usages in InlineCanvasEditor.tsx
- [ ] #5 vite build succeeds and tsc --noEmit is clean for the file
- [ ] #6 biome lint passes for the file
- [ ] #7 Visual spot-check: editor toolbar, content area, buttons all show correct Atlas-consistent colors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## LOS-009 — Inline editor Atlas token cleanup

### Token reference (from `web/src/global.css` @theme)
Real Atlas bg tokens: `bg-base` #0f0f0f, `bg-raised` #0f0f0f, `bg-surface` #000000, `bg-input` #0a0a0a, `bg-tab-active` #171717, `bg-hover` rgba(255,255,255,0.04), `bg-button` #414553, `bg-elevated` #0f0f0f.
Real Atlas text tokens: `text-primary` #ffffff, `text-secondary` #aaaaaa, `text-tertiary` #777777, `text-inverse` #000000 (for white-on-black CTAs).
Real Atlas CTA tokens: `bg-accent-primary` #ededed, `bg-accent-primary-hover` #ffffff.

### Replacements in `web/src/components/agent/InlineCanvasEditor.tsx`

| Element | Current (no-op) | Replacement | Why |
|---------|-----------------|------------|-----|
| Toolbar container (line ~55) | `bg-tertiary` | `bg-raised` | Elevated strip above the card body; matches the footer (LOS-002) |
| Edit/Preview toggle — active state (lines ~60, 71) | `bg-secondary text-primary` | `bg-tab-active text-primary` | `bg-tab-active` is the Atlas token for an active tab/segment |
| Edit/Preview toggle — inactive hover (lines ~62, 73) | `hover:bg-secondary/50` | `hover:bg-hover` | `bg-hover` is the standard Atlas hover token |
| Preview content area (line ~111) | `bg-primary` | `bg-base` | Matches body/page bg — recessed reading surface inside the raised card |
| Edit textarea (line ~117) | `bg-primary` | `bg-base` | Same as preview |
| Save button (line ~92) | `bg-accent text-on-accent hover:bg-accent-hover` | `bg-accent-primary text-inverse hover:bg-accent-primary-hover` | AC #7 says "buttons" must render Atlas-consistent colors. `bg-accent`/`text-on-accent`/`bg-accent-hover` are also no-ops (not in @theme). Atlas primary CTA = near-white bg + black text |
| Close button hover (line ~100) | `hover:bg-secondary` | `hover:bg-hover` | Standard hover token |

### Out of scope
- The wrapping card in `AgentSmartBoard.tsx` (line ~189) also uses `bg-secondary` (no-op). Not in this task's references — flag as known but leave alone unless asked.
- Any other files in the repo using the no-op tokens.

### Verification
- `npx biome lint src/components/agent/InlineCanvasEditor.tsx` — no new errors
- `npx tsc --noEmit` — clean
- `npm run build` — succeeds
- `git grep -nE "bg-tertiary|bg-secondary|bg-primary" -- web/src/components/agent/InlineCanvasEditor.tsx` — no matches (AC #4)
- Visual spot-check by user (AC #7)
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: thein3rovert
created: 2026-08-16 00:28
---
**Implementation done — committing + finalizing.**

Applied 7 token replacements to `InlineCanvasEditor.tsx` (toolbar bg, toggle active/hover, save button, close hover, preview bg, textarea bg). All no-op tokens (`bg-tertiary`/`bg-secondary`/`bg-primary`/`bg-accent`/`text-on-accent`/`bg-accent-hover`) removed.

**Adjustments after first visual review:**
- Save button originally switched to `bg-accent-primary text-inverse hover:bg-accent-primary-hover` (near-white per Atlas guide) — too bright, jarring on dark bg. User flagged it. Reverted to match the app's existing `Button.tsx` primary convention: `bg-highlight text-white hover:bg-highlight-hover` (dark blue-gray `#556483`).
- All hover states originally used `bg-hover` (0.04 alpha) — too subtle to see. Bumped to `bg-active` (0.08 alpha) per user feedback.

**Verification:**
- `git grep` for no-op tokens → no matches (AC #4 ✅)
- `vite build` succeeded (AC #5 ✅)
- `tsc --noEmit` clean for the file (only pre-existing `ScheduleCard.tsx` error) (AC #5 ✅)
- `biome lint` clean for the file (AC #6 ✅)
- User confirmed visual spot-check works ("nice..yes i can see" — Save button no longer pure white, hover states visible) (AC #1-3, #7 ✅)

**Note for plan-of-record:** diverged from the planned Atlas-guide primary CTA pattern to match the app's existing convention in `Button.tsx`. The codebase convention (`bg-highlight text-white hover:bg-highlight-hover`) wins over the guide's recommendation (`bg-accent-primary text-inverse hover:bg-accent-primary-hover`) for consistency.
---
<!-- COMMENTS:END -->
