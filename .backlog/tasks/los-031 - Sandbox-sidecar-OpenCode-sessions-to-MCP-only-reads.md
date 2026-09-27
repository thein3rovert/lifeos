---
id: LOS-031
title: Sandbox sidecar OpenCode sessions to MCP-only reads
status: To Do
assignee: []
created_date: '2026-09-27 07:59'
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
