# Frontend Best-Practices Improvement Plan

**Project:** LifeOS Web (`/web`)  
**Date:** 2026-06-14  
**Goal:** Improve the React frontend to follow modern best practices, one area at a time.

---

## Current State Summary

The frontend is built on a strong modern stack:

- React 19 + TanStack Router/Start + TanStack Query-adjacent patterns
- Tailwind CSS v4 with a custom Atlas design system
- Vite 8 + TypeScript (strict mode enabled)
- File-based routing, centralized API client, custom hooks, loading skeletons, toasts

The codebase is organized and functional, but has maintainability, consistency, and quality gaps that should be addressed incrementally.

---

## Already Done Well

- Strict TypeScript configuration (`strict: true`, `noUnusedLocals`, etc.)
- Path aliases (`#/*` and `@/*`)
- Centralized API client in `src/lib/api.ts`
- Domain hooks: `useSkills`, `useNotes`, `useSync`, `useApi`
- Design tokens in `src/global.css`
- Runtime API URL resolution in `src/lib/apiUrl.ts`
- Loading skeletons and toast notifications

---

## Improvement Areas (Step-by-Step)

### Step 1 — Add Linting and Formatting
**Why first:** Automates bug-catching and makes every later step easier.  
**Files:** root of `web/`  
**Actions:**
- Add ESLint 9 (flat config) with TypeScript, React, and React Hooks plugins.
- Add Prettier (or Biome) for formatting.
- Add `lint`, `lint:fix`, and `format` scripts to `package.json`.
- Run the first pass and fix all auto-fixable issues.

---

### Step 2 — Add Tests
**Why:** Vitest is installed but unused.  
**Files:** `package.json`, new `*.test.tsx` files  
**Actions:**
- Configure `@testing-library/react` + `jsdom` (already installed).
- Add a test for `DataTable`, `Skeleton`, and one hook (`useApi`).
- Add a `test:watch` script and a CI-friendly `test` script.

---

### Step 3 — Unify Data-Fetching Patterns
**Why:** Mixed patterns make the app harder to reason about and test.  
**Files:** `src/routes/index.tsx`, `src/hooks/useSmartBoardPanel.ts`, `src/components/agent/FloatingChat.tsx`  
**Actions:**
- Move route data fetching into TanStack Router **loaders** where possible.
- Make `useSmartBoardPanel` use `api.smartboard.*` instead of raw `fetch`.
- Ensure all API calls go through `src/lib/api.ts`.

---

### Step 4 — Fix `package.json` Hygiene
**Why:** Non-deterministic builds and mixed package managers cause CI/env issues.  
**Files:** `package.json`, lockfile  
**Actions:**
- Replace `"latest"` tags with pinned versions.
- Remove unused dependencies (e.g. `@tanstack/react-router-ssr-query` if unused).
- Decide on npm vs pnpm and remove the conflicting lockfile/config.

---

### Step 5 — Improve Error Handling
**Why:** Failures currently fail silently or only log to console.  
**Files:** `src/routes/skills/index.tsx`, `src/components/skills/SkillContent.tsx`, `src/components/agent/AgentSmartBoard.tsx`  
**Actions:**
- Surface API errors to users via the existing toast system.
- Add retry buttons where appropriate.
- Standardize error state in hooks (`useApi`, `useSkills`, etc.).

---

### Step 6 — Close Type-Safety Leaks
**Why:** `any` and `as` casts undermine strict TypeScript.  
**Files:** `src/components/skills/SkillsSidebar.tsx`, `src/hooks/useApi.ts`, `src/components/agent/FloatingChat.tsx`  
**Actions:**
- Replace `reference: any` with `SkillReference | null`.
- Replace `err as Error` with proper unknown-error narrowing.
- Replace `error: any` with typed or `unknown` error handling.

---

### Step 7 — Split Overgrown Page Components
**Why:** `SkillsPage` is 291 lines with too many responsibilities.  
**Files:** `src/routes/skills/index.tsx`, `src/routes/__root.tsx`  
**Actions:**
- Extract dialog components and handlers into smaller hooks/components.
- Move sync orchestration into `useSync` or a new `usePullFlow` hook.
- Separate navigation/sidebar logic from the root route shell.

---

### Step 8 — Improve Accessibility
**Why:** Icon-only buttons, dialogs without focus trapping, and low-contrast colors.  
**Files:** `src/routes/__root.tsx`, `src/components/skills/SkillsSidebar.tsx`, `src/global.css`  
**Actions:**
- Add `aria-label` to all icon-only buttons.
- Implement focus trapping for modals/dialogs.
- Fix contrast for status colors (e.g. success #4d4d4d on dark bg).

---

### Step 9 — Tighten the Design System
**Why:** Hardcoded colors and mixed token styles cause visual drift.  
**Files:** `src/global.css`, all components  
**Actions:**
- Replace hardcoded Tailwind colors (`bg-blue-600`, `text-red-400`) with Atlas tokens.
- Remove or consolidate CSS variables that duplicate `@theme` tokens.
- Load fonts via `link rel="preconnect"` + `preload` to avoid render-blocking.

---

### Step 10 — Clean Up Environment Config
**Why:** `VITE_API_URL` in `.env` is confusing because `apiUrl.ts` ignores it.  
**Files:** `.env`, `.env.example`, `src/lib/apiUrl.ts`  
**Actions:**
- Document the actual runtime config mechanism (`window.APP_CONFIG` / `process.env.API_URL`).
- Remove or repurpose `VITE_API_URL` usage so `.env` is accurate.

---

### Step 11 — Remove Placeholder / Unfinished Code
**Why:** Notes page is a placeholder and dashboard has "Empty for now" boxes.  
**Files:** `src/routes/notes/index.tsx`, `src/routes/index.tsx`  
**Actions:**
- Decide whether to implement, hide, or redirect the Notes page.
- Replace placeholders with useful content or remove them.

---

## Modularization Opportunities

These are not necessarily bugs, but restructuring suggestions to make navigation, reuse, and testing easier. They can be tackled alongside the numbered steps above or as dedicated refactors.

### 1. Split `src/routes/__root.tsx` into layout pieces
**Current problem:** The root route file is 221 lines and mixes:
- HTML shell / `<head>` management
- Theme initialization scripts
- Sidebar layout and collapse behavior
- `NavItem` component

**Suggested modules:**
```
src/components/layout/
  RootLayout.tsx       # HTML shell + theme scripts
  Sidebar.tsx          # Collapsible sidebar shell
  SidebarNav.tsx       # Navigation links
  SidebarHeader.tsx    # Logo + collapse button
  SidebarToggle.tsx    # Floating expand button
```

**Benefit:** Routes become thin wrappers; layout pieces are reusable and testable.

---

### 2. Extract dialog management from `SkillsPage`
**Current problem:** `src/routes/skills/index.tsx` holds state and handlers for:
- AI preview dialog
- Pull selection dialog
- Sync confirmation dialog
- Push selection dialog
- Skill chat modal
- Create skill dialog

**Suggested modules:**
```
src/components/skills/
  SkillDialogs.tsx          # Renders all dialogs (orchestrator)
  useSkillDialogs.ts        # State + open/close handlers
  useSkillActions.ts        # Save/sync/push/pull handlers
```

**Benefit:** The route file becomes a composition layer instead of a controller.

---

### 3. Create a reusable `Dialog` primitive
**Current problem:** Each dialog (`SkillAIPreviewDialog`, `PullSelectionDialog`, etc.) likely repeats backdrop, close-on-escape, focus trapping, and layout.

**Suggested module:**
```
src/components/ui/
  Dialog.tsx   # Headless primitive: Dialog, DialogTrigger, DialogContent, DialogTitle
```

**Benefit:** Consistent behavior, one place to fix accessibility, and easier new-dialog creation.

---

### 4. Create a `Button` primitive
**Current problem:** Buttons are inline Tailwind across many files with duplicated classes like:
- `h-6 px-2.5 bg-blue-600 hover:bg-blue-700 ...`
- `bg-raised hover:bg-hover border border-default ...`

**Suggested module:**
```
src/components/ui/
  Button.tsx   # variants: primary, secondary, ghost, danger; sizes: sm, md
```

**Benefit:** One source of truth for button styles and states (disabled, loading).

---

### 5. Centralize icon usage / icon-button pattern
**Current problem:** Icon-only buttons repeat `aria-label`, sizing, and hover classes.

**Suggested modules:**
```
src/components/ui/
  IconButton.tsx     # Accessible icon button with aria-label enforcement
  icons.ts           # Re-export lucide icons used across the app (optional)
```

**Benefit:** Accessibility enforced by type system; consistent sizing.

---

### 6. Split `src/lib/api.ts` by domain
**Current problem:** One 158-line file with all endpoints.

**Suggested modules:**
```
src/lib/api/
  client.ts       # fetcher wrapper
  skills.ts
  notes.ts
  chat.ts
  references.ts
  agent.ts
  smartboard.ts
  index.ts        # Re-export as `api`
```

**Benefit:** Easier to find endpoints, smaller files, and domain-specific request/response types.

---

### 7. Move smartboard panel logic into feature folder
**Current problem:** SmartBoard code is split between `src/hooks/useSmartBoardPanel.ts` and `src/components/agent/`.

**Suggested modules:**
```
src/features/smartboard/
  hooks/
    useSmartBoardPanel.ts
    useScheduleStatus.ts
  components/
    SmartBoardPanel.tsx
    ThingsToRememberPanel.tsx
    SuggestionsPanel.tsx
    AchievementsPanel.tsx
    BlockersPanel.tsx
  types.ts
  utils.ts
```

**Benefit:** The feature is self-contained; future work touches one directory.

---

### 8. Create a `features/skills/` folder
**Current problem:** Skills logic is spread across `src/hooks/useSkills.ts`, `src/hooks/useNotes.ts`, `src/hooks/useSync.ts`, and `src/components/skills/`.

**Suggested modules:**
```
src/features/skills/
  api/
    skills.ts
    notes.ts
    sync.ts
  hooks/
    useSkills.ts
    useNotes.ts
    useSync.ts
  components/
    SkillsPage.tsx
    SkillsSidebar.tsx
    SkillContent.tsx
    SkillNotes.tsx
    ...
```

**Benefit:** All skill-related code lives in one place.

---

### 9. Extract markdown rendering theme
**Current problem:** `RenderMarkdown.tsx` hardcodes every element mapping.

**Suggested modules:**
```
src/components/ui/markdown/
  RenderMarkdown.tsx
  components/
    MarkdownHeading.tsx
    MarkdownCode.tsx
    MarkdownLink.tsx
    ...
```

**Benefit:** Individual elements can be tested and styled independently.

---

### 10. Add barrel files and enforce clean public APIs
**Current problem:** Some folders have `index.ts` barrel files (`components/ui/index.ts`, `components/agent/index.ts`) but usage is inconsistent.

**Suggested action:**
- Add barrels for every major folder.
- Import from the barrel in consuming code: `import { DataTable } from '@/components/ui'`.
- Avoid deep relative imports like `../../../components/agent/SmartBoardPanel`.

**Benefit:** Refactoring internals does not touch consumers; imports read like a public API.

---

## Tracking

| Step | Status | Notes |
| ---- | ------ | ----- |
| 1. Linting/Formatting | Not started | |
| 2. Tests | Not started | |
| 3. Unified Data Fetching | Not started | |
| 4. package.json Hygiene | Not started | |
| 5. Error Handling | Not started | |
| 6. Type-Safety Leaks | Not started | |
| 7. Split Page Components | Not started | |
| 8. Accessibility | Not started | |
| 9. Design System | Not started | |
| 10. Environment Config | Not started | |
| 11. Placeholders | Not started | |

### Modularization Quick Wins

| Area | Priority | Notes |
| ---- | -------- | ----- |
| Button primitive | High | Repeated everywhere |
| Dialog primitive | High | Repeats a11y logic |
| Split `__root.tsx` layout | Medium | Immediate readability gain |
| Skills dialog orchestrator | Medium | Cuts 100+ lines from SkillsPage |
| API domain split | Medium | Scales with endpoints |
| Smartboard feature folder | Low-Medium | Group existing code |
| Skills feature folder | Low-Medium | Group existing code |
| Markdown element split | Low | Nice-to-have for testing |
| Barrel files everywhere | Low | Polish pass |

---

## Next Action

Start with **Step 1 — Add Linting and Formatting**.
