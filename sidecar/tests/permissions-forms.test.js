import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../app.js';
import { setClient } from '../client.js';

let server;
let baseURL;
const calls = [];

before(async () => {
  setClient({
    session: {
      get: async ({ sessionID }) => ({ id: sessionID }),
      form: {
        list: async ({ sessionID }) => [{ id: 'form-1', sessionID, title: 'Details', fields: [] }],
        get: async ({ sessionID, formID }) => ({ id: formID, sessionID, title: 'Details', fields: [], state: { status: 'pending' } }),
        reply: async (input) => calls.push(['form.reply', input]),
        cancel: async (input) => calls.push(['form.cancel', input]),
      },
    },
    permission: {
      list: async ({ sessionID }) => [{ id: 'permission-1', sessionID, action: 'read', resources: ['/safe'] }],
      get: async ({ sessionID, requestID }) => ({ id: requestID, sessionID, action: 'read', resources: ['/safe'] }),
      reply: async (input) => calls.push(['permission.reply', input]),
    },
  });
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test('lists and replies to V2 permission requests in the exact session', async () => {
  const listed = await fetch(`${baseURL}/agent/session/ses_exact/permissions`);
  assert.equal((await listed.json()).permissions[0].sessionID, 'ses_exact');
  const replied = await fetch(`${baseURL}/agent/session/ses_exact/permissions/permission-1/reply`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decision: 'always' }),
  });
  assert.equal(replied.status, 200);
  assert.deepEqual(calls.at(-1)[1], { sessionID: 'ses_exact', requestID: 'permission-1', decision: 'always', message: undefined });
});

test('hydrates, replies to, and cancels V2 forms in the exact session', async () => {
  const listed = await fetch(`${baseURL}/agent/session/ses_exact/forms`);
  assert.equal((await listed.json()).forms[0].state.status, 'pending');
  await fetch(`${baseURL}/agent/session/ses_exact/forms/form-1/reply`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answer: { count: 2 } }),
  });
  assert.deepEqual(calls.at(-1)[1], { sessionID: 'ses_exact', formID: 'form-1', answer: { count: 2 } });
  await fetch(`${baseURL}/agent/session/ses_exact/forms/form-1/cancel`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.deepEqual(calls.at(-1)[1], { sessionID: 'ses_exact', formID: 'form-1' });
});

test('rejects invalid decisions before calling OpenCode', async () => {
  const response = await fetch(`${baseURL}/agent/session/ses_exact/permissions/permission-1/reply`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decision: 'yes' }),
  });
  assert.equal(response.status, 400);
});
