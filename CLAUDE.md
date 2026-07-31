# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`pharmacy-monorepo` — a pharmacy website + AI product advisor + two Telegram bots, sharing one Postgres database and one `.env` at the repo root. npm workspaces, no shared build tool (each app has its own dev/build scripts).

- `apps/nadeck-frontend` — React 19 + Vite + Tailwind 4 site: product catalog, AI Peptide Advisor chat widget, dosage calculator, admin panel.
- `apps/nadeck-backend` — NestJS + Prisma (Postgres) API. Owns the catalog, orders, auth, and the `/api/chat` endpoint that powers the AI advisor.
- `apps/nadeck-bot` — Telegram support bot (grammy). Thin transport only: forwards every message to the backend's `/api/chat` — same knowledge base/prompt/model as the website widget. Also runs an independent daily group greeting (own OpenAI prompt, unrelated to the FAQ/catalog).
- `apps/gender-router-bot` — separate Telegram bot, unrelated to the above: greets new group members with male/female routing buttons that link straight to the target chat.

## Commands

Run from the repo root unless noted. `.env` is shared repo-wide (see `.env.example`) — none of the apps have their own.

```bash
npm install                 # once, at the root — installs all workspaces
npm run dev                 # all four apps concurrently (backend, frontend, bot, gender-bot)
npm run dev:backend         # just one, e.g. when iterating on the API
npm run dev:frontend
npm run dev:bot
npm run dev:gender-bot
npm run build                # frontend then backend
```

Backend (`apps/nadeck-backend`):
```bash
npm run lint -w @pharmacy/backend                 # eslint --fix
npm test -w @pharmacy/backend                      # jest, all *.spec.ts
npx jest <path-or-name> -w @pharmacy/backend        # single test
npm run test:e2e -w @pharmacy/backend
npx prisma migrate dev -w @pharmacy/backend         # new migration during development
npx prisma migrate deploy -w @pharmacy/backend      # apply migrations (prod / after `docker compose up -d db`)
npx prisma generate -w @pharmacy/backend            # regenerate client after schema changes
npm run parse-faq -w @pharmacy/backend              # rebuild the chat knowledge base from HTML exports in faq-sources/
```

Frontend (`apps/nadeck-frontend`): `npm run lint -w @pharmacy/frontend` is `tsc --noEmit` (no test suite).

Local Postgres without Docker:
```bash
docker compose up -d db                              # publishes 127.0.0.1:5434 (not 5432/5433 — taken by other projects on this host)
cd apps/nadeck-backend && npx prisma migrate deploy
```

Full stack via Docker: `docker compose up -d --build`. DB backups: `./scripts/backup-db.sh` / `./scripts/restore-db.sh <file>` (see README for the cron setup).

## Architecture

**One chat brain, two front doors.** `nadeck-backend`'s `src/chat/chat.service.ts` holds the model, prompt, and knowledge base (FAQ + catalog) for the AI Peptide Advisor. Both the website widget and `nadeck-bot` call the same `/api/chat` endpoint — never duplicate Q&A logic into the bot. The bot's own daily greeting (`apps/nadeck-bot/src/greeting.ts`) is a deliberately separate, smaller prompt with no catalog/FAQ knowledge; don't merge it into the chat service.

**Product schema is split by type.** `Product` holds fields common to everything in the catalog; type-specific data lives in `MedicineDetails` or `AdditionalGoodDetails` (one-to-one with `Product`). Price is *not* a field on `Product` — it's derived from volumes/pricing records, so don't reintroduce a flat `price`/`priceUsd` column. Currency fallback: USD price missing/0 → fall back to KZT.

**gender-router-bot is intentionally isolated.** Different Telegram token, no backend dependency, no shared code with `nadeck-bot` — it only exists to route new group members via link-buttons. Don't couple it to the backend or the other bot.

**nadeck-bot's group list is self-discovered.** Telegram's Bot API has no "list my chats" call, so `apps/nadeck-bot/src/groupStore.ts` builds the list from `my_chat_member` events and persists it to `data/groups.json` (a Docker volume — survives restarts). Nothing to configure manually; the bot learns a group as soon as it's added.

**Uploads go to Cloudflare R2**, not local disk (`src/upload`, `@aws-sdk/client-s3` against R2's S3-compatible endpoint) — used by the admin panel for product/category images.

**HTTPS is terminated at Cloudflare, not the origin.** `nginx.conf`/`docker-compose.yml` deliberately serve plain HTTP only; Cloudflare (proxied DNS + Flexible SSL) handles TLS for visitors. Don't add certbot/TLS config to the origin unless the Cloudflare proxy setup changes.

**Promo discounts are computed server-side.** A `PromoCode` is a percentage (never a fixed sum — the storefront prices in KZT/USD/SAR). The cart's `/api/promo-codes/validate` call is display-only; `OrdersService.placeOrder` re-reads the percentage from the database and applies it to the goods subtotal itself, so a discount posted by the browser is ignored. `Order.promoCode` is plain text with no relation to `PromoCode` on purpose — deleting a retired code must not erase which orders a partner brought in, and the admin usage stats are counted from that column.

**Shipping is priced per destination country** (`DeliveryCountry`), maintained in the admin panel — the flat fees that used to live in the frontend's `currency.ts` are now only a fallback for when no country has been added yet (the checkout hides the country picker in that state). There is no free-delivery tier. Like the promo discount, `OrdersService` charges the rate stored for `address.country` rather than the figure the browser reports.

**Backend module layout** (`apps/nadeck-backend/src/`): `auth`, `categories`, `medicines`, `orders`, `promo-codes`, `delivery-countries`, `chat`, `upload`, `notifications`, `newsletter`, `translate`, `seeds`, `database`. `src/seeds` conditionally seeds categories/medicines based on environment — check it before assuming a fresh DB is empty.
