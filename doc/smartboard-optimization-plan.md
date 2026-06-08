# Smart Board Data Optimization Plan

> Goal: make Smart Board panel refreshes **fast, cheap, and non-destructive** —
> never regenerate what hasn't changed, never overwrite user-curated state,
> and never show duplicates.

---

## Current Pain Points

1. **Every refresh = full AI re-generation** — even when no source files changed.
2. **AI generates fresh IDs each run** → impossible to dedupe across refreshes.
3. **Refresh wipes prior data** → user category/status edits get lost.
4. **No file-change awareness** → AI scans everything, every time.
5. **No "remember dismissed"** → AI keeps re-suggesting items the user already rejected.
6. **No observability** → hard to know whether AI actually produced new info.

---

## Strategy Overview

```
┌────────────────────────────────────────────────────────────────────┐
│  Refresh request                                                   │
│         │                                                          │
│         ▼                                                          │
│  ┌─────────────────────┐    no change   ┌───────────────────────┐  │
│  │ Source fingerprint  │ ─────────────▶ │ Return cached panel   │  │
│  │ (mtime + size hash) │                │ (instant, $0 AI cost) │  │
│  └─────────────────────┘                └───────────────────────┘  │
│         │ changed                                                  │
│         ▼                                                          │
│  ┌─────────────────────┐                                           │
│  │ AI delta prompt     │  (existing items + new files)             │
│  └─────────────────────┘                                           │
│         │                                                          │
│         ▼                                                          │
│  ┌─────────────────────┐                                           │
│  │ Stable-ID + merge   │  preserve user state, dedupe              │
│  └─────────────────────┘                                           │
│         │                                                          │
│         ▼                                                          │
│  Updated panel + stats                                             │
└────────────────────────────────────────────────────────────────────┘
```

---

## Quick Wins (1–2h each)

### 1. Stable IDs via content hash
Replace AI-generated `id` with a deterministic hash, server-side, after parsing.

```go
func itemID(title, source, date string) string {
    h := sha256.Sum256([]byte(title + "|" + source + "|" + date))
    return hex.EncodeToString(h[:])[:8]
}
```

Same content = same ID across refreshes → unlocks dedupe and merge.

### 2. Merge instead of replace on refresh
On refresh, fetch the new AI items, then merge with existing panel:

| New item state                | Action                                                                 |
| ----------------------------- | ---------------------------------------------------------------------- |
| Exists in old + new           | Keep user's `status`/`category`/`pinned`, update `text`/`title` if AI revised them |
| Exists in old, missing in new | Keep (mark `archived_at = now`), drop after N days                     |
| New only                      | Insert                                                                 |

### 3. Source fingerprint cache
Before calling AI, hash all source file `mtime + size`. If unchanged since last
refresh → skip AI entirely, return cached panel.

```go
type SourceFingerprint struct {
    PanelType string
    Hash      string // sha256 of sorted "path:mtime:size" lines
    ComputedAt time.Time
}
```

Store on `smartboard_panels` row. Refresh handler short-circuits when hash matches.

---

## Medium Effort (½ day each)

### 4. Incremental file-level processing
Track files-per-panel in a new `smartboard_panel_sources` table:

```sql
CREATE TABLE smartboard_panel_sources (
    panel_id INTEGER,
    source_path TEXT,
    last_mtime DATETIME,
    PRIMARY KEY (panel_id, source_path)
);
```

On refresh, feed AI only files where `mtime > last_mtime`, then merge results
into existing panel.

### 5. Soft-delete + archive
Add `archived_at` and `dismissed_at` to items. User dismisses → archive (not delete).
Include "previously dismissed" titles in the AI prompt so it won't re-suggest them.

### 6. User-pinned items
Add `pinned: bool` per item. Pinned items survive any refresh untouched.
Especially valuable for **Things to Remember**.

---

## AI-Side Optimizations

### 7. Delta prompting (two-tier)
Instead of "regenerate everything":

- **Pass 1 (cheap):** "Here are existing items + new files. Return only `add`,
  `update`, `remove` deltas as JSON."
- **Pass 2 (rare):** Full regenerate only when delta exceeds a threshold or on
  manual "force fresh" request.

This dramatically cuts tokens and latency after the initial generation.

### 8. Session continuity with explicit prior-state context
Session reuse already exists. Extend the prompt to include the *previous panel
JSON* so the AI explicitly compares and avoids restating known items.

```
Previous items:
[{"id":"a1","title":"...","status":"completed"}, ...]

New/changed source files since last run:
- 2026-06-05.md (added)
- 2026-06-03.md (modified)

Return JSON deltas only.
```

---

## Observability

### 9. `smartboard_refresh_stats` table
```sql
CREATE TABLE smartboard_refresh_stats (
    id INTEGER PRIMARY KEY,
    panel_type TEXT,
    refresh_time_ms INTEGER,
    items_added INTEGER,
    items_updated INTEGER,
    items_unchanged INTEGER,
    items_removed INTEGER,
    source_files_scanned INTEGER,
    tokens_used INTEGER,
    cache_hit BOOLEAN,
    created_at DATETIME
);
```

Lets us answer:
- Is panel X actually changing or is AI just churning?
- What's the cache-hit rate?
- Average refresh time per panel?

Expose via a debug overlay or a `/api/smartboard/stats` endpoint.

---

## Recommended Build Order

1. **#1 Stable IDs** — foundation; unblocks everything else
2. **#3 Source fingerprint cache** — instant ~80% speed win when nothing changed
3. **#2 Merge-on-refresh** — fixes the most annoying current bug (lost user state)
4. **#6 Pinned items** — tiny code, huge UX win
5. **#9 Refresh stats** — adds visibility before deeper optimization
6. **#5 Soft-delete / dismissed memory**
7. **#4 Incremental file-level processing**
8. **#7 Delta prompting** — biggest cost reduction, but most complex
9. **#8 Prior-state in prompts** — refinement on top of #7

---

## Success Criteria

- [ ] Refresh with no source changes returns in **< 200ms** (cache hit)
- [ ] User-modified items never lose their `status`/`category` on refresh
- [ ] No duplicate items appear across refreshes
- [ ] Dismissed items don't re-appear next refresh
- [ ] Pinned items always preserved
- [ ] Refresh stats visible per panel for debugging

---

## Open Questions

- How long should archived items linger before hard-delete? (proposed: 30 days)
- Should "force fresh scan" be a user-facing button, or only triggered when
  the AI delta confidence is low?
- Per-panel TTL — should some panels (e.g. Weekly Achievements) only refresh
  weekly regardless of source changes?
