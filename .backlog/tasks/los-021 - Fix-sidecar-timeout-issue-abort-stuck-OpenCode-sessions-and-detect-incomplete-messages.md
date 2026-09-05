---
id: LOS-021
title: >-
  Fix sidecar timeout issue - abort stuck OpenCode sessions and detect
  incomplete messages
status: Done
assignee: []
created_date: '2026-08-22 19:06'
updated_date: '2026-08-22 19:46'
labels:
  - sidecar
  - mcp
  - opencode
  - timeout
dependencies: []
priority: high
type: bug
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Panel refreshes time out after 10 minutes because OpenCode gets stuck processing MCP tool calls. The sidecar waits for a response that never comes, then reuses the same stuck session on the next request, causing repeated failures.

## Root Cause
1. When panel refresh prompts OpenCode to call MCP tools (list_files, read_file), OpenCode sometimes hangs
2. Sidecar times out after 600s but doesn't abort the session
3. The session continues processing in the background
4. Next refresh reuses the same stuck session → immediate failure

## Manual Testing Confirmation
- Regular chat to the same session works fine: "hi" → response in 2.96s
- Manual MCP tool calls in OpenCode work fine
- Issue is specific to concurrent/queued requests to the same session
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When a sidecar request times out, abort the OpenCode session
- [x] #2 Detect stuck sessions (incomplete assistant messages) before reusing them
- [x] #3 Create new session if existing one is stuck
- [x] #4 Panel refreshes work reliably without manual intervention
- [x] #5 Session context preserved across successful refreshes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Solution Summary

Three commits implemented a complete solution for stuck OpenCode sessions:

### Commit 1: e28e2f4 - Session Abort & Detection
Added timeout handling and stuck session detection to sidecar:
- Abort sessions via session.abort() when requests timeout (600s)
- Detect incomplete assistant messages before reusing sessions
- Create fresh session if existing one is stuck processing

### Commit 2: c4143d9 - New Session Parameter
Added ?new_session parameter to refresh endpoint:
- When true, forces creation of fresh OpenCode session
- Default behavior continues to reuse sessions (efficient)
- Provides manual control for stuck session recovery

### Commit 3: c150755 - Dedicated Reset Endpoint
Created separate endpoint for forcing new sessions:
- POST /api/smartboard/refresh/{panelType}/reset
- Always creates fresh session (newSession=true, force=true)
- Separates efficient refresh from stuck session recovery
- Original refresh endpoint always reuses sessions

## Final Architecture

**Normal Operation (efficient):**
- POST /api/smartboard/refresh/{panelType}?force=true
- Reuses existing session (preserves context)
- Used by UI refresh button
- Used by auto-refresh scheduler

**Stuck Session Recovery:**
- POST /api/smartboard/refresh/{panelType}/reset
- Forces fresh OpenCode session
- Use when sessions get stuck/unresponsive
- Can add separate 'Reset' button to UI

## Testing
- Verified new session creation with /reset endpoint
- Confirmed normal refresh reuses sessions
- Panel refreshes working after OpenCode restart
- All commits pushed and CI builds complete
- Production backend restarted with latest image
<!-- SECTION:NOTES:END -->
