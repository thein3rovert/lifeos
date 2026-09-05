import { fileURLToPath, pathToFileURL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

// Native dev: load .env.dev (direnv convention) instead of .env (prod).
// Falls back to .env if .env.dev doesn't exist.
const envDir = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs');
    const dev = pathToFileURL('.env.dev').pathname;
    return fs.existsSync(dev) ? '.env.dev' : '.';
  } catch {
    return '.';
  }
})();

const config = defineConfig({
  envDir,
  resolve: {
    tsconfigPaths: true,
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [devtools(), tailwindcss(), tanstackStart(), nitro(), viteReact()],
});

export default config;
