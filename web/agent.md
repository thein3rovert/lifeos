# LifeOS — Web Agent Guide

This guide covers the TanStack Start frontend for LifeOS. For the full project overview, see [`../agent.md`](../agent.md). Server and sidecar guidance live in [`../server/agent.md`](../server/agent.md) and [`../sidecar/agent.md`](../sidecar/agent.md).

## Frontend Stack

| Layer | Tech |
|-------|------|
| Framework | TanStack Start (React + TypeScript) |
| Styling | Tailwind CSS v4 + Atlas design system |
| Icons | Lucide React (1.5px stroke) |
| Markdown | `react-markdown` + `remark-gfm` |

## Project Structure

```
web/
  src/
    types/          # Shared TypeScript types
    hooks/          # Custom React hooks (data fetching, CRUD, sync)
    lib/            # API client and utilities
    components/
      ui/           # Reusable primitives (Toast, Skeleton, EmptyState, etc.)
      layout/       # Layout components
      skills/       # Skills feature components
    routes/         # File-based routing
    global.css      # Atlas design system tokens
  public/           # Static assets
```

## Routes

TanStack Start uses file-based routing with route directories:

| Route | File | Purpose |
|-------|------|---------|
| `/` | `routes/index.tsx` | Dashboard with stats and "Today's Notes" |
| `/gallery` | `routes/gallery/index.tsx` | Photo grid, upload, viewer |
| `/skills` | `routes/skills/index.tsx` | 3-pane skills viewer (sidebar + content + notes) |
| `/notes` | `routes/notes/index.tsx` | Full notes CRUD interface |
| `/settings` | `routes/settings/index.tsx` | Settings and configuration |

## Component Organization

**When a route file exceeds ~150 lines or has multiple visual sections, split it.**

### Structure Pattern

```
src/
├── types/
│   └── index.ts            # Single types file
├── lib/
│   ├── index.ts            # Barrel export
│   ├── api.ts              # API client
│   └── utils/              # Utilities
├── components/
│   ├── ui/                 # Reusable primitives
│   ├── layout/             # Layout components
│   └── feature/            # Feature components
└── routes/
    └── feature/
        └── index.tsx       # Orchestrator
```

### Example: Skills Page

**Good (organized):**
- `routes/skills/index.tsx` — ~130 lines, just state + handlers + layout
- `components/skills/SkillsSidebar.tsx` — Left panel (220px)
- `components/skills/SkillContent.tsx` — Center panel (flex)
- `components/skills/SkillNotes.tsx` — Right panel (280px)
- `types/index.ts` — All shared types (Skill, Note, SkillDetail)
- `lib/skills/utils.ts` — stripFrontmatter, formatDate utilities

**Always use `@/` path alias for imports:**

```typescript
// Good
import { api } from '@/lib'
import type { Skill } from '@/types'
import { SkillsSidebar } from '@/components/skills'

// Bad
import { api } from '../../../lib/api'
import type { Skill } from '../../../lib/skills/types'
```

### Component Props Pattern

Pass data and callbacks as props, not global state:

```typescript
<SkillsSidebar
  skills={skills}
  selectedSkillId={selectedSkillId}
  onSelectSkill={setSelectedSkillId}
  loading={loading}
  syncing={syncing}
  onSync={handleSync}
/>
```

## Atlas Design System

LifeOS follows the Atlas design system for all UI.

- **AMOLED black** (`#000`) canvas, never dark gray
- **Monochromatic surfaces** — grays + whites for structure
- **Near-white primary actions** — `#ededed` fill, `#fff` hover
- **Blue for state, not action** — `#0070f3` for focus rings, selected rows, links
- **4px spacing grid** — use `--space-*` tokens
- **3 / 4 / 6 / 9999 radii** — no inventing custom values
- **28px buttons, 24px inputs, 13px base text**
- **Borders over shadows** — shadows only for overlays
- **1.5px Lucide icons** — never emoji, never unicode symbols

### CSS Single Source of Truth

**All design tokens are defined in `web/src/global.css`** — this is the ONLY place to edit design values. Components use Tailwind utility classes generated from these tokens.

```css
/* web/src/global.css - @theme block */
@theme {
  --color-bg-raised: #0f0f0f;   /* Components: className="bg-raised" */
  --color-text-secondary: #aaaaaa;  /* Components: className="text-secondary" */
  --radius-md: 4px;             /* Components: className="rounded-md" */
  /* ... etc */
}

/* :root for complex values Tailwind can't handle */
:root {
  --shadow-neuro-soft: ...;    /* Use via style={{ boxShadow: 'var(--shadow-neuro-soft)' }} */
  --z-modal: 200;
  --h-button: 28px;
}
```

### Design Token Reference

**For detailed styling guidance, always reference:**
- `doc/atlas-design-guide.md` — Quick reference, patterns, do's and don'ts
- `skills/atlas/SKILL.md` — Full Atlas design system documentation
- `skills/atlas/references/tokens.md` — All token values
- `skills/atlas/references/components.md` — Component patterns

### 3-Pane Layout (Atlas Standard)

```
┌─────────────────────────────────────────┐
│ Left Sidebar   │ Main Content │ Inspector│
│ 220px          │ flex-1       │ 280px    │
└─────────────────────────────────────────┘
```

Use `flex` with fixed widths, not CSS Grid. Left sidebar can collapse to icon button.

## UI Components

### Available Primitives (`src/components/ui/`)

| Component | Purpose | Usage |
|-----------|---------|-------|
| `ErrorComponent` | Error boundary with retry | `errorComponent: ErrorComponent` in route |
| `NotFound` | 404 page | `notFoundComponent: NotFound` in route |
| `RenderMarkdown` | Markdown rendering | `<RenderMarkdown content={md} />` |
| `Skeleton` | Loading placeholder | `<Skeleton className="h-3 w-20" />` |
| `SkeletonCard` | Card loading state | Use when loading cards |
| `SkeletonTableRow` | Table row loading | Use when loading table data |
| `EmptyState` | Empty state display | `<EmptyState title="No items" description="..." />` |
| `Toaster` | Toast notifications | Already in `__root.tsx`, use `toast('msg', 'error')` |
| `toast()` | Trigger toast | `toast('Success!', 'success')` — types: 'success' \| 'error' \| 'info' |

### Toast Usage

```typescript
import { toast } from '@/components/ui/Toast'

// In any handler
toast('Failed to save', 'error')
toast('Skill synced successfully', 'success')
toast('Processing...', 'info')
```

### EmptyState Usage

```typescript
import { EmptyState } from '@/components/ui/EmptyState'
import { Plus } from 'lucide-react'

<EmptyState
  icon={<Plus className="w-5 h-5" strokeWidth={1.5} />}
  title="No notes yet"
  description="Create your first note to get started"
  action={<Button onClick={handleCreate}>Create Note</Button>}
/>
```

## React Hooks Guidelines

### When to Use Each Hook

| Hook | Purpose | When to Use |
|------|---------|-------------|
| `useState` | Component state | Local UI state (toggle, count, form inputs) |
| `useEffect` | Side effects | Fetch data, DOM mutations, subscriptions, timers |
| `useMemo` | Memoization | Expensive calculations, filtered/sorted data |
| `useCallback` | Function memoization | Functions passed to child components or as deps |

### Examples

```typescript
// useEffect = WHEN to do something (side effects)
useEffect(() => {
  fetchData()  // ← runs once on mount, or when deps change
}, [dependency])

// useMemo = WHAT to compute (derived data)
const filteredItems = useMemo(() => {
  return items.filter(item => item.active)  // ← caches result
}, [items])

// useCallback = HOW to memoize a function (stable reference)
const handleClick = useCallback(() => {
  doSomething()
}, [dependency])  // ← stable function reference
```

### Rules

1. **useEffect** runs after render - use for API calls, subscriptions, DOM updates
2. **useMemo** caches computed values - use for filtering, sorting, expensive operations
3. **useCallback** caches function references - use when passing funcs to child components
4. **Never** replace useEffect with useMemo (they do different things)
5. **Always** specify dependency arrays correctly

### Performance Patterns

```typescript
// Good - memoize expensive computations
const sortedData = useMemo(() => {
  return [...data].sort((a, b) => a.name.localeCompare(b.name))
}, [data])

// Good - stable callback references
const handleSubmit = useCallback((data: FormData) => {
  submitForm(data)
}, [submitForm])

// Good - React.memo for list items
export const ListItem = memo(function ListItem({ item, onSelect }: Props) {
  return <div onClick={() => onSelect(item.id)}>{item.name}</div>
})
```

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `http://localhost:6060` | Go backend API URL |

## Frontend-Specific Notes

- Markdown frontmatter is stripped client-side before rendering; Go returns raw markdown.
- Date strings from Go (`"2026-04-24 22:34:14.340107457 +0100 BST"`) need regex parsing.
- Use `npm run dev -- --host` for Tailscale access.

## Development Workflow

1. Edit files in `web/src/`; hot reload is automatic.
2. Reference `skills/atlas/references/` for UI patterns.
3. When a route file hits 150 lines, extract components into `components/<feature>/`.
4. When changing API shape, update both `lib/api.ts` and the Go handler.
