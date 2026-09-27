import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Empty folder where all LifeOS sessions live. It sits next to the sidecar
// package (repo root) so the agent never starts inside real project code.
const here = path.dirname(fileURLToPath(import.meta.url));
export const SANDBOX_DIR = path.join(here, '..', '.opencode-sandbox');

// Built-in tools the agent may not use. Notes only come via the MCP.
const DENIED_TOOLS = ['shell', 'read', 'edit', 'glob', 'grep', 'execute'];

// Build the sandbox config. MCP stays allowed so list_files/read_file keep working.
export function sandboxConfig(env = process.env) {
  const port = env.LIFEOS_PORT || env.BACKEND_PORT || '6060';
  const mcpUrl = env.LIFEOS_MCP_URL || `http://localhost:${port}/mcp`;
  return {
    $schema: 'https://opencode.ai/config.json',
    permissions: DENIED_TOOLS.map((action) => ({ action, resource: '*', effect: 'deny' })),
    mcp: {
      servers: {
        'lifeos-files': {
          type: 'remote',
          url: mcpUrl,
          oauth: false,
          headers: { Authorization: 'Bearer {env:MCP_API_KEY}' },
        },
      },
    },
  };
}

// Make the sandbox folder and config. Returns the folder path.
export function ensureSandbox(env = process.env) {
  const dir = env.OPENCODE_DIRECTORY || env.PROJECT_DIR || SANDBOX_DIR;
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'opencode.json'), JSON.stringify(sandboxConfig(env), null, 2) + '\n');
  return dir;
}
