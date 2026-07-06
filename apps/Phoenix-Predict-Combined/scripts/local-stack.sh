#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"

BACKEND_DIR="$ROOT_DIR/phoenix-backend"
TAPTRADE_OFFICE_DIR="$ROOT_DIR/talon-backoffice"
PLAYER_APP_DIR="$TAPTRADE_OFFICE_DIR/packages/app"
GO_GATEWAY_DIR="$ROOT_DIR/go-platform/services/gateway"
GO_GATEWAY_READ_MODEL_FILE="$ROOT_DIR/go-platform/services/gateway/internal/http/testdata/seeds/read-model.seed.json"

BACKEND_PID_FILE="$RUNTIME_DIR/backend.pid"
TAPTRADE_OFFICE_PID_FILE="$RUNTIME_DIR/office-office.pid"
PLAYER_PID_FILE="$RUNTIME_DIR/taptrade-player.pid"
LEGACY_SPORTSBOOK_PID_FILE="$RUNTIME_DIR/sportsbook.pid"
GO_GATEWAY_PID_FILE="$RUNTIME_DIR/go-gateway.pid"

BACKEND_LOG_FILE="$RUNTIME_DIR/backend.log"
TAPTRADE_OFFICE_LOG_FILE="$RUNTIME_DIR/office-office.log"
PLAYER_LOG_FILE="$RUNTIME_DIR/taptrade-player.log"
GO_GATEWAY_LOG_FILE="$RUNTIME_DIR/go-gateway.log"

TAPTRADE_OFFICE_PORT="${TAPTRADE_OFFICE_PORT:-3000}"
PLAYER_PORT="${PLAYER_PORT:-${SPORTSBOOK_PORT:-3002}}"
GO_GATEWAY_PORT="${GO_GATEWAY_PORT:-18080}"
BACKEND_HTTP_URL="${BACKEND_HTTP_URL:-http://127.0.0.1:13551/api/v1/status}"
TAPTRADE_OFFICE_HTTP_URL="${TAPTRADE_OFFICE_HTTP_URL:-http://127.0.0.1:${TAPTRADE_OFFICE_PORT}}"
PLAYER_HTTP_URL="${PLAYER_HTTP_URL:-http://127.0.0.1:${PLAYER_PORT}}"
GO_GATEWAY_HTTP_URL="${GO_GATEWAY_HTTP_URL:-http://127.0.0.1:${GO_GATEWAY_PORT}/api/v1/status}"
GATEWAY_AUTH_ENABLED="${GATEWAY_AUTH_ENABLED:-false}"
LOCAL_STACK_SERVICES="${LOCAL_STACK_SERVICES:-backend,go-gateway,office,player}"

function usage() {
  cat <<'EOF'
Usage: ./scripts/local-stack.sh <command>

Commands:
  bootstrap  Install/update frontend dependencies and local env files.
  start      Start backend + go-gateway + TapTrade office backoffice + TapTrade player as background services.
  stop       Stop all background services started by this script.
  restart    Stop and start all services.
  status     Print process and HTTP health status.
  logs       Tail logs for all services.

Environment:
  LOCAL_STACK_SERVICES  Comma-separated services for start. Default: backend,go-gateway,office,player.
EOF
}

function ensure_runtime_dir() {
  mkdir -p "$RUNTIME_DIR"
}

function load_nvm() {
  if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
    # shellcheck disable=SC1090
    source "$HOME/.nvm/nvm.sh"
  else
    echo "warning: nvm was not found at $HOME/.nvm/nvm.sh; using node from PATH"
    return 1
  fi
}

function use_repo_node() {
  local repo_dir="$1"
  if load_nvm; then
    (
      cd "$repo_dir"
      if ! nvm use >/dev/null 2>&1; then
        if ! nvm use 20 >/dev/null 2>&1 && ! nvm use 22 >/dev/null 2>&1; then
          nvm install >/dev/null
          nvm use >/dev/null
        fi
      fi
    )
  fi
}

function ensure_yarn() {
  if ! command -v yarn >/dev/null 2>&1 || [[ "$(yarn -v 2>/dev/null || true)" != "1.22.22" ]]; then
    echo "yarn missing or mismatched; installing yarn@1.22.22 globally"
    npm install -g yarn@1.22.22 >/dev/null
  fi
}

function ensure_local_env_files() {
  local talon_env="$TAPTRADE_OFFICE_DIR/packages/office/.env.local"
  local player_env="$PLAYER_APP_DIR/.env.local"
  local gateway_endpoint="http://localhost:${GO_GATEWAY_PORT}"

  cat >"$talon_env" <<'EOF'
API_GLOBAL_ENDPOINT=http://localhost:13551
WS_GLOBAL_ENDPOINT=ws://localhost:9551/web-socket
EOF

  touch "$player_env"
  set_env_value "$player_env" NEXT_PUBLIC_API_URL "$gateway_endpoint"
  set_env_value "$player_env" NEXT_PUBLIC_FEATURE_RG true
  set_env_value "$player_env" NEXT_PUBLIC_FEATURE_KYC true
  set_env_value "$player_env" NEXT_PUBLIC_FEATURE_LIMITS true
}

function set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  if grep -q "^${key}=" "$file"; then
    sed -i '' "s|^${key}=.*|${key}=${value}|g" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >>"$file"
  fi
}

function bootstrap() {
  echo "==> Bootstrapping TapTrade office backoffice dependencies"
  use_repo_node "$TAPTRADE_OFFICE_DIR"
  ensure_yarn
  (
    cd "$TAPTRADE_OFFICE_DIR"
    YARN_MUTEX=file:/tmp/yarn-mutex-office yarn install --frozen-lockfile
    NODE_OPTIONS=--max-old-space-size=4096 YARN_MUTEX=file:/tmp/yarn-mutex-office yarn workspace @taptrade-ui/utils dist
  )

  ensure_local_env_files
  echo "==> Bootstrap complete"
}

function pick_java_home() {
  if [[ -n "${JAVA_HOME:-}" ]]; then
    echo "$JAVA_HOME"
    return
  fi

  local preferred_version
  preferred_version="${JAVA_PROFILE_VERSION:-21}"

  local java_home
  if [[ "$preferred_version" == "17" ]]; then
    java_home="$(/usr/libexec/java_home -v 17 2>/dev/null || true)"
  elif [[ "$preferred_version" == "auto" ]]; then
    java_home="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"
    if [[ -z "$java_home" ]]; then
      java_home="$(/usr/libexec/java_home -v 17 2>/dev/null || true)"
    fi
  else
    java_home="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"
    if [[ -z "$java_home" ]]; then
      java_home="$(/usr/libexec/java_home -v 17 2>/dev/null || true)"
    fi
  fi

  if [[ -z "$java_home" ]]; then
    echo "error: no supported JDK found (expected Java 21 or Java 17)." >&2
    exit 1
  fi

  echo "$java_home"
}

function is_pid_alive() {
  local pid_file="$1"
  if [[ ! -f "$pid_file" ]]; then
    return 1
  fi

  local pid
  pid="$(cat "$pid_file")"
  if [[ -z "$pid" ]]; then
    return 1
  fi

  kill -0 "$pid" 2>/dev/null
}

function start_bg() {
  local service_name="$1"
  local pid_file="$2"
  local log_file="$3"
  local command="$4"

  if is_pid_alive "$pid_file"; then
    echo "$service_name is already running (pid $(cat "$pid_file"))."
    return
  fi

  nohup /bin/bash -lc "$command" >"$log_file" 2>&1 &
  local pid="$!"
  echo "$pid" >"$pid_file"
  echo "Started $service_name (pid $pid). Log: $log_file"
}

function service_enabled() {
  local service_name="$1"
  case ",$LOCAL_STACK_SERVICES," in
    *",$service_name,"*) return 0 ;;
    *) return 1 ;;
  esac
}

function start() {
  ensure_runtime_dir
  ensure_local_env_files
  load_nvm || true
  ensure_yarn

  if service_enabled "backend" && ! command -v sbt >/dev/null 2>&1; then
    echo "error: sbt is not installed or not on PATH."
    exit 1
  fi
  if service_enabled "go-gateway" && ! command -v go >/dev/null 2>&1; then
    echo "error: go is not installed or not on PATH."
    exit 1
  fi

  local java_home
  if service_enabled "backend"; then
    java_home="$(pick_java_home)"
    start_bg \
      "phoenix-backend" \
      "$BACKEND_PID_FILE" \
      "$BACKEND_LOG_FILE" \
      "cd '$BACKEND_DIR' && export JAVA_HOME='$java_home' && export PHOENIX_ODDIN_DATA_INGESTION_ENABLED='no' && sbt \"phoenix-backend/runMain phoenix.main.LocalClusterApplication\""
  fi

  if service_enabled "go-gateway"; then
    start_bg \
      "go-gateway" \
      "$GO_GATEWAY_PID_FILE" \
      "$GO_GATEWAY_LOG_FILE" \
      "cd '$GO_GATEWAY_DIR' && PORT='$GO_GATEWAY_PORT' GATEWAY_AUTH_ENABLED='$GATEWAY_AUTH_ENABLED' GATEWAY_READ_MODEL_FILE='$GO_GATEWAY_READ_MODEL_FILE' go run ./cmd/gateway"
  fi

  if service_enabled "office"; then
    start_bg \
      "talon-backoffice" \
      "$TAPTRADE_OFFICE_PID_FILE" \
      "$TAPTRADE_OFFICE_LOG_FILE" \
      "if [ -s '$HOME/.nvm/nvm.sh' ]; then source '$HOME/.nvm/nvm.sh' && nvm use >/dev/null; fi && cd '$TAPTRADE_OFFICE_DIR' && cd packages/office && yarn bootstrap:locales && PORT='$TAPTRADE_OFFICE_PORT' yarn next dev --webpack"
  fi

  if service_enabled "player"; then
    start_bg \
      "taptrade-player" \
      "$PLAYER_PID_FILE" \
      "$PLAYER_LOG_FILE" \
      "if [ -s '$HOME/.nvm/nvm.sh' ]; then source '$HOME/.nvm/nvm.sh' && nvm use >/dev/null; fi && cd '$TAPTRADE_OFFICE_DIR' && export NEXT_PUBLIC_API_URL='http://localhost:${GO_GATEWAY_PORT}' && cd packages/app && yarn bootstrap:locales && PORT='$PLAYER_PORT' yarn next dev --webpack"
  fi

  echo "Use './scripts/local-stack.sh status' to check health."
}

function stop_one() {
  local service_name="$1"
  local pid_file="$2"
  if ! is_pid_alive "$pid_file"; then
    rm -f "$pid_file"
    echo "$service_name is not running."
    return
  fi

  local pid
  pid="$(cat "$pid_file")"
  kill "$pid" 2>/dev/null || true
  sleep 1
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$pid_file"
  echo "Stopped $service_name."
}

function stop_all() {
  stop_one "taptrade-player" "$PLAYER_PID_FILE"
  stop_one "legacy-sportsbook-frontend" "$LEGACY_SPORTSBOOK_PID_FILE"
  stop_one "talon-backoffice" "$TAPTRADE_OFFICE_PID_FILE"
  stop_one "go-gateway" "$GO_GATEWAY_PID_FILE"
  stop_one "phoenix-backend" "$BACKEND_PID_FILE"
}

function status_line() {
  local service_name="$1"
  local pid_file="$2"
  local url="$3"

  if is_pid_alive "$pid_file"; then
    local pid
    pid="$(cat "$pid_file")"
    if curl -sfI "$url" >/dev/null 2>&1; then
      echo "$service_name: running (pid $pid), HTTP reachable at $url"
    else
      echo "$service_name: running (pid $pid), HTTP not ready at $url"
    fi
  else
    echo "$service_name: stopped"
  fi
}

function status() {
  status_line "phoenix-backend" "$BACKEND_PID_FILE" "$BACKEND_HTTP_URL"
  status_line "go-gateway" "$GO_GATEWAY_PID_FILE" "$GO_GATEWAY_HTTP_URL"
  status_line "talon-backoffice" "$TAPTRADE_OFFICE_PID_FILE" "$TAPTRADE_OFFICE_HTTP_URL"
  status_line "taptrade-player" "$PLAYER_PID_FILE" "$PLAYER_HTTP_URL"
}

function logs() {
  ensure_runtime_dir
  touch "$BACKEND_LOG_FILE" "$GO_GATEWAY_LOG_FILE" "$TAPTRADE_OFFICE_LOG_FILE" "$PLAYER_LOG_FILE"
  tail -n 120 -f "$BACKEND_LOG_FILE" "$GO_GATEWAY_LOG_FILE" "$TAPTRADE_OFFICE_LOG_FILE" "$PLAYER_LOG_FILE"
}

command="${1:-}"

case "$command" in
  bootstrap)
    bootstrap
    ;;
  start)
    start
    ;;
  stop)
    stop_all
    ;;
  restart)
    stop_all
    start
    ;;
  status)
    status
    ;;
  logs)
    logs
    ;;
  *)
    usage
    exit 1
    ;;
esac
