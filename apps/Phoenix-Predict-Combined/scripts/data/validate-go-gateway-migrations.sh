#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATEWAY_DIR="$ROOT_DIR/go-platform/services/gateway"
MIGRATIONS_DIR="$GATEWAY_DIR/migrations"
DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
LOG_FILE="$ARTIFACT_DIR/go_gateway_migration_validation_${TS_TAG}.log"
REPORT_FILE="$ROOT_DIR/revival/GO_GATEWAY_DB_MIGRATION_VALIDATION.md"

PG_IMAGE="${PG_IMAGE:-postgres:16-alpine}"
PG_CONTAINER="hula-na-gateway-migrate-pg-${TS_TAG}"

mkdir -p "$ARTIFACT_DIR"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "error: migrations directory not found: $MIGRATIONS_DIR" | tee "$LOG_FILE"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker is required for gateway migration validation" | tee "$LOG_FILE"
  exit 1
fi

pick_port() {
  local candidate
  for candidate in 56432 56433 56434 56435 56436 56437 56438 56439 56440; do
    if ! lsof -nP -iTCP:"$candidate" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "$candidate"
      return 0
    fi
  done
  echo "error: no free TCP port found in the gateway migration validation range" >&2
  return 1
}

PG_PORT="$(pick_port)"

cleanup() {
  docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

{
  echo "[$(date -u +%FT%TZ)] Starting Go gateway migration validation"
  echo "Postgres image: $PG_IMAGE"
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

export GATEWAY_DB_DRIVER=postgres
export GATEWAY_DB_DSN="postgres://postgres:postgres@127.0.0.1:${PG_PORT}/postgres?sslmode=disable"
export MIGRATIONS_DIR

echo "[$(date -u +%FT%TZ)] Running gateway goose migrations..." | tee -a "$LOG_FILE"
(
  cd "$GATEWAY_DIR"
  go run ./cmd/migrate up
) >>"$LOG_FILE" 2>&1

echo "[$(date -u +%FT%TZ)] Running schema smoke checks..." | tee -a "$LOG_FILE"
docker exec -i "$PG_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres >>"$LOG_FILE" 2>&1 <<'SQL'
WITH required_tables(name) AS (
  VALUES
    ('punters'),
    ('wallets'),
    ('ledger_entries'),
    ('prediction_markets'),
    ('prediction_orders'),
    ('prediction_positions'),
    ('prediction_trades'),
    ('prediction_settlements'),
    ('prediction_payouts'),
    ('prediction_collateral_ledger'),
    ('prediction_resolution_proposals'),
    ('prediction_disputes'),
    ('admin_users'),
    ('roles'),
    ('permissions'),
    ('user_roles'),
    ('role_permissions')
)
SELECT name
FROM required_tables
WHERE to_regclass('public.' || name) IS NULL;
SQL

MISSING_TABLES="$(docker exec "$PG_CONTAINER" psql -U postgres -d postgres -tAc "
WITH required_tables(name) AS (
  VALUES
    ('punters'),
    ('wallets'),
    ('ledger_entries'),
    ('prediction_markets'),
    ('prediction_orders'),
    ('prediction_positions'),
    ('prediction_trades'),
    ('prediction_settlements'),
    ('prediction_payouts'),
    ('prediction_collateral_ledger'),
    ('prediction_resolution_proposals'),
    ('prediction_disputes'),
    ('admin_users'),
    ('roles'),
    ('permissions'),
    ('user_roles'),
    ('role_permissions')
)
SELECT COUNT(*)
FROM required_tables
WHERE to_regclass('public.' || name) IS NULL;
")"
if [[ "$MISSING_TABLES" != "0" ]]; then
  echo "error: gateway migration smoke check found $MISSING_TABLES missing required tables" | tee -a "$LOG_FILE"
  exit 1
fi

APPLIED_COUNT="$(docker exec "$PG_CONTAINER" psql -U postgres -d postgres -tAc "SELECT COUNT(*) FROM goose_db_version WHERE is_applied = true;")"
LATEST_VERSION="$(docker exec "$PG_CONTAINER" psql -U postgres -d postgres -tAc "SELECT version_id FROM goose_db_version WHERE is_applied = true ORDER BY version_id DESC LIMIT 1;")"

{
  echo "# Go Gateway Database Migration Validation ($DATE_TAG)"
  echo
  echo "Validation command: \`make validate-go-migrations\`"
  echo
  echo "- Status: pass"
  echo "- Postgres image: \`$PG_IMAGE\`"
  echo "- Successful migrations applied: \`$APPLIED_COUNT\`"
  echo "- Latest gateway migration version: \`$LATEST_VERSION\`"
  echo "- Required prediction/admin/wallet tables present: \`true\`"
  echo "- Log artifact: \`$LOG_FILE\`"
} >"$REPORT_FILE"

echo "[$(date -u +%FT%TZ)] Go gateway migration validation completed successfully." | tee -a "$LOG_FILE"
echo "Report: $REPORT_FILE" | tee -a "$LOG_FILE"
