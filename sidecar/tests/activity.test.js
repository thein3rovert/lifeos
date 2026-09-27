import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeActivityEvent, streamSessionActivity } from '../activity.js';

function event(type, data, id = type) {
  return { id, type, created: 1_800_000_000_000, data };
}

test('filters every event without the exact requested session ID', () => {
  const tools = new Map();
  assert.equal(normalizeActivityEvent(event('session.execution.started', { sessionID: 'other' }), 'wanted', tools), null);
  assert.equal(normalizeActivityEvent(event('filesystem.changed', { file: '/secret', event: 'change' }), 'wanted', tools), null);
  assert.equal(normalizeActivityEvent(event('mcp.status.changed', { server: 'private' }), 'wanted', tools), null);
});

test('normalizes status, reasoning, file, MCP, and error events without session IDs', () => {
  const tools = new Map();
  const status = normalizeActivityEvent(event('session.execution.started', { sessionID: 'wanted' }), 'wanted', tools);
  const reasoning = normalizeActivityEvent(event('session.reasoning.started', { sessionID: 'wanted' }), 'wanted', tools);
  const fileStart = normalizeActivityEvent(event('session.tool.input.started', {
    sessionID: 'wanted', id: 'call-file', name: 'read',
  }), 'wanted', tools);
  const fileCall = normalizeActivityEvent(event('session.tool.called', {
    sessionID: 'wanted', id: 'call-file', input: { path: '/vault/today.md' }, executed: true,
  }), 'wanted', tools);
  const mcp = normalizeActivityEvent(event('session.tool.input.started', {
    sessionID: 'wanted', id: 'call-mcp', name: 'mcp_obsidian__read_note',
  }), 'wanted', tools);
  const failure = normalizeActivityEvent(event('session.tool.failed', {
    sessionID: 'wanted', id: 'call-mcp', error: { type: 'tool', message: 'Unavailable' }, executed: true,
  }), 'wanted', tools);

  assert.deepEqual([status.kind, reasoning.kind, fileStart.kind, fileCall.kind, mcp.kind, failure.kind],
    ['status', 'reasoning', 'file', 'file', 'mcp', 'error']);
  assert.equal(fileCall.detail, '/vault/today.md');
  assert.equal(failure.detail, 'Unavailable');
  for (const item of [status, reasoning, fileStart, fileCall, mcp, failure]) {
    assert.equal('sessionID' in item, false);
  }
});

test('shows MCP calls that run as Code Mode under their own name', () => {
  const tools = new Map();
  normalizeActivityEvent(event('session.tool.input.started', {
    sessionID: 'wanted', id: 'call-exec', name: 'execute',
  }), 'wanted', tools);
  const called = normalizeActivityEvent(event('session.tool.called', {
    sessionID: 'wanted',
    id: 'call-exec',
    input: { code: 'const r = await tools["lifeos-files"]["list_files"]({ path: "/j" });\nreturn r;' },
  }), 'wanted', tools);
  const done = normalizeActivityEvent(event('session.tool.success', {
    sessionID: 'wanted', id: 'call-exec',
  }), 'wanted', tools);

  assert.equal(called.kind, 'mcp');
  assert.equal(called.title, 'lifeos-files.list_files');
  assert.equal(called.detail, '/j');
  assert.equal(done.kind, 'mcp');
  assert.equal(done.title, 'lifeos-files.list_files');
});

test('streams only normalized events for the requested session', async () => {
  const client = {
    event: {
      subscribe: async function* () {
        yield event('session.execution.started', { sessionID: 'other' }, 'one');
        yield event('session.execution.started', { sessionID: 'wanted' }, 'two');
      },
    },
  };
  let output = '';
  await streamSessionActivity(client, 'wanted', { write: (chunk) => { output += chunk; } });
  assert.doesNotMatch(output, /one|other/);
  assert.match(output, /id: two/);
  assert.match(output, /"kind":"status"/);
});
