#!/usr/bin/env bash
set -euo pipefail

investor_demo_load_env() {
  local root="$1"
  local env_file="${2:-$root/.env.demo}"

  if [[ -f "$env_file" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "$env_file"
    set +a
  fi

  export INVESTOR_DEMO_FRONTEND_MODE="${INVESTOR_DEMO_FRONTEND_MODE:-auto}"
  export INVESTOR_DEMO_FRONTEND_RUNTIME_NODE_VERSION="${INVESTOR_DEMO_FRONTEND_RUNTIME_NODE_VERSION:-20.20.0}"
  export INVESTOR_DEMO_PLAYER_PORT="${INVESTOR_DEMO_PLAYER_PORT:-3100}"
  export INVESTOR_DEMO_TALON_PORT="${INVESTOR_DEMO_TALON_PORT:-3101}"
  export INVESTOR_DEMO_GATEWAY_PUBLIC_URL="${INVESTOR_DEMO_GATEWAY_PUBLIC_URL:-http://localhost:8080}"
  export INVESTOR_DEMO_GATEWAY_PUBLIC_WS_URL="${INVESTOR_DEMO_GATEWAY_PUBLIC_WS_URL:-ws://localhost:8080/api/v1/ws/web-socket}"
  export INVESTOR_DEMO_PLAYER_PUBLIC_URL="${INVESTOR_DEMO_PLAYER_PUBLIC_URL:-http://localhost:${INVESTOR_DEMO_PLAYER_PORT}}"
  export INVESTOR_DEMO_TALON_PUBLIC_URL="${INVESTOR_DEMO_TALON_PUBLIC_URL:-http://localhost:${INVESTOR_DEMO_TALON_PORT}}"
  export HTTP_ALLOWED_ORIGINS="${HTTP_ALLOWED_ORIGINS:-${INVESTOR_DEMO_PLAYER_PUBLIC_URL},${INVESTOR_DEMO_TALON_PUBLIC_URL}}"
  export INVESTOR_DEMO_RUNTIME_DIR="${INVESTOR_DEMO_RUNTIME_DIR:-$root/.runtime/investor-demo}"
  export INVESTOR_DEMO_LOG_DIR="${INVESTOR_DEMO_LOG_DIR:-$INVESTOR_DEMO_RUNTIME_DIR/logs}"
  export INVESTOR_DEMO_PID_DIR="${INVESTOR_DEMO_PID_DIR:-$INVESTOR_DEMO_RUNTIME_DIR/pids}"
  export PLAYER_BASE="${PLAYER_BASE:-$INVESTOR_DEMO_PLAYER_PUBLIC_URL}"
  export TALON_BASE="${TALON_BASE:-$INVESTOR_DEMO_TALON_PUBLIC_URL}"
  export API_BASE="${API_BASE:-$INVESTOR_DEMO_GATEWAY_PUBLIC_URL}"
  export REALTIME_BASE="${REALTIME_BASE:-http://localhost:8018}"

  mkdir -p "$INVESTOR_DEMO_LOG_DIR" "$INVESTOR_DEMO_PID_DIR"

  case "$INVESTOR_DEMO_FRONTEND_MODE" in
    auto)
      if [[ -f "${HOME}/.npmrc" ]]; then
        export INVESTOR_DEMO_FRONTEND_MODE_RESOLVED="docker"
      else
        export INVESTOR_DEMO_FRONTEND_MODE_RESOLVED="host"
      fi
      ;;
    docker|host)
      export INVESTOR_DEMO_FRONTEND_MODE_RESOLVED="$INVESTOR_DEMO_FRONTEND_MODE"
      ;;
    *)
      echo "ERROR: unsupported INVESTOR_DEMO_FRONTEND_MODE=$INVESTOR_DEMO_FRONTEND_MODE" >&2
      return 1
      ;;
  esac
}

investor_demo_require_runtime_node() {
  if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
    # shellcheck disable=SC1090
    source "${HOME}/.nvm/nvm.sh"
    export TMPDIR="${TMPDIR:-/tmp}"
    if ! nvm use "$INVESTOR_DEMO_FRONTEND_RUNTIME_NODE_VERSION" >/dev/null 2>&1; then
      echo "==> Installing Node ${INVESTOR_DEMO_FRONTEND_RUNTIME_NODE_VERSION} for host-run investor-demo frontends..."
      if ! nvm install "$INVESTOR_DEMO_FRONTEND_RUNTIME_NODE_VERSION" >/dev/null; then
        echo "ERROR: failed to install Node ${INVESTOR_DEMO_FRONTEND_RUNTIME_NODE_VERSION} via nvm" >&2
        return 1
      fi
      nvm use "$INVESTOR_DEMO_FRONTEND_RUNTIME_NODE_VERSION" >/dev/null
    fi
    return 0
  fi

  echo "ERROR: nvm is required for host-run investor-demo frontends" >&2
  return 1
}

investor_demo_wait_http() {
  local label="$1"
  local url="$2"
  local max_wait="${3:-120}"
  local elapsed=0
  local code

  while [[ $elapsed -lt $max_wait ]]; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url" 2>/dev/null || echo "000")"
    case "$code" in
      200|302|307|308)
        echo "  $label is responding on $url ($code)"
        return 0
        ;;
    esac
    sleep 2
    elapsed=$((elapsed + 2))
  done

  echo "  ERROR: $label did not respond on $url within ${max_wait}s" >&2
  return 1
}

investor_demo_port_pid() {
  local port="$1"
  lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -1 || true
}
