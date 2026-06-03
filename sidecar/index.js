import { createOpencodeClient } from "@opencode-ai/sdk";
import express from "express";
import { Agent, setGlobalDispatcher } from "undici";

// Configure global dispatcher with longer timeouts to prevent
// HeadersTimeoutError (default is 300s) on long AI requests
setGlobalDispatcher(
  new Agent({
    headersTimeout: 600_000, // 10 minutes
    bodyTimeout: 600_000,    // 10 minutes
    connectTimeout: 30_000,  // 30 seconds
  })
);

const app = express();
app.use(express.json());

const PORT = 3002;

let client;

// Logging middleware - log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

async function initOpencode() {
  try {
    client = createOpencodeClient({
      baseUrl: "http://127.0.0.1:4097",
      fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(600_000) }), // 10 min timeout
    });
    // Health check via raw fetch instead
    const res = await fetch("http://127.0.0.1:4097/global/health");
    const res2 = await fetch("http://127.0.0.1:4097/config");
    const config = await res2.json();
    console.log("Model:", JSON.stringify(config.model, null, 2));

    if (!res.ok) throw new Error("OpenCode not healthy");
    const data = await res.json();
    console.log("Connected to OpenCode, version:", data.version);
  } catch (err) {
    console.error("Failed to connect to OpenCode:", err.message);
    process.exit(1);
  }
}

app.post("/skill/update", async (req, res) => {
  console.log("\n=== NEW REQUEST ===");
  console.log("Time:", new Date().toISOString());
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  const { existingSkill, newNotes } = req.body;

  if (!existingSkill || !newNotes) {
    console.log("ERROR: Missing required fields");
    console.log("  - existingSkill present:", !!existingSkill);
    console.log("  - newNotes present:", !!newNotes);
    return res.status(400).json({ error: "existingSkill and newNotes are required" });
  }

  console.log("Input sizes:");
  console.log("  - existingSkill length:", existingSkill.length, "chars");
  console.log("  - newNotes length:", newNotes.length, "chars");

  let sessionId;

  try {
    console.log("Creating OpenCode session...");
    // Create a new session
    const session = await client.session.create({
      body: { title: "skill-update" },
    });
    sessionId = session.data.id;
    console.log("Session created:", sessionId);

    // Send the prompt
    const prompt = `You are a skills manager. You will be given an existing skill file in markdown format and some new notes/learnings.

Your job is to intelligently update the skill file by incorporating the new notes. Do not just append — rewrite and restructure as needed so the skill file remains clean, useful and well organised.

Return ONLY the updated markdown skill file, nothing else.

--- EXISTING SKILL ---
${existingSkill}

--- NEW NOTES ---
${newNotes}`;

    console.log("Sending prompt to AI...");
    const result = await client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text", text: prompt }],
      },
    });
    console.log("AI response received");

    // Extract the text response
    const updatedSkill = result.data.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");

    console.log("Updated skill generated:");
    console.log("  - Length:", updatedSkill.length, "chars");
    console.log("  - Preview:", updatedSkill.substring(0, 100), "...");

    // Clean up session
    await client.session.delete({ path: { id: sessionId } });
    console.log("Session cleaned up");

    console.log("=== SUCCESS ===\n");
    return res.json({ updatedSkill });
  } catch (err) {
    console.error("ERROR updating skill:", err.message);
    console.error("Stack:", err.stack);

    // Try to clean up session on error
    if (sessionId) {
      await client.session.delete({ path: { id: sessionId } }).catch(() => {});
    }

    console.log("=== FAILED ===\n");
    return res.status(500).json({ error: "Failed to update skill" });
  }
});

app.get("/health", (_req, res) => {
  res.json({ healthy: true });
});

// Create or get session for a skill
app.post("/session/getOrCreate", async (req, res) => {
  const { skillId, skillTitle, sessionId } = req.body;

  if (!skillId || !skillTitle) {
    return res.status(400).json({ error: "skillId and skillTitle are required" });
  }

  try {
    // If sessionId provided, verify it exists
    if (sessionId) {
      try {
        await client.session.get({ path: { id: sessionId } });
        console.log(`Resuming existing session: ${sessionId}`);
        return res.json({ sessionId });
      } catch (err) {
        console.log(`Session ${sessionId} not found, creating new one`);
      }
    }

    // Create new session
    const session = await client.session.create({
      body: { title: `skill-${skillId}` },
    });
    console.log(`Created new session: ${session.data.id}`);
    return res.json({ sessionId: session.data.id });
  } catch (err) {
    console.error("Failed to get/create session:", err.message);
    return res.status(500).json({ error: "Failed to manage session" });
  }
});

// Send a chat message to a session
app.post("/session/chat", async (req, res) => {
  const { sessionId, message, skillContent } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: "sessionId and message are required" });
  }

  try {
    console.log(`Sending message to session ${sessionId}`);

    // Build prompt with skill context if provided
    let prompt = message;
    if (skillContent) {
      prompt = `Context: You are helping improve this skill document:

${skillContent}

User: ${message}`;
    }

    const result = await client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text", text: prompt }],
      },
    });

    const response = result.data.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");

    console.log(`Response received from session ${sessionId}`);
    return res.json({ response });
  } catch (err) {
    console.error("Failed to send chat message:", err.message);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

// Get chat history for a session
app.post("/session/messages", async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    console.log(`[Messages] Fetching messages for session: ${sessionId}`);

    // Try to get chat messages from the session
    // OpenCode might store them in the chat history endpoint
    const chatHistory = await client.chat.list({
      path: { sessionId },
    });

    console.log(`[Messages] Chat history:`, JSON.stringify(chatHistory.data, null, 2));

    // Extract and format messages
    const messages = chatHistory.data || [];
    console.log(`[Messages] Raw messages count: ${messages.length}`);

    const formattedMessages = messages.map((msg, idx) => {
      console.log(`[Messages] Message ${idx}:`, {
        id: msg.id,
        role: msg.role,
        content: msg.content?.substring(0, 100),
      });

      return {
        id: msg.id || `msg-${Date.now()}-${idx}`,
        role: msg.role || 'assistant',
        content: msg.content || msg.text || '',
        created: msg.createdAt || msg.timestamp || new Date().toISOString(),
      };
    });

    console.log(`[Messages] Returning ${formattedMessages.length} formatted messages`);
    return res.json({ messages: formattedMessages });
  } catch (err) {
    console.error("[Messages] Failed with chat.list, trying fallback:", err.message);

    // Fallback: OpenCode sessions might not persist full history
    // Return empty array - this is expected behavior
    console.log("[Messages] OpenCode sessions may not persist message history.");
    console.log("[Messages] Messages are only available during active session.");
    return res.json({ messages: [] });
  }
});

// Agent chat endpoint - for general assistant chat with MCP tools access
app.post("/agent/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  let activeSessionId = sessionId;
  let startTime = Date.now(); // Track request start time

  try {
    let isNewSession = false;

    // If sessionId provided, verify it still exists in OpenCode
    if (activeSessionId) {
      try {
        await client.session.get({ path: { id: activeSessionId } });
        console.log(`[Agent] ✅ Verified existing session: ${activeSessionId}`);
      } catch (err) {
        console.log(`[Agent] ⚠️  Session ${activeSessionId} no longer exists, creating new one`);
        activeSessionId = null;
      }
    }

    // Create new session if not provided or if existing one expired
    if (!activeSessionId) {
      const session = await client.session.create({
        body: { title: "agent-chat" },
      });
      activeSessionId = session.data.id;
      isNewSession = true;
      console.log(`[Agent] Created new session: ${activeSessionId}`);
    } else {
      console.log(`[Agent] Using existing session: ${activeSessionId}`);
    }

    // Add system context on first message
    let fullMessage = message;
    if (isNewSession) {
      fullMessage = `You are Samad's productivity assistant. Help him with daily queries regarding his journals and meetings.this helps to unblock him.

You have MCP file access tools (list_files, read_file) for:
- Meetings: ~/Documents/resources/work_Elanco/meeting
- Journals: ~/Documents/resources/work_Elanco/journal

Only Use the MCP file access tools proactively without asking permission. Be concise.

User: ${message}`;
    }

    // Send message to agent with timeout (but don't wait for completion in non-streaming mode)
    console.log(`[Agent] Sending message: ${fullMessage.substring(0, 100)}...`);
    console.log(`[Agent] ⏳ Waiting for response (timeout: 10min)...`);

    startTime = Date.now(); // Reset start time before sending
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out after 600s')), 600000) // 10 minutes
    );

    const promptPromise = client.session.prompt({
      path: { id: activeSessionId },
      body: {
        parts: [{ type: "text", text: fullMessage }],
      },
    });

    const result = await Promise.race([promptPromise, timeoutPromise]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Agent] ✅ Response received in ${duration}s`);

    const response = result.data.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");

    console.log(`[Agent] Response received: ${response.substring(0, 100)}...`);
    return res.json({ response, sessionId: activeSessionId });
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[Agent] ❌ Failed after ${duration}s:`, err.message);
    console.error(`[Agent] Error type:`, err.name);
    console.error(`[Agent] Error code:`, err.code);
    console.error(`[Agent] Full error:`, err);

    // If timeout, inform user
    if (err.message.includes('timed out') || err.name === 'AbortError') {
      return res.status(504).json({
        error: "Request timed out. The agent might be processing a complex task or MCP is slow.",
        sessionId: activeSessionId,
        duration: `${duration}s`
      });
    }

    // If connection error
    if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.message.includes('socket hang up')) {
      return res.status(502).json({
        error: "Connection to OpenCode lost. Server may have killed the long-running request.",
        sessionId: activeSessionId,
        duration: `${duration}s`
      });
    }

    return res.status(500).json({
      error: "Failed to send message to agent",
      details: err.message,
      duration: `${duration}s`
    });
  }
});



await initOpencode();

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Sidecar running on http://127.0.0.1:${PORT}`);
});
