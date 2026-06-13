#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${INVESTOR_DEMO_ENV_FILE:-$ROOT/.env.demo}"
# shellcheck disable=SC1091
source "$ROOT/scripts/investor-demo-common.sh"
investor_demo_load_env "$ROOT" "$ENV_FILE"

SKIP_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
  esac
done

if [[ "$INVESTOR_DEMO_FRONTEND_MODE_RESOLVED" != "host" ]]; then
  echo "==> Frontend mode is $INVESTOR_DEMO_FRONTEND_MODE_RESOLVED; host-run frontends not required."
  exit 0
fi

investor_demo_require_runtime_node
REUSE_EXISTING_BUILD="${INVESTOR_DEMO_REUSE_EXISTING_FRONTEND_BUILD:-true}"

PLAYER_ROOT="$ROOT/../Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg"
PLAYER_WORKDIR="$PLAYER_ROOT/packages/app"
PLAYER_LOG="$INVESTOR_DEMO_LOG_DIR/player-web.log"
PLAYER_PID_FILE="$INVESTOR_DEMO_PID_DIR/player-web.pid"

TALON_ROOT="$ROOT/../Phoenix-Sportsbook-Combined/talon-backoffice"
TALON_WORKDIR="$TALON_ROOT/packages/office"
TALON_LOG="$INVESTOR_DEMO_LOG_DIR/talon-web.log"
TALON_PID_FILE="$INVESTOR_DEMO_PID_DIR/talon-web.pid"

ensure_next_http_errors_compat() {
  local label="$1"
  local repo_root="$2"
  local next_http_errors_pkg="$repo_root/node_modules/next/node_modules/http-errors/package.json"
  local next_statuses_dir="$repo_root/node_modules/next/node_modules/statuses"
  local compatible_statuses_dir=""
  local current_major=""
  local current_version=""

  if [[ ! -f "$next_http_errors_pkg" ]]; then
    return 0
  fi

  if [[ -f "$next_statuses_dir/package.json" ]]; then
    current_version="$(node -p "require('$next_statuses_dir/package.json').version" 2>/dev/null || true)"
    current_major="${current_version%%.*}"
    if [[ "$current_major" == "1" ]]; then
      return 0
    fi
  fi

  for compatible_statuses_dir in \
    "$repo_root/node_modules/raw-body/node_modules/statuses" \
    "$repo_root/node_modules/path-match/node_modules/statuses" \
    "$repo_root/node_modules/connect/node_modules/statuses"
  do
    if [[ -f "$compatible_statuses_dir/package.json" ]]; then
      current_version="$(node -p "require('$compatible_statuses_dir/package.json').version" 2>/dev/null || true)"
      current_major="${current_version%%.*}"
      if [[ "$current_major" == "1" ]]; then
        mkdir -p "$repo_root/node_modules/next/node_modules"
        rm -rf "$next_statuses_dir"
        cp -R "$compatible_statuses_dir" "$next_statuses_dir"
        echo "==> Repaired $label Next/http-errors statuses dependency with statuses@$current_version"
        return 0
      fi
    fi
  done

  echo "ERROR: unable to locate a compatible statuses@1.x package for $label runtime" >&2
  return 1
}

ensure_babel_runtime_compat() {
  local label="$1"
  local repo_root="$2"
  local nested_runtime="$repo_root/node_modules/rc-upload/node_modules/@babel/runtime"
  local root_runtime="$repo_root/node_modules/@babel/runtime"

  if [[ ! -d "$nested_runtime" ]]; then
    return 0
  fi

  if [[ -f "$root_runtime/helpers/esm/regeneratorRuntime.js" ]] \
     && [[ ! -f "$nested_runtime/helpers/esm/regeneratorRuntime.js" ]]; then
    rm -rf "$nested_runtime"
    echo "==> Removed $label nested rc-upload/@babel/runtime (missing regeneratorRuntime); will resolve to root @babel/runtime"
  fi
}

ensure_port_available() {
  local label="$1"
  local port="$2"
  local pid_file="$3"
  local expected_pid=""
  local port_pid=""

  if [[ -f "$pid_file" ]]; then
    expected_pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "$expected_pid" ]] && kill -0 "$expected_pid" 2>/dev/null; then
      return 0
    fi
    rm -f "$pid_file"
  fi

  port_pid="$(investor_demo_port_pid "$port")"
  if [[ -n "$port_pid" ]]; then
    echo "ERROR: $label cannot start because port $port is already in use by PID $port_pid" >&2
    return 1
  fi
}

start_frontend() {
  local label="$1"
  local workdir="$2"
  local port="$3"
  local pid_file="$4"
  local log_file="$5"
  shift 5
  local -a env_pairs=("$@")
  local existing_pid=""
  local repo_root=""
  local next_bin=""

  if [[ ! -d "$workdir" ]]; then
    echo "ERROR: missing $label workdir at $workdir" >&2
    return 1
  fi

  repo_root="$(cd "$workdir/../.." && pwd)"
  next_bin="$repo_root/node_modules/next/dist/bin/next"

  case " ${NODE_OPTIONS:-} " in
    *" --openssl-legacy-provider "*) ;;
    *) export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--openssl-legacy-provider" ;;
  esac

  if [[ -f "$pid_file" ]]; then
    existing_pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" 2>/dev/null; then
      echo "==> $label already running (PID $existing_pid)"
      investor_demo_wait_http "$label" "http://localhost:${port}" 60
      return 0
    fi
    rm -f "$pid_file"
  fi

  ensure_port_available "$label" "$port" "$pid_file"
  ensure_babel_runtime_compat "$label" "$repo_root"

  mkdir -p "$(dirname "$log_file")"
  : > "$log_file"

  if [[ "$SKIP_BUILD" == "false" ]]; then
    if [[ "$REUSE_EXISTING_BUILD" == "true" ]] && [[ -f "$workdir/.next/BUILD_ID" ]]; then
      echo "==> Reusing existing $label build output."
    else
      if [[ ! -x "$next_bin" ]]; then
        echo "ERROR: missing Next CLI for $label at $next_bin" >&2
        return 1
      fi
      echo "==> Building $label for investor-demo host mode..."
      (
        cd "$workdir"
        for pair in "${env_pairs[@]}"; do
          export "$pair"
        done
        yarn bootstrap:locales >>"$log_file" 2>&1
        "$next_bin" build >>"$log_file" 2>&1
      )
    fi
  else
    echo "==> Skipping $label build (--skip-build)."
  fi

  if [[ ! -x "$next_bin" ]]; then
    echo "ERROR: missing Next CLI for $label at $next_bin" >&2
    return 1
  fi

  ensure_next_http_errors_compat "$label" "$repo_root"

  echo "==> Starting $label on port $port..."
  # Launch in a new session (setsid) so the node process survives terminal close.
  # nohup alone is insufficient: Node.js/libuv overrides the inherited SIG_IGN for
  # SIGHUP by installing its own signal handlers, so processes die when the launching
  # terminal session ends. setsid moves the process into its own session with no
  # controlling terminal, so terminal-close SIGHUP never reaches it.
  # macOS lacks a standalone setsid command; perl POSIX::setsid() is used instead.
  # The exec chain (subshell -> perl -> node) preserves the PID captured by $!.
  (
    cd "$workdir"
    for pair in "${env_pairs[@]}"; do
      export "$pair"
    done
    exec perl -MPOSIX=setsid -e 'POSIX::setsid(); exec @ARGV' -- \
      node "$next_bin" start -p "$port" -H 0.0.0.0
  ) </dev/null >>"$log_file" 2>&1 &
  echo $! >"$pid_file"

  investor_demo_wait_http "$label" "http://localhost:${port}" 180
}

PLAYER_ENV=(
  "ENV_NAME=${INVESTOR_DEMO_ENV_NAME:-demo}"
  "API_GLOBAL_ENDPOINT=${INVESTOR_DEMO_GATEWAY_PUBLIC_URL}"
  "GO_GATEWAY_ENDPOINT=${INVESTOR_DEMO_GATEWAY_PUBLIC_URL}"
  "CANONICAL_GATEWAY_ENDPOINT=${INVESTOR_DEMO_GATEWAY_PUBLIC_URL}"
  "WS_GLOBAL_ENDPOINT=${INVESTOR_DEMO_GATEWAY_PUBLIC_WS_URL}"
  "CDN_URL=${INVESTOR_DEMO_CDN_URL:-https://cdn.vie.gg/phoenix/static}"
  "GEOCOMPLY_ENV=${INVESTOR_DEMO_GEOCOMPLY_ENV:-demo}"
  "GEOCOMPLY_MOBILE_SERVICE_URL=${INVESTOR_DEMO_GEOCOMPLY_MOBILE_SERVICE_URL:-https://demo-mobile-service.geocomply.example}"
  "GEOCOMPLY_OOBEE_URL=${INVESTOR_DEMO_GEOCOMPLY_OOBEE_URL:-https://demo-oobee.geocomply.example}"
  "SPORTSBOOK_INTEGRATION_MODE=${INVESTOR_DEMO_PLAYER_INTEGRATION_MODE:-full}"
  "PREDICTION_MARKETS_ENABLED=${INVESTOR_DEMO_PREDICTION_MARKETS_ENABLED:-true}"
)

TALON_ENV=(
  "ENV_NAME=${INVESTOR_DEMO_ENV_NAME:-demo}"
  "API_GLOBAL_ENDPOINT=${INVESTOR_DEMO_GATEWAY_PUBLIC_URL}"
  "WS_GLOBAL_ENDPOINT=${INVESTOR_DEMO_GATEWAY_PUBLIC_WS_URL}"
  "CDN_URL=${INVESTOR_DEMO_CDN_URL:-https://cdn.vie.gg/phoenix/static}"
  "SHOW_FOR_SUBMISSION=${INVESTOR_DEMO_TALON_SHOW_FOR_SUBMISSION:-1}"
)

start_frontend "player-web" "$PLAYER_WORKDIR" "$INVESTOR_DEMO_PLAYER_PORT" "$PLAYER_PID_FILE" "$PLAYER_LOG" "${PLAYER_ENV[@]}"
start_frontend "talon-web" "$TALON_WORKDIR" "$INVESTOR_DEMO_TALON_PORT" "$TALON_PID_FILE" "$TALON_LOG" "${TALON_ENV[@]}"

echo "==> Host-run investor-demo frontends are ready."
echo "Player UI: $PLAYER_BASE"
echo "Talon UI:  $TALON_BASE"
