# LifeOS Web UI Improvement Plan

## Context
- React 19 + Vite + TanStack Router + Tailwind v4
- Atlas design system (AMOLED black, near-white CTAs, blue for selection)
- Goal: Production-ready codebase quality

### Completed Phases (from ui-refactor-plan.md)
- ✅ Phase 1: CSS Token Consolidation - Tailwind `@theme` single source
- ✅ Phase 2: Type Consolidation - `src/types/index.ts` single source
- ✅ Phase 3: Component Organization - `ui/`, `layout/`, `skills/` folders
- ✅ Phase 5: Import Cleanup - barrel exports
- ✅ Phase 6: Route Structure Review

---

## Phase 1: Environment & Config (Priority: High)
- [ ] **1.1** Extract hardcoded API URL to `.env`
  - `VITE_API_URL=http://100.105.217.77:6060`
  - Update `src/lib/api.ts` to use `import.meta.env.VITE_API_URL`
  - Add `VITE_API_URL` to `CORS_ORIGINS` in Go backend

- [ ] **1.2** Create `.env.example` with documented env vars
  ```
  VITE_API_URL=http://localhost:6060
  ```

---

## Phase 2: Code Cleanup (Priority: High)
- [ ] **2.1** Remove all `console.log` statements in production code
  - `src/routes/skills/index.tsx:187-188` - Selected reference debug
  - `src/routes/skills/index.tsx:136` - Push result
  - Search for any others

- [ ] **2.2** Remove unused type imports in `src/routes/skills/index.tsx`
  - `AIPreviewResponse` - used? (check line ~4)
  - `ChatMessage`, `ChatSession` - used?

- [ ] **2.3** Replace hardcoded `bg-gray-100` with design tokens
  - `src/routes/index.tsx:125` - `bg-gray-100` should be `bg-accent-primary`

---

## Phase 3: State Management (Priority: High)
- [ ] **3.1** Create `useApi` hook for typed fetch wrapper
  - Standardized error handling
  - Loading states
  - Could return `{ data, loading, error }`

- [ ] **3.2** Create `useSkills` hook to extract from SkillsPage
  - Skills list fetching
  - Skill detail fetching
  - Auto-select first skill
  - Handles loading/error states

- [ ] **3.3** Create `useNotes` hook for notes CRUD
  - Add, edit, delete notes
  - Integrates with `useSkills`

- [ ] **3.4** Create `useSync` hook for sync operations
  - Pull, push state machine
  - Conflict detection

---

## Phase 4: UI Improvements (Priority: Medium)
- [ ] **4.1** Add proper loading skeleton states
  - Not just `-` in StatCard
  - Skeleton components for cards, lists, tables

- [ ] **4.2** Add error boundaries per route
  - ErrorComponent per route with retry buttons

- [ ] **4.3** Add toast notifications for API errors
  - Instead of silent `console.error`
  - Consider `react-hot-toast` or custom toast

- [ ] **4.4** Add empty state components
  - Empty notes, empty skills, empty search results

---

## Phase 5: Performance (Priority: Medium)
- [ ] **5.1** Add React.memo to expensive list items
  - `SkillItem` in maps
  - `NoteItem` in notes list

- [ ] **5.2** Add `useMemo`/`useCallback` where appropriate
  - Filtered lists (dashboard notes search)
  - Event handlers passed to children

- [ ] **5.3** Consider route-based code splitting
  - TanStack Router supports this

---

## Phase 6: Accessibility (Priority: Low)
- [ ] **6.1** Add ARIA labels to icon-only buttons
  - Sync button, collapse button, nav items

- [ ] **6.2** Keyboard navigation for dialogs
  - Escape to close, Tab navigation

- [ ] **6.3** Focus management in modals
  - Focus trap in SkillChatModal

---

## Phase 7: Testing Setup (Priority: Low)
- [ ] **7.1** Add MSW for API mocking in tests
- [ ] **7.2** Add component tests for critical paths
- [ ] **7.3** Add Vitest UI runner

---

## Priority Order
1. Phase 1 (Env) → quick win, production-ready
2. Phase 2 (Cleanup) → low effort, immediate
3. Phase 3 (Hooks) → foundation for everything else
4. Phase 4 (UI) → user-facing improvements
5. Phase 5 (Perf) → optimization
6. Phase 6 (A11y) → compliance
7. Phase 7 (Tests) → if time permits

---

## Progress Tracker

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 | Not Started | |
| Phase 2 | Not Started | |
| Phase 3 | Not Started | |
| Phase 4 | Not Started | |
| Phase 5 | Not Started | |
| Phase 6 | Not Started | |
| Phase 7 | Not Started | |

---

## Implementation Notes

### Phase 3 Hook Structure

```
src/hooks/
  useApi.ts          # Generic fetch wrapper
  useSkills.ts       # Skills list + detail + selection
  useNotes.ts        # Notes CRUD operations
  useSync.ts         # Pull/push state machine
  index.ts           # Barrel export
```

### Example: useApi hook signature

```typescript
function useApi<T>(
  fetcher: () => Promise<T>,
  deps?: unknown[]
): { data: T | null; loading: boolean; error: Error | null; refetch: () => void }
```

### Example: useSkills hook signature

```typescript
function useSkills(): {
  skills: Skill[]
  selectedSkill: Skill | null
  skillDetail: SkillDetail | null
  loading: boolean
  error: Error | null
  selectSkill: (id: string) => void
  refreshSkills: () => Promise<void>
  refreshDetail: () => Promise<void>
}
```