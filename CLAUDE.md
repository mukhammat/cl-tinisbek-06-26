# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`pharmacy-monorepo` — a pharmacy website + AI product advisor + two Telegram bots, sharing one Postgres database and one `.env` at the repo root. npm workspaces, no shared build tool (each app has its own dev/build scripts).

- `apps/nadeck-frontend` — React 19 + Vite + Tailwind 4 site: product catalog, AI Peptide Advisor chat widget, dosage calculator, admin panel.
- `apps/nadeck-backend` — NestJS + Prisma (Postgres) API. Owns the catalog, orders, auth, and the `/api/chat` endpoint that powers the AI advisor.
- `apps/nadeck-bot` — Telegram support + sales bot (grammy). Thin transport only: forwards every message to the backend's `/api/chat` — same knowledge base/prompt/model as the website widget. In private chats it sends `mode: "sales"`, and the advisor itself recommends products, collects contacts and places the order; the bot only hands the result to a manager who takes payment. Voice messages in private chats are transcribed by the backend (`/api/chat/transcribe`) and then answered like typed text. It never posts on its own and has no scheduled messages; the only unprompted message is the welcome when someone joins one of its groups (they arrive from gender-router-bot's male/female buttons) — it mentions them and invites questions in the group or in private.
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

**One chat brain, two front doors.** `nadeck-backend`'s `src/chat/chat.service.ts` holds the model, prompt, and knowledge base (FAQ + catalog) for the AI Peptide Advisor. Both the website widget and `nadeck-bot` call the same `/api/chat` endpoint — never duplicate Q&A logic into the bot. The bot has no OpenAI client of its own: it used to also post a scheduled daily group greeting, and that was removed on purpose — don't reintroduce timed broadcasts.

**Product schema is split by type.** `Product` holds fields common to everything in the catalog; type-specific data lives in `MedicineDetails` or `AdditionalGoodDetails` (one-to-one with `Product`). Price is *not* a field on `Product` — it's derived from volumes/pricing records, so don't reintroduce a flat `price`/`priceUsd` column. Currency fallback: USD price missing/0 → fall back to KZT.

**One storefront: nadeck.net, Russian and English, KZT and USD.** The Arabic site ar.nadeck.net was shut down on purpose (2026-10) together with everything that existed only for it — the `Market` enum, per-market products/categories/countries, the second photo gallery and category, the scoped ar admin, Arabic translations and SAR prices (migration `remove_ar_storefront`). nginx drops requests for ar.nadeck.net rather than serving nadeck.net under that name. Don't reintroduce a market or a third language without being asked.

**Bot sales are a conversation, not a button menu.** In private chats the bot calls `/api/chat` with `mode: "sales"` + `customer` (Telegram id/username); `ChatService` then adds a sales block and a sales catalog (product ids, every pack size, delivery countries) to the prompt and offers the `place_order` tool. The model only supplies ids, pack sizes, quantities and contacts — `OrdersService.placeTelegramOrder` prices everything from the database (KZT, nadeck.net catalog), and a rejected order goes back to the model as the tool result. The response then carries `order`, and the bot attaches a `t.me`/`wa.me` hand-over link with the order prefilled (`MANAGER_*` env vars) — there is no online payment, the order stays `pending` for a manager. The website widget never gets the tool. In groups the bot only answers and, when the answer names a product, adds one deep link into the private chat — contacts are never collected in a group. The channel's direct messages ("Сообщения каналу" of t.me/nadeck, a supergroup with `is_direct_messages`) are answered the same way, one history per customer topic; Telegram rejects chat actions there, and messages sent on behalf of the channel are staff and are skipped.

**Managers can read and answer the bot's private chats.** `ChatService` records every sales-mode exchange (`BotDialog`/`BotDialogMessage`, via `src/dialogs`) and, when it has a stored conversation, feeds that to the model instead of the bot's in-memory history — so a manager's words become part of the context. The admin panel's "Диалоги бота" tab (full admins only — the bot sells for nadeck.net) lists them; a manager's reply is sent by the backend straight through the Bot API with the same `TELEGRAM_BOT_TOKEN`, so it arrives as a message from the bot. A reply (or "Остановить бота") sets `pausedUntil` one hour ahead, extended by each reply; until then `/api/chat` stores the customer's message and returns `operator: true`, and the bot stays silent. Group chats are never recorded.

**gender-router-bot is intentionally isolated.** Different Telegram token, no backend dependency, no shared code with `nadeck-bot` — it only exists to route new group members via link-buttons. Don't couple it to the backend or the other bot.

**nadeck-bot's group list is self-discovered.** Telegram's Bot API has no "list my chats" call, so `apps/nadeck-bot/src/groupStore.ts` builds the list from `my_chat_member` events and persists it to `data/groups.json` (a Docker volume — survives restarts). Nothing to configure manually; the bot learns a group as soon as it's added.

**Uploads go to Cloudflare R2**, not local disk (`src/upload`, `@aws-sdk/client-s3` against R2's S3-compatible endpoint) — used by the admin panel for product/category images.

**HTTPS is terminated at Cloudflare, not the origin.** `nginx.conf`/`docker-compose.yml` deliberately serve plain HTTP only; Cloudflare (proxied DNS + Flexible SSL) handles TLS for visitors. Don't add certbot/TLS config to the origin unless the Cloudflare proxy setup changes.

**Promo discounts are computed server-side.** A `PromoCode` is a percentage (never a fixed sum — the storefront prices in KZT and USD). The cart's `/api/promo-codes/validate` call is display-only; `OrdersService.placeOrder` re-reads the percentage from the database and applies it to the goods subtotal itself, so a discount posted by the browser is ignored. `Order.promoCode` is plain text with no relation to `PromoCode` on purpose — deleting a retired code must not erase which orders a partner brought in, and the admin usage stats are counted from that column.

**Shipping is priced per destination country** (`DeliveryCountry`), maintained in the admin panel — the flat fees that used to live in the frontend's `currency.ts` are now only a fallback for when no country has been added yet (the checkout hides the country picker in that state). There is no free-delivery tier. Like the promo discount, `OrdersService` charges the rate stored for `address.country` rather than the figure the browser reports.

**Traffic analytics are first-party and anonymous.** The storefront posts one `VisitEvent` per screen the visitor opens (`src/analytics.ts` → `POST /api/analytics/track`); the admin panel's Analytics tab reads it back through `GET /api/admin/analytics`. There is no Google Analytics and nothing identifying is stored: a random `visitorId` (localStorage, = "how many people"), a `sessionId` that lapses after 30 idle minutes (= "how many visits"), and the country Cloudflare already puts on the request — no IP, no email, no cross-site cookie. Crawlers and logged-in admins are deliberately not counted, so don't "fix" the missing admin page views. `VisitEvent.createdAt` is a real timestamp rather than the ISO strings the older tables use because it's the one table queried by range; rows older than 400 days are pruned by `AnalyticsService`.

**Videos and photos under the catalog are a `MediaItem` table** (`src/media-feed`, admin tab "Видео и фото"), ported from storefront-kit: `kind` video|photo, files uploaded to the same R2 bucket (`videos/`, `gallery/`, `video-posters/`), and the service only accepts URLs under `R2_PUBLIC_URL`. Videos go through `POST /api/upload/video` (≤95 MB — under Cloudflare's 100 MB body cap; nginx's `client_max_body_size` is raised for it). The catalog itself matches storefront-kit too: no "All" pill, the first category by sortOrder is selected, one product is open as a full card and the rest are compact tiles.

**Backend module layout** (`apps/nadeck-backend/src/`): `auth`, `categories`, `medicines`, `orders`, `promo-codes`, `delivery-countries`, `chat`, `upload`, `notifications`, `newsletter`, `translate`, `analytics`, `dialogs`, `media-feed`, `seeds`, `database`. `src/seeds` conditionally seeds categories/medicines based on environment — check it before assuming a fresh DB is empty.
