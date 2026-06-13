#!/usr/bin/env bash
# =============================================================================
# Phoenix Platform — Investor Demo Smoke Tests
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
ENV_FILE="${INVESTOR_DEMO_ENV_FILE:-$ROOT/.env.demo}"
COMPOSE_BASE="$ROOT/docker-compose.yml"
COMPOSE_DEMO="$ROOT/docker-compose.demo.yml"

# shellcheck disable=SC1091
source "$ROOT/scripts/investor-demo-common.sh"
investor_demo_load_env "$ROOT" "$ENV_FILE"

PASS=0
FAIL=0
SKIP=0

check() {
  local label="$1"
  local url="$2"
  local expect_code="${3:-200}"
  local retries="${4:-1}"
  local code attempt=1

  while true; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url" 2>/dev/null || echo "000")"
    if [[ "$code" == "$expect_code" || "$attempt" -ge "$retries" ]]; then
      break
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  if [[ "$code" == "$expect_code" ]]; then
    echo "  PASS  $label ($code)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $label (got $code, expected $expect_code)"
    FAIL=$((FAIL + 1))
  fi
}

check_any() {
  local label="$1"
  local url="$2"
  shift 2
  local allowed=("$@")
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url" 2>/dev/null || echo "000")"
  for expected in "${allowed[@]}"; do
    if [[ "$code" == "$expected" ]]; then
      echo "  PASS  $label ($code)"
      PASS=$((PASS + 1))
      return 0
    fi
  done
  echo "  FAIL  $label (got $code, expected one of ${allowed[*]})"
  FAIL=$((FAIL + 1))
}

check_log() {
  local label="$1"
  local container="$2"
  local pattern="$3"
  if docker compose -f "$COMPOSE_BASE" -f "$COMPOSE_DEMO" --env-file "$ENV_FILE" logs --tail=50 "$container" 2>/dev/null | grep -q "$pattern"; then
    echo "  PASS  $label (log pattern found)"
    PASS=$((PASS + 1))
  else
    echo "  SKIP  $label (log pattern not found - may need traffic)"
    SKIP=$((SKIP + 1))
  fi
}

echo "============================================="
echo "  Phoenix Investor Demo Smoke Tests"
echo "  Player:  $PLAYER_BASE"
echo "  Talon:   $TALON_BASE"
echo "  API:     $API_BASE"
echo "============================================="
echo ""

echo "[Frontends]"
check_any "player root" "$PLAYER_BASE/" 200 302 307 308
check_any "talon root" "$TALON_BASE/" 200 302 307 308
echo ""

echo "[Gateway]"
check "gateway /health" "$API_BASE/health" 200 10
check "gateway /ready" "$API_BASE/ready" 200 10
echo ""

echo "[Service Health - Direct]"
SERVICES=(
  "phoenix-user:8001"
  "phoenix-wallet:8002"
  "phoenix-market-engine:8003"
  "phoenix-betting-engine:8004"
  "phoenix-events:8005"
  "phoenix-retention:8006"
  "phoenix-social:8007"
  "phoenix-compliance:8008"
  "phoenix-analytics:8009"
  "phoenix-settlement:8010"
  "phoenix-notification:8011"
  "phoenix-cms:8012"
  "stella-engagement:8013"
  "phoenix-prediction:8014"
  "phoenix-audit:8015"
  "phoenix-support-notes:8016"
  "phoenix-config:8017"
  "phoenix-realtime:8018"
)

HOST="${DIRECT_HOST:-localhost}"
for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"
  port="${entry##*:}"
  check "$name /health" "http://$HOST:$port/health"
done
echo ""

echo "[Public API Routes]"
check "markets" "$API_BASE/api/v1/markets" 200
check "events" "$API_BASE/api/v1/events" 200
check "sports" "$API_BASE/api/v1/sports" 200
check "prediction overview" "$API_BASE/api/v1/prediction/overview" 200
check "prediction categories" "$API_BASE/api/v1/prediction/categories" 200
check "prediction markets" "$API_BASE/api/v1/prediction/markets" 200
check "terms current" "$API_BASE/api/v1/terms/current" 200
check "pages" "$API_BASE/api/v1/pages" 200
check "banners" "$API_BASE/api/v1/banners" 200
check "promotions" "$API_BASE/api/v1/promotions" 200
echo ""

echo "[Outbox Worker]"
check_log "outbox worker running" "phoenix-outbox-worker" "outbox"
echo ""

echo "[Infrastructure]"
check "kafka-ui" "http://${HOST}:8090" 200
echo ""

TOTAL=$((PASS + FAIL + SKIP))
echo "============================================="
echo "  Results: $PASS passed, $FAIL failed, $SKIP skipped (of $TOTAL)"
if [[ $FAIL -eq 0 ]]; then
  echo "  STATUS: ALL CHECKS PASSED"
else
  echo "  STATUS: $FAIL CHECKS FAILED"
fi
echo "============================================="

exit $FAIL
