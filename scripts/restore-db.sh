#!/usr/bin/env bash
set -euo pipefail

# Restores a backup produced by scripts/backup-db.sh into the docker-compose "db" service.
# WARNING: this overwrites the current database contents.
#
# Usage: ./scripts/restore-db.sh path/to/nadeck-db-TIMESTAMP.sql.gz

if [ $# -ne 1 ]; then
  echo "Usage: $0 path/to/nadeck-db-TIMESTAMP.sql.gz" >&2
  exit 1
fi

BACKUP_FILE="$1"
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && source .env && set +a

gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U "${POSTGRES_USER:-nadeck}" "${POSTGRES_DB:-nadeck}"
echo "Restored $BACKUP_FILE"
