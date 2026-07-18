# API Endpoints

JSON API for the TanStack Start frontend. All endpoints return JSON.

## Files

```
server/internal/api/
├── README.md      # This file — endpoint reference
├── response.go    # Shared JSON helpers: RespondJSON(), RespondError(), DecodeJSON()
├── note.go        # Note endpoints
├── ai.go          # AI workflow endpoints (uses sidecar.Client)
├── skills/        # Skill + skill-file endpoints
├── agents/        # General agent chat endpoints
├── chats/         # Per-skill chat session endpoints
└── smartboard/    # Smart Board endpoints
```

## Skills

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/skills` | `skillAPI.ListSkills` | List all skills |
| GET | `/api/skills/{id}` | `skillAPI.GetSkill` | Get a skill with its notes |
| POST | `/api/skills/create` | `skillAPI.CreateNewSkill` | Create a new skill |
| POST | `/api/skills/edit` | `skillAPI.EditSkill` | Edit skill content |
| GET | `/api/skills/sync` | `skillAPI.SyncSkills` | Pull skills from GitHub |
| POST | `/api/skills/push` | `skillAPI.PushSkills` | Push all pending skills to GitHub |
| POST | `/api/skills/{id}/push` | `skillAPI.PushSingleSkill` | Push a single skill |
| GET | `/api/skills/{id}/files` | `skillFileAPI.ListFile` | List reference files |
| GET | `/api/skills/{id}/files/{path...}` | `skillFileAPI.GetFile` | Get a reference file |
| PUT | `/api/skills/{id}/files/{path...}` | `skillFileAPI.SaveFile` | Save a reference file |

## Notes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/notes` | `noteAPI.GetAllNotes` | List all notes |
| GET | `/api/skills/{id}/notes` | `noteAPI.GetNotes` | List notes for a skill |
| POST | `/api/skills/{id}/notes` | `noteAPI.AddNote` | Add a buffer note |
| PUT | `/api/skills/{id}/notes/{noteId}` | `noteAPI.UpdateNote` | Update a note |
| PATCH | `/api/skills/{id}/notes/{noteId}` | `noteAPI.EditNote` | Edit a note |
| DELETE | `/api/skills/{id}/notes/{noteId}` | `noteAPI.DeleteNote` | Delete a note |

## AI Workflow

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/skills/{id}/preview` | `aiAPI.PreviewSkillUpdate` | AI preview update (via sidecar) |
| POST | `/api/skills/{id}/save` | `aiAPI.SaveSkillUpdate` | Save AI update to GitHub (creates PR) |
| POST | `/api/skills/{id}/notes/append` | `aiAPI.AppendNotesToSkill` | Append notes via AI |
| POST | `/api/skills/preview-render` | `aiAPI.RenderMarkdown` | Render markdown to HTML |

## Chat (per-skill sessions)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/skills/{id}/session` | `chatAPI.GetOrCreateSession` | Get or create chat session |
| POST | `/api/skills/{id}/chat` | `chatAPI.SendChatMessage` | Send message |
| GET | `/api/skills/{id}/messages` | `chatAPI.GetChatMessages` | List messages |

## Agent (general assistant with MCP tools)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/agent/chat` | `agentAPI.AgentChatMessage` | Send message to general agent |
| POST | `/api/agent/abort` | `agentAPI.AbortRequest` | Abort an in-flight request |

## Smart Board

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/smartboard/{panelType}` | `smartBoardAPI.GetPanel` | Get panel data |
| POST | `/api/smartboard/refresh/{panelType}` | `smartBoardAPI.RefreshPanel` | Force refresh |
| GET | `/api/smartboard/schedule` | `smartBoardAPI.GetScheduleStatus` | Schedule status |
| POST | `/api/smartboard/schedule/{panelType}` | `smartBoardAPI.SetPanelSchedule` | Configure schedule |
| POST | `/api/smartboard/schedule/{panelType}/pause` | `smartBoardAPI.PausePanel` | Pause a panel |
| POST | `/api/smartboard/schedule/{panelType}/resume` | `smartBoardAPI.ResumePanel` | Resume a panel |
| POST | `/api/smartboard/schedule/pause-all` | `smartBoardAPI.PauseAllPanels` | Pause all |
| POST | `/api/smartboard/schedule/resume-all` | `smartBoardAPI.ResumeAllPanels` | Resume all |
| PATCH | `/api/smartboard/item/{itemId}` | `smartBoardAPI.UpdateItemStatus` | Update item status |
| PATCH | `/api/smartboard/item/{itemId}/content` | `smartBoardAPI.UpdateItemContent` | Update item content |

## General

- CORS enabled via `middleware.CORS` — origins configurable with `CORS_ORIGINS` env var
- Path params use Go 1.22+ `r.PathValue("id")` syntax
- All sidecar HTTP goes through `internal/sidecar.Client`
