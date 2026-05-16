# Atlas Design System - LifeOS Web

## Overview

LifeOS uses the **Atlas design system** with **Tailwind CSS v4**. Tokens live in `@theme`, utility classes handle styling. Do not import `atlas.css` — Tailwind translates Atlas tokens into utilities.

---

## Quick Reference

### Token → Utility Mapping

| Atlas Token | Tailwind Utility | Example |
|-------------|------------------|---------|
| `--color-bg-raised` | `bg-raised` | `<div className="bg-raised">` |
| `--color-bg-input` | `bg-input` | `<input className="bg-input">` |
| `--color-bg-hover` | `bg-hover` | `<div className="bg-hover">` |
| `--color-text-secondary` | `text-secondary` | `<span className="text-secondary">` |
| `--color-text-muted` | `text-muted` | `<span className="text-muted">` |
| `--color-border-default` | `border-default` | `<div className="border border-default">` |
| `--color-accent-highlight` | `text-highlight` / `bg-highlight` | `<span className="text-highlight">` |
| `--color-accent-primary` | `bg-accent-primary` | `<button className="bg-accent-primary">` |
| `--color-status-warning` | `text-warning` | `<span className="text-warning">` |
| `--radius-md` | `rounded-md` | `<div className="rounded-md">` |

### Complex Values (use `var()`)

These cannot be mapped to Tailwind utilities. Use inline `style` or CSS classes:

```tsx
// Shadows
<div style={{ boxShadow: 'var(--shadow-md)' }}>

// Z-index
<div style={{ zIndex: 'var(--z-modal)' }}>

// Component heights
<div style={{ height: 'var(--h-button)' }}>
```

---

## File Structure

```
web/src/
├── global.css          # Atlas tokens in @theme, custom utilities
├── components/
│   ├── skills/          # Feature components
│   ├── ui/              # Reusable primitives (future)
│   └── ...
├── routes/
│   └── ...
└── lib/
    └── ...
```

---

## Styling Patterns

### 1. Use Tailwind Utilities (Preferred)

```tsx
// Good - uses Tailwind utilities generated from @theme
<div className="bg-raised border border-default rounded-lg p-4">
  <p className="text-secondary text-sm">Content</p>
</div>

// Good - hover states
<button className="bg-hover hover:bg-active transition-colors">
  Action
</button>
```

### 2. Use `var()` for Complex Values

```tsx
// Good - shadows, z-index, component heights
<div
  className="bg-raised rounded-lg"
  style={{
    boxShadow: 'var(--shadow-neuro-soft)',
    zIndex: 'var(--z-modal)'
  }}
>
```

### 3. Avoid Raw Values

```tsx
// Bad - hardcoded hex
<div style={{ background: '#0f0f0f' }}>

// Good - use token
<div className="bg-raised">
// or
<div style={{ background: 'var(--color-bg-raised)' }}>
```

### 4. Prefer `className` over Inline Styles

```tsx
// Preferred
<div className="bg-raised border border-default">

// Only use style for: shadows, z-index, complex calculations
<div className="p-4" style={{ boxShadow: 'var(--shadow-neuro-raised)' }}>
```

---

## Component Rules

### Buttons

```tsx
// Primary button (near-white on dark)
<button className="inline-flex items-center justify-center h-7 px-3 bg-accent-primary text-black rounded-md text-sm font-medium hover:brightness-95 transition-colors">
  Action
</button>

// Ghost button
<button className="inline-flex items-center justify-center h-7 px-3 bg-transparent text-secondary rounded-md text-sm font-medium hover:bg-hover hover:text-primary transition-colors">
  Cancel
</button>

// Icon button
<button className="inline-flex items-center justify-center w-7 h-7 bg-transparent text-secondary rounded-md hover:bg-hover transition-colors">
  <Icon className="w-4 h-4" />
</button>
```

### Inputs

```tsx
<input
  className="h-6 px-2 bg-input border border-default rounded text-sm text-primary placeholder:text-muted focus:border-highlight focus:outline-none transition-colors"
  placeholder="Search..."
/>
```

### Cards / Panels

```tsx
<div className="bg-raised border border-default rounded-lg p-4">
  <h3 className="text-primary text-md font-medium mb-2">Title</h3>
  <p className="text-secondary text-sm">Description</p>
</div>
```

### Dialogs / Modals

```tsx
<div
  className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
  style={{ zIndex: 'var(--z-modal)' }}
>
  <div
    className="bg-raised border border-default rounded-lg w-full max-w-md"
    style={{ boxShadow: 'var(--shadow-overlay)' }}
  >
    {/* Dialog content */}
  </div>
</div>
```

### 3-Pane Layout (Atlas Standard)

```tsx
<div className="flex h-screen bg-base">
  {/* Left sidebar - 220px */}
  <aside className="w-sidebar border-r border-default">
    {/* Sidebar content */}
  </aside>

  {/* Main content - flex-1 */}
  <main className="flex-1 overflow-hidden">
    {/* Main content */}
  </main>

  {/* Right panel - 280px */}
  <aside className="w-notes border-l border-default">
    {/* Panel content */}
  </aside>
</div>
```

---

## Typography Scale

| Token | Size | Use |
|-------|------|-----|
| `--text-xxs` | 10px | Badges, captions |
| `--text-xs` | 11px | Panel headers, status |
| `--text-sm` | 12px | Buttons, inputs, list items |
| `--text-base` | 13px | Body default |
| `--text-md` | 14px | Emphasis |
| `--text-lg` | 16px | Section titles |
| `--text-xl` | 20px | Page titles |
| `--text-2xl` | 28px | h2 |
| `--text-3xl` | 44px | h1 |

```tsx
// Typography classes (defined in global.css)
<p className="text-xxs">Caption</p>
<p className="text-xs">Panel header</p>
<p className="text-sm">Body small</p>
<p className="text-base">Body default</p>
<p className="text-md">Emphasis</p>
```

---

## Spacing (4px Grid)

Use Tailwind's spacing scale. Key values:

| Token | Tailwind | Use |
|-------|----------|-----|
| `--spacing-1` | `p-1`, `m-1` | Tight spacing |
| `--spacing-2` | `p-2`, `m-2` | Default internal |
| `--spacing-3` | `p-3`, `m-3` | Section padding |
| `--spacing-4` | `p-4`, `m-4` | Cards, panels |
| `--spacing-6` | `p-6`, `m-6` | Large gaps |

---

## Radius

| Token | Tailwind | Use |
|-------|----------|-----|
| `--radius-sm` | `rounded-sm` | 3px - Badges |
| `--radius-md` | `rounded-md` | 4px - Buttons, inputs |
| `--radius-lg` | `rounded-lg` | 6px - Cards |
| `--radius-full` | `rounded-full` | Pills |

---

## Color Palette

### Backgrounds
- `bg-base` - Pure black (#000000)
- `bg-raised` - Elevated surfaces (#0f0f0f)
- `bg-input` - Input fields (#0a0a0a)
- `bg-hover` - Hover state (rgba white 4%)

### Text
- `text-primary` - White (#ffffff)
- `text-secondary` - Gray (#aaaaaa)
- `text-muted` - Dark gray (#585858)

### Accents
- `accent-primary` - Near-white (#ededed) - **Buttons/CTAs**
- `accent-highlight` - Blue (#0070f3) - **Focus, links, selection**

### Status
- `status-warning` - Amber (#cd9731)
- `status-error` - Red (#f44747)
- `status-success` - Gray (#4d4d4d)

---

## Shadows (Overlays Only)

Shadows are for floating content only: dialogs, popovers, toasts, tooltips.

```tsx
// Use var() for shadows
<div style={{ boxShadow: 'var(--shadow-md)' }}>  {/* Card */}
<div style={{ boxShadow: 'var(--shadow-overlay)' }}>  {/* Dialog */}
```

**Never shadow cards or panels** - borders separate surfaces.

---

## Icons

Use **Lucide React** with **1.5px stroke width**:

```tsx
import { IconName } from 'lucide-react'

// Default size
<Icon className="w-4 h-4" />

// In titlebar / panel headers (18px)
<Icon className="w-[18px] h-[18px]" />

// Small (badges, compact)
<Icon className="w-3 h-3" />
```

**Never use emoji or unicode symbols.**

---

## Transitions

Use `transition-colors` with `120ms` for hover states:

```tsx
<button className="transition-colors hover:text-primary">
```

Only animate `background-color` and `color` on hover. Don't animate opacity or scale on icons.

---

## Common Mistakes

### ❌ Don't use inline styles for colors

```tsx
// Bad
<div style={{ background: '#0f0f0f', color: '#aaa' }}>

// Good
<div className="bg-raised text-secondary">
```

### ❌ Don't use hardcoded radii

```tsx
// Bad
<div style={{ borderRadius: '8px' }}>

// Good
<div className="rounded-lg">  // 6px from @theme
```

### ❌ Don't mix utility classes and inline styles for same property

```tsx
// Bad
<div className="bg-raised" style={{ background: 'var(--color-bg-elevated)' }}>

// Good - pick one approach
<div className="bg-raised">
// or
<div style={{ background: 'var(--color-bg-raised)' }}>
```

### ❌ Don't use blue for CTAs

```tsx
// Bad - blue is for focus/selection, not CTAs
<button className="bg-highlight text-white">Submit</button>

// Good - primary buttons use near-white
<button className="bg-accent-primary text-black">Submit</button>
```

---

## Adding New Tokens

To add a new token:

1. Add to `@theme` in `global.css`:

```css
@theme {
  /* existing tokens... */
  --color-my-new-token: #value;
}
```

2. Tailwind auto-generates `bg-my-new-token` and `text-my-new-token` utilities.

3. For complex values (shadows, z-index), add to `:root` block and use via `var()`.

---

## Reference Files

- **Atlas skill**: `skills/atlas/SKILL.md`
- **Tokens reference**: `skills/atlas/references/tokens.md`
- **Components reference**: `skills/atlas/references/components.md`
- **Patterns reference**: `skills/atlas/references/patterns.md`
- **CSS reference**: `skills/atlas/colors_and_type.css`

---

## Quick Start Checklist

- [ ] Use `className="bg-raised"` not `style={{ background: 'var(--bg-raised)' }}`
- [ ] Use `border border-default` not `border: 1px solid #1e1e1e`
- [ ] Use `text-secondary` not `color: #aaaaaa`
- [ ] Use `rounded-md` for buttons/inputs, `rounded-lg` for cards
- [ ] Use `h-7` (28px) for buttons, `h-6` (24px) for inputs
- [ ] Use `var(--shadow-*)` for shadows, `var(--z-*)` for z-index
- [ ] Use Lucide icons with 1.5px stroke
- [ ] Prefer Tailwind utilities; use `style` only for complex values