# Phase 5: Events Stream for Progress (SSE)

## Overview

Implement real-time progress updates for smartboard panel refreshes using Server-Sent Events (SSE). When a panel is refreshing, the frontend will receive live updates from OpenCode about what's happening (tool calls, completion, errors).

## Background

Research shows that OpenCode emits granular events via `event.subscribe()`:
- `complete` - session finished
- `error` - errors occurred
- `permission` - needs permission
- `user_message` - user sent message
- And more...

The [opencode-notifier](https://github.com/mohak34/opencode-notifier) plugin (638 stars) successfully uses this API, proving it's reliable.

## Architecture

```
┌─────────────┐
│  OpenCode   │
│   Server    │
└──────┬──────┘
       │ event.subscribe()
       │ (SSE stream)
       ▼
┌─────────────┐
│   Sidecar   │
│  (Node.js)  │
└──────┬──────┘
       │ /agent/events/:sessionId
       │ (SSE proxy)
       ▼
┌─────────────┐
│    Go API   │
│   Server    │
└──────┬──────┘
       │ /api/agent/events
       │ (SSE proxy)
       ▼
┌─────────────┐
│  Frontend   │
│   (React)   │
└─────────────┘
```

**Flow:**
1. Sidecar subscribes to OpenCode event stream on startup
2. Sidecar exposes SSE endpoint that filters events by session ID
3. Go backend proxies SSE to frontend (handles CORS)
4. Frontend connects to SSE when panel starts refreshing
5. UI updates in real-time based on events

## Implementation Plan

### 1. Sidecar: Event Stream Manager

**File:** `sidecar/events.js`

```javascript
import { getClient } from './client.js';

class EventStreamManager {
  constructor() {
    this.subscribers = new Map(); // sessionId -> Set of response objects
    this.eventStream = null;
  }

  async start() {
    const client = getClient();
    this.eventStream = await client.event.subscribe();
    
    // Listen to all events
    for await (const event of this.eventStream.stream) {
      this.handleEvent(event);
    }
  }

  handleEvent(event) {
    const sessionId = event.properties?.sessionId;
    if (!sessionId) return;

    const subscribers = this.subscribers.get(sessionId);
    if (!subscribers) return;

    // Forward event to all subscribers for this session
    const eventData = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of subscribers) {
      res.write(eventData);
    }
  }

  subscribe(sessionId, res) {
    if (!this.subscribers.has(sessionId)) {
      this.subscribers.set(sessionId, new Set());
    }
    this.subscribers.get(sessionId).add(res);

    // Cleanup on disconnect
    res.on('close', () => {
      const subs = this.subscribers.get(sessionId);
      subs?.delete(res);
      if (subs?.size === 0) {
        this.subscribers.delete(sessionId);
      }
    });
  }
}

export const eventManager = new EventStreamManager();
```

### 2. Sidecar: SSE Endpoint

**File:** `sidecar/routes/agent.js` (add new route)

```javascript
// GET /agent/events/:sessionId - SSE stream for session events
router.get('/events/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);

  // Subscribe to events for this session
  eventManager.subscribe(sessionId, res);

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(':keepalive\n\n');
  }, 30000);

  res.on('close', () => {
    clearInterval(keepAlive);
  });
});
```

### 3. Sidecar: Start Event Manager

**File:** `sidecar/index.js`

```javascript
import { eventManager } from './events.js';

// After OpenCode client is initialized
await eventManager.start();
console.log('[Sidecar] Event stream manager started');
```

### 4. Go Backend: SSE Proxy

**File:** `internal/api/agents/agent.go`

```go
// Events streams real-time agent events via SSE
// GET /api/agent/events/{sessionId}
func (h *AgentHandler) Events(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("sessionId")
	if sessionID == "" {
		api.RespondError(w, http.StatusBadRequest, "sessionId is required")
		return
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Connect to sidecar SSE
	sidecarURL := fmt.Sprintf("%s/agent/events/%s", h.sidecarURL, sessionID)
	resp, err := http.Get(sidecarURL)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to connect to event stream: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Forward SSE stream to client
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	buf := make([]byte, 4096)
	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			w.Write(buf[:n])
			flusher.Flush()
		}
		if err != nil {
			break
		}
	}
}
```

**File:** `cmd/server/main.go`

```go
// Add route
mux.HandleFunc("GET /api/agent/events/{sessionId}", agentAPI.Events)
```

### 5. Frontend: SSE Hook

**File:** `web/src/hooks/useAgentEvents.ts`

```typescript
import { useEffect, useState } from 'react';

interface AgentEvent {
  type: string;
  properties?: {
    sessionId?: string;
    [key: string]: any;
  };
}

export function useAgentEvents(sessionId: string | null) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [status, setStatus] = useState<'idle' | 'connected' | 'error'>('idle');

  useEffect(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(
      `${import.meta.env.VITE_API_URL}/api/agent/events/${sessionId}`
    );

    eventSource.onopen = () => {
      setStatus('connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setEvents((prev) => [...prev, data]);
      } catch (err) {
        console.error('Failed to parse event:', err);
      }
    };

    eventSource.onerror = () => {
      setStatus('error');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId]);

  return { events, status };
}
```

### 6. Frontend: Update SmartBoardPanel

**File:** `web/src/components/agent/SmartBoardPanel.tsx`

```typescript
import { useAgentEvents } from '@/hooks/useAgentEvents';

export function SmartBoardPanel({ panelType, onRefresh, ... }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { events, status } = useAgentEvents(sessionId);

  const handleRefresh = async () => {
    const newSessionId = await onRefresh(); // onRefresh now returns sessionId
    setSessionId(newSessionId);
  };

  // Show latest event in UI
  const latestEvent = events[events.length - 1];
  const progressMessage = latestEvent?.type === 'complete' 
    ? 'Refresh complete!' 
    : latestEvent?.type === 'error'
    ? 'Refresh failed'
    : 'Analyzing your notes...';

  return (
    <div>
      {/* ... existing panel code ... */}
      {loading && (
        <div className="text-sm text-gray-500">
          {progressMessage}
        </div>
      )}
    </div>
  );
}
```

### 7. Update Panel Refresh to Return Session ID

**File:** `web/src/hooks/useSmartBoardPanel.ts`

```typescript
const refresh = async () => {
  setLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/api/smartboard/refresh/${panelType}?force=true`, {
      method: 'POST',
    });
    const data = await response.json();
    setPanelData(data);
    return data.sessionId; // Return session ID for event subscription
  } finally {
    setLoading(false);
  }
};
```

## Testing Strategy

1. **Unit Tests:**
   - EventStreamManager correctly filters by session ID
   - SSE endpoints send proper headers
   - Frontend hook connects/disconnects properly

2. **Integration Tests:**
   - Trigger panel refresh
   - Verify SSE connection established
   - Verify events flow through entire stack
   - Verify UI updates in real-time

3. **Manual Testing:**
   - Open browser DevTools → Network tab
   - Trigger smartboard refresh
   - Watch SSE connection in Network tab
   - Verify events appear in console
   - Verify UI shows progress messages

## Rollback Plan

If SSE causes issues:
1. Remove SSE route from Go backend
2. Remove SSE endpoint from sidecar
3. Remove `useAgentEvents` hook from frontend
4. Revert SmartBoardPanel to simple loading spinner
5. Keep event manager in sidecar (no harm if unused)

## Success Criteria

- [ ] Sidecar subscribes to OpenCode events on startup
- [ ] SSE endpoint filters by session ID
- [ ] Go backend proxies SSE correctly
- [ ] Frontend connects to SSE when panel refreshes
- [ ] UI shows real-time progress updates
- [ ] Connection cleanup on component unmount
- [ ] No memory leaks from event subscriptions

## Future Enhancements

- Show tool calls in progress (e.g., "Reading file X...")
- Display token usage in real-time
- Add progress percentage based on event count
- Support multiple concurrent panel refreshes
