#!/bin/sh
# Restore a Predict logical backup into a target database.
#
# DESTRUCTIVE: dumps are created with --clean --if-exists, so restoring drops and
# recreates objects in the target. To make verification safe, this refuses to
# restore into the live 'predict' database unless --force is passed.
#
# Usage: restore-db.sh <dump.sql.gz> <target_db> [--force]
# Connection comes from the standard libpq env vars (PGHOST/PGUSER/PGPASSWORD).
set -eu

usage() { echo "usage: restore-db.sh <dump.sql.gz> <target_db> [--force]" >&2; exit 2; }
[ $# -ge 2 ] || usage
DUMP="$1"
TARGET="$2"
FORCE="${3:-}"

[ -f "$DUMP" ] || { echo "[restore] dump not found: $DUMP" >&2; exit 1; }

if [ "$TARGET" = "predict" ] && [ "$FORCE" != "--force" ]; then
  echo "[restore] refusing to restore into the live 'predict' DB without --force" >&2
  echo "[restore] (restore into a scratch DB to verify; use --force only for a real recovery)" >&2
  exit 1
fi

echo "[restore] ensuring target DB '$TARGET' exists"
if ! psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$TARGET'" | grep -q 1; then
  psql -d postgres -c "CREATE DATABASE \"$TARGET\""
fi

echo "[restore] restoring $DUMP -> $TARGET"
# ON_ERROR_STOP=0: a --clean dump emits harmless DROP errors on a fresh target.
gunzip -c "$DUMP" | psql -d "$TARGET" -v ON_ERROR_STOP=0 >/dev/null
echo "[restore] done. Verify: psql -d $TARGET -c '\\dt'"
