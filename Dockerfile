# syntax=docker/dockerfile:1.7
# Build stage
FROM golang:1.26-alpine AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Copy source code
COPY . .

# Build the binary with cache mounts for module and build cache
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=1 GOOS=linux go build -ldflags="-w -s" -o lifeos server/cmd/server/main.go

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates sqlite

# Copy binary to /usr/local/bin
COPY --from=builder /app/lifeos /usr/local/bin/lifeos
RUN chmod +x /usr/local/bin/lifeos

# Set working directory for data
WORKDIR /app

EXPOSE 6060

CMD ["lifeos"]
