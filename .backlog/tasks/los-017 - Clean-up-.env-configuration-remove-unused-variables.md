---
id: LOS-017
title: Clean up .env configuration - remove unused variables
status: Done
assignee: []
created_date: '2026-08-22 17:56'
updated_date: '2026-08-22 18:07'
labels:
  - configuration
  - cleanup
dependencies: []
priority: low
type: chore
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove unnecessary environment variables from .env files. Currently have API_URL and PUBLIC_HOST that aren't actually needed since the code has smart defaults and auto-detection.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Remove API_URL from .env and .env.dev (frontend auto-detects)
- [x] #2 Remove PUBLIC_HOST from .env and .env.dev (not used)
- [x] #3 Keep BACKEND_PORT, FRONTEND_PORT, SIDECAR_PORT (prevents port conflicts)
- [x] #4 Keep LIFEOS_PUBLIC_URL (MCP needs this)
- [x] #5 Keep FRONTEND_URL (OAuth redirects need this)
- [x] #6 Verify dev and prod still work after cleanup
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Why We Have So Many Port Variables

**The Setup:**
- **Dev**: Native processes run on host → ports 6060, 3050, 3002
- **Prod**: Docker containers → ports 7060, 7001, 7002

Both run on the same machine at the same time, so they need different ports to avoid conflicts.

## What Can Be Removed

### 1. API_URL ❌ Not Needed
**Current:**
```bash
API_URL=http://localhost:7060
```

**Why not needed:**
The frontend has smart port detection in `web/src/lib/apiUrl.ts`:
- If you visit `:7001` → automatically calls backend on `:7060`
- If you visit `:3050` → automatically calls backend on `:6060`

It only needs `API_URL` when using a domain name (not localhost).

### 2. PUBLIC_HOST ❌ Not Used
**Current:**
```bash
PUBLIC_HOST=localhost
```

**Why not needed:**
This was added as a "central place" to define the host, but docker-compose doesn't support nested variable substitution like `${PUBLIC_HOST}:${BACKEND_PORT}`, so it ended up not being used anywhere.

## What Must Stay

### 1. Port Variables ✅ Required
```bash
BACKEND_PORT=7060
FRONTEND_PORT=7001
SIDECAR_PORT=7002
```
**Why:** Prevents port conflicts between dev (native) and prod (containers).

### 2. LIFEOS_PUBLIC_URL ✅ Required
```bash
LIFEOS_PUBLIC_URL=http://localhost:7060
```
**Why:** MCP server needs to advertise where it's accessible. Opencode connects to this URL.

### 3. FRONTEND_URL ✅ Required
```bash
FRONTEND_URL=http://localhost:7001
```
**Why:** Backend uses this for OAuth redirects (like Google Calendar login).

## Files to Update

1. `.env` (prod)
2. `.env.dev` (dev)

## Testing After Changes

1. Start prod: `just prod-up`
2. Test MCP connection from opencode
3. Test frontend can reach backend API
4. Start dev: `just dev`
5. Verify dev and prod run simultaneously without conflicts
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-08-22 17:56
---
Key insight from this cleanup: The frontend is smarter than we thought! It auto-detects the backend based on which port you're visiting.

So when you visit `http://localhost:7001`, it knows to call the backend at `http://localhost:7060` without needing any env vars.

This means we only need to configure things that the code CAN'T auto-detect:
- Port mappings (to avoid conflicts)
- MCP public URL (for remote connections)
- Frontend URL (for OAuth redirects)

Everything else is just extra maintenance burden.
---
<!-- COMMENTS:END -->
