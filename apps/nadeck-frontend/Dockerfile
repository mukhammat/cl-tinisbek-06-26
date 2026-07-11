# Build context is the repo root (npm workspaces monorepo, single root lockfile)
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/nadeck-backend/package.json ./backend/package.json
COPY apps/nadeck-frontend/package.json ./frontend/package.json
RUN npm ci

COPY apps/nadeck-frontend ./frontend
RUN npm run build -w @pharmacy/frontend

FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY apps/nadeck-frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
