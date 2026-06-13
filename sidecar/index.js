import { createOpencodeClient } from '@opencode-ai/sdk';
import { Agent, setGlobalDispatcher } from 'undici';
import { createApp } from './app.js';
import { setClient } from './client.js';

// Configure global dispatcher with longer timeouts to prevent
// HeadersTimeoutError (default is 300s) on long AI requests
setGlobalDispatcher(
  new Agent({
    headersTimeout: 600_000, // 10 minutes
    bodyTimeout: 600_000,    // 10 minutes
    connectTimeout: 30_000,  // 30 seconds
  })
);

// TODO: This should be in env
const PORT = process.env.PORT || 3002;
const OPENCODE_URL = process.env.OPENCODE_URL || 'http://127.0.0.1:4097';

async function initOpencode() {
  try {
    const client = createOpencodeClient({
      baseUrl: OPENCODE_URL,
      fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(600_000) }), // 10 min timeout
    });

    // Health check
    const checkHealthRequest = await fetch(`${OPENCODE_URL}/global/health`);
    const opencodeConfigRequest = await fetch(`${OPENCODE_URL}/config`);
    const config = await opencodeConfigRequest.json();
    console.log('Model:', JSON.stringify(config.model, null, 2));

    if (!checkHealthRequest.ok) throw new Error('OpenCode not healthy');
    const data = await checkHealthRequest.json();
    console.log('Connected to OpenCode, version:', data.version);

    // Set the shared client instance
    setClient(client);

    return client;
  } catch (err) {
    console.error('Failed to connect to OpenCode:', err.message);
    process.exit(1);
  }
}

async function main() {
  await initOpencode();

  const app = createApp();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sidecar running on http://0.0.0.0:${PORT}`);
  });
}

main();
