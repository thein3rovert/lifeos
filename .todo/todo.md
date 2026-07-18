## Agent Page - Smart Board Feature

The agent page (which will be renamed) have a chat interface that is connected to opencode and the mcp created for it that has access a scope and limited dir in my obsidian vault.

But this page except for the chat interface is currently blank and has nothing in it but i have an idea of what i want it to be..a SMART BOARD..where i can see more ai summary and details about my vault and all.

- [x] I need to make sure some of the description is visible on the cards
- [ ] If the recent output is [] just show the cache output in the db and have a way to show its not the latest output
- [x] I need to convert the catagory on the card to tags instead and have them below like linear
- [x] I need to preview card below to show the preview mode first instead of edit mode and i need the save to work.
- [ ] Make sure the github action is using bun so it have faster build time
- [x] Generate a new agent.md for lifeos so its
- [ ] Add the ability to pause/disable the timer on each panel
  - [ ] Maybe also add it in settings
- [ ] Add notification (discord/telegram)
- [ ] i need a better way to integrate the agent chat below with each of these days
  - [ ] It need to have context of each card and also knowledge base in case it wants to go deeper into what the context board gives.
- [ ] Add filtering option to panel types

### Plan: `/doc/smartboard-plan.md`

## Backend Code Smells (from review)

### Bugs
- [x] `store/chat_message.go:11-12` — fix malformed JSON tags (missing closing `"`, caught by `go vet`)
- [x] `handler/skills.go:304-308` — check `sc.UpdateSkill` error before overwriting `skill.Content` (silent empty writes today) — N/A, handler/skills.go deleted
- [x] `api/skills/skill.go:138` — remove no-op `strings.ReplaceAll(id, "_", "_")`
- [x] `handler/photo.go:42-43` — add missing `return` after `http.Error` — N/A, photo.go deleted
- [x] `handler/photo.go:110` — check `r.ParseMultipartForm` error — N/A, photo.go deleted
- [x] `store/photo.go:82` — add `defer rows.Close()` (resource leak in `ListTags`) — N/A, photo.go deleted

### Duplication (~400 lines removable)
- [x] Delete duplicate HTML handlers in `handler/skills.go` (522 lines duplicates `api/ai.go` + `api/skills/`; already marked Phase 4 removal in `main.go`)
- [x] Extract `stripMarkdownFrontMatter` once to `internal/utils/markdown.go` (exists in 2+ files today)
- [x] Delete `api/skills/skill.go:18-63` duplicates of `respondJSON`, `NoteResponse` etc. — use `api/` versions
- [x] Consolidate 3 frontmatter parsers into one place; delete unused exported `ParseFrontmatter` in `store/skills/skills.go`

### Config leaks (survived the refactor)
- [x] `mcp/server.go:22-31, 90-92` — hardcoded absolute paths `/home/thein3rovert/Documents/...`, move to `MCP_ALLOWED_DIRS` env
- [x] `services/smartboard.go:141-146, 223, 256, 288, 319` — same paths baked into 5 prompt strings, parameterize via config
- [x] `main.go:63` — hardcoded `"lifeos.db"`, add `cfg.DBPath` (env `LIFEOS_DB_PATH`)
- [x] `main.go:182` — MCP SSE `http://localhost:` hardcoded, add `cfg.PublicBaseURL`

### Structural
- [x] Move sidecar orchestration + note joining out of HTTP handlers into `services.SkillAIService`
- [x] Services use concrete store types (`*skills.SQLSkillStore` etc.); define + inject interfaces so they're testable
- [x] Add `ChatMessageStore` interface in `store/store.go`
- [x] Consolidate schema — currently split across `sqlite.go`, `store/skills/skills.go`, `store/skills/files.go` (race risk)
- [x] `ALTER TABLE` errors silently swallowed in `skills.go:64` + `files.go:37-49` — check for "duplicate column name" only
- [x] Two `AgentHandler` structs in different packages → rename to `SkillChatHandler` and `AgentChatHandler`
- [x] `api/skills/skill.go:329-373` — move `SkillPusher`/`SingleSkillPusher` interfaces to `store/store.go`

### Store layer gaps
- [x] `SkillStore` interface doesn't cover file operations → add `SkillFileStore` interface
- [x] `store/skills/skills.go:172-179` — `upsertSkillFromGitHub` silently drops pending local changes (TODO: conflict resolution)
- [x] Delete unused `store/github/skill_store.go:101-106` `InvalidateCache`

### Nits
- [x] Replace `fmt.Printf` with `log.Printf` in ~20 places (scheduler.go, smartboard.go, agent.go, skills.go, chat.go, main.go)
- [x] Fix template `err` swallowing in `handler/skills.go` and `handler/photo.go` — N/A, handler pkg gone
- [x] Delete commented-out blocks in `api/agents/agent.go:11-42, 104-137`
- [x] Delete empty `store/skills/files.go:11-13` `init()`
- [x] Delete stale `store/chat_messages.sql` (migration is embedded in `sqlite.go`)
- [x] Fix receiver name `createSkillHandler` → `h` in `api/skills/skill.go:123`
- [ ] Promote inline anonymous request structs to named types in `models/`
- [x] Downgrade or drop `log.Printf("SavePhoto Successfully")` per-save log in `store/photo.go:35` — N/A, deleted
- [x] Update outdated `api/README.md` (missing push/create/agent/smartboard endpoints)
- [x] Fix comment typos: "Mocw", "businesss", "Secureity", "decorder", "retuern", "funtion"
