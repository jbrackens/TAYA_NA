#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TALON_DIR="$ROOT/talon-backoffice"
APP_DIR="$TALON_DIR/packages/app"
YARN_MUTEX="file:/tmp/yarn-mutex-tiangge-discovery-smoke"
YARN_BIN=""

HAS_NVM=false
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  source "$HOME/.nvm/nvm.sh"
  HAS_NVM=true
fi

use_node_runtime() {
  if [[ "$HAS_NVM" == "true" ]]; then
    if ! nvm use >/dev/null 2>&1; then
      if ! nvm use 20 >/dev/null 2>&1 && ! nvm use 22 >/dev/null 2>&1; then
        nvm install >/dev/null
        nvm use >/dev/null
      fi
    fi
    hash -r
    return 0
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "error: node is required (nvm not found and node binary is missing)" >&2
    exit 1
  fi

  local node_major
  node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo "0")"
  if [[ "$node_major" -lt 20 ]]; then
    echo "error: Node 20+ is required when nvm is unavailable (found $(node -v))" >&2
    exit 1
  fi
}

select_yarn_bin() {
  if [[ -n "${NVM_BIN:-}" ]] && [[ -x "${NVM_BIN}/yarn" ]]; then
    YARN_BIN="${NVM_BIN}/yarn"
    return 0
  fi
  if command -v yarn >/dev/null 2>&1; then
    YARN_BIN="$(command -v yarn)"
    return 0
  fi
  echo "error: yarn binary not found in PATH" >&2
  return 1
}

run_yarn() {
  if [[ -z "$YARN_BIN" ]]; then
    echo "error: YARN_BIN is not configured" >&2
    return 1
  fi
  "$YARN_BIN" "$@"
}

ensure_yarn() {
  if ! command -v yarn >/dev/null 2>&1 || [[ "$(yarn -v 2>/dev/null || true)" != "1.22.22" ]]; then
    npm install -g yarn@1.22.22 >/dev/null
  fi
  select_yarn_bin >/dev/null
  if [[ "$(run_yarn -v 2>/dev/null || true)" != "1.22.22" ]]; then
    npm install -g yarn@1.22.22 >/dev/null
    select_yarn_bin >/dev/null
  fi
}

run_discovery_contract_tests() {
  local tsx_bin="$TALON_DIR/node_modules/.bin/tsx"
  if [[ ! -x "$tsx_bin" ]]; then
    echo "error: tsx test runner not found at $tsx_bin" >&2
    return 1
  fi

  (
    cd "$APP_DIR"
    CI=1 BROWSERSLIST_IGNORE_OLD_DATA=1 "$tsx_bin" --test --test-reporter=tap \
      app/__tests__/market-search.test.ts \
      app/__tests__/market-subcategories.test.ts \
      app/__tests__/market-status-display.test.ts \
      app/__tests__/market-chart-states.test.ts \
      app/__tests__/market-content-templates.test.ts
  )
}

echo "[info] qa-sports-route-smoke is a compatibility alias for Tiangge discovery route contracts"

use_node_runtime
ensure_yarn
select_yarn_bin

cd "$TALON_DIR"
YARN_MUTEX="$YARN_MUTEX" run_yarn install --frozen-lockfile

run_discovery_contract_tests
