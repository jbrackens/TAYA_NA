#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STACK_SCRIPT="$ROOT_DIR/scripts/local-stack.sh"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/30_LAUNCH_READINESS_GATE.md"
DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
RESULT_FILE="$ARTIFACT_DIR/runtime_gate_profile_${TS_TAG}.md"
PROFILE_FILE="${RUNTIME_GATE_PROFILE_FILE:-$ROOT_DIR/scripts/release/profiles/runtime-gate.env}"

if [[ -f "$PROFILE_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$PROFILE_FILE"
  set +a
fi

RUNTIME_GATE_AUTOSTART_STACK="${RUNTIME_GATE_AUTOSTART_STACK:-1}"
RUNTIME_GATE_AUTO_STOP_STACK="${RUNTIME_GATE_AUTO_STOP_STACK:-1}"
RUNTIME_GATE_BOOTSTRAP="${RUNTIME_GATE_BOOTSTRAP:-0}"
RUNTIME_GATE_WAIT_TIMEOUT_SECONDS="${RUNTIME_GATE_WAIT_TIMEOUT_SECONDS:-300}"
RUNTIME_GATE_PICK_FREE_PORTS="${RUNTIME_GATE_PICK_FREE_PORTS:-0}"

JAVA_PROFILE_VERSION="${JAVA_PROFILE_VERSION:-21}"
TALON_PORT="${TALON_PORT:-3000}"
SPORTSBOOK_PORT="${SPORTSBOOK_PORT:-3002}"
GO_GATEWAY_PORT="${GO_GATEWAY_PORT:-18080}"

MULTI_SPORT_ITERATIONS="${MULTI_SPORT_ITERATIONS:-5}"
MULTI_SPORT_SPORTS_CSV="${MULTI_SPORT_SPORTS_CSV:-mlb,nfl,nba,ufc,ncaa_baseball}"
MULTI_SPORT_CHECK_ESPORTS_COMPAT="${MULTI_SPORT_CHECK_ESPORTS_COMPAT:-1}"

is_truthy() {
  local value="${1:-0}"
  case "$value" in
    1|true|TRUE|yes|YES|on|ON) return 0 ;;
    *) return 1 ;;
  esac
}

pick_free_port() {
  local port="$1"
  while lsof -ti "tcp:$port" >/dev/null 2>&1; do
    port=$((port + 1))
  done
  echo "$port"
}

if is_truthy "$RUNTIME_GATE_PICK_FREE_PORTS"; then
  TALON_PORT="$(pick_free_port "$TALON_PORT")"
  SPORTSBOOK_PORT="$(pick_free_port "$SPORTSBOOK_PORT")"
  GO_GATEWAY_PORT="$(pick_free_port "$GO_GATEWAY_PORT")"
fi

BACKEND_STATUS_URL="${BACKEND_STATUS_URL:-http://127.0.0.1:13551/api/v1/status}"
TALON_STATUS_URL="${TALON_STATUS_URL:-http://127.0.0.1:${TALON_PORT}}"
SPORTSBOOK_STATUS_URL="${SPORTSBOOK_STATUS_URL:-http://127.0.0.1:${SPORTSBOOK_PORT}}"
GO_GATEWAY_STATUS_URL="${GO_GATEWAY_STATUS_URL:-http://127.0.0.1:${GO_GATEWAY_PORT}/api/v1/status}"

MULTI_SPORT_FRONTEND_BASE_URL="${MULTI_SPORT_FRONTEND_BASE_URL:-http://127.0.0.1:${SPORTSBOOK_PORT}}"
MULTI_SPORT_GATEWAY_BASE_URL="${MULTI_SPORT_GATEWAY_BASE_URL:-http://127.0.0.1:${GO_GATEWAY_PORT}}"

mkdir -p "$ARTIFACT_DIR"

sanitize_name() {
  echo "$1" | tr ' ' '_' | tr -cd '[:alnum:]_'
}

run_step() {
  local name="$1"
  shift
  local cmd=("$@")
  local log_file="$ARTIFACT_DIR/runtime_profile_${TS_TAG}_$(sanitize_name "$name").log"

  if "${cmd[@]}" >"$log_file" 2>&1; then
    echo "| $name | pass | \`$log_file\` |" >>"$RESULT_FILE"
    return 0
  fi

  echo "| $name | fail | \`$log_file\` |" >>"$RESULT_FILE"
  return 1
}

wait_for_http_200() {
  local url="$1"
  local name="$2"
  local attempts="$RUNTIME_GATE_WAIT_TIMEOUT_SECONDS"

  for _ in $(seq 1 "$attempts"); do
    local code
    code="$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)"
    if [[ "$code" == "200" ]]; then
      return 0
    fi
    sleep 1
  done

  echo "timeout waiting for $name at $url after ${attempts}s" >&2
  return 1
}

STACK_STARTED_BY_PROFILE=0
cleanup() {
  if ! is_truthy "$RUNTIME_GATE_AUTO_STOP_STACK"; then
    return
  fi
  if [[ "$STACK_STARTED_BY_PROFILE" != "1" ]]; then
    return
  fi

  local log_file="$ARTIFACT_DIR/runtime_profile_${TS_TAG}_stack_stop.log"
  if env \
      JAVA_PROFILE_VERSION="$JAVA_PROFILE_VERSION" \
      TALON_PORT="$TALON_PORT" \
      SPORTSBOOK_PORT="$SPORTSBOOK_PORT" \
      GO_GATEWAY_PORT="$GO_GATEWAY_PORT" \
      bash "$STACK_SCRIPT" stop >"$log_file" 2>&1; then
    echo "| stack stop | pass | \`$log_file\` |" >>"$RESULT_FILE"
  else
    echo "| stack stop | fail | \`$log_file\` |" >>"$RESULT_FILE"
  fi
}
trap cleanup EXIT

{
  echo "# Runtime Gate Profile Checklist ($DATE_TAG)"
  echo
  echo "- Profile file: \`$PROFILE_FILE\`"
  echo "- Ports: talon=\`$TALON_PORT\`, sportsbook=\`$SPORTSBOOK_PORT\`, go-gateway=\`$GO_GATEWAY_PORT\`"
  echo "- Runtime gate frontend base: \`$MULTI_SPORT_FRONTEND_BASE_URL\`"
  echo "- Runtime gate gateway base: \`$MULTI_SPORT_GATEWAY_BASE_URL\`"
  echo "- Runtime gate sports: \`$MULTI_SPORT_SPORTS_CSV\`"
  echo "- Runtime gate iterations: \`$MULTI_SPORT_ITERATIONS\`"
  echo "- Runtime gate esports compatibility: \`$MULTI_SPORT_CHECK_ESPORTS_COMPAT\`"
  echo
  echo "| Step | Result | Log |"
  echo "|---|---|---|"
} >"$RESULT_FILE"

overall=0

if is_truthy "$RUNTIME_GATE_BOOTSTRAP"; then
  run_step \
    "stack bootstrap" \
    env \
    JAVA_PROFILE_VERSION="$JAVA_PROFILE_VERSION" \
    TALON_PORT="$TALON_PORT" \
    SPORTSBOOK_PORT="$SPORTSBOOK_PORT" \
    GO_GATEWAY_PORT="$GO_GATEWAY_PORT" \
    bash "$STACK_SCRIPT" bootstrap || overall=1
fi

if is_truthy "$RUNTIME_GATE_AUTOSTART_STACK"; then
  run_step \
    "stack start" \
    env \
    JAVA_PROFILE_VERSION="$JAVA_PROFILE_VERSION" \
    TALON_PORT="$TALON_PORT" \
    SPORTSBOOK_PORT="$SPORTSBOOK_PORT" \
    GO_GATEWAY_PORT="$GO_GATEWAY_PORT" \
    bash "$STACK_SCRIPT" start || overall=1
  if [[ "$overall" -eq 0 ]]; then
    STACK_STARTED_BY_PROFILE=1
  fi
fi

run_step "wait backend status" wait_for_http_200 "$BACKEND_STATUS_URL" "backend status" || overall=1
run_step "wait go-gateway status" wait_for_http_200 "$GO_GATEWAY_STATUS_URL" "go-gateway status" || overall=1
run_step "wait sportsbook status" wait_for_http_200 "$SPORTSBOOK_STATUS_URL" "sportsbook status" || overall=1
run_step "wait talon status" wait_for_http_200 "$TALON_STATUS_URL" "talon status" || overall=1

if [[ "$overall" -eq 0 ]]; then
  run_step \
    "launch readiness runtime gate" \
    env \
    RUN_MULTI_SPORT_RUNTIME_GATE=1 \
    MULTI_SPORT_FRONTEND_BASE_URL="$MULTI_SPORT_FRONTEND_BASE_URL" \
    MULTI_SPORT_GATEWAY_BASE_URL="$MULTI_SPORT_GATEWAY_BASE_URL" \
    MULTI_SPORT_ITERATIONS="$MULTI_SPORT_ITERATIONS" \
    MULTI_SPORT_SPORTS_CSV="$MULTI_SPORT_SPORTS_CSV" \
    MULTI_SPORT_CHECK_ESPORTS_COMPAT="$MULTI_SPORT_CHECK_ESPORTS_COMPAT" \
    make -C "$ROOT_DIR" release-launch-readiness || overall=1
fi

result="pass"
go_no_go="GO"
if [[ "$overall" -ne 0 ]]; then
  result="fail"
  go_no_go="NO-GO"
fi

{
  echo "# Launch Readiness Gate ($DATE_TAG)"
  echo
  echo "Command: \`make release-launch-readiness-runtime-profile\`"
  echo
  echo "- Result: **$result**"
  echo "- Decision: **$go_no_go**"
  echo "- Runtime profile artifact: \`$RESULT_FILE\`"
  echo "- Runtime profile file: \`$PROFILE_FILE\`"
  echo "- Multi-sport runtime gate enabled: \`1\`"
  echo
  echo "## Decision Notes"
  echo
  echo "1. This command is the dedicated runtime profile for release sign-off rehearsal."
  echo "2. Any failed step in this profile run is a NO-GO."
  echo "3. Preserve the runtime profile checklist and launch-readiness artifacts together."
  echo "4. Set \`RUNTIME_GATE_PICK_FREE_PORTS=1\` to auto-shift front-end/gateway ports when local defaults are busy."
} >"$REPORT_FILE"

echo "Runtime gate profile checklist: $RESULT_FILE"
if [[ "$overall" -ne 0 ]]; then
  exit 1
fi
