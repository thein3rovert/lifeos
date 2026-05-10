#!/usr/bin/env bash

# LifeOS Development Startup Script
# Runs all services: OpenCode, Sidecar, Backend, Frontend

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"

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
start_service "OpenCode" "opencode serve --port 4097" "4097"
sleep 2

# 2. Start Sidecar
start_service "Sidecar" "cd $PROJECT_ROOT/sidecar && npm start" "3002"
sleep 2

# 3. Start Go Backend
start_service "Backend" "export CORS_ORIGINS='http://localhost:3001,http://100.105.217.77:3001' && cd $PROJECT_ROOT && go run cmd/server/main.go" "6060"
sleep 2

# 4. Start Vite Frontend
start_service "Frontend" "cd $PROJECT_ROOT/web && npm run dev" "3001"
sleep 2

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✨ All services running!            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  • OpenCode:  ${YELLOW}http://localhost:4097${NC}"
echo -e "  • Sidecar:   ${YELLOW}http://localhost:3002${NC}"
echo -e "  • Backend:   ${YELLOW}http://localhost:6060${NC}"
echo -e "  • Frontend:  ${YELLOW}http://localhost:3001${NC}"
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
