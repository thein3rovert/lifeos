# Sidecar Improvement Plan

## Overview

The LifeOS sidecar (`sidecar/index.js`) acts as a bridge between the Go backend and OpenCode AI. Currently it uses basic text prompts and manual JSON parsing. The OpenCode SDK offers several features that can make the sidecar more reliable, efficient, and maintainable.

This plan tackles improvements one phase at a time, prioritized by impact.

---

## Current State

### What works:
- Basic session management (`/session/getOrCreate`, `/session/chat`)
- Skill updates (`/skill/update`)
- Agent chat with MCP tools (`/agent/chat`)
- Timeout handling (10-minute limit)

### Problems:
1. **JSON parsing is fragile** — AI returns text, we manually extract JSON with regex
2. **Chat history is broken** — `/session/messages` uses non-existent `client.chat.list()`
3. **Context injection is hacky** — System prompts are concatenated into user messages
4. **No cancellation** — Running requests can't be aborted if user navigates away
5. **No progress feedback** — Long requests block with no streaming updates

---

## Phase 1: Structured Output for Smartboard Panels

**Priority**: High  
**Impact**: Eliminates JSON parsing failures in smartboard panel refreshes  
**Effort**: Medium (2-3 hours)

### Problem
The smartboard service (`internal/services/smartboard.go`) asks the AI to "return ONLY JSON" in a text prompt, then uses `cleanJSONResponse()` to hack-parse it. This fails when the AI wraps JSON in markdown code blocks or adds explanatory text.

### Solution
Use the SDK's native `format: { type: "json_schema", schema: {...} }` parameter in `session.prompt()`. This guarantees validated JSON output from the model.

### Implementation

#### 1. Define JSON schemas for each panel type

```javascript
// sidecar/schemas/smartboard.js

export const thingsToRememberSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: { type: "string", description: "Item ID (empty if new)" },
      title: { type: "string", description: "Short title (max 40 chars)" },
      text: { type: "string", description: "Full description (max 200 chars)" },
      category: { 
        type: "string", 
        enum: ["urgent", "important", "not-important"],
        description: "Priority category"
      },
      source: { type: "string", description: "Source filename" },
      date: { type: "string", description: "YYYY-MM-DD" }
    },
    required: ["title", "text", "category", "source", "date"]
  }
}

export const suggestionsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      suggestion: { type: "string" },
      reasoning: { type: "string" }
    },
    required: ["title", "suggestion", "reasoning"]
  }
}

export const achievementsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      achievement: { type: "string" },
      date: { type: "string" },
      source: { type: "string" }
    },
    required: ["title", "achievement", "date", "source"]
  }
}

export const blockersSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      blocker: { type: "string" },
      context: { type: "string" },
      date: { type: "string" },
      source: { type: "string" }
    },
    required: ["title", "blocker", "context", "date", "source"]
  }
}
```

#### 2. Update `/agent/chat` to accept schema parameter

```javascript
// sidecar/index.js

app.post("/agent/chat", async (req, res) => {
  const { message, sessionId, structuredOutput } = req.body
  
  // ... existing session management ...
  
  const promptBody = {
    parts: [{ type: "text", text: fullMessage }]
  }
  
  // Add structured output format if requested
  if (structuredOutput?.schema) {
    promptBody.format = {
      type: "json_schema",
      schema: structuredOutput.schema,
      retryCount: 2
    }
  }
  
  const result = await client.session.prompt({
    path: { id: activeSessionId },
    body: promptBody
  })
  
  // Extract structured output if present
  let response
  if (structuredOutput?.schema) {
    response = result.data.info.structured_output
  } else {
    response = result.data.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("")
  }
  
  return res.json({ response, sessionId: activeSessionId })
})
```

#### 3. Update Go backend to pass schema

```go
// internal/services/smartboard.go

func (s *SmartBoardService) RefreshPanel(panelType string, force bool) (*model.SmartBoardPanel, error) {
  // ... existing cache check ...
  
  prompt, err := s.getPromptForPanel(panelType, existingCtx)
  if err != nil {
    return nil, err
  }
  
  // Get JSON schema for this panel type
  schema := getSchemaForPanel(panelType)
  
  chatResp, err := s.agentChatService.SendAgentChatMessage(AgentChatRequest{
    Message:          prompt,
    SessionID:        sessionID,
    StructuredOutput: &schema, // NEW
  })
  
  // ... rest of logic ...
}

func getSchemaForPanel(panelType string) map[string]interface{} {
  switch panelType {
  case "things-to-remember":
    return map[string]interface{}{
      "type": "array",
      "items": map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
          "id":       map[string]interface{}{"type": "string"},
          "title":    map[string]interface{}{"type": "string"},
          "text":     map[string]interface{}{"type": "string"},
          "category": map[string]interface{}{"type": "string", "enum": []string{"urgent", "important", "not-important"}},
          "source":   map[string]interface{}{"type": "string"},
          "date":     map[string]interface{}{"type": "string"},
        },
        "required": []string{"title", "text", "category", "source", "date"},
      },
    }
  // ... other panel types ...
  }
}
```

#### 4. Remove `cleanJSONResponse()` hack

Once structured output is working, delete the regex-based JSON extraction in `internal/services/smartboard.go`.

### Testing
- Refresh each panel type and verify JSON is always valid
- Check that `structured_output` field is populated in response
- Verify merge logic still works with structured output

### Rollback
If structured output fails, fall back to text mode and log a warning.

---

## Phase 2: Fix session.messages() Bug

**Priority**: High  
**Impact**: Fixes empty chat history in skill chat  
**Effort**: Low (30 minutes)

### Problem
The `/session/messages` endpoint uses `client.chat.list()` which doesn't exist in the SDK. The correct method is `client.session.messages()`.

### Solution

```javascript
// sidecar/index.js

app.post("/session/messages", async (req, res) => {
  const { sessionId } = req.body
  
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" })
  }
  
  try {
    console.log(`[Messages] Fetching messages for session: ${sessionId}`)
    
    // Use correct SDK method
    const messages = await client.session.messages({
      path: { id: sessionId }
    })
    
    console.log(`[Messages] Found ${messages.data.length} messages`)
    
    // Format for frontend
    const formattedMessages = messages.data.map((msg) => ({
      id: msg.info.id,
      role: msg.info.role,
      content: msg.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join(""),
      created: msg.info.created,
    }))
    
    return res.json({ messages: formattedMessages })
  } catch (err) {
    console.error("[Messages] Failed:", err.message)
    
    // Session might not exist or have no messages
    if (err.message.includes("not found")) {
      return res.json({ messages: [] })
    }
    
    return res.status(500).json({ error: "Failed to fetch messages" })
  }
})
```

### Testing
- Open a skill chat, send a few messages, refresh the page
- Verify chat history loads correctly
- Check that messages are in correct order (oldest first)

---

## Phase 3: noReply Context Injection

**Priority**: Medium  
**Impact**: Cleaner separation of system context vs user input  
**Effort**: Low (1 hour)

### Problem
Currently, system prompts are concatenated into the user's message:

```javascript
fullMessage = `You are Samad's productivity assistant...\n\nUser: ${message}`
```

This pollutes the conversation history and can confuse the model on subsequent messages.

### Solution
Use `noReply: true` to inject context silently:

```javascript
// sidecar/index.js

app.post("/agent/chat", async (req, res) => {
  const { message, sessionId, context } = req.body
  
  // ... session management ...
  
  // Inject context silently on first message
  if (isNewSession && context) {
    await client.session.prompt({
      path: { id: activeSessionId },
      body: {
        noReply: true, // Don't trigger AI response
        parts: [{ type: "text", text: context }]
      }
    })
    console.log(`[Agent] Injected context silently`)
  }
  
  // Now send actual user message
  const result = await client.session.prompt({
    path: { id: activeSessionId },
    body: {
      parts: [{ type: "text", text: message }]
    }
  })
  
  // ... extract response ...
})
```

### Update Go backend

```go
// internal/services/agent.go

type AgentChatRequest struct {
  Message   string  `json:"message"`
  SessionID *string `json:"sessionId,omitempty"`
  Context   string  `json:"context,omitempty"` // NEW
}

func (s *AgentChatService) SendAgentChatMessage(req AgentChatRequest) (*AgentChatResponse, error) {
  // Build context for first message
  var context string
  if req.SessionID == nil {
    context = `You are Samad's productivity assistant. Help him with daily queries regarding his journals and meetings...`
  }
  
  payload := map[string]interface{}{
    "message": req.Message,
    "context": context,
  }
  if req.SessionID != nil {
    payload["sessionId"] = *req.SessionID
  }
  
  // ... rest of HTTP call ...
}
```

### Testing
- Start a new agent chat session
- Verify system context is not visible in chat history
- Send follow-up messages and verify context is preserved

---

## Phase 4: session.abort() Cancellation

**Priority**: Medium  
**Impact**: Prevents wasted tokens when user navigates away  
**Effort**: Medium (2 hours)

### Problem
If a user triggers a smartboard refresh and then navigates away or clicks refresh again, the original AI request keeps running for up to 10 minutes, burning tokens.

### Solution

#### 1. Track active requests

```javascript
// sidecar/index.js

const activeRequests = new Map() // sessionId -> { abortController, response }

app.post("/agent/chat", async (req, res) => {
  const { message, sessionId, requestId } = req.body
  
  // ... session management ...
  
  // Create abort controller
  const abortController = new AbortController()
  
  // Track this request
  if (requestId) {
    activeRequests.set(requestId, {
      sessionId: activeSessionId,
      abortController,
      startTime: Date.now()
    })
  }
  
  try {
    const result = await client.session.prompt({
      path: { id: activeSessionId },
      body: {
        parts: [{ type: "text", text: fullMessage }]
      },
      signal: abortController.signal // Pass abort signal
    })
    
    // Clean up tracking
    if (requestId) {
      activeRequests.delete(requestId)
    }
    
    // ... extract response ...
  } catch (err) {
    if (err.name === "AbortError") {
      console.log(`[Agent] Request ${requestId} aborted`)
      return res.status(499).json({ error: "Request cancelled" })
    }
    // ... other error handling ...
  }
})
```

#### 2. Add abort endpoint

```javascript
// sidecar/index.js

app.post("/agent/abort", async (req, res) => {
  const { requestId } = req.body
  
  if (!requestId) {
    return res.status(400).json({ error: "requestId is required" })
  }
  
  const request = activeRequests.get(requestId)
  if (!request) {
    return res.json({ aborted: false, reason: "Request not found or already completed" })
  }
  
  console.log(`[Agent] Aborting request ${requestId}`)
  request.abortController.abort()
  
  // Also abort the OpenCode session
  try {
    await client.session.abort({
      path: { id: request.sessionId }
    })
    console.log(`[Agent] Session ${request.sessionId} aborted`)
  } catch (err) {
    console.error(`[Agent] Failed to abort session:`, err.message)
  }
  
  activeRequests.delete(requestId)
  return res.json({ aborted: true })
})
```

#### 3. Update Go backend to pass requestId

```go
// internal/services/agent.go

type AgentChatRequest struct {
  Message   string  `json:"message"`
  SessionID *string `json:"sessionId,omitempty"`
  RequestID string  `json:"requestId,omitempty"` // NEW
}

func (s *AgentChatService) SendAgentChatMessage(req AgentChatRequest) (*AgentChatResponse, error) {
  // Generate request ID if not provided
  if req.RequestID == "" {
    req.RequestID = fmt.Sprintf("req-%d", time.Now().UnixNano())
  }
  
  // ... rest of logic ...
}
```

#### 4. Add abort endpoint to Go backend

```go
// internal/api/agents/agent.go

func (h *AgentChatHandler) AbortRequest(w http.ResponseWriter, r *http.Request) {
  var req struct {
    RequestID string `json:"requestId"`
  }
  if err := api.DecodeJSON(r, &req); err != nil {
    api.RespondError(w, http.StatusBadRequest, "invalid request body")
    return
  }
  
  if err := h.service.AbortAgentRequest(req.RequestID); err != nil {
    api.RespondError(w, http.StatusInternalServerError, err.Error())
    return
  }
  
  api.RespondJSON(w, http.StatusOK, map[string]bool{"aborted": true})
}
```

### Testing
- Trigger a smartboard refresh
- Immediately click refresh again or navigate away
- Verify first request is aborted (check sidecar logs)
- Verify no token waste

---

## Phase 5: Events Stream for Progress (SSE)

**Priority**: Low  
**Impact**: Better UX for long-running requests  
**Effort**: High (4-6 hours)

### Problem
Smartboard panel refreshes can take 30-90 seconds. The UI shows a spinner but no progress indication. Users don't know if the AI is stuck or working.

### Solution
Use the SDK's `event.subscribe()` to stream progress updates via Server-Sent Events (SSE).

### Implementation

#### 1. Add SSE endpoint to sidecar

```javascript
// sidecar/index.js

app.get("/agent/events/:sessionId", async (req, res) => {
  const { sessionId } = req.params
  
  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  })
  
  try {
    const events = await client.event.subscribe()
    
    for await (const event of events.stream) {
      // Filter events for this session
      if (event.properties?.sessionId === sessionId) {
        res.write(`data: ${JSON.stringify(event)}\n\n`)
      }
      
      // Check if client disconnected
      if (res.writableEnded) {
        break
      }
    }
  } catch (err) {
    console.error(`[Events] Stream error:`, err.message)
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
  }
  
  res.end()
})
```

#### 2. Add SSE client to frontend

```typescript
// web/src/hooks/useAgentEvents.ts

export function useAgentEvents(sessionId: string | null) {
  const [events, setEvents] = useState<any[]>([])
  const [status, setStatus] = useState<string>("idle")
  
  useEffect(() => {
    if (!sessionId) return
    
    const eventSource = new EventSource(
      `${SIDECAR_URL}/agent/events/${sessionId}`
    )
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setEvents((prev) => [...prev, data])
      
      // Update status based on event type
      if (data.type === "tool.call") {
        setStatus(`Using ${data.properties.tool}...`)
      } else if (data.type === "message.complete") {
        setStatus("complete")
      }
    }
    
    eventSource.onerror = () => {
      setStatus("error")
      eventSource.close()
    }
    
    return () => eventSource.close()
  }, [sessionId])
  
  return { events, status }
}
```

#### 3. Show progress in SmartBoardPanel

```typescript
// web/src/components/agent/SmartBoardPanel.tsx

function LoadingState({ sessionId }: { sessionId?: string }) {
  const { status } = useAgentEvents(sessionId)
  
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Spinner />
      <p className="text-sm text-secondary mt-2">
        {status === "idle" ? "Analyzing your notes..." : status}
      </p>
    </div>
  )
}
```

### Testing
- Trigger a smartboard refresh
- Open browser DevTools → Network tab
- Verify SSE connection is established
- Check that events stream in real-time
- Verify UI updates with progress messages

### Limitations
- Requires OpenCode to emit granular events (may not be available)
- Adds complexity to error handling
- May not work well with the scheduler (background refreshes)

---

## Implementation Order

1. **Phase 1: Structured Output** — Highest impact, fixes JSON parsing failures
2. **Phase 2: Fix session.messages()** — Quick win, fixes broken chat history
3. **Phase 3: noReply Context** — Clean separation of concerns
4. **Phase 4: Abort Cancellation** — Prevents token waste
5. **Phase 5: Events Stream** — Nice-to-have, improves UX

Each phase is independent and can be deployed separately.

---

## Success Metrics

- **Phase 1**: Zero JSON parsing failures in smartboard refreshes
- **Phase 2**: Chat history loads correctly after page refresh
- **Phase 3**: System prompts not visible in chat history
- **Phase 4**: Aborted requests stop consuming tokens within 5 seconds
- **Phase 5**: Users see real-time progress during long refreshes

---

## Risks

- **Structured Output**: May not work with all models (requires JSON mode support)
- **Abort Cancellation**: Race conditions if request completes while aborting
- **Events Stream**: OpenCode may not emit enough granular events

## Rollback Plan

Each phase can be reverted independently:
- Phase 1: Remove `format` parameter, restore `cleanJSONResponse()`
- Phase 2: Revert to `client.chat.list()` (broken but no worse than current)
- Phase 3: Revert to string concatenation
- Phase 4: Remove abort endpoint and tracking
- Phase 5: Remove SSE endpoint and frontend hook
