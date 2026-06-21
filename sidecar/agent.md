# LifeOS — Sidecar Agent Guide

This guide covers the Node.js sidecar for LifeOS. For the full project overview, see [`../agent.md`](../agent.md). Server and web guidance live in [`../server/agent.md`](../server/agent.md) and [`../web/agent.md`](../web/agent.md).

## Sidecar Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js |
| Framework | Express |
| AI SDK | `@opencode-ai/sdk` |
| Port | `3001` |

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
| `PORT` | `3001` | Express server port |
| `OPENCODE_URL` | `http://localhost:4097` | OpenCode API endpoint |

## Running the Sidecar

```bash
cd sidecar && npm start    # port 3001
```

OpenCode must already be running:

```bash
opencode serve --port 4097
```

## Sidecar-Specific Notes

- The sidecar expects OpenCode on port `4097`.
- The Go backend and frontend do not talk to the sidecar directly for most operations; the sidecar is used for AI-powered skill rewrites.
