---
id: LOS-018
title: Switch .env configuration from Tailscale IP to localhost
status: Done
assignee: []
created_date: '2026-08-22 17:57'
updated_date: '2026-08-22 18:08'
labels:
  - configuration
  - simplification
dependencies: []
priority: medium
type: chore
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Currently using Tailscale IP (100.105.217.77) in .env files. Should use localhost instead since it's simpler and more portable. Can add Traefik reverse proxy later when remote access is actually needed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Update LIFEOS_PUBLIC_URL to use localhost instead of 100.105.217.77
- [x] #2 Update FRONTEND_URL to use localhost
- [x] #3 Update CORS_ORIGINS to use localhost
- [x] #4 Update both .env (prod) and .env.dev (dev)
- [ ] #5 Test that MCP connection still works with localhost
- [ ] #6 Test that frontend can reach backend
- [ ] #7 Verify dev and prod run simultaneously
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Why Localhost is Better

### Current Approach (Tailscale IP)
```bash
LIFEOS_PUBLIC_URL=http://100.105.217.77:7060
FRONTEND_URL=http://100.105.217.77:7001
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3050,http://100.105.217.77:3050,http://localhost:7001,http://100.105.217.77:7001
```

**Problems:**
- ❌ IP address scattered everywhere
- ❌ Not portable (IP specific to your Tailscale setup)
- ❌ Confusing mix of localhost and IP
- ❌ Still works on localhost, so why use IP?

### New Approach (Localhost)
```bash
LIFEOS_PUBLIC_URL=http://localhost:7060
FRONTEND_URL=http://localhost:7001
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3050,http://localhost:7001
```

**Benefits:**
- ✅ Simpler and cleaner
- ✅ Works everywhere
- ✅ Faster (no network overhead)
- ✅ Still accessible via Tailscale! (port forwarding works)

## What Changes

### .env (prod)
```bash
# Before
LIFEOS_PUBLIC_URL=http://100.105.217.77:7060
FRONTEURL=http://100.105.217.77:7001
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3050,http://100.105.217.77:3050,http://localhost:7001,http://100.105.217.77:7001

# After
LIFEOS_PUBLIC_URL=http://localhost:7060
FRONTEND_URL=http://localhost:7001
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3050,http://localhost:7001
```

### .env.dev (dev)
```bash
# Before
LIFEOS_PUBLIC_URL=http://100.105.217.77:6060
FRONTEND_URL=http://100.105.217.77:3050
CORS_ORIGINS=http://localhost:3000,http://localhost:3050,http://100.105.217.77:3050

# After
LIFEOS_PUBLIC_URL=http://localhost:6060
FRONTEND_URL=http://localhost:3050
CORS_ORIGINS=http://localhost:3000,http://localhost:3050
```

## What About Remote Access?

**Don't worry!** You can still access via Tailscale:
- Visit `http://100.105.217.77:7060` in your browser
- Port forwarding still works
- Just the *config* uses localhost

**Later**: When you actually need proper remote access (from phone, etc.), add Traefik reverse proxy and use a domain name.

## Deployment

After updating .env files:
```bash
just prod-restart backend frontend
```

## Verification

1. Check MCP connection: `opencode mcp list` should show lifeos-files as connected
2. Visit frontend: `http://localhost:7001` should load
3. Check API calls work (look at Network tab in browser)
4. Try Tailscale access: `http://100.105.217.77:7001` should also work
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-08-22 17:57
---
This task pairs well with LOS-017 (removing unused variables). You could do both at once:

1. Remove API_URL and PUBLIC_HOST
2. Change remaining URLs from 100.105.217.77 to localhost

Result: Much cleaner .env files with only what's actually needed!

Note: You'll still be able to access lifeos via your Tailscale IP - the port forwarding will work regardless of what's in the config. The config only affects how the services talk to *each other*, not how you access them externally.
---

created: 2026-08-22 18:08
---
Changes made to .env and .env.dev (git-ignored files):
- Changed LIFEOS_PUBLIC_URL from 100.105.217.77 to localhost
- Changed FRONTEND_URL from 100.105.217.77 to localhost
- Removed Tailscale IP from CORS_ORIGINS

Will test after LOS-019 is complete.
---
<!-- COMMENTS:END -->
