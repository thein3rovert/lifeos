# Smart Board Optimization — Phase 1 Implementation Spec

> Implements two changes from `smartboard-optimization-plan.md`:
>   1. **Stable Item IDs** (item #1)
>   2. **TTL-based cache** (replaces #3's filesystem fingerprint with a
>      storage-agnostic time check)
>
> These together establish the foundation for all later optimizations
> (merge, dedupe, deltas).

---

## Why TTL Instead of File Fingerprint

The original plan walked the local filesystem to detect changes. That assumes
all source files live on the same machine as the Go server, which isn't
realistic — files may live on:
- NAS / network share
- Cloud-synced folders (Dropbox, iCloud, etc.)
- Remote vaults / Git repos
- Anywhere accessible only through the AI's MCP tools

A simple **time-to-live** sidesteps this entirely: if the panel was refreshed
recently, trust it. If the user wants a guaranteed fresh result, they hit a
"force refresh" button which sends `?force=true`.

A storage-agnostic fingerprint (via MCP file-listing) can be layered on later
as Phase 1.5 / Option B if needed.

---

## Scope

**In:**
- Deterministic item IDs derived from content (`sha256(title|source|date)`)
- TTL-based cache short-circuit on refresh
- `?force=true` query param to bypass cache
- Schema column `source_fingerprint` reserved (unused for now)

**Out (later phases):**
- Merge-on-refresh logic (#2)
- Soft-delete / pinning (#5, #6)
- MCP-listed fingerprint (later Option B upgrade)
- Delta prompting (#7)

---

## Schema Changes

One reserved column on `smartboard_panels` (no behavior yet — placeholder
for the future Option-B fingerprint):

```sql
ALTER TABLE smartboard_panels
  ADD COLUMN source_fingerprint TEXT NOT NULL DEFAULT '';
```

---

## ID Generation

Server-side in `services/itemid.go`, applied after `parseAIResponse`.

```go
func computeItemID(parts ...string) string {
    h := sha256.New()
    for i, p := range parts {
        if i > 0 { h.Write([]byte("|")) }
        h.Write([]byte(strings.TrimSpace(strings.ToLower(p))))
    }
    return hex.EncodeToString(h.Sum(nil))[:12]
}
```

| Panel              | ID inputs                       |
| ------------------ | ------------------------------- |
| things-to-remember | `title` + `source` + `date`     |
| suggestions        | `title` + `createdAt`           |
| achievements       | `title` + `source` + `date`     |
| blockers           | `title` + `source` + `date`     |

Overwrites whatever random ID the AI returned.

---

## TTL Cache

In `services/smartboard.go`:

```go
const cacheTTL = 10 * time.Minute
```

`RefreshPanel(panelType, force)` flow:

```
1. Load latest panel from DB.
2. If panel exists, age < cacheTTL, and !force:
       return cached panel (no AI call). Log cache_hit.
3. Otherwise:
       call AI as today
       parse response
       rewrite item IDs with deterministic hash
       save panel
       return panel
```

### Forced refresh
`POST /api/smartboard/refresh/{panelType}?force=true` bypasses the TTL.
Used by a future UI "force fresh" button.

---

## Store Interface

`SavePanel` signature gains a `sourceFingerprint string` parameter (always
empty for now — keeps DB schema stable for future use):

```go
SavePanel(panelType string, data interface{}, sessionID, sourceFingerprint string) error
```

`GetLatestPanel` returns the fingerprint as part of the panel struct.

---

## API Surface

No new endpoints. Existing
`POST /api/smartboard/refresh/{panelType}` gains optional `?force=true` query
parameter.

---

## Files Touched

| File                                              | Change                                  |
| ------------------------------------------------- | --------------------------------------- |
| `internal/store/sqlite.go`                        | + `ALTER TABLE` migration               |
| `internal/store/smartboard.go`                    | Modify `SavePanel` + `GetLatestPanel`   |
| `internal/services/smartboard.go`                 | TTL cache check, ID rewrite, force flag |
| `internal/api/smartboard/smartboard.go`           | Read `?force=true` query param          |
| `internal/services/itemid.go` *(new)*             | Helper: deterministic ID                |
| `internal/model/smartboard.go`                    | + `SourceFingerprint` field             |

Web frontend: no changes required.

---

## Acceptance Criteria

- [ ] Refresh within `cacheTTL` returns cached panel in < 200ms
- [ ] Refresh after `cacheTTL` re-calls AI
- [ ] `?force=true` always re-calls AI
- [ ] Same item content across refreshes has the same `id`
- [ ] DB migration runs cleanly on existing databases
- [ ] No regressions in existing refresh / category / save flows

---

## Future Upgrade Path (Option B)

When ready, swap the TTL check for a real change-detection signal:

```
1. Ask MCP (via small tool call) for current source-file digest.
2. Hash the digest into a fingerprint.
3. Compare to stored fingerprint.
   - same → cache hit
   - different → call AI, save new fingerprint
```

The `source_fingerprint` column is already in the schema, so this upgrade is
isolated to `services/smartboard.go` and a new MCP tool wrapper. No further
schema migration required.
