---
id: LOS-010
title: Persist InlineCanvasEditor state across page navigation
status: Done
assignee:
  - thein3rovert
created_date: '2026-08-16 00:23'
updated_date: '2026-08-16 00:38'
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
- [x] #1 Open the editor on a /agent card, navigate to another route, return to /agent → editor is still open with the same content, title, panelType, and itemId
- [x] #2 Switching state from the editor footer (LOS-002), navigating away, and returning preserves the new state in the editor
- [x] #3 Closing the editor persists (navigating away after closing returns to a closed editor, not a stale open one)
- [x] #4 Hard refresh on /agent restores the editor to its last-open state, OR a documented decision that hard refresh intentionally resets (with reasoning)
- [x] #5 No regressions to existing editor open/close/save behavior
- [x] #6 vite build succeeds and tsc --noEmit is clean for affected files
- [x] #7 biome lint passes for affected files
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## LOS-010 — Persist InlineCanvasEditor state across navigation

### Research findings (key facts)
- **Stack:** plain `useState`, TanStack Router v1 (`@tanstack/react-router ^1.168.23`). No Zustand/Redux/Context/TanStack Query/useSyncExternalStore anywhere in the codebase.
- **Existing router-state precedent:** `/skills/` route uses `validateSearch` (zod) + `loaderDeps` + `Route.useNavigate()` + `navigate({ search })` (`web/src/routes/skills/index.tsx` lines 20-30, 64, 137). Only such usage.
- **Existing browser-storage convention:** `web/src/lib/cache.ts` — SSR-safe `sessionStorage` wrapper with `lifeos:cache:` prefix, 5-min TTL, `typeof window` guards. No `useLocalStorage` / `usePersistentState` hook exists.
- **Shell persists, route unmounts:** `RootDocument.tsx` (shell + Sidebar) stays mounted across all navigation; `AgentSmartBoard` (the `/agent/` route's `component`) unmounts → its 4 `useState`s and the `InlineCanvasEditor` child all die.
- **Editor state in `AgentSmartBoard.tsx`:** `editorOpen` (L35), `editorContent` (L36), `editorTitle` (L37), `editorContext { panelType, itemId }` (L38-41). Setters called at L45-48, 57-60, 64-67, 71-74 (the 4 edit handlers), L123 (save close), L211 (editor onClose).
- **Critical gotcha:** `InlineCanvasEditor.tsx:40` holds an internal `content` draft via `useState(initialContent)` — this is the user's unsaved working copy. Parent's `editorContent` is the *original* content at open time, never updates as the user types. To preserve unsaved edits across navigation, the draft must be persisted too (separately or by hoisting to a controlled prop).
- **`stateOptions` / `currentState` / `onChangeState` (LOS-002 additions):** no persistence needed. `currentState` re-derives reactively from `editorContext.itemId` + the panel re-fetch on remount.

### Candidate approaches (ranked)
A. **URL search params** (mirror `/skills/`) for `{ editorOpen, panelType, itemId, editorTitle }` + **`sessionStorage` for the unsaved draft** keyed by `itemId`. Survives hard refresh, deep-linkable, but URL carries selectors; need `navigate({ replace: true })` to avoid cluttering history. Best fit to existing precedent.
B. **`usePersistentState` hook** (new tiny hook mirroring `lib/cache.ts` style, drop the TTL). Line-for-line swap of the 4 `useState`s in `AgentSmartBoard`. Smallest diff. Not deep-linkable; hard refresh survives within the browser session (or use `localStorage` for cross-session).
C. **React Context provider mounted in `RootDocument`.** Introduces `createContext` (currently 0 in repo) — a brand-new convention, and scope-mismatched (app-wide shell holding a single-route feature's state).
D. **`useSyncExternalStore` module store.** Introduces two new patterns not used anywhere. Also SSR-leak risk.
E. **Route `loader` sourcing from server.** No single-item GET endpoint exists, and still loses unsaved drafts. Over-engineered for this feature.

### Recommended: B (`usePersistentState` hook)
**Why B over A:** user confirmed via the prior LOS-002 + LOS-009 conversations that they prefer the smallest, codebase-consistent changes with no surprise conventions. Approach A's URL-with-search-params puts state in the URL bar (the user didn't ask for deep-linkable editor URLs), risks producing many Back-stack entries if `replace:` is forgotten, and still requires sessionStorage for the draft anyway — so the gains over B come at UX and complexity costs the user didn't request. B is the smallest diff that reuses the only in-repo storage convention (`lib/cache.ts` style).

B also answers AC #4 cleanly: **sessionStorage survives hard refresh within the tab** (browsers retain sessionStorage across F5). If you want cross-session/tab-close survival, swap to `localStorage` — one-line change in the hook.

### Implementation plan (Approach B)

1. **New hook:** `web/src/hooks/usePersistentState.ts`
   - Generic `function usePersistentState<T>(key: string, defaultValue: T): [T, (v: T | ((prev: T) => T)) => void]`
   - Mirrors `lib/cache.ts` SSR guard (`typeof window === 'undefined'`) so it no-ops on server and hydrates client-side.
   - Uses `sessionStorage` by default (matches `lib/cache.ts` precedent). Keep key prefix `lifeos:editor:` to namespace editor-session keys.
   - Reads on initial mount only (no SSR hydration mismatch — initial state is always `localStorage.getItem` value since the hook resolves during `useState` initializer, but since SSR returns the default, the client must not render persist-dependent UI until mounted). Simpler: accept a tiny client-supplied initial render that uses the default, then re-syncs on mount via `useEffect`. (Industry standard: `useState(default)` + `useEffect` to hydrate.)

   Actually simplest + cleanest: use `useState(() => readStorage(key, default))` and a `useEffect` that writes on every change. Guard the read with `typeof window === 'undefined' ? default : ...`. SSR renders the default; client `useState` initializer runs *after* hydration so it reads the real value — no mismatch.

2. **Refactor `AgentSmartBoard.tsx`:**
   - Import `usePersistentState`.
   - Replace `useState(false)` on `editorOpen` → `usePersistentState('lifeos:editor:open', false)`.
   - Replace `useState('')` on `editorContent` → `usePersistentState('lifeos:editor:content', '')`.
   - Replace `useState('')` on `editorTitle` → `usePersistentState('lifeos:editor:title', '')`.
   - Replace `useState<editorContextType | null>(null)` on `editorContext` → `usePersistentState<editorContextType | null>('lifeos:editor:context', null)`.
   - All existing callsites of the setters (L45-48, 57-60, 64-67, 71-74, 123, 211) continue to work unchanged because the new setter accepts the same signature.

3. **Persist the unsaved draft (the gotcha):**
   - **Option B-i (chosen):** In `InlineCanvasEditor.tsx`, lift the draft to the parent by making `content` a controlled prop. Parent's `editorContent` becomes the draft; `InlineCanvasEditor` calls `onContentChange(newContent)` whenever the textarea changes (rename `content` state to parent-controlled).
     - Trade-off: small API change on `InlineCanvasEditor` (adds `onContentChange`, deprecates internal `useState(content)`). Touches one component.
   - Alternative B-ii (rejected): Keep child uncontrolled but persist its draft in sessionStorage keyed by `itemId` internally — leaks storage knowledge into the child, and the child doesn't know `itemId` cleanly (would need a new prop).
   - Going with B-i means: parent's `editorContent` (already going to be persisted) IS the draft. `InlineCanvasEditor`'s existing `useEffect(() => setContent(initialContent), [initialContent])` (L44-46) becomes redundant because content comes from props. `handleSave` becomes `onSave(content)` using the controlled content from props. Net change to `InlineCanvasEditor`: remove internal `useState(content)` + the useEffect; `handleSave` uses the prop instead of state. Add `onContentChange(newContent: string)` prop.
   - This means any typing in the textarea updates the parent's persisted `editorContent` live — so the parent's React state gets hit on every keystroke. That's fine for a small editor; for a large one you'd debounce the sessionStorage write. Keep it simple here; flag as known.

4. **SSR hydration:** `usePersistentState` returns the default during SSR and hydrates to the stored value on client initial render — the `useState(() => readStorage(...))` initializer pattern means the *client* reads the real value in its initializer (which runs after hydration), so no mismatch warning. Confirmed safe.

5. **Handle "close" persistence (AC #3):** `onClose={() => setEditorOpen(false)}` (L211) already sets `editorOpen=false`. Since `editorOpen` is now persisted, navigating away while closed also writes `false` to storage. Returning to `/agent/` reads `false` → editor stays closed. But: the `editorContent` / `editorContext` are NOT cleared on close, so reopening via a card click overwrites them anyway. (Could optionally clear the rest on close for cleanliness — flag for user.)

6. **Verification:**
   - Open a card → type unsaved edits in textarea → nav to `/skills/` → nav back → editor still open, textarea content preserved, state switcher footer visible
   - Switch state from footer → nav away → nav back → editor still open, state badge updated (panel data re-fetched on remount)
   - Close editor → nav away → nav back → editor closed (not stale)
   - Hard refresh on `/agent/` while editor open → editor restores (sessionStorage survives F5)
   - `vite build` succeeds; `tsc --noEmit` clean; `biome lint` clean

### Open decision (needs your call before I build)
- **Storage backend:** `sessionStorage` (survives nav + F5 within the tab; dies on tab close — matches `lib/cache.ts` precedent) **vs** `localStorage` (also survives tab close/reopen). I recommend `sessionStorage` — editor session is transient, not a permanent UI.
- **Clear `editorContent`/`editorContext` on explicit close (the X button):** keep them (reopening via card overwrites) **vs** clear them (cleaner state, no stale draft lingering in storage). I recommend clearing on explicit close — semantically a "close" means "I'm done with this draft" (unless we want "Closed, reopen restores draft"). Worth your call: do you want to be able to close the editor and reopen it via a button to restore the draft, or is "close = discard"?

### Out of scope
- Deep-linkable editor URLs (Approach A) — not requested.
- Cross-session/tab persistence — only if you choose `localStorage`.
- Server-side loader pattern — no single-item endpoint exists; not worth adding one for this.

### Notes for future agent
- The `usePersistentState` hook is a NEW convention introduced by this task — the first persistent-state hook in the repo. It mirrors `lib/cache.ts`'s `sessionStorage` style. Future tasks needing cross-route state persistence should reuse it.
- `InlineCanvasEditor` becomes a **controlled** component after this task (content prop drives the textarea). Future changes to the editor that need to mutate content must go through `onContentChange`.

## Decisions (locked)

- **Storage:** `sessionStorage` (my default, not objected). Survives nav + F5 within tab; dies on tab close — matches `lib/cache.ts` convention.

- **Close behavior (option a):** discard. Closing the editor clears `editorContent`, `editorTitle`, and `editorContext` from storage. Reopening requires clicking a card again.

## SSR hydration note

TanStack Start SSR is on (routeTree.gen.ts `ssr: true`). The hydrate-via-useEffect pattern means the editor will render closed (placeholder) for one frame on remount, then flip to open via a `useEffect`. Tiny flash; acceptable for Low priority. Future follow-up if flicker is bothersome: skip SSR on /agent or add a NotRendered gate.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: thein3rovert
created: 2026-08-16 00:36
---
**Implementation done.** Approach B (usePersistentState hook + sessionStorage + close=discard).

**Files:**
- `web/src/hooks/usePersistentState.ts` (new) — generic hook mirroring state to sessionStorage, SSR-safe.
- `web/src/components/agent/InlineCanvasEditor.tsx` — now controlled: content prop drives textarea, onContentChange prop, onSave no longer takes content arg.
- `web/src/components/agent/AgentSmartBoard.tsx` — 4 useState -> usePersistentState; new handleCloseEditor that discards the draft (clears content/title/context); onSave reads editorContent directly.

**Decisions:** sessionStorage (survives nav + F5 in tab); close = clear all 4 fields (option a).

**Verification:** tsc clean, biome lint clean, vite build ok. Needs user browser smoke test for ACs #1-#5.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Summary

Persist the InlineCanvasEditor's open state, content draft, title, and context across navigation away from `/agent` and back (and across same-tab hard refresh). Before this, navigating away from `/agent` lost all editor state and unsaved drafts.

### What changed

**New file:** `web/src/hooks/usePersistentState.ts` — generic hook mirroring `useState` but persisting value to `sessionStorage`. SSR-safe via `typeof window` guards; hydrates from storage in a mount `useEffect` so server and client render the same initial markup. Mirrors the existing `lib/cache.ts` sessionStorage convention. First persistent-state hook in the repo.

**`web/src/components/agent/InlineCanvasEditor.tsx`** — became a **controlled** component:
- Removed internal `useState(content)` and the `useEffect` that synced it with the prop
- `content` prop now drives the textarea value, preview, and char count directly
- New required `onContentChange` prop fires on textarea change
- `onSave` no longer takes a `content` arg — the parent owns the draft and reads it from state

**`web/src/components/agent/AgentSmartBoard.tsx`**:
- Swapped the 4 `useState` calls → `usePersistentState('lifeos:editor:<field>', default)` for `editorOpen`, `editorContent`, `editorTitle`, `editorContext`
- `handleSaveEdit` reads `editorContent` from state instead of an arg
- New `handleCloseEditor` — **close = discard** (clears all 4 fields: `editorOpen=false`, `editorContent=''`, `editorTitle=''`, `editorContext=null`). Wired to `InlineCanvasEditor`'s `onClose`.
- Wired `onContentChange={setEditorContent}` to the editor.

### Design decisions
- **Approach B (`usePersistentState` hook)** over URL search params — smallest diff, reuses the only in-repo storage convention (`lib/cache.ts`), no URL pollution.
- **sessionStorage** over localStorage — editor session is transient (survives nav + F5 within tab, dies on tab close).
- **Close = discard (option a)** — clicking the X clears all persisted fields so no stale draft lingers.
- **Controlled editor** — `InlineCanvasEditor` no longer holds an internal draft; parent owns it via `editorContent` so the draft is persisted too (otherwise persisted `editorContent` would hold the original content, not unsaved edits).

### Verification
- `tsc --noEmit` clean for all 3 touched files (only pre-existing `ScheduleCard.tsx` error remains)
- `biome lint` clean (resolved 1 self-introduced `useExhaustiveDependencies` error by adding `defaultValue` to the hydrate effect's dep array)
- `vite build` succeeded (~509ms)
- User live browser smoke test passed: nav away + back preserves editor + draft + footer switcher; close persists (no stale open); F5 restores editor.

### Known follow-up (not started)
- One-frame flash on remount where placeholder shows before hydrate effect runs (SSR-safe; documented in hook comment). Future fix: skip SSR on `/agent` or add a NotRendered gate.
- Keystrokes update the parent's persisted `editorContent` on every change — fine for a small editor; for large content, debounce the sessionStorage write.
<!-- SECTION:FINAL_SUMMARY:END -->
