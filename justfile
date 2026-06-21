# LifeOS Development Commands

# Default recipe (shows available commands)
default:
    @just --list

# Start all services (OpenCode, Sidecar, Backend, Frontend)
dev:
    @./scripts/dev.sh

# Stop all services
stop:
    @./scripts/stop.sh

# Start only the Go backend
backend:
    @echo "🚀 Starting Backend..."
    @export CORS_ORIGINS="http://localhost:3001,http://100.105.217.77:3001" && go run server/cmd/server/main.go

# Start only the frontend
frontend:
    @echo "🚀 Starting Frontend..."
    @cd web && npm run dev

# Start only the sidecar
sidecar:
    @echo "🚀 Starting Sidecar..."
    @cd sidecar && npm start

# Start only OpenCode
opencode:
    @echo "🚀 Starting OpenCode..."
    @opencode serve --port 4097

# Build the Go backend
build:
    @echo "🔨 Building backend..."
    @go build -o bin/lifeos server/cmd/server/main.go
    @echo "✓ Binary created: bin/lifeos"

# Run tests
test:
    @echo "🧪 Running tests..."
    @go test ./...

# Format Go code
fmt:
    @echo "🎨 Formatting Go code..."
    @go fmt ./...

# Run Go linter
lint:
    @echo "🔍 Running linter..."
    @golangci-lint run

# Clean build artifacts and logs
clean:
    @echo "🧹 Cleaning up..."
    @rm -rf bin/
    @rm -rf logs/
    @echo "✓ Cleaned"

# View logs (pass service name: opencode, sidecar, backend, frontend)
logs service:
    @tail -f logs/{{service}}.log

# Check if all services are running
status:
    @echo "📊 Service Status:"
    @echo ""
    @lsof -ti:4097 > /dev/null && echo "✓ OpenCode (4097): Running" || echo "✗ OpenCode (4097): Stopped"
    @lsof -ti:3002 > /dev/null && echo "✓ Sidecar  (3002): Running" || echo "✗ Sidecar  (3002): Stopped"
    @lsof -ti:6060 > /dev/null && echo "✓ Backend  (6060): Running" || echo "✗ Backend  (6060): Stopped"
    @lsof -ti:3001 > /dev/null && echo "✓ Frontend (3001): Running" || echo "✗ Frontend (3001): Stopped"

# Install dependencies
install:
    @echo "📦 Installing dependencies..."
    @go mod download
    @cd web && npm install
    @cd sidecar && npm install
    @echo "✓ Dependencies installed"

# Database migrations (if needed)
migrate:
    @echo "🗄️  Running migrations..."
    @go run server/cmd/server/main.go migrate

# Open the app in browser
open:
    @echo "🌐 Opening LifeOS..."
    @open http://localhost:3001 || xdg-open http://localhost:3001

# Restart all services
restart: stop dev

# === Docker Commands ===

# Start all services with Podman
docker-up:
    @echo "🐳 Starting all services with Podman..."
    @podman compose up -d --build

# Start specific service(s) with Podman (e.g., just docker-start backend frontend)
docker-start *services:
    @echo "🐳 Starting Podman service(s): {{services}}..."
    @podman compose up -d --build {{services}}

# Stop all Podman services
docker-down:
    @echo "🐳 Stopping all Podman services..."
    @podman compose down

# Stop specific Podman service(s)
docker-stop *services:
    @echo "🐳 Stopping Podman service(s): {{services}}..."
    @podman compose stop {{services}}

# View Podman logs for all services
docker-logs:
    @podman compose logs -f

# View Podman logs for specific service
docker-log service:
    @podman compose logs -f {{service}}

# Restart specific Podman service(s)
docker-restart *services:
    @echo "🐳 Restarting Podman service(s): {{services}}..."
    @podman compose restart {{services}}

# Check Podman service status
docker-status:
    @podman compose ps

# === Production (Registry Images) ===

# Pull latest images from registry (sequentially to avoid TLS timeouts
# from parallel pulls saturating the connection)
prod-pull:
    @echo "📥 Pulling backend..."
    @podman pull docker.io/theintrovert/lifeos-backend:latest
    @echo "📥 Pulling frontend..."
    @podman pull docker.io/theintrovert/lifeos-frontend:latest
    @echo "📥 Pulling sidecar..."
    @podman pull docker.io/theintrovert/lifeos-sidecar:latest
    @echo "✓ All images pulled"

# Start all services using registry images
prod-up:
    @echo "🚀 Starting production services (registry images)..."
    @podman compose -f docker-compose.prod.yml up -d

# Start specific service(s) using registry images
prod-start *services:
    @echo "🚀 Starting production service(s): {{services}}..."
    @podman compose -f docker-compose.prod.yml up -d {{services}}

# Stop all production services
prod-down:
    @echo "🛑 Stopping production services..."
    @podman compose -f docker-compose.prod.yml down

# Restart production service(s)
prod-restart *services:
    @echo "🔄 Restarting production service(s): {{services}}..."
    @podman compose -f docker-compose.prod.yml restart {{services}}

# View production logs
prod-logs:
    @podman compose -f docker-compose.prod.yml logs -f

# View production logs for specific service
prod-log service:
    @podman compose -f docker-compose.prod.yml logs -f {{service}}

# Check production service status
prod-status:
    @podman compose -f docker-compose.prod.yml ps

# Pull latest and restart everything (full update)
prod-update: prod-pull
    @echo "🔄 Restarting with new images..."
    @podman compose -f docker-compose.prod.yml up -d --force-recreate
