#!/usr/bin/env bash
# Nightly PostgreSQL backup: writes a compressed dump and deletes dumps older than KEEP_DAYS.
# Install:  sudo install -m 755 deploy/backup-db.sh /usr/local/bin/vet-backup-db
# Schedule: sudo crontab -e   ->   30 2 * * * /usr/local/bin/vet-backup-db
# Also copy /var/backups/vet off the server now and then (e.g. scp or rsync to your laptop).
set -euo pipefail

DB_NAME="${DB_NAME:-vet_online_consultancy}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/vet}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"   # dumps contain owners' contact details and pet medical records

file="$BACKUP_DIR/${DB_NAME}_$(date +%Y-%m-%d_%H%M).sql.gz"
runuser -u postgres -- pg_dump "$DB_NAME" | gzip > "$file"
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime "+$KEEP_DAYS" -delete

echo "Backup written: $file"
# Restore with:  gunzip -c FILE | runuser -u postgres -- psql NEW_DB_NAME
