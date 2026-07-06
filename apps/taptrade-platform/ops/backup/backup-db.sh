#!/bin/sh
# One-shot logical backup of the Predict database.
#
# Designed to run inside a postgres:16-alpine container (the db-backup sidecar in
# docker-compose.demo.yml) or anywhere pg_dump + the standard libpq env vars are
# available. Connection comes from PGHOST / PGUSER / PGPASSWORD / PGDATABASE.
#
# Output: $BACKUP_DIR/<db>-<UTC timestamp>.sql.gz, written atomically.
# Retention: dumps older than BACKUP_RETENTION_DAYS are pruned.
# Offsite (optional): if BACKUP_OFFSITE_CMD is set, the new dump's path is passed
#   to it (e.g. BACKUP_OFFSITE_CMD='aws s3 cp "$1" s3://my-bucket/predict/').
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
DB="${PGDATABASE:-predict}"

mkdir -p "$BACKUP_DIR"
ts="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUP_DIR/${DB}-${ts}.sql.gz"
tmp="${out}.partial"

echo "[backup] $(date -u +%H:%M:%SZ) dumping '$DB' -> $out"
# --clean --if-exists makes the dump restorable onto an existing database;
# --no-owner/--no-privileges keep it portable across role setups.
pg_dump --clean --if-exists --no-owner --no-privileges "$DB" | gzip -c > "$tmp"
mv "$tmp" "$out" # atomic publish — a reader never sees a half-written dump
size="$(wc -c < "$out" | tr -d ' ')"
echo "[backup] wrote ${size} bytes"

if [ "$size" -lt 1024 ]; then
  echo "[backup] ERROR: dump suspiciously small (<1KiB); keeping it but flagging" >&2
fi

# Retention prune.
find "$BACKUP_DIR" -name "${DB}-*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -print -delete 2>/dev/null || true

# Optional offsite copy (wired but off until BACKUP_OFFSITE_CMD is set — a
# local-only backup does not survive box loss).
if [ -n "${BACKUP_OFFSITE_CMD:-}" ]; then
  echo "[backup] offsite copy"
  sh -c "$BACKUP_OFFSITE_CMD" offsite "$out" || echo "[backup] WARN: offsite copy failed" >&2
fi

echo "[backup] done"
