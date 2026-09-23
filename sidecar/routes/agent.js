import { Router } from 'express';
import { getClient } from '../client.js';
import { getLocation, messageText, promptAndWait, promptAndWaitDetailed, requestSignal } from '../opencode.js';
import { schemas } from '../schemas/smartboard.js';
import { streamSessionActivity } from '../activity.js';

const router = Router();

// Track active opencode requests for cancellation
const activeRequests = new Map();
const sessionRequests = new Map();

function trackRequest(requestId, request) {
  if (!requestId) return;
  activeRequests.set(requestId, request);
  if (!request.sessionId) return;
  const requests = sessionRequests.get(request.sessionId) || new Set();
  requests.add(requestId);
  sessionRequests.set(request.sessionId, requests);
}

function untrackRequest(requestId) {
  if (!requestId) return;
  const request = activeRequests.get(requestId);
  activeRequests.delete(requestId);
  if (!request?.sessionId) return;
  const requests = sessionRequests.get(request.sessionId);
  requests?.delete(requestId);
  if (requests?.size === 0) sessionRequests.delete(request.sessionId);
}

function upstreamStatus(err) {
  const tag = err?._tag || err?.data?._tag;
  if (tag?.includes('NotFound')) return 404;
  if (tag?.includes('AlreadySettled')) return 409;
  if (tag?.includes('InvalidAnswer')) return 400;
  return 502;
}

async function exactSession(client, sessionId) {
  const session = await client.session.get({ sessionID: sessionId });
  if (session.id !== sessionId) throw new Error('OpenCode returned a different session');
}

function exactResource(resource, sessionId) {
  if (!resource || resource.sessionID !== sessionId) {
    throw new Error('OpenCode returned a resource from a different session');
  }
  return resource;
}

// V2 permission requests, strictly scoped to the session in the route.
router.get('/session/:sessionId/permissions', async (req, res) => {
  const { sessionId } = req.params;
  const client = getClient();
  try {
    await exactSession(client, sessionId);
    const permissions = await client.permission.list({ sessionID: sessionId });
    return res.json({ permissions: permissions.map((item) => exactResource(item, sessionId)) });
  } catch (err) {
    return res.status(upstreamStatus(err)).json({ error: 'Failed to list session permissions' });
  }
});

router.post('/session/:sessionId/permissions/:requestId/reply', async (req, res) => {
  const { sessionId, requestId } = req.params;
  const { decision, message } = req.body;
  if (!['once', 'always', 'reject'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be once, always, or reject' });
  }
  const client = getClient();
  try {
    await exactSession(client, sessionId);
    exactResource(await client.permission.get({ sessionID: sessionId, requestID: requestId }), sessionId);
    await client.permission.reply({ sessionID: sessionId, requestID: requestId, decision, message });
    return res.json({ requestId, status: decision === 'reject' ? 'rejected' : 'approved', decision });
  } catch (err) {
    return res.status(upstreamStatus(err)).json({ error: 'Failed to reply to session permission' });
  }
});

// V2 forms. List is hydrated so callers receive pending/answered/cancelled state.
router.get('/session/:sessionId/forms', async (req, res) => {
  const { sessionId } = req.params;
  const client = getClient();
  try {
    await exactSession(client, sessionId);
    const forms = await client.session.form.list({ sessionID: sessionId });
    const details = await Promise.all(forms.map(async (form) => {
      exactResource(form, sessionId);
      return exactResource(
        await client.session.form.get({ sessionID: sessionId, formID: form.id }),
        sessionId,
      );
    }));
    return res.json({ forms: details });
  } catch (err) {
    return res.status(upstreamStatus(err)).json({ error: 'Failed to list session forms' });
  }
});

router.get('/session/:sessionId/forms/:formId', async (req, res) => {
  const { sessionId, formId } = req.params;
  const client = getClient();
  try {
    await exactSession(client, sessionId);
    const form = exactResource(await client.session.form.get({ sessionID: sessionId, formID: formId }), sessionId);
    return res.json({ form });
  } catch (err) {
    return res.status(upstreamStatus(err)).json({ error: 'Failed to get session form' });
  }
});

router.post('/session/:sessionId/forms/:formId/reply', async (req, res) => {
  const { sessionId, formId } = req.params;
  if (!req.body.answer || typeof req.body.answer !== 'object' || Array.isArray(req.body.answer)) {
    return res.status(400).json({ error: 'answer is required' });
  }
  const client = getClient();
  try {
    await exactSession(client, sessionId);
    exactResource(await client.session.form.get({ sessionID: sessionId, formID: formId }), sessionId);
    await client.session.form.reply({ sessionID: sessionId, formID: formId, answer: req.body.answer });
    return res.json({ formId, status: 'answered' });
  } catch (err) {
    return res.status(upstreamStatus(err)).json({ error: 'Failed to reply to session form' });
  }
});

router.post('/session/:sessionId/forms/:formId/cancel', async (req, res) => {
  const { sessionId, formId } = req.params;
  const client = getClient();
  try {
    await exactSession(client, sessionId);
    exactResource(await client.session.form.get({ sessionID: sessionId, formID: formId }), sessionId);
    await client.session.form.cancel({ sessionID: sessionId, formID: formId });
    return res.json({ formId, status: 'cancelled' });
  } catch (err) {
    return res.status(upstreamStatus(err)).json({ error: 'Failed to cancel session form' });
  }
});

// GET /agent/session/:sessionId/activity - Stream only this session's V2 events.
router.get('/session/:sessionId/activity', async (req, res) => {
  const { sessionId } = req.params;
  const client = getClient();

  try {
    await client.session.get({ sessionID: sessionId });
  } catch {
    return res.status(404).json({ error: 'Agent session not found' });
  }

  const abortController = new AbortController();
  res.once('close', () => abortController.abort());
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write(': connected\n\n');
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15_000);

  try {
    await streamSessionActivity(client, sessionId, res, abortController.signal);
  } catch (err) {
    if (!abortController.signal.aborted) {
      console.error(`[Agent] Activity stream failed for ${sessionId}:`, err.message);
      res.write(`data: ${JSON.stringify({
        id: `stream-${Date.now()}`,
        kind: 'error',
        status: 'failed',
        title: 'Activity stream interrupted',
        timestamp: new Date().toISOString(),
      })}\n\n`);
    }
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

// POST /agent/session - Explicitly create a session for persisted callers.
router.post('/session', async (req, res) => {
  const { title = 'agent-chat', context } = req.body;
  const client = getClient();

  try {
    const session = await client.session.create({ title, location: getLocation() });
    const sessionId = session.id;
    if (context) {
      await client.session.synthetic({
        sessionID: sessionId,
        text: context,
        description: 'LifeOS context',
        resume: false,
      });
    }
    return res.status(200).json({ sessionId });
  } catch (err) {
    console.error('[Agent] Failed to create session:', err.message);
    return res.status(500).json({ error: 'Failed to create agent session' });
  }
});

// POST /agent/session/chat - Continue exactly one existing session.
router.post('/session/chat', async (req, res) => {
  const { sessionId, message, requestId, delivery = 'queue', messageId } = req.body;
  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId and message are required' });
  }
  if (!['steer', 'queue'].includes(delivery)) {
    return res.status(400).json({ error: 'delivery must be steer or queue' });
  }

  const client = getClient();
  try {
    await client.session.get({ sessionID: sessionId });
  } catch (err) {
    return res.status(404).json({ error: 'Agent session not found' });
  }

  const abortController = new AbortController();
  if (requestId) {
    trackRequest(requestId, { abortController, sessionId, startTime: Date.now() });
  }

  try {
    const result = await promptAndWaitDetailed(client, sessionId, message, abortController.signal, {
      delivery,
      lifeOSMessageID: messageId,
    });
    const response = messageText(result.assistant);
    return res.json({
      response,
      sessionId,
      delivery: result.delivery,
      inboxId: result.inbox.id,
      assistantMessageId: result.assistant.id,
    });
  } catch (err) {
    if (err.name === 'AbortError' || abortController.signal.aborted) {
      return res.status(499).json({ error: 'Request was aborted', sessionId });
    }
    console.error(`[Agent] Failed to continue session ${sessionId}:`, err.message);
    return res.status(500).json({ error: 'Failed to send message to agent' });
  } finally {
    untrackRequest(requestId);
  }
});

// POST /agent/chat - Agent chat endpoint with MCP tools access
router.post('/chat', async (req, res) => {
  const { message, sessionId, structuredOutput, context, requestId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  let activeSessionId = sessionId;
  let startTime = Date.now();
  const client = getClient();

  // Create abort controller for this request
  const abortController = new AbortController();

  // Track this request if requestId provided
  if (requestId) {
    activeRequests.set(requestId, {
      abortController,
      sessionId: activeSessionId,
      startTime: Date.now(),
    });
    console.log(`[Agent] Tracking request ${requestId}`);
  }

  try {
    let isNewSession = false;

    if (activeSessionId) {
      try {
        await client.session.get({ sessionID: activeSessionId });
        
        // Check if session is stuck processing (has an incomplete assistant message)
        const messages = await client.message.list({ sessionID: activeSessionId, order: 'desc', limit: 1 });
        const lastMessage = messages.data?.[0];
        const isStuck = lastMessage?.type === 'assistant' && !lastMessage.time.completed;
        
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

    if (!activeSessionId) {
      const session = await client.session.create({
        title: 'agent-chat',
        location: getLocation(),
      });
      activeSessionId = session.id;
      isNewSession = true;
      if (requestId) activeRequests.get(requestId).sessionId = activeSessionId;
      console.log(`[Agent] Created new session: ${activeSessionId}`);
    } else {
      console.log(`[Agent] Using existing session: ${activeSessionId}`);
    }

    // Insert context without resuming the agent loop.
    if (isNewSession && context) {
      console.log(`[Agent] Injecting context silently`);
      await client.session.synthetic({
        sessionID: activeSessionId,
        text: context,
        description: 'LifeOS context',
        resume: false,
      });
      console.log(`[Agent] ✅ Context injected`);
    }

    // V2 session.prompt has no response-format field. Keep the flag and schema
    // lookup for compatibility, but rely on prompt instructions and backend JSON parsing.
    const useStructuredOutput = process.env.USE_STRUCTURED_OUTPUT === 'true';

    if (useStructuredOutput && structuredOutput?.panelType) {
      const schema = schemas[structuredOutput.panelType];
      if (!schema) {
        console.log(`[Agent] ⚠️  Unknown panel type: ${structuredOutput.panelType}, skipping structured output`);
      } else {
        console.log(`[Agent] V2 prompt does not accept a response schema; using prompt-only JSON for panel: ${structuredOutput.panelType}`);
      }
    } else if (structuredOutput?.panelType) {
      console.log(`[Agent] Panel: ${structuredOutput.panelType} (prompt-only mode)`);
    }

    console.log(`[Agent] Sending message: ${message.substring(0, 100)}...`);
    console.log(`[Agent] ⏳ Waiting for response (timeout: 10min)...`);

    startTime = Date.now();
    let result;
    try {
      result = await promptAndWait(
        client,
        activeSessionId,
        message,
        requestSignal(abortController),
      );
    } catch (timeoutError) {
      if (timeoutError.name === 'TimeoutError') {
        console.log(`[Agent] ⏰ Timeout - interrupting session ${activeSessionId}`);
        try {
          await client.session.interrupt({ sessionID: activeSessionId });
          console.log(`[Agent] ✅ Session interrupted successfully`);
        } catch (interruptErr) {
          console.log(`[Agent] ⚠️  Failed to interrupt session:`, interruptErr.message);
        }
        throw new Error('Request timed out after 600s', { cause: timeoutError });
      }
      throw timeoutError;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Agent] ✅ Response received in ${duration}s`);

    const response = messageText(result);

    if (!response) {
      const contentTypes = result.content.map((part) => part.type);
      console.log(`[Agent] ⚠️  Empty text response. Content received: ${JSON.stringify(contentTypes)}`);
    } else {
      console.log(`[Agent] Text response: ${response.substring(0, 100)}...`);
    }

    // Clean up tracking
    if (requestId) {
      activeRequests.delete(requestId);
      console.log(`[Agent] Cleaned up tracking for ${requestId}`);
    }

    return res.json({ response, sessionId: activeSessionId });
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Clean up tracking on error
    if (requestId) {
      activeRequests.delete(requestId);
      console.log(`[Agent] Cleaned up tracking for ${requestId} (error)`);
    }

    // Check if this was an abort
    if (err.name === 'AbortError' || abortController.signal.aborted) {
      console.log(`[Agent] ⚠️  Request aborted after ${duration}s`);
      return res.status(499).json({
        error: 'Request was aborted',
        sessionId: activeSessionId,
        duration: `${duration}s`
      });
    }

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

// POST /agent/abort - Abort a running request
router.post('/abort', async (req, res) => {
  const { requestId } = req.body;

  if (!requestId) {
    return res.status(400).json({ error: 'requestId is required' });
  }

  const request = activeRequests.get(requestId);
  if (!request) {
    console.log(`[Agent] ⚠️  No active request found for ${requestId}`);
    return res.json({ aborted: false, reason: 'Request not found or already completed' });
  }

  console.log(`[Agent] 🛑 Aborting request ${requestId}`);
  const affectedRequestIds = request.sessionId
    ? [...(sessionRequests.get(request.sessionId) || [requestId])]
    : [requestId];
  for (const affectedRequestId of affectedRequestIds) {
    activeRequests.get(affectedRequestId)?.abortController.abort();
  }

  if (request.sessionId) {
    await getClient().session.interrupt({ sessionID: request.sessionId }).catch((err) => {
      console.log(`[Agent] ⚠️  Failed to interrupt session:`, err.message);
    });
  }

  // Clean up tracking
  for (const affectedRequestId of affectedRequestIds) untrackRequest(affectedRequestId);

  return res.json({ aborted: true, requestId, affectedRequestIds });
});

// GET /agent/active - List active requests (for debugging)
router.get('/active', (req, res) => {
  const active = Array.from(activeRequests.entries()).map(([id, data]) => ({
    requestId: id,
    duration: Date.now() - data.startTime,
  }));
  res.json({ active });
});

export default router;
