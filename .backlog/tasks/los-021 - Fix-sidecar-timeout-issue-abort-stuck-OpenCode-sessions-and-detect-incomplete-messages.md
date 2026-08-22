---
id: LOS-021
title: >-
  Fix sidecar timeout issue - abort stuck OpenCode sessions and detect
  incomplete messages
status: In Progress
assignee: []
created_date: '2026-08-22 19:06'
updated_date: '2026-08-22 19:07'
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
- [ ] #1 When a sidecar request times out, abort the OpenCode session
- [ ] #2 Detect stuck sessions (incomplete assistant messages) before reusing them
- [ ] #3 Create new session if existing one is stuck
- [ ] #4 Panel refreshes work reliably without manual intervention
- [ ] #5 Session context preserved across successful refreshes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Solution

Based on OpenCode SDK docs (https://opencode.ai/docs/sdk), implemented two fixes:

### 1. Abort Session on Timeout

When a request times out, call `client.session.abort({ path: { id } })` to stop OpenCode from continuing to process the stuck request.

**File:** `sidecar/routes/agent.js`

```javascript
let result;
try {
  result = await Promise.race([promptPromise, timeoutPromise]);
} catch (timeoutError) {
  // Timeout occurred - abort the session to stop OpenCode from processing
  console.log(`[Agent] ⏰ Timeout - aborting session ${activeSessionId}`);
  try {
    await client.session.abort({ path: { id: activeSessionId } });
    console.log(`[Agent] ✅ Session aborted successfully`);
  } catch (abortErr) {
    console.log(`[Agent] ⚠️  Failed to abort session:`, abortErr.message);
  }
  throw timeoutError; // Re-throw to trigger error handling below
}
```

### 2. Detect Stuck Sessions

Before reusing a session, check if it has an incomplete assistant message (stuck processing). If so, create a fresh session instead.

**File:** `sidecar/routes/agent.js`

```javascript
if (activeSessionId) {
  try {
    const session = await client.session.get({ path: { id: activeSessionId } });
    
    // Check if session is stuck processing (has an incomplete assistant message)
    const messages = await client.session.messages({ path: { id: activeSessionId } });
    const lastMessage = messages.data?.[messages.data.length - 1];
    const isStuck = lastMessage?.info?.role === 'assistant' && !lastMessage?.info?.completed_at;
    
    if (isStuck) {
      console.log(`[Agent] ⚠️  Session ${activeSessionId} appears stuck, creating new one`);
      activeSessionId = null;
    } else {
      console.log(`[Agent] ✅ Verified existing session: ${activeSessionId}`);
    }
  } catch (err) {
    console.log(`[Agent] ⚠️  Session ${activeSessionId} no longer exists, creating new one`);
    activeSessionId = null;
  }
}
```

## Benefits

1. **No context loss** - Still reuses sessions when they're healthy
2. **Auto-recovery** - Detects and creates new sessions when stuck
3. **Clean abort** - Stops OpenCode from wasting resources on stuck requests
4. **Better logging** - Clear visibility into what's happening

## Files Modified

- `sidecar/routes/agent.js` - Added timeout abort and stuck session detection

## Changes Committed

Commit: `e28e2f4` - fix(sidecar): abort stuck OpenCode sessions and detect incomplete messages

Pushed to GitHub. Waiting for CI to build new sidecar image.

## Next Steps

1. Wait for CI to complete
2. Pull latest images: `just prod-pull`
3. Restart services: `just prod-restart`
4. Test panel refresh to verify fix works
5. Monitor sidecar logs for stuck session detection
<!-- SECTION:NOTES:END -->
