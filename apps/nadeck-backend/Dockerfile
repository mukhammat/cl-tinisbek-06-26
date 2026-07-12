# Build context is the repo root (npm workspaces monorepo, single root lockfile)
FROM node:20-bookworm-slim
WORKDIR /app

# openssl is required by Prisma's query engine binary at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Intermediate package.json copies must land at the same paths as root package.json's
# "workspaces" globs (apps/nadeck-*), otherwise npm ci silently skips workspace deps.
COPY package.json package-lock.json ./
COPY apps/nadeck-backend/package.json ./apps/nadeck-backend/package.json
COPY apps/nadeck-frontend/package.json ./apps/nadeck-frontend/package.json
RUN npm ci

COPY apps/nadeck-backend ./apps/nadeck-backend

# `prisma generate` only parses the schema (no live DB connection needed), but it does
# require DATABASE_URL to resolve to something — the real value is injected at runtime.
RUN cd apps/nadeck-backend && DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npx prisma generate
RUN npm run build -w @pharmacy/backend
RUN npm prune --omit=dev

WORKDIR /app/apps/nadeck-backend
ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
