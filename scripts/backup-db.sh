#!/usr/bin/env bash
set -euo pipefail

# Dumps the docker-compose "db" (Postgres) service to a timestamped, gzip-compressed
# file OUTSIDE the project directory — so the backup survives even if the repo, the
# Docker volume, or a .gitignore/.dockerignore rule gets wiped or changed by mistake.
#
# Usage: ./scripts/backup-db.sh [backup-dir]
#   backup-dir defaults to $BACKUP_DIR, falling back to ~/nadeck-backups

cd "$(dirname "$0")/.."
[ -f .env ] && set -a && source .env && set +a

BACKUP_DIR="${1:-${BACKUP_DIR:-$HOME/nadeck-backups}}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUT_FILE="$BACKUP_DIR/nadeck-db-$TIMESTAMP.sql.gz"

docker compose exec -T db pg_dump --clean --if-exists -U "${POSTGRES_USER:-nadeck}" "${POSTGRES_DB:-nadeck}" | gzip > "$OUT_FILE"
echo "Backup written to $OUT_FILE"

# Keep only the last 14 backups so this doesn't grow disk usage unbounded.
ls -1t "$BACKUP_DIR"/nadeck-db-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm --
