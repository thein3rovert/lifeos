# syntax=docker/dockerfile:1.7
# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copy source code
COPY . .

# Build for production
# Note: app uses same-origin relative URLs (/api/*), so no VITE_API_URL needed.
# A reverse proxy routes /api/* to the backend in production; vite dev server
# proxies it in local dev (see vite.config.ts).
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy Nitro build output (self-contained server)
COPY --from=builder /app/.output ./.output

EXPOSE 3000

ENV HOST=0.0.0.0
ENV PORT=3000

CMD ["node", ".output/server/index.mjs"]
