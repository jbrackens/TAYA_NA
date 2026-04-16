#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GO_DIR="$ROOT_DIR/go-platform"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
REPORT_FILE="$ROOT_DIR/revival/23_HEALTH_READINESS_LIVENESS_BASELINE.md"
LOG_FILE="$ARTIFACT_DIR/platform_health_check_${TS_TAG}.md"
AUTH_LOG="$ARTIFACT_DIR/platform_health_auth_${TS_TAG}.log"
GATEWAY_LOG="$ARTIFACT_DIR/platform_health_gateway_${TS_TAG}.log"

pick_free_port() {
  local port="$1"
  while lsof -ti "tcp:$port" >/dev/null 2>&1; do
    port=$((port + 1))
  done
  echo "$port"
}

AUTH_PORT="${AUTH_PORT:-$(pick_free_port 18081)}"
GATEWAY_PORT="${GATEWAY_PORT:-$(pick_free_port 18080)}"
if [[ "$AUTH_PORT" == "$GATEWAY_PORT" ]]; then
  GATEWAY_PORT="$(pick_free_port $((AUTH_PORT + 1)))"
fi
GATEWAY_BASE="${GATEWAY_BASE:-http://127.0.0.1:${GATEWAY_PORT}}"
AUTH_BASE="${AUTH_BASE:-http://127.0.0.1:${AUTH_PORT}}"
START_SERVICES="${START_SERVICES:-true}"

mkdir -p "$ARTIFACT_DIR"

wait_for_http_200() {
  local url="$1"
  local name="$2"
  local attempts=60

  for _ in $(seq 1 "$attempts"); do
    code="$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)"
    if [[ "$code" == "200" ]]; then
      return 0
    fi
    sleep 1
  done

  echo "error: timeout waiting for $name at $url" >&2
  return 1
}

cleanup() {
  if [[ -n "${GATEWAY_PID:-}" ]]; then
    kill "$GATEWAY_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${AUTH_PID:-}" ]]; then
    kill "$AUTH_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

check_endpoint() {
  local label="$1"
  local url="$2"
  local code
  code="$(curl -s -o /tmp/phoenix-health.tmp -w "%{http_code}" "$url" || true)"
  local body
  body="$(cat /tmp/phoenix-health.tmp 2>/dev/null || true)"
  rm -f /tmp/phoenix-health.tmp

  if [[ "$code" != "200" ]]; then
    echo "| $label | $url | fail | $code | \`${body:0:120}\` |" >>"$LOG_FILE"
    return 1
  fi

  echo "| $label | $url | pass | $code | \`${body:0:120}\` |" >>"$LOG_FILE"
  return 0
}

{
  echo "# Platform Health Check ($DATE_TAG)"
  echo
  echo "| Check | URL | Result | HTTP | Sample Body |"
  echo "|---|---|---|---|---|"
} >"$LOG_FILE"

overall=0

if [[ "$START_SERVICES" == "true" ]]; then
  (
    cd "$GO_DIR"
    exec env PORT="$AUTH_PORT" go run ./services/auth/cmd/auth >"$AUTH_LOG" 2>&1
  ) &
  AUTH_PID=$!

  (
    cd "$GO_DIR"
    exec env PORT="$GATEWAY_PORT" go run ./services/gateway/cmd/gateway >"$GATEWAY_LOG" 2>&1
  ) &
  GATEWAY_PID=$!

  wait_for_http_200 "$AUTH_BASE/healthz" "auth healthz"
  wait_for_http_200 "$GATEWAY_BASE/healthz" "gateway healthz"
fi

check_endpoint "gateway healthz" "$GATEWAY_BASE/healthz" || overall=1
check_endpoint "gateway readyz" "$GATEWAY_BASE/readyz" || overall=1
check_endpoint "gateway status" "$GATEWAY_BASE/api/v1/status" || overall=1

check_endpoint "auth healthz" "$AUTH_BASE/healthz" || overall=1
check_endpoint "auth readyz" "$AUTH_BASE/readyz" || overall=1
check_endpoint "auth status" "$AUTH_BASE/api/v1/status" || overall=1

result="pass"
if [[ $overall -ne 0 ]]; then
  result="fail"
fi

{
  echo "# Health, Readiness, Liveness Baseline ($DATE_TAG)"
  echo
  echo "Command: \`make platform-health\`"
  echo
  echo "- Result: **$result**"
  echo "- Gateway base: \`$GATEWAY_BASE\`"
  echo "- Auth base: \`$AUTH_BASE\`"
  echo "- Artifact: \`$LOG_FILE\`"
  if [[ "$START_SERVICES" == "true" ]]; then
    echo "- Auth log: \`$AUTH_LOG\`"
    echo "- Gateway log: \`$GATEWAY_LOG\`"
  fi
} >"$REPORT_FILE"

echo "Health check report: $LOG_FILE"
if [[ $overall -ne 0 ]]; then
  exit 1
fi
