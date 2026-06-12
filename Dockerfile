# Build stage
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o lifeos cmd/server/main.go

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates sqlite

# Copy binary to /usr/local/bin
COPY --from=builder /app/lifeos /usr/local/bin/lifeos
RUN chmod +x /usr/local/bin/lifeos

# Set working directory for data
WORKDIR /app

# Copy any static files the backend might need (templates, etc.)
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/static ./static

EXPOSE 6060

CMD ["lifeos"]
