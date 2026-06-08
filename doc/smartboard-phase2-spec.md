# Smart Board Optimization — Phase 2: AI-Aware Merge

> Replaces blind content-hash matching with **AI-driven item identity**. The
> AI sees the panel's current items and is asked to reuse their IDs when it
> re-emits the same idea (even if reworded). The server merges new + old,
> preserving user-curated fields (category, status) across refreshes.

---

## Why Not Pure Content Hashing

Phase 1 hashed `title + source + date` to produce stable IDs. That fails
the moment AI rewords:

- Refresh #1: `"FERN deploy"` → hash `a3f9...`
- Refresh #2: `"FERN deployment"` → hash `7c4e...` (different)

Result: same real item, two different IDs, duplicates, lost user state.

Only the AI can determine semantic equivalence ("these mean the same thing").
So we make the AI a partner in identity, not just a content generator.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│ Refresh panel (cache miss)                                      │
│         │                                                       │
│         ▼                                                       │
│  Load existing panel from DB.                                   │
│         │                                                       │
│         ▼                                                       │
│  Extract { id, title } pairs of existing items.                 │
│         │                                                       │
│         ▼                                                       │
│  Append "ID REUSE INSTRUCTIONS" block to AI prompt:             │
│    "Here are existing items: [...]                              │
│     If a new item matches one of these, copy its exact id.      │
│     If brand new, leave id empty."                              │
│         │                                                       │
│         ▼                                                       │
│  Call AI. Receive items, some with reused IDs, some blank.      │
│         │                                                       │
│         ▼                                                       │
│  Merge:                                                         │
│   • For each AI item:                                           │
│     - If id matches an existing item → preserve user fields     │
│       (category for things-to-remember, status for suggestions) │
│     - If id is empty or unknown → assign deterministic ID       │
│       (sha256 of title+source+date, 12 chars)                   │
│   • For each old item NOT in new response → drop                │
│     (AI implicitly chose to omit it)                            │
│         │                                                       │
│         ▼                                                       │
│  Save merged panel to DB.                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## What Each Field Owner Is

| Field                                  | Owner   | Behavior on refresh                                  |
| -------------------------------------- | ------- | ---------------------------------------------------- |
| `id`                                   | system  | AI reuses, server assigns when blank/unknown         |
| `title`                                | AI      | always taken from AI's latest response               |
| `text` / `suggestion` / `achievement` / `blocker` | AI | overwritten — TODO: protect manual edits (later) |
| `category` (things-to-remember)        | **user** | preserved if existing item had one                  |
| `status` (suggestions)                 | **user** | preserved if existing item had one                  |
| `createdAt` (suggestions)              | system  | preserved across refresh so timestamps don't drift  |
| `date`, `source`                       | AI      | always taken from AI                                |

---

## Files Touched

| File                                    | Change                                                        |
| --------------------------------------- | ------------------------------------------------------------- |
| `internal/services/merge.go` *(new)*    | Per-panel merge logic + `existingItemsContext()` helper       |
| `internal/services/itemid.go`           | Trimmed to just `computeItemID` (removed `rewriteItemIDs`)    |
| `internal/services/smartboard.go`       | `getPromptForPanel(panelType, existingItemsJSON)`; new flow   |
| `internal/services/smartboard.go`       | `parseAIResponse` no longer overwrites AI IDs                 |
| `internal/services/smartboard.go`       | Each panel prompt gains an `ID REUSE INSTRUCTIONS` block      |

No DB schema changes. No frontend changes.

---

## Prompt Addition

Appended to every panel prompt when prior data exists:

```
ID REUSE INSTRUCTIONS (IMPORTANT):
These items are currently in the panel:
[{"id":"a3f9c2b1d4e0","title":"FERN deploy"}, ...]

For each item you produce:
- If it represents the SAME underlying idea/task/event as one of the items above
  (even if you would word it differently), copy that item's exact "id" into your output.
- If it's brand new, leave "id" as an empty string "" and we will assign one.
- It's fine to omit items from the list above that no longer apply.
```

Token cost: tiny (~20 tokens per existing item; ~500 tokens for a 20-item panel).

---

## Merge Logic (Per Panel)

Implemented in `internal/services/merge.go`:

```go
func mergePanelData(panelType, oldJSON string, newData interface{}) interface{}
```

Dispatches to per-type helpers (`mergeThingsToRemember`, `mergeSuggestions`,
`mergeAchievements`, `mergeBlockers`).

### Per-type behavior

- **things-to-remember:** preserve `Category`
- **suggestions:** preserve `Status` and `CreatedAt`
- **achievements:** no user fields to preserve (yet)
- **blockers:** no user fields to preserve (yet)

All four also assign deterministic IDs to items the AI marks as new
(empty `id` or unknown id).

---

## Failure Modes (Honest)

| Scenario                                              | Behavior                                                  |
| ----------------------------------------------------- | --------------------------------------------------------- |
| AI ignores reuse instructions and returns all blank IDs | Server assigns hashed IDs; duplicates likely if titles drift |
| AI hallucinates a non-existent ID                     | Server treats as new (unknown ID), assigns hashed ID      |
| AI omits an item that the user pinned                 | Item is dropped (no pinning yet — Phase 3)                |
| User edited text, AI returns different text           | AI text wins (no `user_edited` flag yet — Phase 3)        |

These are explicit and accepted for Phase 2; addressed in later phases.

---

## Acceptance Criteria

- [ ] Setting an item's category to "Urgent" survives a refresh
- [ ] Marking a suggestion as "Completed" survives a refresh
- [ ] Same item reworded by AI keeps the same ID (when AI follows instructions)
- [ ] Brand-new items get deterministic IDs without AI involvement
- [ ] No duplicates appear when AI rewords titles
- [ ] No frontend changes required (panel JSON shape unchanged)
- [ ] No regressions in cache-hit flow or `?force=true`

---

## Next Phase Candidates

- **Phase 3a:** `pinned` flag — survives any refresh
- **Phase 3b:** `user_edited` flag on text fields — protect manual edits
- **Phase 3c:** Soft-archive old items (`archived_at`) with N-day retention
- **Phase 3d:** Refresh stats table for observability
