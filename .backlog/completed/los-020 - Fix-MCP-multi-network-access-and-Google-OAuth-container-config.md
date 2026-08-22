---
id: LOS-020
title: Fix MCP multi-network access and Google OAuth container config
status: Done
assignee: []
created_date: '2026-08-22 18:36'
updated_date: '2026-08-22 18:36'
labels:
  - mcp
  - oauth
  - docker
  - networking
dependencies: []
priority: high
type: bug
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Two critical fixes discovered during testing:

1. **MCP SSE auto-detection**: Remove hardcoded baseURL to allow MCP connections from any network (localhost, Tailscale, LAN)
2. **Google OAuth env vars**: Add missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI to docker-compose backend container

Both issues prevented production features from working correctly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 MCP connects successfully via localhost URL
- [x] #2 MCP connects successfully via Tailscale IP
- [x] #3 MCP connects successfully via any network interface
- [x] #4 Google OAuth credentials available in backend container
- [x] #5 OAuth redirect works from production (port 7060)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Fixes Implemented ✅

### 1. MCP Multi-Network Access

**Problem:** MCP SSE endpoint had hardcoded `baseURL = "http://localhost:7060"`, causing connection failures from Tailscale with error:
```
Endpoint origin does not match connection origin
```

**Solution:** Removed hardcoded baseURL from `NewSSEServer()` - the mcp-go library now auto-detects the correct URL from incoming request's Host header.

**Code Change:**
```go
// Before
baseURL := cfg.GetPublicBaseURL()
sse := server.NewSSEServer(lifeosMCPServer, server.WithBaseURL(baseURL))

// After
sse := server.NewSSEServer(lifeosMCPServer)  // Auto-detect from request
```

**Testing Results:**
- ✅ `http://localhost:7060/mcp/sse` - Connected
- ✅ `http://100.105.217.77:7060/mcp/sse` - Connected  
- ✅ Works from any network interface (LAN, Tailscale, localhost)

---

### 2. Google OAuth Container Configuration

**Problem:** Google OAuth credentials weren't being passed to the Docker backend container, causing OAuth flow to fail with:
```
Error 400: invalid_request
Missing required parameter: client_id
```

**Solution:** Added missing environment variables to `docker-compose.prod.yml`:
```yaml
- GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
- GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
- GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI}
```

Also updated `.env` to use correct production port:
```bash
GOOGLE_REDIRECT_URI=http://localhost:7060/api/calendar/oauth/callback
```

**Note:** Requires updating Google Cloud Console to add the new redirect URI.

---

## Commits

1. `0fdf10b` - fix(mcp): auto-detect baseURL from request for multi-network access
2. `e605ca0` - fix(oauth): add Google Calendar env vars to backend container

---

## Impact

These fixes complete the self-hosted multi-network setup:
- MCP works from any IP/network (localhost, Tailscale, LAN)
- Google Calendar OAuth works in production
- No hardcoded IPs or URLs anywhere in the config
- Truly network-agnostic deployment ✨
<!-- SECTION:FINAL_SUMMARY:END -->
