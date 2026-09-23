import { Router } from 'express';
import { getClient } from '../client.js';
import { getLocation, messageText, promptAndWait } from '../opencode.js';

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
        await client.session.get({ sessionID: sessionId });
        console.log(`Resuming existing session: ${sessionId}`);
        return res.json({ sessionId });
      } catch (err) {
        console.log(`Session ${sessionId} not found, creating new one`);
      }
    }

    const session = await client.session.create({
      title: `skill-${skillId}`,
      location: getLocation(),
    });
    console.log(`Created new session: ${session.id}`);
    return res.json({ sessionId: session.id });
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

    const result = await promptAndWait(client, sessionId, prompt);
    const response = messageText(result);

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

    const messages = await client.message.list({ sessionID: sessionId, order: 'asc' });

    console.log(`[Messages] Found ${messages.data.length} messages`);

    // Format for frontend
    const formattedMessages = messages.data.map((msg) => ({
      id: msg.id,
      role: msg.type,
      content: messageText(msg),
      created: msg.time.created,
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
