import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createApp } from '../app.js';
import { setClient } from '../client.js';

let baseURL;
let server;
let state;

function assistant(id, text, created = Date.now()) {
  return {
    id,
    type: 'assistant',
    time: { created, completed: created + 1 },
    content: [{ type: 'text', text }],
  };
}

function mockClient() {
  return {
    session: {
      create: async (input) => {
        state.create.push(input);
        return { id: 'ses_session1', location: input.location };
      },
      get: async ({ sessionID }) => {
        state.get.push({ sessionID });
        if (sessionID === 'ses_missing') throw new Error('not found');
        return { id: sessionID };
      },
      prompt: async (input, options) => {
        state.prompt.push({ input, options });
        state.messages.push({
          id: input.id,
          type: 'user',
          time: { created: Date.now() },
          text: input.text,
        });
        state.messages.push(assistant(`msg_reply${state.prompt.length}`, 'reply'));
        return { id: `inbox-${state.prompt.length}`, type: 'user' };
      },
      wait: async (input, options) => {
        state.wait.push({ input, options });
      },
      synthetic: async (input) => {
        state.synthetic.push(input);
        return { id: 'inbox-context', type: 'synthetic' };
      },
      interrupt: async (input) => {
        state.interrupt.push(input);
        return { interrupted: true };
      },
      remove: async (input) => {
        state.remove.push(input);
      },
    },
    message: {
      list: async (input) => {
        state.messageList.push(input);
        let data = [...state.messages];
        if (input.type) data = data.filter((message) => message.type === input.type);
        if (input.order === 'desc') data.reverse();
        if (input.limit) data = data.slice(0, input.limit);
        return { data, cursor: {} };
      },
    },
  };
}

before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  state = {
    create: [], get: [], prompt: [], wait: [], synthetic: [], interrupt: [],
    remove: [], messageList: [], messages: [],
  };
  setClient(mockClient());
});

after(() => server.close());

async function post(path, body) {
  return fetch(`${baseURL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('creates an explicit V2 session and injects context without running the agent', async () => {
  const response = await post('/agent/session', { title: 'floating', context: 'recent panels' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { sessionId: 'ses_session1' });
  assert.equal(state.create[0].title, 'floating');
  assert.equal(typeof state.create[0].location.directory, 'string');
  assert.deepEqual(state.synthetic[0], {
    sessionID: 'ses_session1',
    text: 'recent panels',
    description: 'LifeOS context',
    resume: false,
  });
  assert.equal(state.prompt.length, 0);
});

test('strict continuation uses V2 prompt, wait, and message list without replacement', async () => {
  const missing = await post('/agent/session/chat', { sessionId: 'ses_missing', message: 'hello' });
  assert.equal(missing.status, 404);
  assert.equal(state.create.length, 0);

  const existing = await post('/agent/session/chat', { sessionId: 'ses_session1', message: 'hello' });
  assert.equal(existing.status, 200);
  assert.deepEqual(await existing.json(), {
    response: 'reply', sessionId: 'ses_session1', delivery: 'queue', inboxId: 'inbox-1',
    assistantMessageId: 'msg_reply1',
  });
  assert.equal(state.prompt[0].input.sessionID, 'ses_session1');
  assert.match(state.prompt[0].input.id, /^msg_/);
  assert.equal(state.prompt[0].input.text, 'hello');
  assert.equal(state.prompt[0].input.delivery, 'queue');
  assert.deepEqual(state.wait[0].input, { sessionID: 'ses_session1' });
  assert.deepEqual(state.messageList.at(-1), { sessionID: 'ses_session1', order: 'desc', limit: 100 });
  assert.equal(state.create.length, 0);
});

test('legacy agent chat preserves its response while using V2 contracts', async () => {
  const response = await post('/agent/chat', { message: 'legacy hello', context: 'board context' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { response: 'reply', sessionId: 'ses_session1' });
  assert.equal(state.create.length, 1);
  assert.equal(state.synthetic[0].text, 'board context');
  assert.equal(state.prompt[0].input.text, 'legacy hello');
  assert.equal(state.wait.length, 1);
});

test('skill session chat and history retain the LifeOS-facing API', async () => {
  const created = await post('/session/getOrCreate', { skillId: 'writing', skillTitle: 'Writing' });
  assert.deepEqual(await created.json(), { sessionId: 'ses_session1' });

  const chat = await post('/session/chat', {
    sessionId: 'ses_session1',
    message: 'Improve this',
    skillContent: '# Existing',
  });
  assert.deepEqual(await chat.json(), { response: 'reply' });
  assert.match(state.prompt[0].input.text, /# Existing/);
  assert.match(state.prompt[0].input.text, /Improve this/);

  const history = await post('/session/messages', { sessionId: 'ses_session1' });
  const body = await history.json();
  assert.equal(body.messages[0].role, 'user');
  assert.equal(body.messages[1].role, 'assistant');
  assert.equal(body.messages[1].content, 'reply');
});

test('skill update removes its temporary V2 session', async () => {
  const response = await post('/skill/update', { existingSkill: '# Skill', newNotes: 'Add guidance' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { updatedSkill: 'reply' });
  assert.deepEqual(state.remove, [{ sessionID: 'ses_session1' }]);
});

test('abort interrupts the OpenCode V2 session as well as the HTTP wait', async () => {
  const client = mockClient();
  client.session.wait = async (input, options) => {
    state.wait.push({ input, options });
    await new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    });
  };
  setClient(client);

  const pending = post('/agent/session/chat', {
    sessionId: 'ses_session1', message: 'long task', requestId: 'request-1',
  });
  while (state.wait.length === 0) await new Promise((resolve) => setTimeout(resolve, 1));

  const aborted = await post('/agent/abort', { requestId: 'request-1' });
  assert.deepEqual(await aborted.json(), {
    aborted: true, requestId: 'request-1', affectedRequestIds: ['request-1'],
  });
  assert.deepEqual(state.interrupt, [{ sessionID: 'ses_session1' }]);
  assert.equal((await pending).status, 499);
});

test('propagates steer and queue delivery and aborts every simultaneous wait for the session', async () => {
  const client = mockClient();
  client.session.wait = async (input, options) => {
    state.wait.push({ input, options });
    await new Promise((resolve, reject) => {
      options.signal.addEventListener(
        'abort',
        () => reject(new DOMException('aborted', 'AbortError')),
        { once: true },
      );
    });
  };
  setClient(client);

  const first = post('/agent/session/chat', {
    sessionId: 'ses_session1', message: 'first', requestId: 'request-a',
    messageId: 'life-a', delivery: 'queue',
  });
  const second = post('/agent/session/chat', {
    sessionId: 'ses_session1', message: 'second', requestId: 'request-b',
    messageId: 'life-b', delivery: 'steer',
  });
  while (state.wait.length < 2) await new Promise((resolve) => setTimeout(resolve, 1));

  assert.deepEqual(state.prompt.map(({ input }) => [input.text, input.delivery]), [
    ['first', 'queue'], ['second', 'steer'],
  ]);
  assert.match(state.prompt[0].input.id, /^msg_/);
  assert.deepEqual(state.prompt[1].input.metadata, { lifeOSMessageID: 'life-b' });

  const stopped = await post('/agent/abort', { requestId: 'request-a' });
  const stopBody = await stopped.json();
  assert.deepEqual(new Set(stopBody.affectedRequestIds), new Set(['request-a', 'request-b']));
  assert.equal((await first).status, 499);
  assert.equal((await second).status, 499);
  assert.deepEqual(state.interrupt, [{ sessionID: 'ses_session1' }]);
});
