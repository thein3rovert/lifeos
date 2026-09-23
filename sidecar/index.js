import { Agent, setGlobalDispatcher } from 'undici';
import { createApp } from './app.js';
import { setClient } from './client.js';
import { createOpenCodeClient } from './opencode.js';

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
async function initOpencode() {
  try {
    const { client, baseUrl, location } = await createOpenCodeClient();
    const info = await client.server.info();
    await client.location.get({ location });
    console.log(`Connected to OpenCode ${info.version} at ${baseUrl}`);
    console.log('OpenCode location:', location.directory);

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
