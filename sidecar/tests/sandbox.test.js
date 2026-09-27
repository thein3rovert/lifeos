import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { getLocation } from '../opencode.js';
import { SANDBOX_DIR, ensureSandbox, sandboxConfig } from '../sandbox.js';

test('sandbox config denies built-in file and shell tools', () => {
  const config = sandboxConfig({ LIFEOS_PORT: '6060' });
  const denied = config.permissions
    .filter((rule) => rule.effect === 'deny')
    .map((rule) => rule.action);
  for (const tool of ['shell', 'read', 'edit', 'glob', 'grep']) {
    assert.ok(denied.includes(tool), `expected ${tool} to be denied`);
  }
});

test('sandbox config keeps the lifeos-files MCP', () => {
  const config = sandboxConfig({ LIFEOS_PORT: '6060' });
  const mcp = config.mcp.servers['lifeos-files'];
  assert.equal(mcp.type, 'remote');
  assert.equal(mcp.url, 'http://localhost:6060/mcp');
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

test('ensureSandbox writes the config file', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'lifeos-sandbox-'));
  const result = ensureSandbox({ OPENCODE_DIRECTORY: dir, LIFEOS_PORT: '6060' });
  assert.equal(result, dir);
  const saved = JSON.parse(readFileSync(path.join(dir, 'opencode.json'), 'utf8'));
  assert.ok(existsSync(path.join(dir, 'opencode.json')));
  assert.ok(saved.permissions.some((rule) => rule.action === 'shell' && rule.effect === 'deny'));
});
