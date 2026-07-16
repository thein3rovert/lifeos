// API URL resolver with 3-tier priority:
//
// 1. Runtime env var (API_URL): injected via window.APP_CONFIG by the server
//    at SSR time. Set in docker-compose like a normal env var. Best for prod.
//
// 2. Window location detection: if no env var, auto-detect from current URL.
//    Works for direct port access (frontend :3000 dev, :3001 container).
//
// 3. Same-origin relative URL: if behind a reverse proxy (Traefik etc.).
//
// To override at runtime, set API_URL env var on the frontend container:
//   environment:
//     - API_URL=http://100.105.217.77:6060

// Map frontend host ports to their corresponding backend host ports.
// - 3000: native dev (npm run dev) → backend on 6060
// - 3001: legacy container mapping → backend on 6060
// - 7001: prod containers (docker-compose.prod.yml) → backend on 7060
const FRONTEND_TO_BACKEND_PORT: Record<string, string> = {
  '3000': '6060',
  '3001': '6060',
  '7001': '7060',
};

declare global {
  interface Window {
    APP_CONFIG?: { API_URL?: string };
  }
}

export function apiUrl(path: string): string {
  // SSR: read env var directly on the server
  if (typeof window === 'undefined') {
    const base = process.env.API_URL || '';
    return `${base}${path}`;
  }

  // Client: prefer injected runtime config
  const configured = window.APP_CONFIG?.API_URL;
  if (configured) {
    return `${configured}${path}`;
  }

  // Fallback: detect from window.location
  const { protocol, hostname, port } = window.location;
  const backendPort = FRONTEND_TO_BACKEND_PORT[port];
  if (backendPort) {
    return `${protocol}//${hostname}:${backendPort}${path}`;
  }

  // Same-origin (reverse proxy)
  return path;
}
