import { Router } from 'express';
import { getClient } from '../client.js';
import { schemas } from '../schemas/smartboard.js';

const router = Router();

// POST /agent/chat - Agent chat endpoint with MCP tools access
router.post('/chat', async (req, res) => {
  const { message, sessionId, structuredOutput } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  let activeSessionId = sessionId;
  let startTime = Date.now();
  const client = getClient();

  try {
    let isNewSession = false;

    if (activeSessionId) {
      try {
        await client.session.get({ path: { id: activeSessionId } });
        console.log(`[Agent] ✅ Verified existing session: ${activeSessionId}`);
      } catch (err) {
        console.log(`[Agent] ⚠️  Session ${activeSessionId} no longer exists, creating new one`);
        activeSessionId = null;
      }
    }

    if (!activeSessionId) {
      const session = await client.session.create({
        body: { title: 'agent-chat' },
      });
      activeSessionId = session.data.id;
      isNewSession = true;
      console.log(`[Agent] Created new session: ${activeSessionId}`);
    } else {
      console.log(`[Agent] Using existing session: ${activeSessionId}`);
    }

    let fullMessage = message;
    if (isNewSession) {
      fullMessage = `You are Samad's productivity assistant. Help him with daily queries regarding his journals and meetings.this helps to unblock him.

You have MCP file access tools (list_files, read_file) for:
- Meetings: ~/Documents/resources/work_Elanco/meeting
- Journals: ~/Documents/resources/work_Elanco/journal

Only Use the MCP file access tools proactively without asking permission. Be concise.

User: ${message}`;
    }

    const promptBody = {
      parts: [{ type: 'text', text: fullMessage }],
    };

    if (structuredOutput?.panelType) {
      const schema = schemas[structuredOutput.panelType];
      if (!schema) {
        console.log(`[Agent] ⚠️  Unknown panel type: ${structuredOutput.panelType}, skipping structured output`);
      } else {
        promptBody.format = {
          type: 'json_schema',
          schema: schema,
          retryCount: 2,
        };
        console.log(`[Agent] Using structured output for panel: ${structuredOutput.panelType}`);
      }
    }

    console.log(`[Agent] Sending message: ${fullMessage.substring(0, 100)}...`);
    console.log(`[Agent] ⏳ Waiting for response (timeout: 10min)...`);

    startTime = Date.now();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out after 600s')), 600000)
    );

    const promptPromise = client.session.prompt({
      path: { id: activeSessionId },
      body: promptBody,
    });

    const result = await Promise.race([promptPromise, timeoutPromise]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Agent] ✅ Response received in ${duration}s`);

    let response;
    if (structuredOutput?.panelType && result.data.info?.structured_output) {
      response = JSON.stringify(result.data.info.structured_output);
      console.log(`[Agent] Structured output: ${response.substring(0, 100)}...`);
    } else {
      response = result.data.parts
        .filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join('');
      console.log(`[Agent] Text response: ${response.substring(0, 100)}...`);
    }

    return res.json({ response, sessionId: activeSessionId });
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[Agent] ❌ Failed after ${duration}s:`, err.message);
    console.error(`[Agent] Error type:`, err.name);
    console.error(`[Agent] Error code:`, err.code);
    console.error(`[Agent] Full error:`, err);

    if (err.message.includes('timed out') || err.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request timed out. The agent might be processing a complex task or MCP is slow.',
        sessionId: activeSessionId,
        duration: `${duration}s`
      });
    }

    if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.message.includes('socket hang up')) {
      return res.status(502).json({
        error: 'Connection to OpenCode lost. Server may have killed the long-running request.',
        sessionId: activeSessionId,
        duration: `${duration}s`
      });
    }

    return res.status(500).json({
      error: 'Failed to send message to agent',
      details: err.message,
      duration: `${duration}s`
    });
  }
});

export default router;
