# Build context is the repo root (npm workspaces monorepo, single root lockfile)
FROM node:20-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY nadeck-bot/package.json ./nadeck-bot/package.json
RUN npm ci

COPY nadeck-bot ./nadeck-bot

WORKDIR /app/nadeck-bot
ENV NODE_ENV=production
CMD ["npm", "run", "bot"]
