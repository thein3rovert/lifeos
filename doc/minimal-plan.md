**Step 1 — Project init**
- Run `go mod init github.com/yourname/lifeos`
- Create the folder structure
- Write `main.go` with a basic `http.ListenAndServe` — just enough to start the server and print a log

**Step 2 — Router + routes**
- Add Chi router (`go get github.com/go-chi/chi/v5`)
- Register `/photos` and `/skills` as GET routes
- Handlers just return plain text for now ("photos page", "skills page")

**Step 3 — Templates**
- Create `templates/base.html` (shared layout)
- Create `templates/photos.html` and `templates/skills.html`
- Update handlers to parse and execute templates instead of plain text

**Step 4 — SQLite + store layer**
- Add `modernc.org/sqlite` (pure Go, no CGo needed)
- Define a `Photo` model in `internal/model`
- Write a `Store` interface in `internal/store` with methods like `SavePhoto`, `ListPhotos`
- Implement the interface, run migrations (create table on startup)

**Step 5 — Photos handler**
- `POST /photos/upload` — accept a file, save to `photos/` dir, save metadata to DB
- `GET /photos` — fetch all photos from DB, pass to template, display them

**Step 6 — Skills handler**
- `GET /skills` — read all `.md` files from `skills/` dir
- Convert markdown to HTML (using `github.com/yuin/goldmark`)
- Pass rendered HTML to template

**Step 7 — Tighten up**
- Move config (port, paths) to env vars
- Proper error handling across all layers
- Clean up any shortcuts taken earlier

---

Solid foundation. Start with step 1?
