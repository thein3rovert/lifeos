# LifeOS Changelog

All notable changes and features will be documented in this file.

---

## [2026-05-10] - Notes in Chat Integration

### Added
- **Persistent Chat Sessions** - Chat with AI about each skill, messages saved to database
- **Notes as Context** - Select multiple notes with `/` command to provide context to AI
- **Save AI Responses** - Save button on each AI message to create or update notes
- **Edit Notes** - Full edit capability for note title and content
- **Multiple Notes Context** - Select multiple notes simultaneously as context
- **Note Type Badges** - Visual distinction between manual and AI-generated notes

### Backend
- `POST /api/skills/{id}/session` - Create or resume chat session
- `POST /api/skills/{id}/chat` - Send message with optional multiple `noteIds`
- `GET /api/skills/{id}/messages` - Get chat history
- `PATCH /api/skills/{id}/notes/{noteId}` - Edit note (full replacement)
- `PUT /api/skills/{id}/notes/{noteId}` - Update note (append with timestamp)
- Added `chat_messages` table for persistent chat history
- Updated `ChatService.SendMessage()` to accept `noteIds` array
- Added `NoteService.EditNote()` for full note editing

### Frontend
- New `SkillChatModal` component with minimize/fullscreen
- Slash command (`/`) for note selection dropdown
- Multiple context badges with individual remove buttons
- Save modal with "Update existing" or "Create new" options
- Edit button (pencil icon) on each note in sidebar
- Notes excluded from dropdown once selected

### Fixed
- CORS middleware now allows PATCH method
- Chat session initialization error handling
- Note editing now updates both title and content
- AI response saving (was saving user input instead)

---

## [2026-04-26] - TanStack Start Frontend Migration

### Added
- **TanStack Start** - Migrated from Next.js to TanStack Start
- **Atlas Design System** - Custom CSS variables and components
- **File-based Routing** - `/`, `/skills`, `/gallery`, `/notes`, `/settings`
- **3-Pane Skills Layout** - Sidebar + Content + Notes panel
- **Create Skill Dialog** - Templates for different skill formats
- **Edit Skill** - Raw markdown editor with preview
- **Sync Confirmation** - Warns about local changes before GitHub sync
- **Push Selection Dialog** - Choose which modified skills to push
- **Resizable Note Modal** - Minimize/resume draft notes

### Changed
- Frontend now fully decoupled from backend (JSON API)
- Improved performance with Vite HMR
- Better type safety with TypeScript

---

## [2026-04-15] - AI Integration & GitHub Sync

### Added
- **OpenCode Sidecar** - Node.js service (port 3002) for AI integration
- **AI Preview** - Side-by-side diff view (Original vs AI Updated)
- **GitHub Push** - Create PRs for skill updates
- **Visual Indicators** - Blue dot (modified), Yellow dot (notes)
- **Note Count Badges** - Show number of pending notes per skill

### Backend
- `POST /api/skills/{id}/preview` - Preview AI-updated skills
- `POST /api/skills/{id}/save` - Save AI changes to GitHub PR
- `POST /api/skills/push` - Push all pending changes
- `POST /api/skills/{id}/push` - Push single skill
- OpenCode integration via HTTP API

---

## [2026-04-01] - Core Backend & Skills Module

### Added
- **Go Backend** - HTTP server with Chi router
- **SQLite Database** - Embedded database with migrations
- **Skills Module** - SQLite cache + GitHub sync
- **Notes Module** - Buffer notes per skill
- **Photos Module** - Upload, list, search with tags

### Backend API
- `GET /api/skills` - List all skills with note counts
- `GET /api/skills/{id}` - Get skill detail with notes
- `POST /api/skills/create` - Create new skill
- `POST /api/skills/edit` - Edit skill content
- `GET /api/skills/sync` - Sync from GitHub
- `POST /api/skills/{id}/notes` - Add note to skill
- `DELETE /api/skills/{id}/notes/{noteId}` - Delete note
- `GET /api/photos` - List photos
- `POST /api/photos/upload` - Upload photo
- `GET /api/tags` - List all tags

### Infrastructure
- CORS middleware for frontend access
- Environment variable configuration (direnv)
- Static file server for photos
- Database migrations on startup
- GitHub integration (read/write)

---

## Format

This changelog follows these conventions:
- **[YYYY-MM-DD]** - Release date
- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security fixes

---

Last Updated: 2026-05-10
