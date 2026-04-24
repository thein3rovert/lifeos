# LifeOS — Agent Guide

## What Is This?

LifeOS is a personal "second brain" / digital life manager. A Go backend serves HTML templates over HTMX, a Node.js sidecar talks to OpenCode for AI-powered skill updates, and skills live in a GitHub repo (`thein3rovert/polis`).

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Go 1.26, `net/http` stdlib router |
| Templates | Go `html/template` (base+content pattern) |
| Frontend | HTMX + Tailwind CSS (CDN) |
| Database | SQLite (`modernc.org/sqlite`, pure Go, no CGo) |
| AI Sidecar | Node.js + Express on port 3001, uses `@opencode-ai/sdk` |
| Dev Shell | Nix flake (`flake.nix`) + `direnv` |
| Markdown | `yuin/goldmark` |

## Running the App

Three services must be running:

```bash
# 1. OpenCode (prerequisite)
opencode serve --port 4097

# 2. Sidecar
cd sidecar && npm start    # port 3001

# 3. Go server
go run cmd/server/main.go  # port 6060 (configurable via LIFEOS_PORT)
```

## Project Structure

```
cmd/server/main.go              # Entry point — wires routes, stores, starts server
internal/
  handler/
    home.go                     # GET /home — dashboard
    photo.go                    # Photo CRUD — list, upload, search
    skills.go                   # Skills CRUD — list, get, edit, AI preview/save
  middleware/
    logger.go                   # Request logging middleware
  model/
    photo.go, skill.go, note.go, tag.go  # Data structs
  store/
    store.go                    # Store, SkillStore, NoteStore interfaces
    sqlite.go                   # SQLite connection + migrations
    photo.go                    # PhotoStore impl (SQLite)
    notes/notes.go              # NoteStore impl (SQLite)
    github/
      client.go                 # GitHub API client
      skill_store.go            # GitHubSkillStore with 5-min cache
      types.go                  # GitHub API response types
templates/
  base.html                     # Shared layout — sidebar, HTMX, Tailwind
  home.html, photos.html, skills.html, skill.html, ...
  *-list.html, *-preview.html  # HTMX partials
sidecar/
  index.js                      # Express server — POST /skill/update (AI rewrite)
  package.json
skills/                         # Local skill markdown files (YAML frontmatter)
photos/                         # Uploaded photo storage
static/                         # Empty (unused)
dev/                            # Old practice code — not part of the app
doc/                            # Architecture notes, roadmap, future ideas
```

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Health check — "LifeOS is running" |
| GET | `/home` | Dashboard |
| GET | `/photos/view` | List all photos |
| GET/POST | `/photos/upload` | Upload form / handler |
| GET | `/photos/search` | Search photos (text or `tags:` prefix) |
| GET | `/skills` | List all skills |
| GET | `/skills/{id}` | View single skill |
| POST | `/skills/edit` | Edit skill content |
| GET | `/skills/sync` | Force refresh from GitHub |
| POST | `/skills/notes/add` | Add buffer note to skill |
| POST | `/skills/notes/delete` | Delete a buffer note |
| POST | `/skills/notes/append` | Append notes to skill directly |
| POST | `/skills/preview` | Preview AI-rewritten skill |
| POST | `/skills/save` | Save AI update (creates PR on GitHub) |
| POST | `/skills/preview-render` | Render markdown to HTML (AJAX) |
| ANY | `/static/` | Serve local files (photos) |

**Sidecar routes:**
| POST | `/skill/update` | AI-rewrite skill with new notes |
| GET | `/health` | Sidecar health check |

## Database Schema (SQLite)

**photos**: `id` (PK), `filename`, `path`, `caption`, `description`, `created_at`
**tags**: `id` (PK), `name` (UNIQUE)
**photo_tags**: `photo_id` (FK), `tag_id` (FK) — composite PK
**skill_notes**: `id` (PK), `skill_id`, `content`, `created_at`

## Key Patterns

- **Store Interface**: `Store`, `SkillStore`, `NoteStore` interfaces in `store/store.go` — swap implementations easily
- **Handler Closures**: Handlers created via `handler.ListPhotos(photoStore)` closures that capture stores
- **HTMX Dual-Rendering**: Every handler checks `HX-Request` header → partial content for HTMX, full page otherwise
- **GitHub-Backed Skills**: Skills stored in GitHub repo as markdown, 5-min cache, `/skills/sync` for manual refresh
- **Buffer Notes → AI → PR**: Add notes → preview AI rewrite → save creates branch + commit + PR on GitHub
- **Markdown Frontmatter**: Skills use YAML frontmatter; stripped before HTML rendering

## Configuration (.env)

| Variable | Default | Purpose |
|----------|---------|---------|
| GITHUB_TOKEN | (required) | GitHub PAT for skill repo |
| GITHUB_OWNER | thein3rovert | Repo owner |
| GITHUB_REPO | polis | Skill files repo |
| LIFEOS_PORT | 6060 | HTTP port |

## Things to Know

- No tests exist yet
- `dev/` is old practice code, not part of the app
- `static/` directory is empty — photos served via `/static/` from project root
- Photo filenames on disk: `photos/<unix_nano>_<original_filename>`
- Sidecar expects OpenCode running on port 4097
- `doc/minimal-plan.md` has a feature roadmap with checkboxes
- `doc/iv3-second-brain.md` has architecture notes and plans for Next.js + PostgreSQL migration
