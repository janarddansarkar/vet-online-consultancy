#!/usr/bin/env bash
# Nightly backup of the dockerised database: writes a compressed dump and deletes dumps older than KEEP_DAYS.
# Run from the folder that holds docker-compose.yml on the VPS. Schedule with:  crontab -e
#   30 2 * * * cd /opt/vet && ./backup-db.sh
# Copy the backups folder off the server now and then. Restore into a running db container with:
#   gunzip -c backups/FILE.sql.gz | docker compose exec -T db psql -U vet_app vet_online_consultancy
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"   # dumps contain owners' contact details and pet medical records

file="$BACKUP_DIR/vet_$(date +%Y-%m-%d_%H%M).sql.gz"
docker compose exec -T db pg_dump -U vet_app vet_online_consultancy | gzip > "$file"
find "$BACKUP_DIR" -name "vet_*.sql.gz" -mtime "+$KEEP_DAYS" -delete

echo "Backup written: $file"
