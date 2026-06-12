# syntax=docker/dockerfile:1.7
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm install --omit=dev

# Copy source code
COPY . .

EXPOSE 3002

CMD ["node", "index.js"]
