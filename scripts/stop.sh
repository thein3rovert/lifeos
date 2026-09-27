#!/usr/bin/env bash

# LifeOS Stop Script
# Stops all running services (reads ports from .env)

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load .env if present
if [[ -f "$PROJECT_ROOT/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.env"
    set +a
fi

# Defaults
: "${LIFEOS_PORT:=6060}"
: "${PORT:=3002}"
: "${FRONTEND_DEV_PORT:=3000}"
: "${OPENCODE_PORT:=4097}"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}╔════════════════════════════════════════╗${NC}"
echo -e "${RED}║      🛑 Stopping LifeOS Services      ║${NC}"
echo -e "${RED}╚════════════════════════════════════════╝${NC}"
echo ""

# True when the process runs from inside this project folder.
# Checked via /proc cwd, so only LifeOS dev processes match.
is_project_process() {
    local pid=$1
    local cwd
    cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || echo "")
    [[ -n "$cwd" && "$cwd" == "$PROJECT_ROOT"* ]]
}

# Function to kill process on port
# Only kills it if it runs from this project folder, so browsers and other apps stay safe.
kill_port() {
    local port=$1
    local name=$2
    local pids=$(lsof -ti:$port 2>/dev/null)

    if [ -z "$pids" ]; then
        echo -e "${GREEN}[✓]${NC} $name not running"
        return
    fi

    for pid in $pids; do
        if is_project_process "$pid"; then
            echo -e "${YELLOW}[•]${NC} Stopping $name (port $port, PID: $pid)..."
            kill -9 "$pid" 2>/dev/null || true
            echo -e "${GREEN}[✓]${NC} $name stopped"
        else
            echo -e "${YELLOW}[!]${NC} Port $port is used by another app (PID: $pid), leaving it alone:"
            echo "    $(ps -o args= -p "$pid" 2>/dev/null)"
        fi
    done
}

# Stop all services
kill_port "$OPENCODE_PORT" "OpenCode"
kill_port "$PORT"          "Sidecar"
kill_port "$LIFEOS_PORT"   "Backend"
kill_port "$FRONTEND_DEV_PORT" "Frontend"

# Also clean up leftover LifeOS processes by folder, never by bare tool name,
# so browsers and other projects are never touched.
echo ""
echo -e "${YELLOW}[•]${NC} Cleaning up any remaining processes..."
for pid in $(pgrep -f "opencode serve|node index.js|server/cmd/server|vite" 2>/dev/null); do
    if is_project_process "$pid"; then
        echo -e "${YELLOW}[•]${NC} Stopping leftover PID $pid ($(ps -o args= -p "$pid" 2>/dev/null | head -c 80))..."
        kill -9 "$pid" 2>/dev/null || true
    fi
done

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✨ All services stopped!          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
