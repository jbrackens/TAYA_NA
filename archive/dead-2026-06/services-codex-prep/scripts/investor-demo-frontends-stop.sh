#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${INVESTOR_DEMO_ENV_FILE:-$ROOT/.env.demo}"
# shellcheck disable=SC1091
source "$ROOT/scripts/investor-demo-common.sh"
investor_demo_load_env "$ROOT" "$ENV_FILE"

stop_frontend() {
  local label="$1"
  local pid_file="$2"
  local pid=""

  if [[ ! -f "$pid_file" ]]; then
    echo "==> $label not running (no pid file)."
    return 0
  fi

  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if [[ -z "$pid" ]]; then
    rm -f "$pid_file"
    echo "==> $label pid file was empty; cleaned up."
    return 0
  fi

  if ! kill -0 "$pid" 2>/dev/null; then
    rm -f "$pid_file"
    echo "==> $label not running (stale pid $pid); cleaned up."
    return 0
  fi

  echo "==> Stopping $label (PID $pid)..."
  kill "$pid" 2>/dev/null || true
  for _ in $(seq 1 15); do
    if ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$pid_file"
      echo "==> $label stopped."
      return 0
    fi
    sleep 1
  done

  echo "==> $label did not stop cleanly; sending SIGKILL."
  kill -9 "$pid" 2>/dev/null || true
  rm -f "$pid_file"
}

stop_frontend "player-web" "$INVESTOR_DEMO_PID_DIR/player-web.pid"
stop_frontend "talon-web" "$INVESTOR_DEMO_PID_DIR/talon-web.pid"
