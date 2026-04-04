#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"

BACKEND_DIR="$ROOT_DIR/phoenix-backend"
TALON_DIR="$ROOT_DIR/talon-backoffice"
SPORTSBOOK_DIR="$ROOT_DIR/phoenix-frontend-brand-viegg"
GO_GATEWAY_DIR="$ROOT_DIR/go-platform/services/gateway"
GO_GATEWAY_READ_MODEL_FILE="$ROOT_DIR/go-platform/services/gateway/internal/http/testdata/seeds/read-model.seed.json"

BACKEND_PID_FILE="$RUNTIME_DIR/backend.pid"
TALON_PID_FILE="$RUNTIME_DIR/talon-office.pid"
SPORTSBOOK_PID_FILE="$RUNTIME_DIR/sportsbook.pid"
GO_GATEWAY_PID_FILE="$RUNTIME_DIR/go-gateway.pid"

BACKEND_LOG_FILE="$RUNTIME_DIR/backend.log"
TALON_LOG_FILE="$RUNTIME_DIR/talon-office.log"
SPORTSBOOK_LOG_FILE="$RUNTIME_DIR/sportsbook.log"
GO_GATEWAY_LOG_FILE="$RUNTIME_DIR/go-gateway.log"

BACKEND_HTTP_URL="${BACKEND_HTTP_URL:-http://127.0.0.1:13551/api/v1/status}"
TALON_HTTP_URL="${TALON_HTTP_URL:-http://127.0.0.1:3000}"
SPORTSBOOK_HTTP_URL="${SPORTSBOOK_HTTP_URL:-http://127.0.0.1:3002}"
GO_GATEWAY_HTTP_URL="${GO_GATEWAY_HTTP_URL:-http://127.0.0.1:18080/api/v1/status}"
TALON_PORT="${TALON_PORT:-3000}"
SPORTSBOOK_PORT="${SPORTSBOOK_PORT:-3002}"
GO_GATEWAY_PORT="${GO_GATEWAY_PORT:-18080}"

function usage() {
  cat <<'EOF'
Usage: ./scripts/local-stack.sh <command>

Commands:
  bootstrap  Install/update frontend dependencies and local env files.
  start      Start backend + go-gateway + Talon backoffice + Sportsbook as background services.
  stop       Stop all background services started by this script.
  restart    Stop and start all services.
  status     Print process and HTTP health status.
  logs       Tail logs for all services.
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
    echo "error: nvm was not found at $HOME/.nvm/nvm.sh"
    echo "Install nvm first, then re-run this command."
    exit 1
  fi
}

function use_repo_node() {
  local repo_dir="$1"
  load_nvm
  (
    cd "$repo_dir"
    if ! nvm use >/dev/null 2>&1; then
      if ! nvm use 20 >/dev/null 2>&1 && ! nvm use 22 >/dev/null 2>&1; then
        nvm install >/dev/null
        nvm use >/dev/null
      fi
    fi
  )
}

function ensure_yarn() {
  if ! command -v yarn >/dev/null 2>&1 || [[ "$(yarn -v 2>/dev/null || true)" != "1.22.22" ]]; then
    echo "yarn missing or mismatched; installing yarn@1.22.22 globally"
    npm install -g yarn@1.22.22 >/dev/null
  fi
}

function ensure_local_env_files() {
  local talon_env="$TALON_DIR/packages/office/.env.local"
  local sportsbook_env="$SPORTSBOOK_DIR/packages/app/.env.local"
  local canonical_endpoint="http://localhost:${GO_GATEWAY_PORT}"

  cat >"$talon_env" <<'EOF'
API_GLOBAL_ENDPOINT=http://localhost:13551
WS_GLOBAL_ENDPOINT=ws://localhost:9551/web-socket
EOF

  if [[ ! -f "$sportsbook_env" ]]; then
    cat >"$sportsbook_env" <<'EOF'
ENV_NAME=local
API_GLOBAL_ENDPOINT=http://localhost:13551
CANONICAL_GATEWAY_ENDPOINT=__CANONICAL_GATEWAY_ENDPOINT__
WS_GLOBAL_ENDPOINT=ws://localhost:9551/web-socket
CDN_URL=http://localhost:3002/static
GEOCOMPLY_ENV=staging
GEOCOMPLY_MOBILE_SERVICE_URL=
GEOCOMPLY_OOBEE_URL=
EOF
    sed -i '' "s|__CANONICAL_GATEWAY_ENDPOINT__|$canonical_endpoint|g" "$sportsbook_env"
  else
    if grep -q '^CANONICAL_GATEWAY_ENDPOINT=' "$sportsbook_env"; then
      sed -i '' "s|^CANONICAL_GATEWAY_ENDPOINT=.*|CANONICAL_GATEWAY_ENDPOINT=$canonical_endpoint|g" "$sportsbook_env"
    else
      printf '\nCANONICAL_GATEWAY_ENDPOINT=%s\n' "$canonical_endpoint" >>"$sportsbook_env"
    fi
  fi
}

function bootstrap() {
  echo "==> Bootstrapping Talon backoffice dependencies"
  use_repo_node "$TALON_DIR"
  ensure_yarn
  (
    cd "$TALON_DIR"
    YARN_MUTEX=file:/tmp/yarn-mutex-talon yarn install --frozen-lockfile
    NODE_OPTIONS=--max-old-space-size=4096 YARN_MUTEX=file:/tmp/yarn-mutex-talon yarn workspace @phoenix-ui/utils dist
  )

  echo "==> Bootstrapping Sportsbook dependencies"
  use_repo_node "$SPORTSBOOK_DIR"
  ensure_yarn
  (
    cd "$SPORTSBOOK_DIR"
    YARN_MUTEX=file:/tmp/yarn-mutex-sportsbook yarn install --frozen-lockfile
    if ! NODE_OPTIONS=--max-old-space-size=2048 YARN_MUTEX=file:/tmp/yarn-mutex-sportsbook yarn workspace @phoenix-ui/utils dist; then
      echo "warn: Node 20 utils dist failed; retrying sportsbook utils build under Node 16.16 compatibility bridge" >&2
      nvm use 16.16 >/dev/null 2>&1
      NODE_OPTIONS=--max-old-space-size=2048 YARN_MUTEX=file:/tmp/yarn-mutex-sportsbook yarn workspace @phoenix-ui/utils dist || exit 1
      nvm use 20 >/dev/null 2>&1
    fi
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

function start() {
  ensure_runtime_dir
  ensure_local_env_files
  load_nvm
  ensure_yarn

  if ! command -v sbt >/dev/null 2>&1; then
    echo "error: sbt is not installed or not on PATH."
    exit 1
  fi
  if ! command -v go >/dev/null 2>&1; then
    echo "error: go is not installed or not on PATH."
    exit 1
  fi

  local java_home
  java_home="$(pick_java_home)"

  start_bg \
    "phoenix-backend" \
    "$BACKEND_PID_FILE" \
    "$BACKEND_LOG_FILE" \
    "cd '$BACKEND_DIR' && export JAVA_HOME='$java_home' && export PHOENIX_ODDIN_DATA_INGESTION_ENABLED='no' && sbt \"phoenix-backend/runMain phoenix.main.LocalClusterApplication\""

  start_bg \
    "go-gateway" \
    "$GO_GATEWAY_PID_FILE" \
    "$GO_GATEWAY_LOG_FILE" \
    "cd '$GO_GATEWAY_DIR' && PORT='$GO_GATEWAY_PORT' GATEWAY_READ_MODEL_FILE='$GO_GATEWAY_READ_MODEL_FILE' go run ./cmd/gateway"

  start_bg \
    "talon-backoffice" \
    "$TALON_PID_FILE" \
    "$TALON_LOG_FILE" \
    "source '$HOME/.nvm/nvm.sh' && cd '$TALON_DIR' && nvm use >/dev/null && export NODE_OPTIONS=--openssl-legacy-provider && cd packages/office && PORT='$TALON_PORT' yarn run-local:dev"

  start_bg \
    "sportsbook-frontend" \
    "$SPORTSBOOK_PID_FILE" \
    "$SPORTSBOOK_LOG_FILE" \
    "source '$HOME/.nvm/nvm.sh' && cd '$SPORTSBOOK_DIR' && nvm use >/dev/null && export NODE_OPTIONS=--openssl-legacy-provider && cd packages/app && PORT='$SPORTSBOOK_PORT' yarn run-local:dev"

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
  stop_one "sportsbook-frontend" "$SPORTSBOOK_PID_FILE"
  stop_one "talon-backoffice" "$TALON_PID_FILE"
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
  status_line "talon-backoffice" "$TALON_PID_FILE" "$TALON_HTTP_URL"
  status_line "sportsbook-frontend" "$SPORTSBOOK_PID_FILE" "$SPORTSBOOK_HTTP_URL"
}

function logs() {
  ensure_runtime_dir
  touch "$BACKEND_LOG_FILE" "$GO_GATEWAY_LOG_FILE" "$TALON_LOG_FILE" "$SPORTSBOOK_LOG_FILE"
  tail -n 120 -f "$BACKEND_LOG_FILE" "$GO_GATEWAY_LOG_FILE" "$TALON_LOG_FILE" "$SPORTSBOOK_LOG_FILE"
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
