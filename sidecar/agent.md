# LifeOS — Sidecar Agent Guide

This guide covers the Node.js sidecar for LifeOS. For the full project overview, see [`../agent.md`](../agent.md). Server and web guidance live in [`../server/agent.md`](../server/agent.md) and [`../web/agent.md`](../web/agent.md).

## Sidecar Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js |
| Framework | Express |
| OpenCode client | `@opencode/client@2.0.15` |
| Port | `3002` |

## Project Structure

```
sidecar/
  index.js        # Express server — POST /skill/update (AI rewrite)
  package.json
```

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/skill/update` | AI-rewrite skill with new notes |
| GET | `/health` | Sidecar health check |

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3002` | Express server port |
| `OPENCODE_URL` | unset | Explicit OpenCode V2 endpoint; when unset, discover/start the local service |
| `OPENCODE_DIRECTORY` | current directory | Project location for configuration and sessions |
| `OPENCODE_AUTHORIZATION` | unset | Complete Authorization header for an explicit endpoint |
| `OPENCODE_TOKEN` | unset | Bearer token for an explicit endpoint |
| `OPENCODE_USERNAME` / `OPENCODE_PASSWORD` | unset | Basic credentials for an explicit endpoint |

## Running the Sidecar

```bash
cd sidecar && npm start    # port 3002
```

With no `OPENCODE_URL`, the V2 client discovers the authenticated local service
and starts it when necessary. Containers use an explicit `OPENCODE_URL` and
must receive any required authentication through the variables above.

## Sidecar-Specific Notes

- The sidecar uses `@opencode/client@2.0.15` and the OpenCode V2 API.
- The Go backend and frontend do not talk to the sidecar directly for most operations; the sidecar is used for AI-powered skill rewrites.
