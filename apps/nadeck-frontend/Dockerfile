# Build context is the repo root (npm workspaces monorepo, single root lockfile)
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Intermediate package.json copies must land at the same paths as root package.json's
# "workspaces" globs (apps/nadeck-*), otherwise npm ci silently skips workspace deps.
COPY package.json package-lock.json ./
COPY apps/nadeck-backend/package.json ./apps/nadeck-backend/package.json
COPY apps/nadeck-frontend/package.json ./apps/nadeck-frontend/package.json
RUN npm ci

COPY apps/nadeck-frontend ./apps/nadeck-frontend
RUN npm run build -w @pharmacy/frontend

FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/apps/nadeck-frontend/dist /usr/share/nginx/html
COPY apps/nadeck-frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
