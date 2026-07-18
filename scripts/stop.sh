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
kill_port() {
    local port=$1
    local name=$2
    local pid=$(lsof -ti:$port 2>/dev/null)

    if [ -n "$pid" ]; then
        echo -e "${YELLOW}[•]${NC} Stopping $name (port $port, PID: $pid)..."
        kill -9 $pid 2>/dev/null || true
        echo -e "${GREEN}[✓]${NC} $name stopped"
    else
        echo -e "${GREEN}[✓]${NC} $name not running"
    fi
}

# Stop all services
kill_port "$OPENCODE_PORT" "OpenCode"
kill_port "$PORT"          "Sidecar"
kill_port "$LIFEOS_PORT"   "Backend"
kill_port "$FRONTEND_DEV_PORT" "Frontend"

# Also kill by process name as fallback
echo ""
echo -e "${YELLOW}[•]${NC} Cleaning up any remaining processes..."
pkill -f "opencode serve" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true
pkill -f "go run server/cmd/server/main.go" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✨ All services stopped!          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
