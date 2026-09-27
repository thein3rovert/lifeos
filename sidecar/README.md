# LifeOS Sidecar

Thin Express proxy that translates LifeOS HTTP into OpenCode V2 SDK calls. It does no AI itself — it creates / prompts / waits on sessions on your local OpenCode server and returns text + activity events.

Port: `3002`. SDK: `@opencode/client@2.0.15`.

## How it talks to OpenCode

`index.js` → `createOpenCodeClient()` in `opencode.js`:

1. If `OPENCODE_URL` is set, use it + `OPENCODE_AUTHORIZATION` / `OPENCODE_TOKEN` / `OPENCODE_USERNAME:PASSWORD` headers.
2. Else auto-discover local service via `Service.ensure({ version: v => v.startsWith('2.') })` — starts server if needed.
3. Then `client.server.info()` + `client.location.get()` to pin the project directory, stored as singleton in `client.js`.

All routes use `getClient()` + helpers in `opencode.js`:
- `promptAndWait()` / `promptAndWaitDetailed()` — `session.prompt({ delivery: queue|steer })` → `session.wait()` → `message.list()` to find newest completed assistant.
- `messageText()` — extracts text from V2 message parts.
- `requestSignal()` — 10min abort timeout per request.

V1 → V2 migration note: V1 `format: { json_schema }` is gone. See `doc/structured-output.md` — sidecar now does prompt-only JSON and backend parses it. Schemas kept in `schemas/` for future use.

## Structure

```
sidecar/
  index.js        # entry — undici timeouts, initOpencode(), listen :3002
  app.js          # createApp() — json, logger, /health, mounts routers
  client.js       # shared singleton getClient()/setClient()
  opencode.js     # V2 client factory + prompt/wait helpers
  activity.js     # normalize V2 events → SSE feed, streamSessionActivity()
  routes/
    agent.js      # /agent/* — main chat, session chat, permissions, forms, activity SSE, abort
    sessions.js   # /session/* — getOrCreate, chat, messages (legacy skill-chat)
    skills.js     # /skill/update — AI-rewrite skill markdown
  schemas/
    smartboard.js # things-to-remember, suggestions, achievements, blockers (prompt-only for now)
  doc/
    structured-output.md
  tests/          # node --test
  Dockerfile
```

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | health check |
| POST | `/agent/chat` | auto-create/resume session, inject `context` once via `session.synthetic`, prompt+wait, returns `{ response, sessionId }` |
| POST | `/agent/session` | explicitly create session + optional `context` |
| POST | `/agent/session/chat` | continue exactly one `sessionId` with `steer|queue`, returns response + inbox/assistant IDs |
| GET | `/agent/session/:id/activity` | SSE stream of filtered V2 events (see below) |
| GET | `/agent/session/:id/permissions` | list pending perms, session-scoped |
| POST | `/agent/session/:id/permissions/:reqId/reply` | `{ decision: once|always|reject }` |
| GET/POST | `/agent/session/:id/forms...` | list/get/reply/cancel V2 forms |
| POST | `/agent/abort` | abort by `requestId` (+ `session.interrupt`) |
| GET | `/agent/active` | debug active requests |
| POST | `/session/getOrCreate` | legacy skill session resume/create |
| POST | `/session/chat` | legacy chat with optional `skillContent` wrapper |
| POST | `/session/messages` | list history mapped to `{ id, role, content, created }` |
| POST | `/skill/update` | rewrite skill md from `existingSkill` + `newNotes`, deletes temp session |

Activity SSE (`activity.js`): subscribes `client.event.subscribe()`, filters by exact `data.sessionID`, maps `session.tool.*`, `session.status`, `permission.*`, `form.*`, `compaction.*` to `{ id, kind: status|tool|file|mcp|reasoning|error, status, title, detail }`.

## Sandbox (MCP-only reads)

Sessions never start in project code. The sidecar builds an empty
`.opencode-sandbox/` folder (next to `sidecar/`) and writes an
`opencode.json` there on every startup:

- Denies built-in `shell`, `read`, `edit`, `glob`, `grep`, `execute`
- Keeps only the `lifeos-files` MCP (`http://localhost:${LIFEOS_PORT:-6060}/mcp`)

So the agent reads meeting/journal notes through MCP tools only. If you see
`Tool shell` in live activity, the sandbox config is not loaded — restart via
`just dev`.

| Var | Default | Purpose |
|-----|---------|---------|
| `OPENCODE_DIRECTORY` | `.opencode-sandbox/` | session cwd, config written here too |
| `LIFEOS_PORT` / `BACKEND_PORT` | `6060` | backend port used for the MCP URL |
| `LIFEOS_MCP_URL` | `http://localhost:$PORT/mcp` | override MCP URL |
| `MCP_API_KEY` | unset | Bearer key, passed through as `{env:MCP_API_KEY}` |

## Config

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | `3002` | listen port |
| `OPENCODE_URL` | unset (auto-discover) | explicit V2 endpoint, required in Docker |
| `OPENCODE_DIRECTORY` / `PROJECT_DIR` | `cwd` | location for sessions/config |
| `OPENCODE_AUTHORIZATION` | unset | full Authorization header |
| `OPENCODE_TOKEN` | unset | Bearer token |
| `OPENCODE_USERNAME` / `PASSWORD` | unset | Basic auth |
| `USE_STRUCTURED_OUTPUT` | `false` | compat flag only, still prompt-only on V2 |

## Run

```bash
cd sidecar && npm install && npm start # :3002, auto-connects local opencode
OPENCODE_URL=http://host.docker.internal:4096 npm start # explicit server
npm test # node --test — activity, agent, opencode, permissions-forms
docker build -t sidecar . # CMD node index.js, EXPOSE 3002
```
