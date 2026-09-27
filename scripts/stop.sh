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

# Function to kill process on port
# Only kills it if it looks like a LifeOS process, so browsers and other apps stay safe.
kill_port() {
    local port=$1
    local name=$2
    local pids=$(lsof -ti:$port 2>/dev/null)

    if [ -z "$pids" ]; then
        echo -e "${GREEN}[✓]${NC} $name not running"
        return
    fi

    for pid in $pids; do
        local args=$(ps -o args= -p "$pid" 2>/dev/null || echo "")
        if echo "$args" | grep -q "$PROJECT_ROOT\|opencode serve.*$OPENCODE_PORT\|lifeos\|sidecar\|vite.*$PROJECT_ROOT"; then
            echo -e "${YELLOW}[•]${NC} Stopping $name (port $port, PID: $pid)..."
            kill -9 "$pid" 2>/dev/null || true
            echo -e "${GREEN}[✓]${NC} $name stopped"
        else
            echo -e "${YELLOW}[!]${NC} Port $port is used by another app (PID: $pid), leaving it alone:"
            echo "    $args"
        fi
    done
}

# Stop all services
kill_port "$OPENCODE_PORT" "OpenCode"
kill_port "$PORT"          "Sidecar"
kill_port "$LIFEOS_PORT"   "Backend"
kill_port "$FRONTEND_DEV_PORT" "Frontend"

# Also clean up leftover LifeOS processes.
# Each pattern includes the project folder, so other apps are never touched.
echo ""
echo -e "${YELLOW}[•]${NC} Cleaning up any remaining processes..."
pkill -f "opencode serve --port $OPENCODE_PORT" 2>/dev/null || true
pkill -f "$PROJECT_ROOT/sidecar" 2>/dev/null || true
pkill -f "$PROJECT_ROOT/server/cmd/server" 2>/dev/null || true
pkill -f "$PROJECT_ROOT/web" 2>/dev/null || true

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✨ All services stopped!          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
