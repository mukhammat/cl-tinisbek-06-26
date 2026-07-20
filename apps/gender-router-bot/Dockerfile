# Build context is the repo root (npm workspaces monorepo, single root lockfile)
FROM node:20-bookworm-slim
WORKDIR /app

# Intermediate package.json copies must land at the same paths as root package.json's
# "workspaces" globs (apps/nadeck-*, apps/gender-router-bot), otherwise npm ci silently
# skips workspace deps.
COPY package.json package-lock.json ./
COPY apps/nadeck-backend/package.json ./apps/nadeck-backend/package.json
COPY apps/nadeck-frontend/package.json ./apps/nadeck-frontend/package.json
COPY apps/nadeck-bot/package.json ./apps/nadeck-bot/package.json
COPY apps/gender-router-bot/package.json ./apps/gender-router-bot/package.json
RUN npm ci

COPY apps/gender-router-bot ./apps/gender-router-bot

WORKDIR /app/apps/gender-router-bot
ENV NODE_ENV=production
CMD ["npm", "run", "bot"]
