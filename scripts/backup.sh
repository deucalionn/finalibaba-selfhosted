#!/bin/bash
# Back up the PostgreSQL database used by docker-compose.yml.
# Produces a gzip-compressed pg_dump under backups/, restorable with restore.sh.
#
# Usage: ./scripts/backup.sh

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Error: .env not found. Copy .env.example to .env first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source <(sed 's/\r$//' .env)
set +a

POSTGRES_USER="${POSTGRES_USER:-appuser}"
POSTGRES_DB="${POSTGRES_DB:-finalibaba}"

mkdir -p backups
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT="backups/finalibaba_${TIMESTAMP}.sql.gz"

echo "→ Backing up '$POSTGRES_DB' to $OUT"

docker compose exec -T db pg_dump -U "$POSTGRES_USER" --clean --if-exists --no-owner "$POSTGRES_DB" | gzip > "$OUT"

echo "✓ Backup complete: $OUT ($(du -h "$OUT" | cut -f1))"
