import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { getLocation } from '../opencode.js';
import { LIFEOS_AGENT, SANDBOX_DIR, ensureSandbox, sandboxConfig } from '../sandbox.js';

test('sandbox config denies everything except two LifeOS MCP tools', () => {
  const config = sandboxConfig({ LIFEOS_PORT: '6060' });
  assert.deepEqual(config.permissions, [
    { action: '*', resource: '*', effect: 'deny' },
    { action: 'lifeos-files_list_files', resource: '*', effect: 'allow' },
    { action: 'lifeos-files_read_file', resource: '*', effect: 'allow' },
  ]);
  assert.deepEqual(Object.keys(config.mcp.servers), ['lifeos-files']);
});

test('sandbox config keeps the lifeos-files MCP', () => {
  const config = sandboxConfig({ LIFEOS_PORT: '6060' });
  const mcp = config.mcp.servers['lifeos-files'];
  assert.equal(mcp.type, 'remote');
  assert.equal(mcp.url, 'http://localhost:6060/mcp');
  assert.equal(mcp.codemode, false);
});

test('sessions default to the sandbox, not the project folder', () => {
  assert.deepEqual(getLocation({}), { directory: SANDBOX_DIR });
  assert.ok(!SANDBOX_DIR.endsWith('sidecar'));
});

test('explicit session folder still wins over the sandbox', () => {
  assert.deepEqual(getLocation({ OPENCODE_DIRECTORY: '/workspace/lifeos' }), {
    directory: '/workspace/lifeos',
  });
});

test('sandbox ships a locked-down lifeos agent', () => {
  const config = sandboxConfig({ LIFEOS_PORT: '6060' });
  const agent = config.agents[LIFEOS_AGENT];
  assert.equal(agent.mode, 'primary');
  assert.equal(agent.steps, 12);
  assert.match(agent.system, /lifeos-files/);
  assert.deepEqual(agent.permissions, config.permissions);
});

test('ensureSandbox writes the config file', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'lifeos-sandbox-'));
  const result = ensureSandbox({ OPENCODE_DIRECTORY: dir, LIFEOS_PORT: '6060' });
  assert.equal(result, dir);
  const saved = JSON.parse(readFileSync(path.join(dir, 'opencode.json'), 'utf8'));
  assert.ok(existsSync(path.join(dir, 'opencode.json')));
  assert.equal(saved.permissions[0].action, '*');
});
