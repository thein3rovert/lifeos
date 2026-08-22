---
id: LOS-016
title: Fix lifeos MCP server access to Obsidian vault directories
status: Done
assignee: []
created_date: '2026-08-22 17:16'
updated_date: '2026-08-22 17:16'
labels:
  - mcp
  - backend
  - docker
  - configuration
dependencies: []
priority: high
type: bug
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The lifeos MCP server was connected to opencode but couldn't access any files. It kept saying "no directories configured" and "access denied" when trying to read from the Obsidian vault.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## What Was Wrong

**Three separate problems:**

1. **Missing permission setting**: The Docker container didn't have `MCP_ALLOWED_DIRS` environment variable, so the server didn't know which folders it was allowed to read from.

2. **Missing folder mount**: The Docker container couldn't see the vault folders because they weren't mounted (connected) into the container's filesystem.

3. **Wrong port number**: The server was advertising itself on port 6060 but opencode was connecting to port 7060, causing a mismatch error.

4. **Environment variable conflict**: The `.env.dev` file (for local development) was overriding the `.env` file (for production) because of direnv, so changes weren't taking effect.

## What We Fixed

### 1. Added Permission Settings
In `docker-compose.prod.yml`, added these environment variables:
```yaml
- MCP_ALLOWED_DIRS=${MCP_ALLOWED_DIRS}
- LIFEOS_MEETINGS_PATH=${LIFEOS_MEETINGS_PATH}
- LIFEOS_JOURNAL_PATH=${LIFEOS_JOURNAL_PATH}
```

### 2. Mounted the Vault Folder
In `docker-compose.prod.yml`, added volume mount:
```yaml
volumes:
  - /home/thein3rovert/Documents/resources/work_Elanco:/home/thein3rovert/Documents/resources/work_Elanco:ro
```
The `:ro` means read-only for safety.

### 3. Fixed Port Configuration
Changed `.env` file:
- `LIFEOS_PUBLIC_URL` from `http://100.105.217.77:6060` to `http://100.105.217.77:7060`
- This matches the external port that opencode connects to

### 4. Fixed Environment Loading
Updated `justfile` prod commands to ignore direnv:
```bash
env -i HOME="${HOME}" PATH="${PATH}" USER="${USER}" bash -c "podman compose..."
```
This ensures `.env` (prod settings) is used instead of `.env.dev` (dev settings).

## Bonus: Cleaned Up Configuration

- Removed duplicate port definitions
- Added `PUBLIC_HOST` variable to centralize the IP address
- Made port names simpler: `BACKEND_PORT`, `FRONTEND_PORT`, `SIDECAR_PORT`
- Removed unused `PORT=3002` variable

## How to Deploy Changes Now

Always use: `just prod-restart backend`

This now properly recreates the container with fresh environment variables instead of just restarting it.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-08-22 17:16
---
Tested and verified working! The MCP server now shows as connected in opencode and can successfully list and read files from the Obsidian vault.

Main gotcha: Docker restart doesn't reload environment variables. You need to recreate the container. The justfile has been updated to do this automatically for all prod commands.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed lifeos MCP server access to Obsidian vault by:

1. **Added MCP_ALLOWED_DIRS environment variable** - Tells the server which folders it can read
2. **Mounted vault directory** - Makes the files actually accessible inside the container  
3. **Fixed port mismatch** - Changed LIFEOS_PUBLIC_URL from 6060 to 7060
4. **Fixed direnv interference** - Updated justfile to use clean environment for prod commands

The MCP server now successfully connects and can read files from `/home/thein3rovert/Documents/resources/work_Elanco/meeting` and `/home/thein3rovert/Documents/resources/work_Elanco/journal`.

**Key Learning**: When changing Docker environment variables, you must recreate the container (not just restart it) for changes to take effect. The justfile now does this automatically.
<!-- SECTION:FINAL_SUMMARY:END -->
