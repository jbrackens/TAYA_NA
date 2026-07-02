#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GO_DIR="$ROOT_DIR/go-platform"
GATEWAY_DIR="$GO_DIR/services/gateway"
TALON_DIR="$ROOT_DIR/talon-backoffice"
APP_DIR="$TALON_DIR/packages/app"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/44_CANONICAL_BROWSER_STACK_RUNNER.md"
JOURNEY_SCRIPT="$ROOT_DIR/scripts/qa/canonical-browser-journey.sh"

DATE_TAG="$(date -u +%F)"
TS_TAG="$(date -u +%Y%m%d_%H%M%S)"
RESULT_FILE="$ARTIFACT_DIR/canonical_browser_stack_${TS_TAG}.md"
POSTGRES_LOG="$ARTIFACT_DIR/canonical_browser_stack_${TS_TAG}_postgres.log"
MIGRATE_LOG="$ARTIFACT_DIR/canonical_browser_stack_${TS_TAG}_migrate.log"
SEED_LOG="$ARTIFACT_DIR/canonical_browser_stack_${TS_TAG}_seed.log"
AUTH_LOG="$ARTIFACT_DIR/canonical_browser_stack_${TS_TAG}_auth.log"
GATEWAY_LOG="$ARTIFACT_DIR/canonical_browser_stack_${TS_TAG}_gateway.log"
PLAYER_LOG="$ARTIFACT_DIR/canonical_browser_stack_${TS_TAG}_player.log"
JOURNEY_LOG="$ARTIFACT_DIR/canonical_browser_stack_${TS_TAG}_journey.log"

mkdir -p "$ARTIFACT_DIR"

pick_free_port() {
  local port="$1"
  while lsof -ti "tcp:$port" >/dev/null 2>&1; do
    port=$((port + 1))
  done
  echo "$port"
}

AUTH_PORT="${AUTH_PORT:-$(pick_free_port 18081)}"
GATEWAY_PORT="${GATEWAY_PORT:-$(pick_free_port 18180)}"
PLAYER_PORT="${PLAYER_PORT:-$(pick_free_port 3022)}"
if [[ "$AUTH_PORT" == "$GATEWAY_PORT" ]]; then
  GATEWAY_PORT="$(pick_free_port $((AUTH_PORT + 1)))"
fi
if [[ "$PLAYER_PORT" == "$AUTH_PORT" || "$PLAYER_PORT" == "$GATEWAY_PORT" ]]; then
  PLAYER_PORT="$(pick_free_port $((GATEWAY_PORT + 1)))"
fi

AUTH_BASE="http://127.0.0.1:${AUTH_PORT}"
GATEWAY_BASE="http://127.0.0.1:${GATEWAY_PORT}"
PLAYER_BASE="http://127.0.0.1:${PLAYER_PORT}"
POSTGRES_CONTAINER="tiangge-canonical-browser-pg-${TS_TAG}"

PIDS=()

cleanup() {
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" >/dev/null 2>&1 || true
  done
  for pid in "${PIDS[@]:-}"; do
    wait "$pid" 2>/dev/null || true
  done
  if [[ -n "${POSTGRES_CONTAINER:-}" ]]; then
    docker rm -f "$POSTGRES_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

write_report() {
  local result="$1"
  local note="$2"
  {
    echo "# Canonical Browser Seeded Stack Runner ($DATE_TAG)"
    echo
    echo "Command: \`make qa-canonical-browser-stack\`"
    echo
    echo "- Result: **$result**"
    echo "- Player base URL: \`$PLAYER_BASE\`"
    echo "- Gateway base URL: \`$GATEWAY_BASE\`"
    echo "- Auth base URL: \`$AUTH_BASE\`"
    echo "- Artifact: \`$RESULT_FILE\`"
    echo
    echo "## Logs"
    echo
    echo "- Postgres: \`$POSTGRES_LOG\`"
    echo "- Migration: \`$MIGRATE_LOG\`"
    echo "- Seed: \`$SEED_LOG\`"
    echo "- Auth: \`$AUTH_LOG\`"
    echo "- Gateway: \`$GATEWAY_LOG\`"
    echo "- Player: \`$PLAYER_LOG\`"
    echo "- Journey gate: \`$JOURNEY_LOG\`"
    echo
    echo "## Result Note"
    echo
    echo "$note"
  } >"$RESULT_FILE"
  cp "$RESULT_FILE" "$REPORT_FILE"
}

wait_for_http_200() {
  local url="$1"
  local name="$2"
  local attempts="${3:-120}"
  local code
  for _ in $(seq 1 "$attempts"); do
    code="$(curl -sSL -o /dev/null -w "%{http_code}" "$url" || true)"
    if [[ "$code" == "200" ]]; then
      return 0
    fi
    sleep 1
  done
  echo "timeout waiting for $name at $url (last status ${code:-none})"
  return 1
}

start_bg() {
  local name="$1"
  local log_file="$2"
  shift 2
  (
    echo "starting $name at $(date -u +%FT%TZ)"
    "$@"
  ) >"$log_file" 2>&1 &
  local pid=$!
  PIDS+=("$pid")
  echo "$pid"
}

if ! command -v docker >/dev/null 2>&1; then
  write_report "fail" "Docker is required to start the disposable Postgres database."
  echo "Canonical browser stack report: $REPORT_FILE"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  write_report "fail" "Docker is installed but not reachable; cannot start the disposable Postgres database."
  echo "Canonical browser stack report: $REPORT_FILE"
  exit 1
fi

docker run -d --rm \
  --name "$POSTGRES_CONTAINER" \
  -e POSTGRES_PASSWORD=postgres \
  -p 127.0.0.1::5432 \
  postgres:16-alpine >"$POSTGRES_LOG" 2>&1

POSTGRES_PORT=""
for _ in $(seq 1 45); do
  POSTGRES_PORT="$(docker port "$POSTGRES_CONTAINER" 5432/tcp 2>/dev/null | sed -E 's/.*:([0-9]+)$/\1/' | tail -n 1)"
  if [[ -n "$POSTGRES_PORT" ]] && docker exec "$POSTGRES_CONTAINER" pg_isready -U postgres >>"$POSTGRES_LOG" 2>&1; then
    break
  fi
  sleep 1
done

if [[ -z "$POSTGRES_PORT" ]]; then
  write_report "fail" "The disposable Postgres container did not publish a port."
  echo "Canonical browser stack report: $REPORT_FILE"
  exit 1
fi

DB_DSN="postgres://postgres:postgres@127.0.0.1:${POSTGRES_PORT}/postgres?sslmode=disable"

(
  cd "$GATEWAY_DIR"
  GATEWAY_DB_DSN="$DB_DSN" \
  MIGRATIONS_DIR="$GATEWAY_DIR/migrations" \
    go run ./cmd/migrate up
) >"$MIGRATE_LOG" 2>&1

(
  cd "$GATEWAY_DIR"
  GATEWAY_DB_DSN="$DB_DSN" \
  WALLET_DB_DSN="$DB_DSN" \
  WALLET_STORE_MODE=db \
    go run ./cmd/seed -mode demo
) >"$SEED_LOG" 2>&1

start_bg "auth" "$AUTH_LOG" bash -lc \
  "cd '$GO_DIR' && exec env AUTH_COOKIE_SECURE=false AUTH_STORE_MODE=db AUTH_DB_DSN='$DB_DSN' PORT='$AUTH_PORT' go run ./services/auth/cmd/auth" >/dev/null
wait_for_http_200 "$AUTH_BASE/healthz" "auth healthz" 120 || {
  write_report "fail" "Auth did not become healthy. See the auth log."
  echo "Canonical browser stack report: $REPORT_FILE"
  exit 1
}

start_bg "gateway" "$GATEWAY_LOG" bash -lc \
  "cd '$GO_DIR' && exec env PORT='$GATEWAY_PORT' AUTH_SERVICE_URL='$AUTH_BASE' GATEWAY_AUTH_ENABLED=true GATEWAY_DB_DSN='$DB_DSN' WALLET_DB_DSN='$DB_DSN' WALLET_STORE_MODE=db STARTER_GRANT_CENTS=500000 MISSION_FIRST_PREDICTION_REWARD_CENTS=450 MARKET_SYNC_ENABLED=false GATEWAY_CORS_ORIGINS='http://127.0.0.1:$PLAYER_PORT,http://localhost:$PLAYER_PORT' go run ./services/gateway/cmd/gateway" >/dev/null
wait_for_http_200 "$GATEWAY_BASE/api/v1/status" "gateway status" 120 || {
  write_report "fail" "Gateway did not become healthy. See the gateway log."
  echo "Canonical browser stack report: $REPORT_FILE"
  exit 1
}

start_bg "player" "$PLAYER_LOG" bash -lc \
  "if [ -s '$HOME/.nvm/nvm.sh' ]; then source '$HOME/.nvm/nvm.sh' && nvm use >/dev/null; fi; cd '$APP_DIR' && yarn bootstrap:locales && exec env NEXT_PUBLIC_API_URL='$GATEWAY_BASE' PORT='$PLAYER_PORT' yarn next dev --webpack" >/dev/null
wait_for_http_200 "$PLAYER_BASE/" "player root" 180 || {
  write_report "fail" "Player app did not become healthy. See the player log."
  echo "Canonical browser stack report: $REPORT_FILE"
  exit 1
}
wait_for_http_200 "$PLAYER_BASE/api/v1/status" "player gateway proxy" 120 || {
  write_report "fail" "Player app did not proxy /api/v1/status to the gateway. See player and gateway logs."
  echo "Canonical browser stack report: $REPORT_FILE"
  exit 1
}

if PREDICT_BASE_URL="$PLAYER_BASE" PLAYER_PORT="$PLAYER_PORT" bash "$JOURNEY_SCRIPT" >"$JOURNEY_LOG" 2>&1; then
  write_report "pass" "The ephemeral DB-backed seeded stack started successfully and the canonical browser journey gate passed."
  echo "Canonical browser stack report: $REPORT_FILE"
  exit 0
fi

write_report "fail" "The seeded stack started, but the canonical browser journey gate failed. See the journey log plus service logs."
echo "Canonical browser stack report: $REPORT_FILE"
exit 1
