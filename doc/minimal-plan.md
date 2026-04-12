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
- [ ] `GET /photos/search` — search photos by caption, filename, or tag

**Display**
- [x] Render photo in the ui using go static file server
- [x] We can use closure or struct in the handle the store request

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
- [ ] `SearchPhotos(query string) ([]model.Photo, error)`
> SearchPhotos searches caption, filename with `LIKE %query%`
> If query starts with `tag:`, treat as tag search (use GetPhotosByTag)

> Completed 06-04-2026

---

**Step 6 — Skills handler**
- [ ] `GET /skills` — read all `.md` files from `skills/` dir
- [ ] Convert markdown to HTML (using `github.com/yuin/goldmark`)
- [ ] Pass rendered HTML to template

- **Functionalities**
- [ ] 1. Edit skills
- [ ] 2. Option to update skills by pasting new text(memories) to a provided text box, click update button and it will trigger an ai agent that will review and update the memory as required, this will be a growing memory as we learn
- [ ] 3. Each skills are downloaded in diff skills format (opencode, claude, copilot) metadata format
- [ ] 4. Each skills have a assets section where we can add images, files and other things that are associated to the skills
- [ ] 5. Ability to download skills and assets when requires

**Step 7 — Tighten up**
- [ ] Move config (port, paths) to env vars
- [ ] Proper error handling across all layers
- [ ] Clean up any shortcuts taken earlier

**TODO: More features to add**
- [ ] Glossary for nix and other tools [Static Webpage] (Useful for other people, we host it publicly later)
- [ ] Cheatsheet Webpage [Static Webpage], contains all tools i've used, their command and description.
