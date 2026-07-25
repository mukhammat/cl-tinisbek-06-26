<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/05a222b9-6546-4d89-8eae-c288b70fa186

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env` and set `OPENAI_API_KEY` (powers the AI Peptide Advisor chat widget and the Nadeck Telegram bot) and `POSTGRES_PASSWORD`/`DATABASE_URL` (see below)
3. Run the app:
   `npm run dev`

## Database (PostgreSQL)

The `db` service in `docker-compose.yml` runs Postgres with its data in the named volume `postgres_data`. For local (non-Docker) development, run just that service and point `DATABASE_URL` in `.env` at it:

```bash
docker compose up -d db
cd apps/nadeck-backend && npx prisma migrate deploy
```

`db` publishes port `5434` (not `5432`/`5433`) on `127.0.0.1` only — pick whatever's actually free on your machine if it's already taken by another project. Inside Docker, other services still reach it via `db:5432` on the internal network regardless of this host-side mapping.

### Backups

A Docker volume lives on the same host as the project — if the host disk fails, the volume is deleted (`docker compose down -v`), or it's otherwise lost, the data goes with it. Back up to a location **outside** the project/host regularly:

```bash
# Manual backup — writes a timestamped, gzip-compressed dump to ~/nadeck-backups
# (or $BACKUP_DIR if set). Keeps the last 14 backups automatically.
./scripts/backup-db.sh

# Restore from a backup (overwrites current data!)
./scripts/restore-db.sh ~/nadeck-backups/nadeck-db-20260712-090839.sql.gz
```

For production, schedule this daily and copy the output off-host (e.g. to S3/another server), for example via cron:

```cron
0 3 * * * cd /path/to/cl-tinisbek-06-26 && ./scripts/backup-db.sh /mnt/external-disk/nadeck-backups
```

## HTTPS (Cloudflare)

`nadeck.net` is on Cloudflare, so Cloudflare terminates TLS for visitors — the origin server itself only serves plain HTTP on port 80 (`nginx.conf`/`docker-compose.yml` are deliberately kept HTTP-only, no certbot involved).

Setup:

1. In Cloudflare → **DNS**, add A records for `nadeck.net`, `www.nadeck.net`, and `ar.nadeck.net` (the Arabic-audience site — same server, own frontend bundle, see `apps/nadeck-frontend/src/market.ts`) pointing to the server's IP (`curl -4 ifconfig.me` on the server), with the proxy status **Proxied** (orange cloud) — this is what makes Cloudflare terminate HTTPS.
2. In Cloudflare → **SSL/TLS**, set the encryption mode to **Flexible** (visitor ↔ Cloudflare is HTTPS; Cloudflare ↔ origin is plain HTTP, matching this server's setup).
3. On the server: `docker compose up -d --build` — nothing else needed, Cloudflare handles the certificate and its renewal entirely on their side.

If you ever move away from Cloudflare's proxy (switch a record to "DNS only"), the site would need its own TLS termination again (e.g. certbot on the origin) — this setup does not currently include that.
