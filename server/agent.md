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
    api/             # JSON API handlers (photos, skills, notes, tags, AI)
    middleware/      # Request logging and CORS
    model/           # Data structs
    services/        # Business logic
    store/           # Store interfaces + SQLite implementations
    github/          # GitHub API client and skill store
```

## API Routes

All routes return JSON. The frontend makes CORS requests from port 3000 to port 6060.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Health check — "LifeOS is running" |
| GET | `/api/photos` | List all photos (JSON) |
| POST | `/api/photos/upload` | Upload photo handler (JSON) |
| GET | `/api/photos/search` | Search photos (JSON) |
| GET | `/api/skills` | List all skills (JSON) |
| GET | `/api/skills/{id}` | Get single skill with notes (JSON) |
| POST | `/api/skills/sync` | Force refresh from GitHub (JSON) |
| POST | `/api/skills/{id}/notes` | Add buffer note to skill (JSON) |
| DELETE | `/api/skills/{id}/notes/{noteId}` | Delete a buffer note (JSON) |
| POST | `/api/skills/{id}/preview` | Preview AI-rewritten skill (JSON) |
| POST | `/api/skills/{id}/save` | Save AI update (creates PR on GitHub) (JSON) |
| GET | `/api/tags` | List all tags (JSON) |
| ANY | `/static/` | Serve local files (photos) |

## Database Schema

**photos**: `id` (PK), `filename`, `path`, `caption`, `description`, `created_at`
**tags**: `id` (PK), `name` (UNIQUE)
**photo_tags**: `photo_id` (FK), `tag_id` (FK) — composite PK
**skill_notes**: `id` (PK), `skill_id`, `content`, `created_at`

## Key Backend Patterns

- **Store Interface**: `Store`, `SkillStore`, `NoteStore` interfaces in `store/store.go` — swap implementations easily.
- **JSON API**: All handlers return JSON; no HTML rendering in Go.
- **CORS**: Middleware allows the frontend (port 3000) to call the backend (port 6060). Configure allowed origins with `CORS_ORIGINS`.
- **GitHub-Backed Skills**: Skill markdown lives in a GitHub repo, cached for 5 minutes. Call `/api/skills/sync` to refresh manually.
- **Buffer Notes → AI → PR**: Users add notes, preview an AI rewrite, then save to create a branch + commit + PR on GitHub.
- **Markdown Frontmatter**: Skills use YAML frontmatter; the frontend strips it before rendering.
- **Photo Storage**: Uploaded photos are saved as `photos/<unix_nano>_<original_filename>` and served via `/static/`.

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `GITHUB_TOKEN` | (required) | GitHub PAT for skill repo |
| `GITHUB_OWNER` | `thein3rovert` | Repo owner |
| `GITHUB_REPO` | `polis` | Skill files repo |
| `LIFEOS_PORT` | `6060` | HTTP port |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins (comma-separated) |

## Server-Specific Notes

- Date format from Go: `"2026-04-24 22:34:14.340107457 +0100 BST"` needs regex parsing on the client.
- `dev/` is old practice code, not part of the app.

## Development Workflow

1. Edit Go files in `server/internal/` or `server/cmd/server/`.
2. Restart the server: `go run server/cmd/server/main.go`
3. If you change API shape, update `web/src/lib/api.ts` as well.
