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

# Two markets, one codebase (see src/market.ts): nadeck.net (ru/en/ar) and ar.nadeck.net
# (ar/en only, Arabic-first). Each gets its own static bundle at build time so nginx can
# serve both domains from this one image without a runtime flag - see nginx.conf.
RUN npm run build -w @pharmacy/frontend -- --outDir dist/main
RUN VITE_MARKET=ar npm run build -w @pharmacy/frontend -- --outDir dist/ar

FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/apps/nadeck-frontend/dist/main /usr/share/nginx/html/main
COPY --from=builder /app/apps/nadeck-frontend/dist/ar /usr/share/nginx/html/ar
COPY apps/nadeck-frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
