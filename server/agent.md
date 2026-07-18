# LifeOS — Server Agent Guide

This guide covers the Go backend for LifeOS. For the full project overview, see [`../agent.md`](../agent.md). Frontend and sidecar guidance live in [`../web/agent.md`](../web/agent.md) and [`../sidecar/agent.md`](../sidecar/agent.md).

## Server Stack

| Layer | Tech |
|-------|------|
| Language | Go 1.26 |
| Router | `net/http` stdlib |
| Database | SQLite (`modernc.org/sqlite`, pure Go, no CGo) |
| Markdown | `yuin/goldmark` |
| Dev Entry | `server/cmd/server/main.go` |

## Project Structure

```
server/
  cmd/server/      # Server entry point
  internal/
    api/             # JSON API handlers (skills, notes, AI, chat, smartboard)
    config/          # Centralized env config
    middleware/      # Request logging and CORS
    model/           # Data structs
    services/        # Business logic
    sidecar/         # Typed HTTP client for the Node sidecar
    store/           # Store interfaces + SQLite implementations
    mcp/             # MCP server (SSE + stdio)
```

## API Routes

See [`internal/api/README.md`](internal/api/README.md) for the full endpoint reference. All routes return JSON.

## Database Schema

- **skills**: `id` (PK), `title`, `content`, `format`, GitHub metadata
- **skill_notes**: `id` (PK), `skill_id`, `title`, `content`, `type`, `created_at`
- **skill_files**: `id` (PK), `skill_id`, `path`, `type`, `name`, `content`
- **chat_messages**: `id` (PK), `skill_id`, `session_id`, `role`, `content`, `created_at`
- **smartboard_panels**: `id` (PK), `panel_type`, `data`, `session_id`, `last_refreshed`
- **panel_schedules**: `panel_type` (PK), `paused`, `mode`, `interval_minutes`, `weekly_*`

## Key Backend Patterns

- **Config**: `internal/config.Load()` reads env vars ONCE at startup. No `os.Getenv` scattered across the codebase.
- **Store Interfaces**: `SkillStore`, `NoteStore` in `store/store.go` — swap implementations easily.
- **Sidecar Client**: All sidecar HTTP goes through `internal/sidecar.Client`. Constructors take `*sidecar.Client`, not a URL.
- **JSON API**: All handlers return JSON; no HTML rendering in Go.
- **CORS**: Middleware accepts an `[]string` of allowed origins (from `config.CORSOrigins`).
- **GitHub-Backed Skills**: Skill markdown lives in a GitHub repo. `/api/skills/sync` pulls; `/api/skills/push` writes back via PR.
- **Buffer Notes → AI → PR**: Users add notes, preview an AI rewrite, then save to create a branch + commit + PR on GitHub.
- **Markdown Frontmatter**: Skills use YAML frontmatter; the frontend strips it before rendering.

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `GITHUB_TOKEN` | (required) | GitHub PAT for skill repo |
| `GITHUB_OWNER` | `thein3rovert` | Repo owner |
| `GITHUB_REPO` | `polis` | Skill files repo |
| `LIFEOS_PORT` | `6060` | HTTP port |
| `SIDECAR_URL` | `http://localhost:3002` | Node sidecar base URL |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:3001` | Allowed CORS origins (CSV) |
| `MCP_API_KEY` | (unset) | Auth key for MCP SSE endpoint |

## Server-Specific Notes

- Date format from Go: `"2026-04-24 22:34:14.340107457 +0100 BST"` needs regex parsing on the client.
- `dev/` is old practice code, not part of the app.

## Development Workflow

1. Edit Go files in `server/internal/` or `server/cmd/server/`.
2. Restart the server: `nix develop -c go run server/cmd/server/main.go`
3. If you change API shape, update `web/src/lib/api/` as well.
