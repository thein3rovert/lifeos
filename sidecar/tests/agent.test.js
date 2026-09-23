import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../app.js';
import { setClient } from '../client.js';

let baseURL;
let server;
let createCalls;
let promptSession;

before(async () => {
  createCalls = 0;
  setClient({
    session: {
      create: async () => {
        createCalls += 1;
        return { data: { id: 'session-1' } };
      },
      get: async ({ path }) => {
        if (path.id === 'missing') throw new Error('not found');
        return { data: { id: path.id } };
      },
      prompt: async ({ path }) => {
        promptSession = path.id;
        return { data: { parts: [{ type: 'text', text: 'reply' }] } };
      },
    },
  });
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('creates an explicit agent session', async () => {
  const response = await fetch(`${baseURL}/agent/session`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'floating' }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { sessionId: 'session-1' });
  assert.equal(createCalls, 1);
});

test('strict continuation never creates a replacement session', async () => {
  const missing = await fetch(`${baseURL}/agent/session/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 'missing', message: 'hello' }),
  });
  assert.equal(missing.status, 404);
  assert.equal(createCalls, 1);

  const existing = await fetch(`${baseURL}/agent/session/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 'session-1', message: 'hello' }),
  });
  assert.equal(existing.status, 200);
  assert.equal(promptSession, 'session-1');
  assert.equal(createCalls, 1);
});

test('legacy agent chat still creates a session when none is supplied', async () => {
  const response = await fetch(`${baseURL}/agent/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'legacy hello' }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { response: 'reply', sessionId: 'session-1' });
  assert.equal(createCalls, 2);
});
