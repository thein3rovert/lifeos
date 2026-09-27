import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Empty folder where all LifeOS sessions live. It sits next to the sidecar
// package (repo root) so the agent never starts inside real project code.
const here = path.dirname(fileURLToPath(import.meta.url));
export const SANDBOX_DIR = path.join(here, '..', '.opencode-sandbox');

// Only these two MCP actions can run. Direct MCP tools do not need Code Mode.
const ALLOWED_TOOLS = ['lifeos-files_list_files', 'lifeos-files_read_file'];
const LIFEOS_PERMISSIONS = [
  { action: '*', resource: '*', effect: 'deny' },
  ...ALLOWED_TOOLS.map((action) => ({ action, resource: '*', effect: 'allow' })),
];

// Name of the locked-down agent every LifeOS session runs as.
export const LIFEOS_AGENT = 'lifeos';

// Short system prompt baked into the agent so every chat knows to use the
// MCP for notes without being told each time.
const LIFEOS_SYSTEM = `You help Samad with his journals and meeting notes.

Rules:
- Read notes ONLY with the lifeos-files MCP tools (list_files, read_file).
- Do not use other tools, subagents, skills, or web searches.
- Only list and read meeting or journal folders provided by LifeOS. Do not
  explore your working directory, home folder, or unrelated paths.
- If the MCP fails, say you cannot access the notes; do not guess or try another source.
- Answer the user's question directly and briefly.`;

// Build the sandbox config. Project-level denies are a backstop; the real
// lock is the lifeos agent below, whose own rules win over the defaults.
export function sandboxConfig(env = process.env) {
  const port = env.LIFEOS_PORT || env.BACKEND_PORT || '6060';
  const mcpUrl = env.LIFEOS_MCP_URL || `http://localhost:${port}/mcp`;
  return {
    $schema: 'https://opencode.ai/config.json',
    permissions: LIFEOS_PERMISSIONS,
    agents: {
      [LIFEOS_AGENT]: {
        description: 'LifeOS assistant. Reads notes through the lifeos-files MCP only.',
        mode: 'primary',
        system: LIFEOS_SYSTEM,
        steps: 12,
        permissions: LIFEOS_PERMISSIONS,
      },
    },
    mcp: {
      servers: {
        'lifeos-files': {
          type: 'remote',
          url: mcpUrl,
          oauth: false,
          codemode: false,
          headers: { Authorization: 'Bearer {env:MCP_API_KEY}' },
        },
      },
    },
  };
}

// Make the sandbox folder and config. Returns the folder path.
export function ensureSandbox(env = process.env) {
  const dir = path.resolve(env.OPENCODE_DIRECTORY || env.PROJECT_DIR || SANDBOX_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'opencode.json'), JSON.stringify(sandboxConfig(env), null, 2) + '\n');
  return dir;
}
