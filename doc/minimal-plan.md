**Step 1 — Project init**
- [x] Run `go mod init github.com/yourname/lifeos`
- [x] Create the folder structure
- [x] Write `main.go` with a basic `http.ListenAndServe` — just enough to start the server and print a log

**Step 2 — Router + routes**
- [x] Add Chi router (`go get github.com/go-chi/chi/v5`)
- [x] Register `/photos` and `/skills` as GET routes
- [x] Handlers just return plain text for now ("photos page", "skills page")

**Step 3 — Templates**
- [x] Create `templates/base.html` (shared layout)
- [x] Create `templates/photos.html` and `templates/skills.html`
- [x] Update handlers to parse and execute templates instead of plain text

**Step 4 — SQLite + store layer**
- [x] Add `modernc.org/sqlite` (pure Go, no CGo needed)
- [x] Define a `Photo` model in `internal/model`
- [x] Write a `Store` interface in `internal/store` with methods like `SavePhoto`, `ListPhotos`
- [x] Implement the interface, run migrations (create table on startup)

**Step 5 — Photos handler**
- [x] `POST /photos/upload` — accept a file, save to `photos/` dir, save metadata to DB
- [x] `GET /photos` — fetch all photos from DB, pass to template, display them
- [x] `GET /photos/search` — search photos by caption, filename, or tag

**Display**
- [x] Render photo in the ui using go static file server
- [x] We can use closure or struct in the handle the store request
- [x] Add Tailwind CSS for styling
- [x] HTMX for live search (no page reload)

**Organisation**
- [ ] Albums/collections — group photos together
- Tags — label photos (e.g. "travel", "nature") and filter by tag
> Tags have many to many relationship with photos (one photo can have many tags can belong to multiple photos).
```
photos          — already have this
tags            — id, name
photo_tags      — photo_id, tag_id (joins them together)
```

**Tags — Store methods needed:**
- [x] `SaveTag(name string) (int64, error)`
- [x] `AddTagToPhoto(photoID, tagID int64) error`
- [x] `ListTags() ([]model.Tag, error)`
- [x] `GetPhotoTags(photoID int64) ([]model.Tag, error)`
- [x] `GetPhotosByTag(tagName string) ([]model.Photo, error)`

**Search — Store methods needed:**
- [x] `SearchPhotos(query string) ([]model.Photo, error)`
> SearchPhotos searches caption, filename with `LIKE %query%`
> If query starts with `tag:`, treat as tag search (use GetPhotosByTag)

> Completed 04-13-2026

---

**Step 6 — Skills handler**
- [x] `GET /skills` — read all skills from GitHub repo (thein3rovert/polis)
- [x] Convert markdown to HTML (using `github.com/yuin/goldmark`)
- [x] Pass rendered HTML to template
- [x] Support both LifeOS and Opencode skill formats
- [x] Add caching (5-min TTL) with manual sync
- [x] Sync button to force refresh from GitHub

**Skills — Architecture**
```
internal/store/github/
├── client.go      # GitHub API client (reusable, centralized auth)
├── types.go       # API response types
└── skill_store.go # GitHubSkillStore implementation
```

- **Functionalities**
- [x] 1. Buffer notes system — add/delete notes per skill (SQLite)
- [x] 2. AI-powered skill updates via OpenCode sidecar
  - [x] Create OPENCODE sidecar (Node.js + Express on port 3001)
  - [x] Buffer notes accumulate in SQLite
  - [x] "Append Notes" — direct append to skill
  - [x] "Preview AI Update" — AI rewrites skill with notes
  - [x] Review preview page (HTML render + raw markdown)
  - [ ] Edit preview manually before creating PR ← NEXT
- [ ] 3. Download skills in different formats (opencode, claude, copilot)
- [ ] 4. Skills assets section (images, files)
- [ ] 5. Download skills with assets

**Skills — Note Buffer Flow**
```
Skill Page → Add Notes (buffered in SQLite)
    ↓
Two options:
  1. "Append Notes to Skill" — direct append (original)
  2. "Preview AI Update" → Sidecar → AI rewrites skill
                              ↓
                        Preview Page (review HTML + raw markdown)
                              ↓
                        [Edit Preview] ← IN PROGRESS
                              ↓
                        [Save to GitHub] — creates PR, clears buffer
```

**Step 7 — Tighten up**
- [x] Move config (port, paths) to env vars — GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, LIFEOS_PORT
- [x] Add direnv support with .envrc
- [ ] Proper error handling across all layers
- [ ] Clean up any shortcuts taken earlier

**TODO: More features to add**
- [ ] Glossary for nix and other tools [Static Webpage] (Useful for other people, we host it publicly later)
- [ ] Cheatsheet Webpage [Static Webpage], contains all tools i've used, their command and description.

> Last Updated: 04-18-2026
