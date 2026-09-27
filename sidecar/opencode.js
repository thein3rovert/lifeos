import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { OpenCode } from '@opencode/client';
import { Service } from '@opencode/client/service';
import { SANDBOX_DIR } from './sandbox.js';

const DEFAULT_TIMEOUT_MS = 600_000;

export function getLocation(env = process.env) {
  return {
    directory: env.OPENCODE_DIRECTORY || env.PROJECT_DIR || SANDBOX_DIR,
  };
}

// Reconnect our MCP after the backend is ready. OpenCode may have saved an
// earlier connection failure, so checking the config file alone is not enough.
export async function connectLifeOSMCP(client, location) {
  await client.mcp.connect({ server: 'lifeos-files', location });
  const servers = await client.mcp.list({ location });
  const lifeos = servers.data.find((server) => server.name === 'lifeos-files');
  if (lifeos?.status?.status !== 'connected') {
    throw new Error(`lifeos-files MCP is not connected: ${lifeos?.status?.status || 'missing'}`);
  }
}

export function getExplicitHeaders(env = process.env) {
  if (env.OPENCODE_AUTHORIZATION) {
    return { authorization: env.OPENCODE_AUTHORIZATION };
  }
  if (env.OPENCODE_TOKEN) {
    return { authorization: `Bearer ${env.OPENCODE_TOKEN}` };
  }
  if (env.OPENCODE_USERNAME || env.OPENCODE_PASSWORD) {
    const credentials = Buffer.from(
      `${env.OPENCODE_USERNAME || ''}:${env.OPENCODE_PASSWORD || ''}`,
    ).toString('base64');
    return { authorization: `Basic ${credentials}` };
  }
  return undefined;
}

export async function createOpenCodeClient(
  env = process.env,
  { OpenCodeClient = OpenCode, ServiceClient = Service } = {},
) {
  let baseUrl = env.OPENCODE_URL;
  let headers;

  if (env.OPENCODE_SERVICE_FILE) {
    // Dedicated production service: use its generated credentials, never the
    // machine's default OpenCode service or a hard-coded shared password.
    const registration = JSON.parse(readFileSync(env.OPENCODE_SERVICE_FILE, 'utf8'));
    if (!registration.version?.startsWith('2.') || !registration.password || !baseUrl) {
      throw new Error('Invalid LifeOS OpenCode service registration or URL');
    }
    headers = ServiceClient.headers({ auth: { username: 'opencode', password: registration.password } });
  } else if (baseUrl) {
    headers = getExplicitHeaders(env);
  } else {
    const endpoint = await ServiceClient.ensure({
      version: (version) => version.startsWith('2.'),
    });
    baseUrl = endpoint.url;
    headers = ServiceClient.headers(endpoint);
  }

  return {
    client: OpenCodeClient.make({ baseUrl, headers }),
    baseUrl,
    location: getLocation(env),
  };
}

// Parse user/assistant message from opencode
// into plain text
export function messageText(message) {
  if (message.type === 'assistant') {
    return message.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('');
  }
  if (message.type === 'user' || message.type === 'synthetic' || message.type === 'system') {
    return message.text;
  }
  return '';
}

// Send user message as queued, wait for agent to go idea
// thn find the newesr completed assistant reply and return
// it
export async function promptAndWaitDetailed(client, sessionID, text, signal, options = {}) {
  const messageID = options.messageID || `msg_${randomUUID().replaceAll('-', '')}`;
  const delivery = options.delivery || 'queue';
  const inbox = await client.session.prompt(
    {
      sessionID,
      id: messageID,
      text,
      delivery,
      metadata: options.lifeOSMessageID ? { lifeOSMessageID: options.lifeOSMessageID } : undefined,
    },
    { signal },
  );
  await client.session.wait({ sessionID }, { signal });

  const result = await client.message.list(
    { sessionID, order: 'desc', limit: 100 },
    { signal },
  );
  const userIndex = result.data.findIndex((message) => message.id === messageID);
  if (userIndex < 0) {
    throw new Error('OpenCode completed the prompt but its user message was not returned');
  }

  // Results are newest-first. Take assistants newer than this user message.
  // Normally take the newest one that has text. The earliest one is
  // sometimes a tool-only step with no text, which used to save as an
  // empty reply. But a newer user message means a steered or concurrent
  // prompt shares this run, so keep the earliest pick there so both
  // callers see the same final assistant message.
  const newer = result.data.slice(0, userIndex);
  const crossed = newer.some((message) => message.type === 'user');
  const completed = newer.filter(
    (message) => message.type === 'assistant' && message.time.completed,
  );
  const assistant = crossed
    ? completed[completed.length - 1]
    : completed.find((message) => messageText(message)) || completed[completed.length - 1];
  if (!assistant) {
    throw new Error('OpenCode completed the prompt without a final assistant message');
  }
  if (assistant.error) {
    throw new Error(assistant.error.message || 'OpenCode assistant response failed');
  }
  return { assistant, inbox, messageID, delivery };
}

export async function promptAndWait(client, sessionID, text, signal, options = {}) {
  return (await promptAndWaitDetailed(client, sessionID, text, signal, options)).assistant;
}

export function requestSignal(controller, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)]);
}
