---
id: LOS-002
title: 'Move the urgent, important and not important to the rendered display below'
status: Done
assignee:
  - thein3rovert
created_date: '2026-08-01 20:15'
updated_date: '2026-08-16 00:20'
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
- [x] #1 State-switch control renders at the bottom (footer) of the InlineCanvasEditor rendered display for things-to-remember and suggestions items
- [x] #2 Editor footer uses a CategoryMenu dropdown to switch state
- [x] #3 Control shows a Badge of the current state (urgent/important/not-important for things-to-remember; active/completed/dismissed for suggestions)
- [x] #4 Switching state fires PATCH /api/smartboard/item/{itemId} with the correct panelType and new state, and the editor stays open after the switch
- [x] #5 Achievements and Blockers panels (no state) do not render the state-switch control in the editor
- [x] #6 State options are sourced from a single shared module (no duplication between card menu and editor control)
- [x] #7 State change re-fetches panel data and toasts success/error (reuses useSmartBoardPanel.updateItemStatus)
- [x] #8 New control uses Atlas token-backed classes (bg-raised/bg-input/bg-hover/border-default) so colors actually render
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation notes (finalization)

**What was built:** Inline state switcher in the `InlineCanvasEditor` footer. The user opens a card from the Things-to-Remember or Suggestions panel, reads its full content in the rendered display, and switches state from a dropdown in the editor footer — without going back to the card. The editor stays open after each switch so the user can switch again.

**Final approach (after mid-stream design change):**
- State options live in `web/src/features/smartboard/constants.ts` (single source of truth, keyed by PanelType). Only `things-to-remember` and `suggestions` have entries; `achievements` and `blockers` are stateless and return `undefined` from `getStateOptions`, so the editor renders without the switcher for those panels.
- `InlineCanvasEditor` got three optional props: `stateOptions`, `currentState`, `onChangeState`. When all three are provided, the footer renders a `CategoryMenu` dropdown with a trigger composed of a colored `Badge` (current state) + `ChevronDown`. Footer `bg-tertiary` → `bg-raised` (token-backed Atlas class that actually renders under Tailwind v4).
- `AgentSmartBoard` derives `editorStateOptions` and `editorCurrentState` from `editorContext` + the matching panel's data, and dispatches `handleChangeState(newState)` to the existing panel hook's `updateItemStatus`. The hook already does `PATCH /api/smartboard/item/{itemId}` + re-fetch + toast.
- Cards in `ThingsToRememberPanel` and `SuggestionsPanel` no longer wrap each `SmartBoardItemCard` in a `CategoryMenu` — they show the same `Badge` + dot indicator but clicking opens the editor. The old `onChangeCategory` / `onChangeStatus` panel props and `handleChangeCategory` / `handleChangeSuggestionStatus` handlers in `AgentSmartBoard` were removed as dead code.

**Why the card dropdown was removed (mid-stream):** Originally Phase 1 hoisted the option arrays so the card dropdown and the editor dropdown could share them. After live testing, the user decided the card dropdown was redundant — the whole point of the feature is to read full content first, then switch state from the editor. Keeping the dropdown on the card defeated that intent. So the card-dropdown was removed and the editor footer dropdown became the singular state-change path.

**Backend:** no changes. The existing `PATCH /api/smartboard/item/{itemId}` with `{ panelType, status }` already handled both `things-to-remember` (sets `category`) and `suggestions` (sets `status`) via the `UpdateItemStatus` handler and the store method in `server/internal/store/smartboard.go`.

**Styling note for future work:** `InlineCanvasEditor` still uses `bg-tertiary` / `bg-secondary` / `bg-primary` in the toolbar and content area — these tokens are NOT defined in `global.css` `@theme` and render as no-ops under Tailwind v4. Out of scope for this task; flagged for a future Atlas-consistency pass.

**Verification evidence:**
- `vite build` succeeded (527ms)
- `tsc --noEmit` clean for all touched files (only pre-existing `ScheduleCard.tsx` error remains, untouched)
- `biome lint` clean for touched files (fixed 2 self-introduced `noNonNullAssertion` errors during finalization by switching `!` → `?? []`)
- Live PATCH smoke test against item `e83d12be6d7d71e8` via curl: `urgent` → `important` → restored to `urgent`; HTTP 200 + `smartboard_panels.data` JSON mutated and confirmed via sqlite queries
- User live smoke test in browser: confirmed footer dropdown appears, switches state, toasts, editor stays open, badge updates; clicked an Achievement/Blocker card and confirmed no switcher in editor footer

**Follow-ups (not started — ask user before creating tasks):**
- Inline editor Atlas token cleanup (replace `bg-tertiary`/`bg-secondary`/`bg-primary` no-ops in `InlineCanvasEditor.tsx` with real tokens)
- Persist editor state across page navigation (currently the editor closes on navigation)
<!-- SECTION:NOTES:END -->

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

author: thein3rovert
created: 2026-08-16 00:20
---
**Design change mid-finalization (user request):** Removed the CategoryMenu dropdown from the panel cards. The cards now show only the colored Badge + dot indicator (no inline state-switcher on the card). State changes now happen **exclusively** via the editor footer dropdown — which is the point of this task (read full content first, then switch state).

**Files:**
- `ThingsToRememberPanel.tsx` — unwrapped `CategoryMenu`, renders `SmartBoardItemCard` directly. Removed `onChangeCategory` prop + `CategoryMenu`/`getStateOptions` imports.
- `SuggestionsPanel.tsx` — same treatment (removed `onChangeStatus` prop).
- `AgentSmartBoard.tsx` — removed dead `handleChangeCategory` + `handleChangeSuggestionStatus` handlers and their prop wiring. `handleChangeState` (the editor footer dispatcher) is now the singular state-change path.

**AC #2 revised:** "Editor footer uses a CategoryMenu dropdown to switch state" — no longer references the card since the dropdown no longer lives on the card. (Old wording implied parity with the card dropdown, which no longer applies.)

**Verification:** user confirmed via live smoke test ("it works fine now"). `tsc` clean, lint clean, `vite build` succeeded.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Summary

Adds inline state-switching to the **rendered display** of Smart Board items. Users can now read a card's full content and switch its state from a dropdown in the editor footer, without navigating back to the panel card.

### What changed

**New file:**
- `web/src/features/smartboard/constants.ts` — `STATE_OPTIONS`, `STATEFUL_PANELS`, `getStateOptions()`, `formatStateLabel()`. Single source of truth for panel state options keyed by `PanelType`. Only `things-to-remember` and `suggestions` have entries; `achievements`/`blockers` are stateless.

**`web/src/components/agent/InlineCanvasEditor.tsx`** — three new optional props (`stateOptions`, `currentState`, `onChangeState`). When all three are present, the footer renders a `CategoryMenu` dropdown with a trigger composed of a colored `Badge` (current state) + `ChevronDown`. Footer background switched from the non-rendering `bg-tertiary` no-op to the Atlas token `bg-raised`. Editor is panel-agnostic: omitted props → no switcher (achievements/blockers unaffected).

**`web/src/components/agent/AgentSmartBoard.tsx`** — derives `editorStateOptions` and `editorCurrentState` from `editorContext` plus the matching panel's data; dispatches `handleChangeState(newState)` to the existing panel hook's `updateItemStatus` (which already does `PATCH /api/smartboard/item/{itemId}` + re-fetch + toast). Removed dead `handleChangeCategory` / `handleChangeSuggestionStatus` handlers and their prop wiring.

**Panel components** (`ThingsToRememberPanel.tsx`, `SuggestionsPanel.tsx`) — unwrapped the `CategoryMenu` so each `SmartBoardItemCard` renders directly with its `Badge` + dot indicator. Clicking opens the editor (where state is now switched). Removed now-unused `onChangeCategory` / `onChangeStatus` props + imports.

**`web/src/components/ui/Badge.tsx`** — exported `BadgeProps` type so the editor can derive the `BadgeVariant` union.

### Backend
No changes — the existing `PATCH /api/smartboard/item/{itemId}` with `{ panelType, status }` already handled both `things-to-remember` (sets `category`) and `suggestions` (sets `status`).

### Design decision mid-stream
Originally Phase 1 hoisted option arrays so the card dropdown and the editor dropdown could share them. After live testing, the user decided the card dropdown was redundant with the editor dropdown — that was the point of the feature (read full content, then switch). The card dropdown was removed; the editor footer dropdown is now the singular state-change path.

### Tests / verification
- `vite build` succeeded (~527ms)
- `tsc --noEmit` clean for all touched files (only pre-existing unresolved `ScheduleCard.tsx` warning)
- `biome lint` clean for touched files (fixed 2 self-introduced `noNonNullAssertion` errors during finalization)
- Live `curl` PATCH smoke test against item `e83d12be6d7d71e8`: `urgent` → `important` → restored to `urgent`; HTTP 200; `smartboard_panels.data` JSON mutated and confirmed via sqlite queries
- User live UI smoke test: footer dropdown appears, switches state, toasts, editor stays open, badge updates; Achievement/Blocker editor shows no switcher in footer

### Known follow-ups (not started)
- Inline editor Atlas token cleanup (replace remaining `bg-tertiary` / `bg-secondary` / `bg-primary` no-ops in `InlineCanvasEditor.tsx` toolbar and content area)
- Persist editor state across page navigation
<!-- SECTION:FINAL_SUMMARY:END -->
