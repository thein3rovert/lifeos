# API Endpoints

JSON API for the Next.js frontend. All endpoints return JSON. All `/api/` routes run alongside the existing HTML routes.

## Photos

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/photos` | `photoAPI.ListPhotos` | List all photos |
| GET | `/api/photos/search?q=` | `photoAPI.SearchPhotos` | Search photos (use `tags:landscape` for tag search) |
| POST | `/api/photos/upload` | `photoAPI.UploadPhoto` | Upload a photo (multipart form: `photo` file + `caption` + `tags`) |
| GET | `/api/photos/{id}` | `photoAPI.GetPhoto` | Get a single photo by ID |

## Skills

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/skills` | `skillAPI.ListSkills` | List all skills |
| GET | `/api/skills/{id}` | `skillAPI.GetSkill` | Get a skill with its notes |
| POST | `/api/skills/edit` | `skillAPI.EditSkill` | Edit skill content (JSON: `skill_id`, `content`) |
| GET | `/api/skills/sync` | `skillAPI.SyncSkills` | Force refresh skills from GitHub |

## Notes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/skills/{id}/notes` | `noteAPI.GetNotes` | List notes for a skill |
| POST | `/api/skills/{id}/notes` | `noteAPI.AddNote` | Add a buffer note (JSON: `content`) |
| DELETE | `/api/skills/{id}/notes/{noteId}` | `noteAPI.DeleteNote` | Delete a note |

## AI Workflow

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/skills/{id}/preview` | `aiAPI.PreviewSkillUpdate` | AI preview update (calls sidecar) |
| POST | `/api/skills/{id}/save` | `aiAPI.SaveSkillUpdate` | Save AI update to GitHub (creates PR) |
| POST | `/api/skills/{id}/notes/append` | `aiAPI.AppendNotesToSkill` | Append notes via AI, save and clear buffer |
| POST | `/api/skills/preview-render` | `aiAPI.RenderMarkdown` | Render markdown to HTML |

## Tags

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/tags` | `tagAPI.ListTags` | List all tags |

## General

- CORS enabled via `middleware.CORS` — origins configurable with `CORS_ORIGINS` env var (defaults to `localhost:3000,3001`)
- Path params use Go 1.22+ `r.PathValue("id")` syntax
- Photo files still served at `/static/photos/` by the Go server