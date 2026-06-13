#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATEWAY_ROOT="$ROOT/phoenix-gateway"
cd "$ROOT"

ENV_FILE="$ROOT/.env.dev"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

pick_free_port() {
  local start="$1"
  local port
  for ((port=start; port<start+200; port++)); do
    if ! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "$port"
      return 0
    fi
  done
  return 1
}

STACK_NAME="phoenix-it-$(date +%s)"
TMP_ENV_FILE="$(mktemp)"
DB_PORT_INTEGRATION="$(pick_free_port 15432)"
REDIS_PORT_INTEGRATION="$(pick_free_port 16379)"
KAFKA_HOST_PORT_INTEGRATION="$(pick_free_port 19092)"
KAFKA_UI_PORT_INTEGRATION="$(pick_free_port 18090)"

cp "$ENV_FILE" "$TMP_ENV_FILE"
{
  echo "COMPOSE_STACK_NAME=$STACK_NAME"
  echo "DB_PORT=$DB_PORT_INTEGRATION"
  echo "REDIS_PORT=$REDIS_PORT_INTEGRATION"
  echo "KAFKA_HOST_PORT=$KAFKA_HOST_PORT_INTEGRATION"
  echo "KAFKA_UI_PORT=$KAFKA_UI_PORT_INTEGRATION"
} >> "$TMP_ENV_FILE"

cleanup() {
  docker compose --project-name "$STACK_NAME" --env-file "$TMP_ENV_FILE" -f "$ROOT/docker-compose.yml" down -v --remove-orphans >/dev/null 2>&1 || true
  rm -f "$TMP_ENV_FILE"
}
trap cleanup EXIT

export COMPOSE_STACK_NAME="$STACK_NAME"
export DB_PORT="$DB_PORT_INTEGRATION"
export REDIS_PORT="$REDIS_PORT_INTEGRATION"
export KAFKA_HOST_PORT="$KAFKA_HOST_PORT_INTEGRATION"
export KAFKA_UI_PORT="$KAFKA_UI_PORT_INTEGRATION"

export PHOENIX_COMPOSE_INTEGRATION=1
export PHOENIX_INTEGRATION_ADMIN_DSN="postgres://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT_INTEGRATION}/postgres?sslmode=disable"
export PHOENIX_INTEGRATION_REDIS_ADDR="localhost:${REDIS_PORT_INTEGRATION}"
export PHOENIX_INTEGRATION_KAFKA_BROKERS="localhost:${KAFKA_HOST_PORT_INTEGRATION}"

docker compose --project-name "$STACK_NAME" --env-file "$TMP_ENV_FILE" -f "$ROOT/docker-compose.yml" up -d postgres redis kafka kafka-init

cd "$GATEWAY_ROOT"
go test ./integration -count=1 -v

cd "$ROOT/phoenix-common"
go test ./pkg/outbox -count=1 -v
