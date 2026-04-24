# LifeOS

Personal life management system - photos, skills/knowledge base, and notes. Built with Go backend and TanStack Start frontend.

**Architecture Evolution:**
- ✅ Started: Go + HTML Templates + HTMX
- ✅ Current: Go JSON API + TanStack Start React Frontend
- 🎯 Future: Add AI agent integration, real-time features

---

## Current Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | TanStack Start (React + Vite + Tailwind CSS) |
| **Backend** | Go 1.26 (stdlib http + Chi router) |
| **Database** | SQLite (photos, notes, tags) |
| **Skills Storage** | GitHub (thein3rovert/polis repo) |
| **AI Sidecar** | Node.js + Express (port 3001) |

---

## Project Status

### ✅ Phase 1: Go Backend (COMPLETE)

**Core Infrastructure:**
- [x] HTTP server with Chi router
- [x] SQLite database with migrations
- [x] Static file server for photos
- [x] CORS middleware for frontend access

**Photos Module:**
- [x] Upload photos (`POST /api/photos/upload`)
- [x] List all photos (`GET /api/photos`)
- [x] Search photos by caption/filename (`GET /api/photos/search`)
- [x] Tag system (many-to-many: photos ↔ tags)
- [x] Static file serving (`/static/photos/`)

**Skills Module:**
- [x] GitHub integration (thein3rovert/polis)
- [x] Fetch skills from GitHub with caching (5-min TTL)
- [x] Sync endpoint to force refresh (`GET /api/skills/sync`)
- [x] Markdown content storage
- [x] Support LifeOS + Opencode skill formats

**Notes Module:**
- [x] Buffer notes per skill (SQLite)
- [x] Add note to skill (`POST /api/skills/{id}/notes`)
- [x] Delete note (`DELETE /api/skills/{id}/notes/{noteId}`)
- [x] List notes for skill

**AI Workflow:**
- [x] OpenCode sidecar (port 3001)
- [x] Preview AI-updated skills (`POST /api/skills/{id}/preview`)
- [x] Save AI changes to GitHub PR (`POST /api/skills/{id}/save`)

---

### ✅ Phase 2: TanStack Start Frontend (COMPLETE)

**Migration: Next.js → TanStack Start**
- [x] Initialize TanStack Start project
- [x] Configure Tailwind CSS with Atlas design system
- [x] File-based routing
- [x] API client module

**Layout & Navigation:**
- [x] Collapsible sidebar (220px)
- [x] Navigation: Dashboard, Gallery, Skills, Notes, Settings
- [x] Icons for all nav items (Lucide)
- [x] Active state highlighting

**Dashboard Page (`/`):**
- [x] Stats cards (Total Skills, Total Photos)
- [x] Real data from API
- [x] "Today's Notes" table with search
- [x] Placeholder sections for future widgets

**Skills Page (`/skills`):**
- [x] 3-pane layout (sidebar + content + notes)
- [x] Skills list with format badges
- [x] Markdown rendering with custom components
- [x] Strip YAML frontmatter before display
- [x] Collapsible left sidebar
- [x] Notes panel (add/delete)
- [x] Sync from GitHub button

**Gallery Page (`/gallery`):**
- [ ] Photo grid display
- [ ] Upload functionality
- [ ] Full-size image viewer
- [ ] Tag filtering

**Notes Page (`/notes`):**
- [ ] All notes list
- [ ] Create/edit/delete notes

**Settings Page (`/settings`):**
- [ ] App configuration
- [ ] Theme toggle

---

## Running the Application

### Prerequisites
- Go 1.26+
- Node.js 20+
- GitHub personal access token (for skills sync)

### 1. Start Go Backend (Port 6060)

# Run server
go run cmd/server/main.go
```

### 2. Start TanStack Frontend (Port 3001)

```bash
cd web
npm install
npm run dev
```

### 3. Start AI Sidecar (Port 3001) - Optional

```bash
cd sidecar
npm install
npm start
```

---

## API Endpoints

### Photos
- `GET /api/photos` - List all photos
- `POST /api/photos/upload` - Upload new photo
- `GET /api/photos/search?q={query}` - Search photos
- `GET /static/photos/{filename}` - Serve photo file

### Skills
- `GET /api/skills` - List all skills from GitHub
- `GET /api/skills/{id}` - Get skill detail with notes
- `GET /api/skills/sync` - Force refresh from GitHub
- `POST /api/skills/{id}/preview` - Preview AI rewrite
- `POST /api/skills/{id}/save` - Save AI changes to PR

### Notes
- `GET /api/skills/{id}/notes` - List notes for skill
- `POST /api/skills/{id}/notes` - Add note to skill
- `DELETE /api/skills/{id}/notes/{noteId}` - Delete note

### Tags
- `GET /api/tags` - List all tags

---

## Design System: Atlas

We're using the **Atlas** design system (located in `skills/atlas/`):
- AMOLED black backgrounds (#000)
- Dense, information-rich UI
- Near-white (#ededed) for CTAs
- Blue (#0070f3) for focus/links
- Lucide icons (1.5px stroke)
- Inter + JetBrains Mono fonts

---

## TODO: Future Features

### Phase 3: Enhanced Frontend
- [ ] Gallery: Photo upload, grid view, lightbox
- [ ] Notes: Full CRUD interface
- [ ] Settings: Theme toggle, config
- [ ] Dashboard: Real data in "Today's Notes" table
- [ ] Real-time updates (WebSockets)

### Phase 4: AI Integration
- [ ] Agent daemon for local AI execution
- [ ] Claude Code / Codex / OpenCode integration
- [ ] Chat interface with skills context

### Phase 5: Advanced Features
- [ ] Photo albums/collections
- [ ] Advanced search (fuzzy, filters)
- [ ] Skills export (multiple formats)
- [ ] Glossary webpage (public)
- [ ] Cheatsheet webpage (public)

---

## Development

### Frontend Development
```bash
cd web
npm run dev        # Start dev server with hot reload
npm run build      # Production build
```

### Backend Development
```bash
# Run with auto-reload (requires air)
air

# Or standard go run
go run cmd/server/main.go
```

### Database Migrations
Migrations run automatically on startup. Schema in `internal/store/`.

---

## Credits

- **Atlas Design System**: Custom design system for agent/developer UIs
- **TanStack Start**: Full-stack React framework
- **Chi Router**: Lightweight Go router
- **SQLite**: Embedded database (no setup required)

---

Last Updated: 2026-04-24
