#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-postgres}"
DB_NAME="${DB_NAME:-backend}"
DB_USER="${DB_USER:-backend}"
DB_PASSWORD="${DB_PASSWORD:-backend}"
JAVA_HOME_DEFAULT="/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home"

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker is required" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
  echo "error: postgres container [$POSTGRES_CONTAINER] is not running" >&2
  exit 1
fi

echo "resetting local prediction state in postgres container [$POSTGRES_CONTAINER]"

docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$POSTGRES_CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" <<'SQL'
TRUNCATE TABLE
  prediction_positions,
  prediction_trades,
  prediction_orders,
  prediction_settlements,
  prediction_outcomes,
  prediction_markets,
  ops_overrides,
  ops_incidents
RESTART IDENTITY CASCADE;

DELETE FROM audit_log_entries
WHERE entry ->> 'product' = 'prediction'
   OR entry ->> 'action' LIKE 'prediction.%';

DELETE FROM audit_event_log
WHERE event_type LIKE 'prediction.projection.%'
   OR aggregate_type IN ('prediction_market', 'prediction_order');

DELETE FROM replay_checkpoints
WHERE stream_name = 'prediction_projection';
SQL

echo "reseeding prediction markets"

(
  cd "$ROOT_DIR/phoenix-backend"
  export JAVA_HOME="${JAVA_HOME:-$JAVA_HOME_DEFAULT}"
  sbt -batch 'phoenix-backend/runMain phoenix.prediction.tools.SyncPredictionSeedData'
)

echo "prediction state reset complete"
