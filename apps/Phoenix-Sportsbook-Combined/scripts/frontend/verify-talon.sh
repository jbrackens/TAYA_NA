#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TALON_DIR="$ROOT_DIR/talon-backoffice"
YARN_MUTEX="file:/tmp/yarn-mutex-talon"
SKIP_UTILS_DIST_IF_PRESENT="${SKIP_UTILS_DIST_IF_PRESENT:-true}"
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

run_retries() {
  local attempts="$1"
  shift

  local attempt=1
  while true; do
    if "$@"; then
      return 0
    fi
    if (( attempt >= attempts )); then
      return 1
    fi
    echo "warn: command failed on attempt $attempt/$attempts; retrying" >&2
    attempt=$((attempt + 1))
    sleep 1
  done
}

try_node16_compat() {
  if [[ "$HAS_NVM" != "true" ]]; then
    echo "warn: nvm unavailable; cannot switch to Node 16 compatibility mode" >&2
    return 1
  fi
  if ! nvm use 16.16 >/dev/null 2>&1; then
    return 1
  fi
  hash -r
  select_yarn_bin >/dev/null
}

restore_node20() {
  if [[ "$HAS_NVM" == "true" ]]; then
    nvm use 20 >/dev/null 2>&1 || true
    hash -r
    select_yarn_bin >/dev/null || true
  fi
}

build_node_options() {
  echo "--max-old-space-size=4096"
}

run_next_build() {
  local node_opts next_bin node_major
  node_opts="$(build_node_options)"
  next_bin="$TALON_DIR/node_modules/.bin/next"
  node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo "0")"

  if [[ "$node_major" -ge 17 ]]; then
    CI=1 NEXT_TELEMETRY_DISABLED=1 BROWSERSLIST_IGNORE_OLD_DATA=1 node $node_opts --openssl-legacy-provider "$next_bin" build
  else
    CI=1 NEXT_TELEMETRY_DISABLED=1 BROWSERSLIST_IGNORE_OLD_DATA=1 node $node_opts "$next_bin" build
  fi
}

use_node_runtime
ensure_yarn
select_yarn_bin

cd "$TALON_DIR"
YARN_MUTEX="$YARN_MUTEX" run_yarn install --frozen-lockfile

utils_dist_file="$TALON_DIR/packages/utils/dist/index.js"
utils_skip=false
if [[ "$SKIP_UTILS_DIST_IF_PRESENT" == "true" ]] && [[ -f "$utils_dist_file" ]]; then
  if ! find "$TALON_DIR/packages/utils/src" -type f -newer "$utils_dist_file" -print -quit | grep -q .; then
    utils_skip=true
  fi
fi

if [[ "$utils_skip" == "true" ]]; then
  echo "info: skipping @phoenix-ui/utils dist (already built and up-to-date)"
else
  if ! run_retries 2 env NODE_OPTIONS=--max-old-space-size=4096 YARN_MUTEX="$YARN_MUTEX" "$YARN_BIN" workspace @phoenix-ui/utils dist; then
    echo "warn: Node 20 utils dist failed; retrying under Node 16.16 compatibility bridge" >&2
    if try_node16_compat; then
      run_retries 3 env NODE_OPTIONS=--max-old-space-size=4096 YARN_MUTEX="$YARN_MUTEX" "$YARN_BIN" workspace @phoenix-ui/utils dist
      restore_node20
    else
      run_retries 2 env NODE_OPTIONS=--max-old-space-size=4096 YARN_MUTEX="$YARN_MUTEX" "$YARN_BIN" workspace @phoenix-ui/utils dist
    fi
  fi
fi

cd packages/office

build_node20() {
  run_yarn bootstrap:locales
  run_next_build
}

build_node16() {
  run_yarn bootstrap:locales
  run_next_build
}

if ! run_retries 2 build_node20; then
  echo "warn: Node 20 office build failed; retrying under Node 16.16 compatibility bridge" >&2
  if try_node16_compat; then
    run_retries 2 build_node16
    restore_node20
  else
    run_retries 2 build_node20
  fi
fi
