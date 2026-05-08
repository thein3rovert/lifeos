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
| **Database** | SQLite (photos, notes, tags, skills cache) |
| **Skills Storage** | GitHub (thein3rovert/polis repo) |
| **AI Sidecar** | Node.js + Express (port 3002) |

---

## Project Status

### ✅ Phase 1: Go Backend (COMPLETE)

**Core Infrastructure:**
- [x] HTTP server with Chi router
- [x] SQLite database with migrations
- [x] Static file server for photos
- [x] CORS middleware for frontend access
- [x] Environment variable configuration (direnv)

**Photos Module:**
- [x] Upload photos (`POST /api/photos/upload`)
- [x] List all photos (`GET /api/photos`)
- [x] Search photos by caption/filename (`GET /api/photos/search`)
- [x] Tag system (many-to-many: photos ↔ tags)
- [x] Static file serving (`/static/photos/`)

**Skills Module (SQLite + GitHub Sync):**
- [x] SQLite-backed skill store (primary source)
- [x] GitHub integration for sync (thein3rovert/polis)
- [x] Fetch skills from GitHub with caching
- [x] **Sync from GitHub** (`GET /api/skills/sync`)
- [x] **Push to GitHub** (`POST /api/skills/push`) - Creates PRs
- [x] **Push single skill** (`POST /api/skills/{id}/push`)
- [x] Edit skills locally (`POST /api/skills/edit`)
- [x] Create new skills (`POST /api/skills/create`)
- [x] Markdown content storage
- [x] Support LifeOS + Opencode skill formats
- [x] Visual sync indicators (pending, notes, modified)
- [x] Conflict detection and warning dialogs

**Notes Module:**
- [x] Buffer notes per skill (SQLite)
- [x] Add note to skill (`POST /api/skills/{id}/notes`)
- [x] Delete note (`DELETE /api/skills/{id}/notes/{noteId}`)
- [x] List notes for skill
- [x] Clear notes after append/save

**AI Workflow:**
- [x] OpenCode sidecar (port 3002) with Kimi K2.5
- [x] Preview AI-updated skills (`POST /api/skills/{id}/preview`)
- [x] Save AI changes to GitHub PR (`POST /api/skills/{id}/save`)
- [x] Side-by-side diff view (Original vs AI Updated)
- [x] Accept/Reject AI changes

---

### ✅ Phase 2: TanStack Start Frontend (COMPLETE)

**Migration: Next.js → TanStack Start**
- [x] Initialize TanStack Start project
- [x] Configure Tailwind CSS with Atlas design system
- [x] File-based routing
- [x] API client module
- [x] Atlas CSS variables integration

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
- [x] **3-pane layout** (sidebar + content + notes)
- [x] Skills list with format badges
- [x] Visual indicators: blue dot (modified), yellow dot (notes)
- [x] **Create new skill** dialog with templates
- [x] **Edit skill** with raw markdown editor
- [x] Markdown rendering with custom components
- [x] Strip YAML frontmatter before display
- [x] Collapsible left sidebar
- [x] **Resizable note modal** with minimize/resume
- [x] **Sync confirmation dialog** (warns about local changes)
- [x] **Push selection dialog** (choose which skills to push)
- [x] Note count badges
- [x] Last synced timestamp

**AI Integration:**
- [x] "Update with AI" button (sends notes to sidecar)
- [x] Loading spinner during AI processing
- [x] Side-by-side preview (Original vs AI Updated)
- [x] Accept/Reject changes
- [x] Auto-clear notes after accepting

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
- OpenCode CLI (for AI sidecar)

### 1. Start OpenCode (Port 4097)
```bash
opencode serve --port 4097
```

### 2. Start AI Sidecar (Port 3002)
```bash
cd sidecar
npm install
npm start
```

### 3. Start Go Backend (Port 6060)
```bash
# Set environment variables
export GITHUB_TOKEN=your_token
export GITHUB_OWNER=thein3rovert
export GITHUB_REPO=polis
export SIDECAR_URL=http://localhost:3002

# Run server
go run cmd/server/main.go
```

### 4. Start TanStack Frontend (Port 3000)
```bash
cd web
npm install
npm run dev
```

---

## API Endpoints

### Photos
- `GET /api/photos` - List all photos
- `POST /api/photos/upload` - Upload new photo
- `GET /api/photos/search?q={query}` - Search photos
- `GET /static/photos/{filename}` - Serve photo file

### Skills
- `GET /api/skills` - List all skills from SQLite (with note counts)
- `GET /api/skills/{id}` - Get skill detail with notes
- `POST /api/skills/create` - Create new skill
- `POST /api/skills/edit` - Edit skill content
- `GET /api/skills/sync` - Force refresh from GitHub
- `POST /api/skills/push` - Push all pending changes to GitHub
- `POST /api/skills/{id}/push` - Push single skill to GitHub

### AI Workflow
- `POST /api/skills/{id}/preview` - Preview AI-updated skill
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
- Yellow (#cd9731) for warnings/notes
- Lucide icons (1.5px stroke)
- Inter + JetBrains Mono fonts
- CSS custom properties (variables)

---

## Skills Workflow

### Daily Usage Flow:
1. **Read skills** from SQLite cache (fast, offline-capable)
2. **Add notes** to skills as you learn/think (yellow dot appears)
3. **Edit skills** directly for quick fixes (blue dot appears)
4. **AI Update** - Send notes to AI for skill rewrite (preview → accept)
5. **Push changes** - Select which modified skills to push to GitHub
6. **Pull updates** - Sync from GitHub to get latest (with conflict warning)

### Visual Indicators:
- 🔵 **Blue dot** = Modified locally, not pushed
- 🟡 **Yellow dot** = Has pending notes
- 🔵🟡 **Both dots** = Modified AND has notes
- **Blue "Modified" badge** = Skill has unsaved changes
- **Yellow "X notes" badge** = Skill has buffer notes

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
- [ ] AI-powered skill suggestions

### Phase 5: Advanced Features
- [ ] Photo albums/collections
- [ ] Advanced search (fuzzy, filters)
- [ ] Skills export (multiple formats: opencode, claude, copilot)
- [ ] Skills assets (images, attachments)
- [ ] Glossary webpage (public)
- [ ] Cheatsheet webpage (public)
- [ ] Skill templates library

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
- **OpenCode**: AI coding assistant platform

---

Last Updated: 2026-04-26