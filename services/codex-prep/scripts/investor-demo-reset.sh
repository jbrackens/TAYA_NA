#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
ENV_FILE="${INVESTOR_DEMO_ENV_FILE:-$ROOT/.env.demo}"

# shellcheck disable=SC1091
source "$ROOT/scripts/investor-demo-common.sh"
investor_demo_load_env "$ROOT" "$ENV_FILE"
COMPOSE_BASE="$ROOT/docker-compose.yml"
COMPOSE_DEMO="$ROOT/docker-compose.demo.yml"
SKIP_BUILD=false

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
  esac
done

COMPOSE_CMD=(docker compose -f "$COMPOSE_BASE" -f "$COMPOSE_DEMO" --env-file "$ENV_FILE")

echo "==> Resetting investor-demo stack..."
"$ROOT/scripts/investor-demo-frontends-stop.sh"
"${COMPOSE_CMD[@]}" down -v --remove-orphans

if [[ "$SKIP_BUILD" == "true" ]]; then
  "$ROOT/scripts/demo-bootstrap.sh" --skip-build
else
  "$ROOT/scripts/demo-bootstrap.sh"
fi

echo "==> Running investor-demo smoke tests..."
"$ROOT/scripts/demo-smoke.sh"

echo "==> Investor-demo reset complete."
