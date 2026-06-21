# LifeOS — Agent Guide

LifeOS is a personal "second brain" / digital life manager. A Go backend serves JSON APIs, a TanStack Start frontend provides the UI, and a Node.js sidecar talks to OpenCode for AI-powered skill updates. Skills live in a GitHub repo (`thein3rovert/polis`).

## Layer Guides

Detailed guidance for each layer lives in its own agent file:

- **[Server (`server/agent.md`)](server/agent.md)** — Go backend, API routes, stores, SQLite schema
- **[Web (`web/agent.md`)](web/agent.md)** — TanStack Start frontend, Atlas design system, components, hooks
- **[Sidecar (`sidecar/agent.md`)](sidecar/agent.md)** — Node.js/Express sidecar, OpenCode integration

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Go 1.26, `net/http` stdlib router serving JSON APIs |
| Frontend | TanStack Start (React + TypeScript) |
| Styling | Tailwind CSS v4 + Atlas design system |
| Database | SQLite (`modernc.org/sqlite`, pure Go, no CGo) |
| AI Sidecar | Node.js + Express on port 3001, uses `@opencode-ai/sdk` |
| Dev Shell | Nix flake (`flake.nix`) + `direnv` |
| Markdown | Go: `yuin/goldmark`, Frontend: `react-markdown` + `remark-gfm` |
| Icons | Lucide React (1.5px stroke) |

## Running the App

Three services must be running:

```bash
# 1. OpenCode (prerequisite)
opencode serve --port 4097

# 2. Sidecar
cd sidecar && npm start    # port 3001

# 3. Go server
go run server/cmd/server/main.go  # port 6060 (configurable via LIFEOS_PORT)

# 4. TanStack Start frontend
cd web && npm run dev      # port 3000 (with --host for Tailscale)
```

## Project Structure

```
server/            # Go backend (see server/agent.md)
  cmd/server/      # Server entry point
  internal/        # API handlers, stores, models, services
web/               # TanStack Start frontend (see web/agent.md)
  src/
    types/         # Shared TypeScript types
    hooks/         # Custom React hooks
    lib/           # API client, utilities
    components/    # UI primitives, layout, feature components
    routes/        # File-based routing
    global.css     # Atlas design system tokens
  public/          # Static assets
sidecar/           # Node.js sidecar (see sidecar/agent.md)
skills/            # Local skill markdown files (YAML frontmatter)
  atlas/           # Atlas design system reference
photos/            # Uploaded photo storage
static/            # Go serves photos from here via /static/
dev/               # Old practice code — not part of the app
doc/               # Architecture notes, roadmap, future ideas
```

## High-Level Data Flow

1. Users interact with the TanStack Start frontend (`web/`).
2. The frontend calls the Go backend (`server/`) at `VITE_API_URL` (default `http://localhost:6060`).
3. Skills are stored as markdown in GitHub (`thein3rovert/polis`), cached in memory, and refreshed via `/api/skills/sync`.
4. Users add buffer notes to a skill, preview an AI rewrite, and save it to create a branch + commit + PR on GitHub.
5. The Node.js sidecar (`sidecar/`) handles the AI rewrite by calling OpenCode.

## Configuration

### Web Frontend

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `http://localhost:6060` | Go backend API URL |

### Go Backend

| Variable | Default | Purpose |
|----------|---------|---------|
| `GITHUB_TOKEN` | (required) | GitHub PAT for skill repo |
| `GITHUB_OWNER` | `thein3rovert` | Repo owner |
| `GITHUB_REPO` | `polis` | Skill files repo |
| `LIFEOS_PORT` | `6060` | HTTP port |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins (comma-separated) |

### Sidecar

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3001` | Express server port |
| `OPENCODE_URL` | `http://localhost:4097` | OpenCode API endpoint |

## Key Cross-Cutting Patterns

- **JSON APIs**: The Go backend returns JSON only; no HTML rendering.
- **CORS**: Configured via `CORS_ORIGINS` to allow the frontend (port 3000) to call the backend (port 6060).
- **GitHub-Backed Skills**: Skills stored as markdown in a GitHub repo, with a 5-minute cache and manual `/api/skills/sync` refresh.
- **Buffer Notes → AI → PR**: Add notes → preview AI rewrite → save creates branch + commit + PR on GitHub.
- **Atlas Design System**: All UI styling follows Atlas tokens defined in `web/src/global.css`. See `web/agent.md` and `skills/atlas/` for details.
- **Path Aliases**: Frontend uses `@/` for imports instead of relative paths (`../../`).
- **Component Split**: Frontend route files over ~150 lines are split into feature components.

## Migration Notes

**Completed:**
- ✅ Go backend converted from HTML templates to JSON APIs
- ✅ CORS middleware added for frontend/backend communication
- ✅ TanStack Start frontend replacing Next.js
- ✅ File-based routing with route directories
- ✅ Atlas design system implementation
- ✅ Skills page with 3-pane layout and component split
- ✅ Dashboard page with stats cards
- ✅ Custom markdown renderer with Atlas styling
- ✅ UI Refactoring (2025) - 6 phases complete
- ✅ UI Improvements (2025) - Phase 1-4:
  - Phase 1: Environment config (VITE_API_URL, .env.example)
  - Phase 2: Code cleanup (remove console.log, fix design tokens)
  - Phase 3: Custom hooks (useApi, useSkills, useNotes, useSync)
  - Phase 4: UI components (Skeleton, Toast, EmptyState, ErrorComponent)
  - SkillsPage refactored from 375 lines to 281 lines using hooks
- ✅ UI Performance (2025) - Phase 5:
  - React.memo on SkillItem for list optimization
  - useMemo for filtered notes in dashboard
  - useCallback for stable function references

**In Progress:**
- Gallery page implementation
- Notes page with full CRUD

**Blocked:**
- None

## Development Workflow

1. **Backend changes**: Edit Go files in `server/`, restart Go server.
2. **Frontend changes**: Edit files in `web/src/`, hot reload automatic.
3. **Sidecar changes**: Edit `sidecar/index.js`, restart `npm start`.
4. **Design system**: Reference `skills/atlas/references/` for UI patterns.
5. **API changes**: Update both the Go handler and `web/src/lib/api.ts`.
6. **Component split**: When a frontend route file hits 150 lines, extract components.

## Testing

No automated tests exist yet. Manual testing workflow:

1. Start all three services (OpenCode, sidecar, Go backend, frontend).
2. Navigate to `http://localhost:3000`.
3. Test each route manually.
4. Verify API calls in browser DevTools Network tab.

## Things to Know

- Frontend runs on port 3000, backend on port 6060, sidecar on port 3001.
- Go serves photos via `/static/` from the project root.
- Photo filenames on disk: `photos/<unix_nano>_<original_filename>`.
- Client-side YAML frontmatter stripping (Go returns raw markdown).
- Date format from Go: `"2026-04-24 22:34:14.340107457 +0100 BST"` needs regex parsing in the frontend.
- TanStack Start with `--host` flag for Tailscale access.
- `dev/` is old practice code, not part of the app.
- `doc/minimal-plan.md` has the feature roadmap.
- `skills/atlas/` contains design system reference files.
