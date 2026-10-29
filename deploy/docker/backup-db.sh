#!/usr/bin/env bash
# Nightly backup of the dockerised database: writes a compressed dump and deletes dumps older than KEEP_DAYS.
# Run from the folder that holds the compose file on the VPS. Schedule with:  crontab -e
#   30 2 * * * cd /opt/vet && ./backup-db.sh
# If the compose file is not named docker-compose.yml (e.g. the Traefik setup), name it:
#   30 2 * * * cd /opt/vet && COMPOSE_FILE=docker-compose.traefik.yml ./backup-db.sh
# Copy the backups folder off the server now and then. Restore into a running db container with:
#   gunzip -c backups/FILE.sql.gz | docker compose exec -T db psql -U vet_app vet_online_consultancy
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
MIN_BYTES="${MIN_BYTES:-1000}"   # a real dump of this schema is several KB; anything smaller means pg_dump failed

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"   # dumps contain owners' contact details and pet medical records

file="$BACKUP_DIR/vet_$(date +%Y-%m-%d_%H%M).sql.gz"
tmp="$file.partial"
trap 'rm -f "$tmp"' EXIT

# Dump to a temp file so a failed pg_dump never leaves an empty backup behind.
docker compose exec -T db pg_dump -U vet_app vet_online_consultancy | gzip > "$tmp"
gunzip -t "$tmp"
if [ "$(gunzip -c "$tmp" | wc -c)" -lt "$MIN_BYTES" ]; then
  echo "Backup failed: dump is smaller than $MIN_BYTES bytes" >&2
  exit 1
fi
mv "$tmp" "$file"

find "$BACKUP_DIR" -name "vet_*.sql.gz" -mtime "+$KEEP_DAYS" -delete

echo "Backup written: $file"
