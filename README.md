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
