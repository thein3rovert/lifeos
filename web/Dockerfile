# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build for production
ARG VITE_API_URL=http://localhost:6060
ENV VITE_API_URL=$VITE_API_URL

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
