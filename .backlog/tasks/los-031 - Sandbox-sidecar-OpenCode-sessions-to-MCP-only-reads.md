---
id: LOS-031
title: Sandbox sidecar OpenCode sessions to MCP-only reads
status: In Progress
assignee:
  - thein3rovert
created_date: '2026-09-27 07:59'
updated_date: '2026-09-27 12:00'
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
- [ ] #5 Production sidecar connects to a dedicated OpenCode process and sees the same host-visible sandbox path rather than container /app
- [ ] #6 Production MCP targets the production backend and startup fails safely when it is unavailable
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

8. Production: create a host-side dedicated OpenCode service with private XDG config/data, provider auth onboarding and HTTP password; bind-mount one absolute sandbox path at the same location inside sidecar; point sidecar at dedicated service and host-side production MCP URL (7060), provide backend health gating and a rollout check. Do not modify the NixOS main OpenCode service or claim firewall/network egress enforcement without explicit firewall setup.

Production design refinement: use `opencode serve --service` with a private XDG state directory and generated authenticated service.json mounted into sidecar, rather than fixed HTTP Basic credentials. Standalone `serve` on installed v2.0.15 returned 401 for configured Basic on /api/*; generated service registration works with the SDK. Provider authentication must be completed interactively for isolated credentials before enabling production sidecar.

9. Rollout gate: verify the main-branch sidecar image build finished (build-sidecar.yml publishes latest), pull latest image, recreate only prod sidecar, then confirm its logs show dedicated :4098, host-visible sandbox and production lifeos-files MCP. Start a fresh production chat to verify only the two permitted MCP tools and no access outside allowed dirs; keep LOS-031 In Progress until this passes. Configure NixOS ingress/egress firewall separately before claiming network isolation.
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

Validated dedicated host service HTTP API with generated registration credentials (v2.0.15), and `podman compose config` resolves sidecar URL to host.containers.internal:4098, same absolute sandbox bind mount, host-side production MCP URL at 127.0.0.1:7060. Isolated provider store has no account yet: agent/MCP availability cannot be fully verified until `just prod-opencode-auth` is run. No changes to the main OpenCode server.

Production infrastructure now uses dedicated host `opencode serve --service` on :4098 with separate XDG config/data/state, generated registration credentials shared only through a host-visible sandbox bind mount, and Compose sidecar points exclusively to that URL (not the main :4097). In a temporary isolated instance the sidecar client authenticated via the registration file (v2.0.15), and Podman Compose config resolved matching sandbox paths plus prod MCP host port 7060. Fresh isolated store has no provider credentials: agent/MCP catalog was empty and full prompt + MCP flow was NOT verifiable until interactive `just prod-opencode-auth`; therefore no live production rollout occurred. Port 4098 firewall/egress policy is also not implemented.

The isolated provider picker showed no options in the user terminal. Confirmed from the dedicated V2 server integration catalog that `opencode-go` exists; changed `just prod-opencode-auth` to call auth login with the provider ID from LIFEOS_OPENCODE_MODEL directly, skipping the picker.

Confirmed from the isolated V2 integration catalog that opencode-go supports method `key` and environment credential `OPENCODE_API_KEY`. Provider ID alone still displayed an empty picker in the user terminal; updated prod auth command to pass `--method key` and documented OPENCODE_API_KEY as the noninteractive alternative.

User placed OPENCODE_API_KEY in ignored .env. Fixed prod-opencode-auth to verify the env key without launching broken CLI picker. Started dedicated user systemd service on :4098; fresh service initially lacks agent/MCP catalog until integration discovery, so sidecar now primes integration.list and agent.list before MCP reconnect. Verified fresh service shows LifeOS agent and connected production MCP, and isolated opencode-go/deepseek-v4-pro replied Ready in a test session. Production sidecar container remains old image; no live app cutover yet.

Current provider key in ignored .env works via OPENCODE_API_KEY environment; dedicated user service active on :4098 and a fresh session with opencode-go/deepseek-v4-pro replied Ready. Production sidecar container is still 3-day-old image. The sidecar workflow publishes latest on main pushes touching sidecar/**, but gh CLI is unavailable locally so image publication has not been confirmed. No production cutover or firewall rules performed.

Production cutover smoke test after user restarted backend/frontend/sidecar: all three containers up; backend and sidecar /health return 200; sidecar logs OpenCode 2.0.15 at host.containers.internal:4098, lifeos-files MCP connected, host-visible sandbox path. Disposable production sidecar session/chat returned 200 with a nonempty reply; the only tool used was lifeos-files_list_files (completed) against allowed journal folder; deleted the test session afterward. Main NixOS OpenCode remains separately on its original service; firewall ingress/egress isolation remains unconfigured.
<!-- SECTION:NOTES:END -->
