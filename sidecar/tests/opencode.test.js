import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createOpenCodeClient,
  getExplicitHeaders,
  getLocation,
  messageText,
  promptAndWait,
} from '../opencode.js';

test('builds explicit-server authentication headers from environment', () => {
  assert.deepEqual(getExplicitHeaders({ OPENCODE_AUTHORIZATION: 'Custom secret' }), {
    authorization: 'Custom secret',
  });
  assert.deepEqual(getExplicitHeaders({ OPENCODE_TOKEN: 'secret' }), {
    authorization: 'Bearer secret',
  });
  assert.deepEqual(getExplicitHeaders({ OPENCODE_USERNAME: 'sam', OPENCODE_PASSWORD: 'secret' }), {
    authorization: `Basic ${Buffer.from('sam:secret').toString('base64')}`,
  });
});

test('uses configured OpenCode project location', () => {
  assert.deepEqual(getLocation({ OPENCODE_DIRECTORY: '/workspace/lifeos' }), {
    directory: '/workspace/lifeos',
  });
});

test('uses authenticated local service discovery when OPENCODE_URL is absent', async () => {
  const calls = [];
  const endpoint = { url: 'http://127.0.0.1:4321', auth: { type: 'basic' } };
  const result = await createOpenCodeClient(
    { OPENCODE_DIRECTORY: '/workspace' },
    {
      ServiceClient: {
        ensure: async (options) => {
          calls.push(['ensure', options]);
          return endpoint;
        },
        headers: (value) => {
          calls.push(['headers', value]);
          return { authorization: 'Basic local' };
        },
      },
      OpenCodeClient: {
        make: (options) => {
          calls.push(['make', options]);
          return { kind: 'client' };
        },
      },
    },
  );

  assert.equal(calls[0][0], 'ensure');
  assert.equal(calls[0][1].version('2.0.15'), true);
  assert.equal(calls[0][1].version('1.14.18'), false);
  assert.deepEqual(calls.slice(1), [
    ['headers', endpoint],
    ['make', { baseUrl: endpoint.url, headers: { authorization: 'Basic local' } }],
  ]);
  assert.deepEqual(result.location, { directory: '/workspace' });
});

test('uses an explicit container endpoint and environment authentication', async () => {
  let options;
  const result = await createOpenCodeClient(
    {
      OPENCODE_URL: 'http://host.containers.internal:4097',
      OPENCODE_TOKEN: 'container-secret',
      PROJECT_DIR: '/project',
    },
    {
      ServiceClient: {
        ensure: async () => assert.fail('local service discovery must not run'),
      },
      OpenCodeClient: {
        make: (value) => {
          options = value;
          return { kind: 'client' };
        },
      },
    },
  );

  assert.deepEqual(options, {
    baseUrl: 'http://host.containers.internal:4097',
    headers: { authorization: 'Bearer container-secret' },
  });
  assert.deepEqual(result.location, { directory: '/project' });
});

test('promptAndWait selects the completed assistant after its exact V2 user message', async () => {
  const messages = [
    { id: 'msg_old', type: 'user', time: { created: 1 }, text: 'old' },
    { id: 'msg_old_reply', type: 'assistant', time: { created: 2, completed: 3 }, content: [{ type: 'text', text: 'old reply' }] },
  ];
  const calls = [];
  const client = {
    session: {
      prompt: async (input) => {
        calls.push(['prompt', input]);
        messages.push({ id: input.id, type: 'user', time: { created: 4 }, text: input.text });
        messages.push({ id: 'msg_new_reply', type: 'assistant', time: { created: 5, completed: 6 }, content: [{ type: 'text', text: 'new reply' }] });
        messages.push({ id: 'msg_later_user', type: 'user', time: { created: 7 }, text: 'concurrent prompt' });
        messages.push({ id: 'msg_later_reply', type: 'assistant', time: { created: 8, completed: 9 }, content: [{ type: 'text', text: 'wrong reply' }] });
        return { id: 'inbox-1', type: 'user' };
      },
      wait: async (input) => calls.push(['wait', input]),
    },
    message: {
      list: async (input) => {
        calls.push(['list', input]);
        return { data: [...messages].reverse(), cursor: {} };
      },
    },
  };

  const result = await promptAndWait(client, 'ses_test', 'new prompt');
  assert.equal(messageText(result), 'new reply');
  assert.deepEqual(calls.map(([name]) => name), ['prompt', 'wait', 'list']);
  assert.match(calls[0][1].id, /^msg_/);
});
