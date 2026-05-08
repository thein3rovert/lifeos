# Next.js Migration Plan

Migrating from Go HTML templates + HTMX to Next.js App Router frontend with Go as JSON API.

## Architecture Overview

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Next.js     │    │  Go API      │    │  Sidecar    │
│  (App Router)│───▶│  (JSON only) │    │  (Express)  │
│  Port 3000   │    │  Port 6060   │◀───│  Port 3001  │
└─────────────┘    └──────┬───────┘    └─────────────┘
                          │
                   ┌──────┴───────┐
                   │  SQLite      │
                   │  + photos/   │
                   └──────────────┘
```

---

## Phase 1 — Go JSON API

Add JSON endpoints alongside existing HTML handlers so both UIs work during migration.

### 1.1 — CORS Middleware ✅
- [x] Add CORS middleware to Go server (allow Next.js origin)
- [x] Configure allowed origins via env var (`CORS_ORIGINS`, defaults to localhost:3000,3001)

### 1.2 — Photo API Endpoints ✅
- [x] `GET /api/photos` → JSON list of all photos
- [x] `GET /api/photos/search?q=` → JSON search results (text + `tags:` prefix)
- [x] `POST /api/photos/upload` → multipart form upload, return photo JSON
- [x] `GET /api/photos/{id}` → single photo JSON
- [x] Keep existing `/static/` serving for photos (Next.js can use these URLs directly)

### 1.3 — Skills API Endpoints ✅
- [x] `GET /api/skills` → JSON list of all skills
- [x] `GET /api/skills/{id}` → JSON single skill detail (includes notes)
- [x] `POST /api/skills/edit` → edit skill content, return updated skill
- [x] `GET /api/skills/sync` → force refresh from GitHub, return skills

### 1.4 — Notes API Endpoints ✅
- [x] `GET /api/skills/{id}/notes` → JSON list of notes for a skill
- [x] `POST /api/skills/{id}/notes` → add a note, return notes JSON
- [x] `DELETE /api/skills/{id}/notes/{noteId}` → delete a note
- [x] `POST /api/skills/{id}/notes/append` → append notes via AI, clear buffer

### 1.5 — AI Workflow API Endpoints ✅
- [x] `POST /api/skills/{id}/preview` → AI preview (calls sidecar), return preview JSON
- [x] `POST /api/skills/{id}/save` → save AI update (creates PR)
- [x] `POST /api/skills/preview-render` → render markdown to HTML, return rendered HTML

### 1.6 — Tags API Endpoints ✅
- [x] `GET /api/tags` → JSON list of all tags

---

## Phase 2 — Next.js App Scaffold

### 2.1 — Project Setup
- [ ] Initialize Next.js app in `web/` directory (App Router, TypeScript, Tailwind)
- [ ] Configure `next.config.js` — API proxy or rewrite to Go backend
- [ ] Set up environment variables (`NEXT_PUBLIC_API_URL`, etc.)

### 2.2 — API Client
- [ ] Create `lib/api.ts` — typed fetch wrapper for all Go endpoints
- [ ] Create types in `lib/types.ts` matching Go models (Photo, Skill, Note, Tag)

### 2.3 — Layout & Navigation
- [ ] Create root layout with dark sidebar (Home, Photos, Skills)
- [ ] Mobile-responsive sidebar (hamburger menu)
- [ ] Loading states / skeletons for page transitions

### 2.4 — Photo Pages
- [ ] `/photos` — photo gallery grid with search
- [ ] `/photos/upload` — upload form with tag selection
- [ ] Photo card component with caption + tags

### 2.5 — Skills Pages
- [ ] `/skills` — skills listing grid
- [ ] `/skills/[id]` — skill detail page (markdown rendered)
- [ ] Skill editor component

### 2.6 — Notes & AI Workflow
- [ ] Buffer notes UI — add/delete notes per skill
- [ ] "Append Notes" action
- [ ] "Preview AI Update" — call preview endpoint, show result
- [ ] Preview page — editable markdown + live rendered preview
- [ ] "Save to GitHub" action — creates PR, clears notes

### 2.7 — Home / Dashboard
- [ ] `/` or `/home` — dashboard with quick stats and cards

---

## Phase 3 — Docker Setup

### 3.1 — Dockerfiles
- [ ] Go API Dockerfile (multi-stage build)
- [ ] Next.js Dockerfile (multi-stage build)
- [ ] Sidecar Dockerfile (Node.js)

### 3.2 — Docker Compose
- [ ] `docker-compose.yml` — all three services
- [ ] Network wiring — Next.js talks to Go on internal network
- [ ] Volume mounts — SQLite DB + photos directory persisted
- [ ] Environment variable management (`.env` file)

### 3.3 — Production Considerations
- [ ] Next.js standalone output mode for smaller image
- [ ] Go binary compiled in builder stage
- [ ] Health check endpoints for all services

---

## Phase 4 — Cleanup & Cutover

### 4.1 — Remove HTML Templates from Go
- [ ] Delete `templates/` directory
- [ ] Remove template rendering logic from all handlers
- [ ] Remove HTMX references from Go codebase
- [ ] Remove `html/template` import if no longer used

### 4.2 — Remove Dual Rendering
- [ ] Remove `HX-Request` checks from handlers
- [ ] Remove HTMX partial templates (`*-list.html`, `*-preview.html`)

### 4.3 — Update Documentation
- [ ] Update `agent.md` with new architecture
- [ ] Update `readme.md` with new setup instructions
- [ ] Update `doc/minimal-plan.md` to reflect completed migration

### 4.4 — Final Testing
- [ ] All photo features work via Next.js
- [ ] All skill features work via Next.js
- [ ] AI workflow (notes → preview → save) works end-to-end
- [ ] Search works correctly
- [ ] Photo uploads work
- [ ] Docker Compose brings up all services cleanly

---

## Decisions Log

| Decision | Choice | Reason |
|----------|--------|--------|
| Router | App Router | Modern, recommended approach |
| Auth | None for now | YAGNI, add later |
| Photo serving | Go `/static/` | Keep it simple, move to S3/R2 later |
| Sidecar | Keep as-is | Works fine, no need to refactor yet |
| Deployment | Docker | Easy multi-service orchestration |
| API prefix | `/api/` | Clean separation from existing HTML routes during migration |

> Created: 04-24-2026