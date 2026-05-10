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
    @export CORS_ORIGINS="http://localhost:3001,http://100.105.217.77:3001" && go run cmd/server/main.go

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
    @go build -o bin/lifeos cmd/server/main.go
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
    @go run cmd/server/main.go migrate

# Open the app in browser
open:
    @echo "🌐 Opening LifeOS..."
    @open http://localhost:3001 || xdg-open http://localhost:3001

# Restart all services
restart: stop dev
