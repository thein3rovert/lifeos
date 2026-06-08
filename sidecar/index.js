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

const PORT = 3002;

async function initOpencode() {
  try {
    const client = createOpencodeClient({
      baseUrl: 'http://127.0.0.1:4097',
      fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(600_000) }), // 10 min timeout
    });

    // Health check
    const res = await fetch('http://127.0.0.1:4097/global/health');
    const res2 = await fetch('http://127.0.0.1:4097/config');
    const config = await res2.json();
    console.log('Model:', JSON.stringify(config.model, null, 2));

    if (!res.ok) throw new Error('OpenCode not healthy');
    const data = await res.json();
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

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Sidecar running on http://127.0.0.1:${PORT}`);
  });
}

main();
