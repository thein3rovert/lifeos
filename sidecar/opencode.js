import { randomUUID } from 'node:crypto';
import { OpenCode } from '@opencode/client';
import { Service } from '@opencode/client/service';

const DEFAULT_TIMEOUT_MS = 600_000;

export function getLocation(env = process.env) {
  return {
    directory: env.OPENCODE_DIRECTORY || env.PROJECT_DIR || process.cwd(),
  };
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

  if (baseUrl) {
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

  // Results are newest-first. The first completed assistant newer than this
  // user is its response. This deliberately crosses a steered user message:
  // steering folds that input into the execution already in progress, so both
  // HTTP callers observe the same final assistant message. Queued input is
  // delivered after the prior assistant and therefore still maps in order.
  const assistant = result.data.slice(0, userIndex).findLast(
    (message) => message.type === 'assistant' && message.time.completed,
  );
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
