# LifeOS Web UI Refactoring Plan

## Overview

This document outlines the phased approach to improve the codebase quality, consistency, and maintainability of the LifeOS web frontend.

> **Design System:** Atlas + Tailwind CSS v4
> - Tokens in `@theme` block → Tailwind utilities (e.g., `bg-raised`, `text-secondary`)
> - Complex values (shadows, z-index) in `:root` → use via `var()`
> - Reference: `doc/atlas-design-guide.md`

---

## Phase 1: CSS Token Consolidation (Tailwind-First) ✅ COMPLETE

**Goal:** Use Tailwind's `@theme` as the single source of truth. Remove CSS variable duplication.

### Problem

Tokens are currently defined **twice** with different naming:
- `@theme` uses `--color-bg-raised: #0f0f0f` (becomes `--color-bg-raised`)
- `:root` uses `--bg-raised: #0f0f0f` (becomes `--bg-raised`)

Components use `var(--bg-raised)` (from `:root`) instead of Tailwind classes.

### Actions

- [x] **Audit `global.css`** - Identify all duplicate token definitions between `@theme` and `:root`
- [x] **Remove `:root` block** - Delete all `--bg-*`, `--text-*`, `--border-*`, `--accent-*`, `--status-*` variables (keep only `@theme`)
- [x] **Keep shadow tokens in `:root`** - `--shadow-neuro-*` are not in @theme, keep them in `:root` for now
- [x] **Update components to use Tailwind classes** - Replace `style={{ background: 'var(--bg-raised)' }}` with `className="bg-raised"`
- [x] **Deprecate utility classes** - Mark existing utility classes (`.bg-raised`, `.text-secondary`, etc.) as deprecated but keep for migration period

### Components Updated

- [x] `components/skills/SkillChatModal.tsx`
- [x] `components/skills/SkillsSidebar.tsx`
- [x] `components/skills/SkillContent.tsx`
- [x] `components/skills/SkillNotes.tsx`
- [x] `components/skills/SyncConfirmationDialog.tsx`
- [x] `components/skills/CreateSkillDialog.tsx`
- [x] `components/skills/PushSelectionDialog.tsx`
- [x] `components/skills/SkillAIPreviewDialog.tsx`
- [x] `components/skills/SkillItem.tsx`
- [x] `components/Footer.tsx`
- [x] `components/RenderMarkdown.tsx`

### Token Naming Convention (Tailwind v4)

| Old CSS Var | Tailwind Class | Example |
|-------------|----------------|---------|
| `--bg-raised` | `bg-raised` | `<div className="bg-raised">` |
| `--text-secondary` | `text-secondary` | `<span className="text-secondary">` |
| `--border-default` | `border-default` | `<div className="border border-default">` |
| `--accent-highlight` | `text-highlight` | `<span className="text-highlight">` |
| `var(--shadow-neuro-*)` | N/A | Use via `style={{ boxShadow: 'var(--shadow-neuro-soft)' }}` |

### Build Verification

- CSS bundle: 27.94 kB (gzip: 6.44 kB) ✅
- All components compile without errors ✅

---

## Phase 2: Type Consolidation

**Goal:** Single source of truth for all shared types.

### Actions

- [ ] Create `src/types/` directory
- [ ] Move `Skill`, `Note`, `SkillDetail`, `SkillReference` from `lib/skills/types.ts` to `src/types/skills.ts`
- [ ] Audit `lib/api.ts` for duplicate type definitions
- [ ] Create `src/types/index.ts` barrel export
- [ ] Update all imports to use `types/` folder

### Target Structure

```
src/
  types/
    index.ts
    skills.ts
    api.ts          # if needed
```

---

## Phase 3: Component Organization

**Goal:** Clear separation between UI primitives and feature components.

### Actions

- [ ] Create `src/components/ui/` for reusable primitives:
  ```
  ui/
    Button.tsx
    Dialog.tsx
    Input.tsx
    Badge.tsx
    Card.tsx
  ```
- [ ] Move generic components to appropriate folders:
  - `ErrorComponent.tsx` → `ui/`
  - `NotFound.tsx` → `ui/`
  - `RenderMarkdown.tsx` → `ui/`
  - `Footer.tsx` → `layout/Footer.tsx`
- [ ] Keep feature-specific components in their feature folders
- [ ] Create `src/components/index.ts` barrel export

### Target Structure

```
src/components/
  index.ts
  ui/
    Button.tsx
    Dialog.tsx
    ...
  layout/
    Footer.tsx
  skills/
    SkillChatModal.tsx
    ...
```

---

## Phase 4: Styling Standardization

**Goal:** Consistent styling approach across all components.

### Actions

- [ ] Establish rule: **Tailwind classes only** for all styling
- [ ] Remove inline `style={{ ... }}` patterns from components
- [ ] Convert hardcoded values to Tailwind utilities or theme tokens
- [ ] Create custom Tailwind utilities in `global.css` for complex patterns:
  - Neumorphic shadows (if still needed)
  - Custom widths/heights

### Patterns to Avoid

```tsx
// BAD - inline style
<div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)' }}>

// GOOD - Tailwind class
<div className="bg-raised border border-default">
```

---

## Phase 5: Import Cleanup

**Goal:** Clean, maintainable imports with barrel exports.

### Actions

- [ ] Create barrel exports:
  - `src/components/index.ts`
  - `src/lib/index.ts`
  - `src/types/index.ts`
- [ ] Audit all `import from '@/lib/...'` patterns
- [ ] Standardize import paths (always use `@/` alias)

---

## Phase 6: Route Structure Review

**Goal:** Ensure TanStack Router is being used optimally.

### Actions

- [ ] Audit `routes/` structure
- [ ] Verify `routeTree.gen.ts` is in `.gitignore`
- [ ] Consider if nested routes are needed for settings/skills subpages
- [ ] Check for route-level code splitting opportunities

---

## Priority Order

1. **Phase 1** (CSS) - Foundation work, immediate visual consistency
2. **Phase 4** (Styling Standardization) - Prevents new inconsistencies
3. **Phase 2** (Types) - Prevents bugs, improves DX
4. **Phase 3** (Components) - Long-term maintainability
5. **Phase 5** (Imports) - Cleanup, can be quick win
6. **Phase 6** (Routes) - Lower priority, depends on roadmap

---

## Notes

- Using **pnpm** as package manager (already configured)
- Design tokens via Tailwind `@theme` block only (no CSS variable duplicates)
- TanStack Router for routing (already in place)
- Consider adding ESLint/Prettier for consistency enforcement