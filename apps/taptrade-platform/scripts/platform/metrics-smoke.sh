#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GO_DIR="$ROOT_DIR/go-platform"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
REPORT_FILE="$ROOT_DIR/revival/24_OBSERVABILITY_BASELINE.md"
LOG_FILE="$ARTIFACT_DIR/platform_metrics_smoke_${TS_TAG}.md"
AUTH_LOG="$ARTIFACT_DIR/platform_metrics_auth_${TS_TAG}.log"
GATEWAY_LOG="$ARTIFACT_DIR/platform_metrics_gateway_${TS_TAG}.log"

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

smoke_metric() {
  local service="$1"
  local url="$2"
  local tmp
  tmp="$(mktemp)"
  local code
  code="$(curl -s -o "$tmp" -w "%{http_code}" "$url" || true)"
  local body
  body="$(cat "$tmp")"
  rm -f "$tmp"

  if [[ "$code" != "200" ]]; then
    echo "| $service | $url | fail | HTTP $code |" >>"$LOG_FILE"
    return 1
  fi

  if [[ "$body" != *"phoenix_http_requests_total"* ]]; then
    echo "| $service | $url | fail | missing phoenix_http_requests_total |" >>"$LOG_FILE"
    return 1
  fi

  if [[ "$body" != *"phoenix_http_request_duration_ms_sum"* ]]; then
    echo "| $service | $url | fail | missing phoenix_http_request_duration_ms_sum |" >>"$LOG_FILE"
    return 1
  fi

  echo "| $service | $url | pass | metrics lines present |" >>"$LOG_FILE"
  return 0
}

{
  echo "# Metrics Smoke Check ($DATE_TAG)"
  echo
  echo "| Service | URL | Result | Detail |"
  echo "|---|---|---|---|"
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

smoke_metric "gateway" "$GATEWAY_BASE/metrics" || overall=1
smoke_metric "auth" "$AUTH_BASE/metrics" || overall=1

result="pass"
if [[ $overall -ne 0 ]]; then
  result="fail"
fi

{
  echo "# Observability Baseline ($DATE_TAG)"
  echo
  echo "Command: \`make platform-metrics\`"
  echo
  echo "- Result: **$result**"
  echo "- Gateway metrics endpoint: \`$GATEWAY_BASE/metrics\`"
  echo "- Auth metrics endpoint: \`$AUTH_BASE/metrics\`"
  echo "- Artifact: \`$LOG_FILE\`"
  if [[ "$START_SERVICES" == "true" ]]; then
    echo "- Auth log: \`$AUTH_LOG\`"
    echo "- Gateway log: \`$GATEWAY_LOG\`"
  fi
} >"$REPORT_FILE"

echo "Metrics smoke report: $LOG_FILE"
if [[ $overall -ne 0 ]]; then
  exit 1
fi
