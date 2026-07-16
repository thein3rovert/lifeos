#!/usr/bin/env bash

# LifeOS Development Startup Script
# Runs all services: OpenCode, Sidecar, Backend, Frontend
# Config comes from .env (see .env.example for defaults).

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"

# ── Load .env if present ────────────────────────────────────────
if [[ -f "$PROJECT_ROOT/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.env"
    set +a
fi

# Defaults (used only if .env doesn't set them)
: "${LIFEOS_PORT:=6060}"
: "${PORT:=3002}"                              # sidecar internal port
: "${FRONTEND_DEV_PORT:=3000}"                 # vite dev server
: "${OPENCODE_PORT:=4097}"
: "${CORS_ORIGINS:=http://localhost:${FRONTEND_DEV_PORT}}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create logs directory
mkdir -p "$LOG_DIR"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      🚀 LifeOS Development Startup    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down all services...${NC}"
    pkill -P $$ || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Function to start a service
start_service() {
    local name=$1
    local command=$2
    local port=$3
    local log_file="$LOG_DIR/$name.log"

    echo -e "${GREEN}[✓]${NC} Starting $name on port $port..."
    echo "  └─ Logs: $log_file"

    eval "$command" > "$log_file" 2>&1 &
    local pid=$!
    echo "  └─ PID: $pid"
    echo ""
}

# 1. Start OpenCode Server
start_service "OpenCode" "opencode serve --port $OPENCODE_PORT" "$OPENCODE_PORT"
sleep 2

# 2. Start Sidecar
start_service "Sidecar" "cd $PROJECT_ROOT/sidecar && PORT=$PORT npm start" "$PORT"
sleep 2

# 3. Start Go Backend
start_service "Backend" "cd $PROJECT_ROOT && CORS_ORIGINS='$CORS_ORIGINS' LIFEOS_PORT=$LIFEOS_PORT go run server/cmd/server/main.go" "$LIFEOS_PORT"
sleep 2

# 4. Start Vite Frontend
start_service "Frontend" "cd $PROJECT_ROOT/web && npm run dev" "$FRONTEND_DEV_PORT"
sleep 2

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✨ All services running!            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  • OpenCode:  ${YELLOW}http://localhost:$OPENCODE_PORT${NC}"
echo -e "  • Sidecar:   ${YELLOW}http://localhost:$PORT${NC}"
echo -e "  • Backend:   ${YELLOW}http://localhost:$LIFEOS_PORT${NC}"
echo -e "  • Frontend:  ${YELLOW}http://localhost:$FRONTEND_DEV_PORT${NC}"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo -e "  • tail -f $LOG_DIR/OpenCode.log"
echo -e "  • tail -f $LOG_DIR/Sidecar.log"
echo -e "  • tail -f $LOG_DIR/Backend.log"
echo -e "  • tail -f $LOG_DIR/Frontend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running
wait
