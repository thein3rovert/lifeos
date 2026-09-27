---
id: LOS-031
title: Sandbox sidecar OpenCode sessions to MCP-only reads
status: In Progress
assignee:
  - thein3rovert
created_date: '2026-09-27 07:59'
updated_date: '2026-09-27 10:14'
labels:
  - sidecar
  - opencode
  - security
dependencies: []
priority: high
type: enhancement
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Sidecar currently pins OpenCode sessions to OPENCODE_DIRECTORY / PROJECT_DIR / cwd (likely lifeos/sidecar). When asking questions the agent can read the whole project dir. LifeOS should only expose meetings and journals via the lifeos-files MCP. Sandbox the session cwd and block built-in file access so MCP is the only source.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sessions default to an empty sandbox dir, not project / sidecar dir
- [ ] #2 Agent cannot read project files via built-in file tools, only via lifeos-files MCP
- [ ] #3 Existing agent, session, skill and permission flows still work
- [ ] #4 README documents the sandbox behavior and config
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Default session cwd to empty sandbox dir (auto-created), never project root
2. Ship sandbox opencode.json denying built-in file/shell tools, allowing only lifeos-files MCP
3. Wire dev.sh + sidecar to use sandbox, update README
4. Verify sessions create, chat works, shell reads blocked, MCP reads work

5. Start dev backend before sidecar and wait for health; on sidecar init explicitly reconnect lifeos-files MCP and fail startup if unavailable, so cached failures cannot silently deprive agent of notes. Verify recovered status, test start sequence and SDK calls.

6. Restrict LifeOS agent: disable inherited MCPs, expose lifeos-files tools directly (codemode:false), deny all actions by default except its two MCP tool actions, cap steps, and remove subagent/skill execution. Test actual tools in a fresh sandbox session. Separate network-isolated service remains an additional deployment requirement; do not claim permissions alone isolate network.

7. Pass the backend configured LIFEOS_MEETINGS_PATH and LIFEOS_JOURNAL_PATH into the first synthetic context of every floating-chat conversation, so LifeOS does not guess sandbox/home paths. Add Go regression test in server/tests and verify configured paths match MCP_ALLOWED_DIRS.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Sandbox built: sidecar/sandbox.js writes deny-policy opencode.json into .opencode-sandbox, getLocation defaults there, dev.sh passes it explicitly. All 23 sidecar tests pass including 5 new sandbox tests.

Root cause of shell persisting: stale sidecar (old code+env) kept serving; fixed stop.sh/dev.sh to match processes by /proc cwd so just stop/just dev actually restart. Verified fresh sessions land in .opencode-sandbox with deny config. Old conversations keep old location, user must start new chat.

Found exact failure in OpenCode server log: ConnectionRefused for sandbox MCP on Sep 27 at 08:55, before backend was ready. Manually called client.mcp.connect for sandbox after backend was available; status changed to connected. Will automate this during sidecar startup.

Implemented backend-first dev startup with health wait and sidecar MCP reconnect/connected-status gate. npm test: 28 passing; bash syntax and git diff --check clean. Live SDK smoke test in sandbox: reply nonempty; tool call execute contained lifeos-files, confirming MCP worked after explicit reconnect. Current running sidecar may still be old process until next restart.

Fixed startup race: just dev waits for backend /health before sidecar, then sidecar calls client.mcp.connect for sandbox and checks connected status before listening. Canonicalized sandbox path to avoid SDK location mismatch. Live validation: initial reconnect changed cached failed MCP to connected; fresh sandbox chat returned text and its execute tool called lifeos-files. Restarted sidecar with new code; /health returns healthy, startup log says Connected to lifeos-files MCP; 28 sidecar tests pass and bash -n/git diff --check pass.

Applied deny-by-default LifeOS agent policy (only lifeos-files_list_files/read_file); disabled Code Mode for that MCP and capped agent at 12 steps. Verified with a fresh SDK sandbox session: it listed journal through lifeos-files_list_files and reported only the two LifeOS tool names available. Sidecar tests 28/28 pass. Shared OpenCode service still shows global MCP connections; permission allowlist hides them from LifeOS agent but separate network-isolated runtime is not yet implemented.

The backend process already has valid meeting/work and journal paths in MCP_ALLOWED_DIRS, but CreateConversation only sends cached panels to the sidecar. Sidecar agent system omits those paths, so it guesses sandbox and /tmp/opencode; MCP correctly denies those requests.

Fixed folder discovery for floating chat: backend passes its configured meetings and journals paths to the session synthetic context on creation. These paths already match the backend MCP_ALLOWED_DIRS. Added TestFloatingChatStartsWithAllowedNoteFolders in server/tests; focused and full Go suite pass. Backend must restart for this change and user must start a new conversation (existing sessions retain old context).
<!-- SECTION:NOTES:END -->
