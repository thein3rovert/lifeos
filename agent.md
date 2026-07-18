# LifeOS — Agent Guide

LifeOS is a personal "second brain" / digital life manager: a Go backend serves JSON APIs, a TanStack Start frontend provides the UI, and a Node.js sidecar talks to OpenCode for AI-powered skill updates. Skills live in `thein3rovert/polis` on GitHub.

## Layer Guides

Each layer has its own focused guide:

- **[Server (`server/agent.md`)](server/agent.md)** — Go backend, API routes, SQLite schema, stores
- **[Web (`web/agent.md`)](web/agent.md)** — TanStack Start frontend, Atlas design system, components, hooks
- **[Sidecar (`sidecar/agent.md`)](sidecar/agent.md)** — Node.js/Express sidecar, OpenCode integration

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Go 1.26, `net/http` stdlib router, JSON APIs |
| Frontend | TanStack Start (React + TypeScript) |
| Styling | Tailwind CSS v4 + Atlas design system |
| Database | SQLite (`modernc.org/sqlite`, pure Go, no CGo) |
| AI Sidecar | Node.js + Express on port 3001, `@opencode-ai/sdk` |
| Dev Shell | Nix flake (`flake.nix`) + `direnv` |
| Markdown | Go: `yuin/goldmark`, Frontend: `react-markdown` + `remark-gfm` |
| Icons | Lucide React (1.5px stroke) |

## Running the App

```bash
# 1. OpenCode (prerequisite)
opencode serve --port 4097

# 2. Sidecar
cd sidecar && npm start    # port 3001

# 3. Go server
go run server/cmd/server/main.go  # port 6060

# 4. Frontend
cd web && npm run dev      # port 3000 (--host for Tailscale)
```

## Project Structure

```
server/            # Go backend
  cmd/server/      # Server entry point
  internal/        # API handlers, stores, models, services
web/               # TanStack Start frontend
  src/             # types, hooks, lib, components, routes
  public/          # Static assets
sidecar/           # Node.js sidecar
skills/            # Local skill markdown files
  atlas/           # Atlas design system reference
dev/               # Old practice code — not part of the app
doc/               # Architecture notes, roadmap
```

## Data Flow

1. Frontend (`web/`) calls the Go backend (`server/`) at `VITE_API_URL`.
2. Skills are markdown in GitHub, cached for 5 minutes, refreshed via `/api/skills/sync`.
3. Users add buffer notes, preview an AI rewrite, then save to create a branch + commit + PR.
4. The sidecar (`sidecar/`) runs the AI rewrite through OpenCode.

## Configuration

| Layer | Variable | Default | Purpose |
|-------|----------|---------|---------|
| Web | `VITE_API_URL` | `http://localhost:6060` | Go backend URL |
| Server | `GITHUB_TOKEN` | (required) | GitHub PAT for skill repo |
| Server | `GITHUB_OWNER` | `thein3rovert` | Repo owner |
| Server | `GITHUB_REPO` | `polis` | Skill files repo |
| Server | `LIFEOS_PORT` | `6060` | HTTP port |
| Server | `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |
| Sidecar | `PORT` | `3001` | Express port |
| Sidecar | `OPENCODE_URL` | `http://localhost:4097` | OpenCode API endpoint |

## Conventions

- Go returns JSON only; no HTML rendering.
- Frontend strips YAML frontmatter before rendering markdown.
- Atlas design tokens live in `web/src/global.css`.
- Frontend uses `@/` imports, not relative paths.
- Route files over ~150 lines get split into feature components.

## Development Workflow

1. **Backend**: edit files in `server/`, restart `go run server/cmd/server/main.go`.
2. **Frontend**: edit files in `web/src/`, hot reload is automatic.
3. **Sidecar**: edit `sidecar/index.js`, restart `npm start`.
4. **API changes**: update both the Go handler and `web/src/lib/api.ts`.

## Testing

No automated tests yet. Manual workflow:

1. Start all services.
2. Open `http://localhost:3000`.
3. Test routes manually and verify API calls in DevTools.

## Notes

- Frontend: 3000, Backend: 6060, Sidecar: 3001.
- Go dates (`"2026-04-24 ... +0100 BST"`) need regex parsing in the frontend.
- `dev/` is old practice code, not part of the app.
- Roadmap lives in `doc/minimal-plan.md`.
