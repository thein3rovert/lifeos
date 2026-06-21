# syntax=docker/dockerfile:1.7
# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# Copy source code
COPY . .

# Build for production
# Note: app uses same-origin relative URLs (/api/*), so no VITE_API_URL needed.
# A reverse proxy routes /api/* to the backend in production; vite dev server
# proxies it in local dev (see vite.config.ts).
RUN bun run build

# Production stage
FROM oven/bun:1-alpine

WORKDIR /app

# Copy Nitro build output (self-contained server)
COPY --from=builder /app/.output ./.output

EXPOSE 3000

ENV HOST=0.0.0.0
ENV PORT=3000

CMD ["bun", "run", ".output/server/index.mjs"]
