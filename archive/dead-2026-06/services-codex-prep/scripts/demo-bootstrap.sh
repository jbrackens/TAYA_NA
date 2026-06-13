#!/usr/bin/env bash
# =============================================================================
# Phoenix Platform — Investor Demo Bootstrap
# =============================================================================
# Builds, starts, seeds, and warms the investor-demo stack on a single machine.
#
# Usage:
#   ./scripts/demo-bootstrap.sh             # build + start + seed + warmup
#   ./scripts/demo-bootstrap.sh --skip-build
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
ENV_FILE="${INVESTOR_DEMO_ENV_FILE:-$ROOT/.env.demo}"

# shellcheck disable=SC1091
source "$ROOT/scripts/investor-demo-common.sh"
investor_demo_load_env "$ROOT" "$ENV_FILE"

export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"
export COMPOSE_DOCKER_CLI_BUILD="${COMPOSE_DOCKER_CLI_BUILD:-1}"

COMPOSE_BASE="$ROOT/docker-compose.yml"
COMPOSE_DEMO="$ROOT/docker-compose.demo.yml"
PLAYER_FRONTEND_DIR="$ROOT/../Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg"
TALON_FRONTEND_DIR="$ROOT/../Phoenix-Sportsbook-Combined/talon-backoffice"
SKIP_BUILD=false

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: missing $ENV_FILE" >&2
  exit 1
fi

if [[ ! -d "$PLAYER_FRONTEND_DIR" ]]; then
  echo "ERROR: missing player frontend repo at $PLAYER_FRONTEND_DIR" >&2
  exit 1
fi

if [[ ! -d "$TALON_FRONTEND_DIR" ]]; then
  echo "ERROR: missing Talon repo at $TALON_FRONTEND_DIR" >&2
  exit 1
fi

if [[ "$INVESTOR_DEMO_FRONTEND_MODE_RESOLVED" == "docker" && "$SKIP_BUILD" == "false" && ! -f "${HOME}/.npmrc" ]]; then
  echo "ERROR: docker frontend mode requires ${HOME}/.npmrc to build private frontend packages" >&2
  exit 1
fi

COMPOSE_CMD=(docker compose -f "$COMPOSE_BASE" -f "$COMPOSE_DEMO" --env-file "$ENV_FILE")

BACKEND_BUILD_SERVICES=(
  phoenix-gateway
  phoenix-realtime
  phoenix-user
  phoenix-wallet
  phoenix-market-engine
  phoenix-betting-engine
  phoenix-events
  phoenix-retention
  phoenix-social
  phoenix-compliance
  phoenix-analytics
  phoenix-settlement
  phoenix-notification
  phoenix-cms
  stella-engagement
  phoenix-prediction
  phoenix-audit
  phoenix-support-notes
  phoenix-config
  phoenix-outbox-worker
)

DOCKER_FRONTEND_SERVICES=(
  phoenix-player-web
  phoenix-talon-web
)

STACK_SERVICES=(
  kafka-ui
  phoenix-gateway
  phoenix-realtime
  phoenix-user
  phoenix-wallet
  phoenix-market-engine
  phoenix-betting-engine
  phoenix-events
  phoenix-retention
  phoenix-social
  phoenix-compliance
  phoenix-analytics
  phoenix-settlement
  phoenix-notification
  phoenix-cms
  stella-engagement
  phoenix-prediction
  phoenix-audit
  phoenix-support-notes
  phoenix-config
  phoenix-outbox-worker
)

HEALTH_SERVICES=(
  phoenix-gateway
  phoenix-realtime
  phoenix-user
  phoenix-wallet
  phoenix-market-engine
  phoenix-betting-engine
  phoenix-events
  phoenix-retention
  phoenix-social
  phoenix-compliance
  phoenix-analytics
  phoenix-settlement
  phoenix-notification
  phoenix-cms
  stella-engagement
  phoenix-prediction
  phoenix-audit
  phoenix-support-notes
  phoenix-config
)

wait_healthy() {
  local svc="$1"
  local max_wait="${2:-120}"
  local elapsed=0
  local status
  while [[ $elapsed -lt $max_wait ]]; do
    status="$("${COMPOSE_CMD[@]}" ps --format json "$svc" 2>/dev/null | grep -o '"Health":"[^"]*"' | head -1 || true)"
    if echo "$status" | grep -q '"Health":"healthy"'; then
      echo "  $svc is healthy"
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  echo "  ERROR: $svc did not become healthy within ${max_wait}s" >&2
  return 1
}

wait_running() {
  local svc="$1"
  local max_wait="${2:-60}"
  local elapsed=0
  local state
  while [[ $elapsed -lt $max_wait ]]; do
    state="$("${COMPOSE_CMD[@]}" ps --format json "$svc" 2>/dev/null | grep -o '\"State\":\"[^\"]*\"' | head -1 || true)"
    if echo "$state" | grep -q '\"State\":\"running\"'; then
      echo "  $svc is running"
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  echo "  ERROR: $svc did not reach running state within ${max_wait}s" >&2
  return 1
}

if [[ "$SKIP_BUILD" == "false" ]]; then
  BUILD_TARGETS=("${BACKEND_BUILD_SERVICES[@]}")
  if [[ "$INVESTOR_DEMO_FRONTEND_MODE_RESOLVED" == "docker" ]]; then
    BUILD_TARGETS+=("${DOCKER_FRONTEND_SERVICES[@]}")
  fi
  echo "==> Building investor-demo images (frontend mode: $INVESTOR_DEMO_FRONTEND_MODE_RESOLVED)..."
  "${COMPOSE_CMD[@]}" build "${BUILD_TARGETS[@]}"
  echo "==> Build complete."
else
  echo "==> Skipping build (--skip-build)."
fi

echo "==> Starting infrastructure (postgres, redis, kafka)..."
"${COMPOSE_CMD[@]}" up -d postgres redis kafka

echo "==> Waiting for infrastructure health..."
wait_healthy postgres 60
wait_healthy redis 30
wait_healthy kafka 90

echo "==> Initializing Kafka topics..."
"${COMPOSE_CMD[@]}" up kafka-init

UP_SERVICES=("${STACK_SERVICES[@]}")
if [[ "$INVESTOR_DEMO_FRONTEND_MODE_RESOLVED" == "docker" ]]; then
  UP_SERVICES+=("${DOCKER_FRONTEND_SERVICES[@]}")
fi

echo "==> Starting investor-demo services (frontend mode: $INVESTOR_DEMO_FRONTEND_MODE_RESOLVED)..."
"${COMPOSE_CMD[@]}" up -d "${UP_SERVICES[@]}"

echo "==> Waiting for services to become healthy..."
ALL_HEALTHY=true
for svc in "${HEALTH_SERVICES[@]}"; do
  if ! wait_healthy "$svc" 180; then
    ALL_HEALTHY=false
  fi
done

if [[ "$INVESTOR_DEMO_FRONTEND_MODE_RESOLVED" == "docker" ]]; then
  for svc in "${DOCKER_FRONTEND_SERVICES[@]}"; do
    if ! wait_healthy "$svc" 180; then
      ALL_HEALTHY=false
    fi
  done
fi

if ! wait_running phoenix-outbox-worker 60; then
  ALL_HEALTHY=false
fi

echo "==> Seeding demo content, accounts, and markets..."
"$ROOT/scripts/demo-seed.sh"

if [[ "$INVESTOR_DEMO_FRONTEND_MODE_RESOLVED" == "host" ]]; then
  echo "==> Starting host-run player and Talon frontends..."
  if [[ "$SKIP_BUILD" == "true" ]]; then
    "$ROOT/scripts/investor-demo-frontends-start.sh" --skip-build
  else
    "$ROOT/scripts/investor-demo-frontends-start.sh"
  fi
fi

echo "==> Warming investor-demo flows..."
"$ROOT/scripts/investor-demo-warmup.sh"

echo ""
echo "============================================="
if [[ "$ALL_HEALTHY" == "true" ]]; then
  echo "  INVESTOR DEMO STACK IS UP AND HEALTHY"
else
  echo "  INVESTOR DEMO STACK STARTED (some services unhealthy)"
  echo "  Run: ${COMPOSE_CMD[*]} ps"
  echo "  Run: ${COMPOSE_CMD[*]} logs <service-name>"
fi
echo "============================================="
echo ""
echo "Frontend mode: $INVESTOR_DEMO_FRONTEND_MODE_RESOLVED"
echo "Player UI:  $PLAYER_BASE"
echo "Talon UI:   $TALON_BASE"
echo "Gateway:    $API_BASE"
echo "Kafka UI:   http://localhost:8090"
echo ""
echo "To run smoke tests:"
echo "  ./scripts/demo-smoke.sh"
echo ""
echo "To run seeded realtime rehearsal:"
echo "  ./scripts/realtime-rehearsal.sh"
echo ""
echo "To reset/warm/smoke from a dirty state:"
echo "  ./scripts/investor-demo-reset.sh --skip-build"
echo ""
if [[ "$INVESTOR_DEMO_FRONTEND_MODE_RESOLVED" == "host" ]]; then
  echo "To stop host-run frontends:"
  echo "  ./scripts/investor-demo-frontends-stop.sh"
  echo ""
fi
echo "To stop Docker services:"
echo "  docker compose -f docker-compose.yml -f docker-compose.demo.yml --env-file .env.demo down"
echo ""
