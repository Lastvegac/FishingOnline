#!/usr/bin/env sh
set -eu
# Working directory: repository root. DATABASE_URL and BACKUP_DIR must be supplied by the operator.
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_DIR:?BACKUP_DIR is required}"
umask 077
mkdir -p "$BACKUP_DIR"
backup_file="$BACKUP_DIR/fishing-world-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --no-acl --file="$backup_file"
pg_restore --list "$backup_file" >/dev/null
printf 'Backup created: %s\n' "$backup_file"
# Upload/encrypt offsite and WAL archiving are operator responsibilities before external beta.
