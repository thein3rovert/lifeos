import { Router } from 'express';
import { getClient } from '../client.js';

const router = Router();

// POST /session/getOrCreate - Create or get session for a skill
router.post('/getOrCreate', async (req, res) => {
  const { skillId, skillTitle, sessionId } = req.body;

  if (!skillId || !skillTitle) {
    return res.status(400).json({ error: 'skillId and skillTitle are required' });
  }

  const client = getClient();

  try {
    if (sessionId) {
      try {
        await client.session.get({ path: { id: sessionId } });
        console.log(`Resuming existing session: ${sessionId}`);
        return res.json({ sessionId });
      } catch (err) {
        console.log(`Session ${sessionId} not found, creating new one`);
      }
    }

    const session = await client.session.create({
      body: { title: `skill-${skillId}` },
    });
    console.log(`Created new session: ${session.data.id}`);
    return res.json({ sessionId: session.data.id });
  } catch (err) {
    console.error('Failed to get/create session:', err.message);
    return res.status(500).json({ error: 'Failed to manage session' });
  }
});

// POST /session/chat - Send a chat message to a session
router.post('/chat', async (req, res) => {
  const { sessionId, message, skillContent } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId and message are required' });
  }

  const client = getClient();

  try {
    console.log(`Sending message to session ${sessionId}`);

    let prompt = message;
    if (skillContent) {
      prompt = `Context: You are helping improve this skill document:

${skillContent}

User: ${message}`;
    }

    const result = await client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: 'text', text: prompt }],
      },
    });

    const response = result.data.parts
      .filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join('');

    console.log(`Response received from session ${sessionId}`);
    return res.json({ response });
  } catch (err) {
    console.error('Failed to send chat message:', err.message);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /session/messages - Get chat history for a session
router.post('/messages', async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const client = getClient();

  try {
    console.log(`[Messages] Fetching messages for session: ${sessionId}`);

    // Use correct SDK method: client.session.messages()
    const messages = await client.session.messages({
      path: { id: sessionId },
    });

    console.log(`[Messages] Found ${messages.data.length} messages`);

    // Format for frontend
    const formattedMessages = messages.data.map((msg) => ({
      id: msg.info.id,
      role: msg.info.role,
      content: msg.parts
        .filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join(''),
      created: msg.info.created,
    }));

    return res.json({ messages: formattedMessages });
  } catch (err) {
    console.error('[Messages] Failed:', err.message);

    // Session might not exist or have no messages
    if (err.message.includes('not found')) {
      return res.json({ messages: [] });
    }

    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
