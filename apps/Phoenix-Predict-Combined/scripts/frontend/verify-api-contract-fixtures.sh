#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SPORTSBOOK_DIR="$ROOT_DIR/phoenix-frontend-brand-viegg"
YARN_MUTEX="file:/tmp/yarn-mutex-sportsbook-api-contracts"
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

run_contract_fixture_tests() {
  local app_dir="$SPORTSBOOK_DIR/packages/app-core"

  (
    cd "$app_dir"
    CI=1 BROWSERSLIST_IGNORE_OLD_DATA=1 run_yarn test --runTestsByPath services/api/__tests__/response-shapes.test.ts --coverage=false
  )
}

use_node_runtime
ensure_yarn
select_yarn_bin

cd "$SPORTSBOOK_DIR"
YARN_MUTEX="$YARN_MUTEX" run_yarn install --frozen-lockfile

if ! run_contract_fixture_tests; then
  echo "warn: response-shape test run failed; building @phoenix-ui/utils and retrying" >&2
  YARN_MUTEX="$YARN_MUTEX" run_yarn workspace @phoenix-ui/utils dist
  run_contract_fixture_tests
fi
