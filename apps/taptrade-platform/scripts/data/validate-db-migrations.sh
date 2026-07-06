#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
LOG_FILE="$ARTIFACT_DIR/db_migration_validation_${TS_TAG}.log"
REPORT_FILE="$ROOT_DIR/revival/19_DB_MIGRATION_VALIDATION.md"

MIGRATIONS_DIR="$ROOT_DIR/phoenix-backend/services/src/main/resources/db/migration"
PG_IMAGE="${PG_IMAGE:-postgres:13.4}"
FLYWAY_IMAGE="${FLYWAY_IMAGE:-flyway/flyway:8.0}"
PG_CONTAINER="phoenix-revival-migrate-pg-${TS_TAG}"

mkdir -p "$ARTIFACT_DIR"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "error: migrations directory not found: $MIGRATIONS_DIR" | tee "$LOG_FILE"
  exit 1
fi

pick_port() {
  local candidate
  for candidate in 55432 55433 55434 55435 55436 55437 55438 55439 55440; do
    if ! lsof -nP -iTCP:"$candidate" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "$candidate"
      return 0
    fi
  done
  echo "error: no free TCP port found in the migration validation range" >&2
  return 1
}

PG_PORT="$(pick_port)"

cleanup() {
  docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

{
  echo "[$(date -u +%FT%TZ)] Starting migration validation"
  echo "Postgres image: $PG_IMAGE"
  echo "Flyway image: $FLYWAY_IMAGE"
  echo "Migrations dir: $MIGRATIONS_DIR"
  echo "Container: $PG_CONTAINER"
  echo "Host port: $PG_PORT"
} | tee "$LOG_FILE"

docker run -d --rm \
  --name "$PG_CONTAINER" \
  -e POSTGRES_PASSWORD=postgres \
  -p "${PG_PORT}:5432" \
  "$PG_IMAGE" >>"$LOG_FILE" 2>&1

echo "[$(date -u +%FT%TZ)] Waiting for postgres readiness..." | tee -a "$LOG_FILE"
for _ in $(seq 1 60); do
  if docker exec "$PG_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "$PG_CONTAINER" pg_isready -U postgres >>"$LOG_FILE" 2>&1

echo "[$(date -u +%FT%TZ)] Preparing database users/schema..." | tee -a "$LOG_FILE"
docker exec -i "$PG_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres >>"$LOG_FILE" 2>&1 <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'backend') THEN
    CREATE ROLE backend LOGIN PASSWORD 'backend';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'backend_flyway') THEN
    CREATE ROLE backend_flyway LOGIN PASSWORD 'backend_flyway';
  END IF;
END $$;
SELECT 'CREATE DATABASE backend'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'backend') \gexec
GRANT ALL PRIVILEGES ON DATABASE backend TO backend;
GRANT ALL PRIVILEGES ON DATABASE backend TO backend_flyway;
SQL

echo "[$(date -u +%FT%TZ)] Running Flyway migrate..." | tee -a "$LOG_FILE"
docker run --rm \
  -v "$MIGRATIONS_DIR:/flyway/sql" \
  "$FLYWAY_IMAGE" \
  -url="jdbc:postgresql://host.docker.internal:${PG_PORT}/backend" \
  -user=backend_flyway \
  -password=backend_flyway \
  -group=true \
  -connectRetries=30 \
  migrate >>"$LOG_FILE" 2>&1

MIGRATION_COUNT="$(docker exec "$PG_CONTAINER" psql -U postgres -d backend -tAc "SELECT COUNT(1) FROM flyway_schema_history WHERE success = true;")"
LATEST_MIGRATION="$(docker exec "$PG_CONTAINER" psql -U postgres -d backend -tAc "SELECT version FROM flyway_schema_history WHERE success = true ORDER BY installed_rank DESC LIMIT 1;")"

{
  echo "# Database Migration Validation ($DATE_TAG)"
  echo
  echo "Validation command: \`make validate-migrations\`"
  echo
  echo "- Status: pass"
  echo "- Postgres image: \`$PG_IMAGE\`"
  echo "- Flyway image: \`$FLYWAY_IMAGE\`"
  echo "- Successful migrations applied: \`$MIGRATION_COUNT\`"
  echo "- Latest migration version: \`$LATEST_MIGRATION\`"
  echo "- Log artifact: \`$LOG_FILE\`"
} >"$REPORT_FILE"

echo "[$(date -u +%FT%TZ)] Migration validation completed successfully." | tee -a "$LOG_FILE"
echo "Report: $REPORT_FILE" | tee -a "$LOG_FILE"
