# Build context is the repo root (npm workspaces monorepo, single root lockfile)
FROM node:20-bookworm-slim
WORKDIR /app

# python3/make/g++ are needed to compile the better-sqlite3 native addon
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/nadeck-backend/package.json ./backend/package.json
COPY apps/nadeck-frontend/package.json ./frontend/package.json
RUN npm ci

COPY apps/nadeck-backend ./backend

RUN cd backend && npx prisma generate
RUN npm run build -w @pharmacy/backend
RUN npm prune --omit=dev

RUN mkdir -p /app/backend/data

WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main"]
