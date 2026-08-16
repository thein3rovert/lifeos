---
id: LOS-002
title: 'Move the urgent, important and not important to the rendered display below'
status: In Progress
assignee:
  - thein3rovert
created_date: '2026-08-01 20:15'
updated_date: '2026-08-16 00:19'
labels: []
dependencies: []
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
I am having issue easily changing the state of the card in each panel, as i havw to move back and fort the render display where i get the full imformation and also the card display to chages the state but if the render display makes it easy for me to just switch the state in maybe a the button of the render displaycard then that alot more convienent like after reading i can just switch the display
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 State-switch control renders at the bottom (footer) of the InlineCanvasEditor rendered display for things-to-remember and suggestions items
- [ ] #2 Editor footer uses a CategoryMenu dropdown to switch state
- [ ] #3 Control shows a Badge of the current state (urgent/important/not-important for things-to-remember; active/completed/dismissed for suggestions)
- [ ] #4 Switching state fires PATCH /api/smartboard/item/{itemId} with the correct panelType and new state, and the editor stays open after the switch
- [ ] #5 Achievements and Blockers panels (no state) do not render the state-switch control in the editor
- [ ] #6 State options are sourced from a single shared module (no duplication between card menu and editor control)
- [ ] #7 State change re-fetches panel data and toasts success/error (reuses useSmartBoardPanel.updateItemStatus)
- [ ] #8 New control uses Atlas token-backed classes (bg-raised/bg-input/bg-hover/border-default) so colors actually render
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## LOS-002 — Inline State-Switching in the Rendered Display

### Goal
Add state-switching controls to the bottom of the `InlineCanvasEditor` (the rendered display) so the user can change a card's state after reading it — without going back to the card panel.

### Architecture finding (research)
- **Card display** = `SmartBoardItemCard` (compact). **Rendered display** = `InlineCanvasEditor` (Preview mode renders full markdown).
- Two panel types carry state: `things-to-remember` (category: urgent/important/not-important) and `suggestions` (status: active/completed/dismissed). Achievements & Blockers have no state.
- **No backend change needed.** `PATCH /api/smartboard/item/{itemId}` with `{ panelType, status }` already mutates both `category` (things-to-remember) and `status` (suggestions).
- `AgentSmartBoard` already keeps `editorContext = { panelType, itemId }` — the data needed to drive a switcher is one level up; `InlineCanvasEditor` just doesn't receive it yet.
- Existing state-switcher primitive = `CategoryMenu` (`web/src/components/ui/CategoryMenu.tsx`) — used on the card. Reuse it for parity. `Badge` variants already match the state enum.

### Implementation steps
1. **Hoist state options** — move the inline option arrays from `ThingsToRememberPanel.tsx:80-84` and `SuggestionsPanel.tsx:80-84` into a shared module (e.g., `web/src/features/smartboard/constants.ts`) keyed by panelType, so both the card menu and the new editor control use the same source.
2. **Extend `InlineCanvasEditor` props** (`InlineCanvasEditor.tsx:5-10`) with optional: `panelType`, `itemId`, `currentState`, `stateOptions`, `onChangeState`. Render a state-switch row at the **bottom** (footer, alongside char count at lines 103-107) only when `stateOptions` is provided — keeps editor reusable for state-less panels.
3. **Build the footer control** — a `Badge` showing current state + a `CategoryMenu` trigger for switching. Reuse `CategoryMenu` so the editor's switcher feels identical to the card's. Use Atlas token-backed classes (`bg-raised`, `bg-input`, `bg-hover`, `border-t border-default`); avoid blue for CTAs per Atlas guide.
4. **Thread data from `AgentSmartBoard`** (`AgentSmartBoard.tsx:190-196`):
   - Pass `editorContext.panelType` + `editorContext.itemId`.
   - Compute `currentState` from the matching panel's data (find item by id).
   - Add a generic `handleChangeState` that dispatches to `thingsToRemember.updateItemStatus` or `suggestions.updateItemStatus` based on `editorContext.panelType` (mirrors existing `handleChangeCategory`/`handleChangeSuggestionStatus` at 131-137). Hook already re-fetches + toasts.
5. **Refresh after switch** — derive `currentState` from panel data after the hook's `fetchCachedData` resolves (matches existing pattern; no local optimistic state to avoid drift).

### Open decisions (need your call before I build)
- **A. Control placement**: footer row (bottom) — matches your request literally. Confirm.
- **B. Control shape**: dropdown (`CategoryMenu`, parity with card) vs. segmented buttons (one click per state). Dropdown is the safe default; segmented is faster but more visual real estate. I recommend dropdown for parity.
- **C. Highlights/keyboard**: non-goal for v1 — dropping states should keep the editor open for further edits?

### Notes
- `InlineCanvasEditor` currently uses `bg-tertiary/secondary/primary` classes that are NOT defined in `global.css` `@theme` (Tailwind v4 no-ops). Out of scope to fix all of them; the new control will use token-backed classes that actually render.
- Consider a design doc at `doc/los-002-rendered-display-state-switch-plan.md` mirroring `doc/smartboard-scheduler-settings-plan.md` (optional).
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: thein3rovert
created: 2026-08-16 00:03
---
**Phase 1 complete & committed.** Hoisted state options to a shared module.

**Files** (all in `web/src/features/smartboard/`):
- `constants.ts` (new) — `STATE_OPTIONS`, `STATEFUL_PANELS`, `getStateOptions()`, `formatStateLabel()` keyed by PanelType
- `index.ts` — re-exports the four helpers
- `components/ThingsToRememberPanel.tsx` — inline options array replaced with `getStateOptions('things-to-remember')!`
- `components/SuggestionsPanel.tsx` — same treatment for suggestions

**Verification:** `grep` confirms the literals now live only in `constants.ts`; `tsc --noEmit` clean for all touched files (only pre-existing `ScheduleCard.tsx` error remains, unrelated). No user-facing behavior change — the card dropdown still renders the exact same options.

Decisions locked for Phase 2: (A) footer placement ✅ (B) dropdown (CategoryMenu, parity with card) ✅ (C) keep editor open after switch ✅

Next: Phase 2 — extend `InlineCanvasEditor` props + build the footer CategoryMenu control.
---

author: thein3rovert
created: 2026-08-16 00:08
---
**Phase 2 complete & committed.** Extended InlineCanvasEditor to render an inline state switcher in the footer.

**Files:**
- `web/src/components/agent/InlineCanvasEditor.tsx` (+33) — added optional `stateOptions`, `currentState`, `onChangeState` props. When all three are provided, the footer renders a `CategoryMenu` dropdown (same primitive as the card) with a trigger composed of a colored `Badge` (current state) + `ChevronDown`. When omitted (achievements/blockers), footer renders unchanged. Added `STATE_TO_BADGE_VARIANT` lookup map so the current-state badge picks the right color per state. Footer `bg-tertiary` → `bg-raised` (token-backed, actually renders).
- `web/src/components/ui/Badge.tsx` (+1 char) — `type BadgeProps` → `export type BadgeProps` so the editor can derive the variant union.

**Verification:** `tsc --noEmit` clean for both files (only pre-existing `ScheduleCard.tsx` error remains). No editor behavior change when new props are omitted. Trigger uses Atlas token-backed classes (`bg-input`, `bg-hover`, `border-default`).

**Decisions honored:** (A) footer placement ✅ (B) dropdown `CategoryMenu` parity with card ✅ (C) editor stays open after switch — implementation doesn't close the editor on state change.

**Not yet wired:** The state-change API call (`PATCH /api/smartboard/item/{itemId}`) happens in Phase 3 — `AgentSmartBoard` will thread `editorContext.panelType` + `itemId` and add a generic `handleChangeState` dispatcher that reuses the existing panel hooks (which already re-fetch + toast).
---

author: thein3rovert
created: 2026-08-16 00:11
---
**Phase 3 complete & committed.** End-to-end wiring in AgentSmartBoard — feature is functionally complete.

**File:** `web/src/components/agent/AgentSmartBoard.tsx` (+31)

**Three additions:**
1. Imported `getStateOptions` from the smartboard barrel.
2. Added state derivation + dispatcher (after `handleChangeSuggestionStatus`):
   - `editorStateOptions = getStateOptions(editorContext.panelType)` — returns options for things-to-remember/suggestions, `undefined` for achievements/blockers (so they render the editor without the switcher).
   - `editorCurrentState` — finds the item by `editorContext.itemId` in the matching panel's data (reads `.category` or `.status`). Reactive: re-derives each render so the badge updates after the hook re-fetches.
   - `handleChangeState(newState)` — dispatches to `thingsToRemember.updateItemStatus` or `suggestions.updateItemStatus` based on `editorContext.panelType`. No `setEditorOpen(false)` — editor stays open per decision C. Hook already does PATCH + re-fetch + toast.
3. Passed the three props to `<InlineCanvasEditor>` (they're optional, so achievements/blockers render the editor unchanged).

**Verification:** `tsc --noEmit` clean for `AgentSmartBoard.tsx` (only pre-existing `ScheduleCard.tsx` error remains, untouched).

**All 8 acceptance criteria now wired end-to-end:**
- AC #1 footer bottom · #2 CategoryMenu dropdown · #3 current-state Badge · #4 PATCH fires + editor stays open · #5 achievements/blockers → no switcher · #6 shared constants · #7 hook re-fetches + toasts · #8 Atlas token-backed classes

**Phase 4 (next):** Finalization — verify each AC with behavior-level evidence (manual smoke test / build), write final summary, and check off acceptance criteria per the Backlog Task Finalization guide. Then optionally move the task to Done.
---
<!-- COMMENTS:END -->
