#!/usr/bin/env bash
# Start a dedicated OpenCode server for production LifeOS chats.
# Run under the user systemd service. Never starts or stops the main OpenCode service.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST_HOME="$HOME"
export PATH="$HOST_HOME/.opencode/bin:$PATH"
if [[ ! -f "$ROOT/.env" ]]; then
    echo "Missing $ROOT/.env" >&2
    exit 1
fi
set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

: "${MCP_API_KEY:?Set MCP_API_KEY in .env}"
: "${LIFEOS_OPENCODE_PORT:=4098}"
: "${LIFEOS_OPENCODE_MODEL:=opencode-go/deepseek-v4-pro}"
: "${LIFEOS_SANDBOX_DIR:=$HOME/.local/share/lifeos-opencode/sandbox}"

# Separate config, saved sessions and credentials from the main OpenCode service.
STATE="$(dirname "$LIFEOS_SANDBOX_DIR")"
mkdir -p "$LIFEOS_SANDBOX_DIR/.state" "$STATE/config/opencode" "$STATE/data" "$STATE/cache" "$STATE/home"
chmod 700 "$STATE" "$LIFEOS_SANDBOX_DIR" "$STATE/config" "$STATE/data" "$STATE/home"

# A minimal global config; the sidecar writes this sandbox's LifeOS agent config.
LIFEOS_OPENCODE_MODEL="$LIFEOS_OPENCODE_MODEL" python3 - "$STATE/config/opencode/opencode.json" <<'PY'
import json
import os
import sys
with open(sys.argv[1], "w", encoding="utf-8") as file:
    json.dump({
        "$schema": "https://opencode.ai/config.json",
        "model": os.environ["LIFEOS_OPENCODE_MODEL"],
        "mcp": {"servers": {"lifeos-files": {
            "type": "remote",
            "url": "http://127.0.0.1:" + os.getenv("BACKEND_PORT", "7060") + "/mcp",
            "oauth": False,
            "codemode": False,
            "headers": {"Authorization": "Bearer {env:MCP_API_KEY}"},
        }}},
    }, file)
PY

# Write the sandbox agent and MCP config before OpenCode boots. Without this,
# the service may cache an empty MCP catalog until it is restarted.
(
    cd "$ROOT/sidecar"
    OPENCODE_DIRECTORY="$LIFEOS_SANDBOX_DIR" \
    LIFEOS_MCP_URL="http://127.0.0.1:${BACKEND_PORT:-7060}/mcp" \
    node --input-type=module -e "import { ensureSandbox } from './sandbox.js'; ensureSandbox()"
)

export HOME="$STATE/home"
export XDG_CONFIG_HOME="$STATE/config"
export XDG_DATA_HOME="$STATE/data"
export XDG_CACHE_HOME="$STATE/cache"
export XDG_STATE_HOME="$LIFEOS_SANDBOX_DIR/.state"
unset OPENCODE_URL OPENCODE_DIRECTORY
unset OPENCODE_SERVER_PASSWORD

cd "$LIFEOS_SANDBOX_DIR"
if [[ "${1:-}" == "auth" ]]; then
    # Skip both pickers. OpenCode Go supports key auth and OPENCODE_API_KEY.
    exec opencode auth login "${LIFEOS_OPENCODE_MODEL%%/*}" --method key
fi
exec opencode serve --service --hostname 0.0.0.0 --port "$LIFEOS_OPENCODE_PORT"
