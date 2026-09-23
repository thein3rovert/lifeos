import { Router } from 'express';
import { getClient } from '../client.js';
import { getLocation, messageText, promptAndWait } from '../opencode.js';

const router = Router();

// POST /skill/update - Update a skill with AI assistance
router.post('/update', async (req, res) => {
  console.log('\n=== NEW REQUEST ===');
  console.log('Time:', new Date().toISOString());
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  const { existingSkill, newNotes } = req.body;

  if (!existingSkill || !newNotes) {
    console.log('ERROR: Missing required fields');
    console.log('  - existingSkill present:', !!existingSkill);
    console.log('  - newNotes present:', !!newNotes);
    return res.status(400).json({ error: 'existingSkill and newNotes are required' });
  }

  console.log('Input sizes:');
  console.log('  - existingSkill length:', existingSkill.length, 'chars');
  console.log('  - newNotes length:', newNotes.length, 'chars');

  let sessionId;
  const client = getClient();

  try {
    console.log('Creating OpenCode session...');
    const session = await client.session.create({
      title: 'skill-update',
      location: getLocation(),
    });
    sessionId = session.id;
    console.log('Session created:', sessionId);

    const prompt = `You are a skills manager. You will be given an existing skill file in markdown format and some new notes/learnings.

Your job is to intelligently update the skill file by incorporating the new notes. Do not just append — rewrite and restructure as needed so the skill file remains clean, useful and well organised.

Return ONLY the updated markdown skill file, nothing else.

--- EXISTING SKILL ---
${existingSkill}

--- NEW NOTES ---
${newNotes}`;

    console.log('Sending prompt to AI...');
    const result = await promptAndWait(client, sessionId, prompt);
    console.log('AI response received');

    const updatedSkill = messageText(result);

    console.log('Updated skill generated:');
    console.log('  - Length:', updatedSkill.length, 'chars');
    console.log('  - Preview:', updatedSkill.substring(0, 100), '...');

    await client.session.remove({ sessionID: sessionId });
    console.log('Session cleaned up');

    console.log('=== SUCCESS ===\n');
    return res.json({ updatedSkill });
  } catch (err) {
    console.error('ERROR updating skill:', err.message);
    console.error('Stack:', err.stack);

    if (sessionId) {
      await client.session.remove({ sessionID: sessionId }).catch(() => {});
    }

    console.log('=== FAILED ===\n');
    return res.status(500).json({ error: 'Failed to update skill' });
  }
});

export default router;
