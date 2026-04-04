#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GO_DIR="$ROOT_DIR/go-platform"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/31_POST_LAUNCH_STABILIZATION_BASELINE.md"
DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
RESULT_FILE="$ARTIFACT_DIR/stabilization_burnin_${TS_TAG}.md"
AUTH_LOG="$ARTIFACT_DIR/stability_auth_${TS_TAG}.log"
GATEWAY_LOG="$ARTIFACT_DIR/stability_gateway_${TS_TAG}.log"

pick_free_port() {
  local port="$1"
  while lsof -ti "tcp:$port" >/dev/null 2>&1; do
    port=$((port + 1))
  done
  echo "$port"
}

AUTH_PORT="${AUTH_PORT:-$(pick_free_port 18181)}"
GATEWAY_PORT="${GATEWAY_PORT:-$(pick_free_port 18180)}"
if [[ "$AUTH_PORT" == "$GATEWAY_PORT" ]]; then
  GATEWAY_PORT="$(pick_free_port $((AUTH_PORT + 1)))"
fi
AUTH_BASE="http://127.0.0.1:${AUTH_PORT}"
GATEWAY_BASE="http://127.0.0.1:${GATEWAY_PORT}"
CYCLES="${CYCLES:-12}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-5}"

mkdir -p "$ARTIFACT_DIR"

cleanup() {
  if [[ -n "${GATEWAY_PID:-}" ]]; then
    kill "$GATEWAY_PID" >/dev/null 2>&1 || true
    wait "$GATEWAY_PID" 2>/dev/null || true
  fi
  if [[ -n "${AUTH_PID:-}" ]]; then
    kill "$AUTH_PID" >/dev/null 2>&1 || true
    wait "$AUTH_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

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

probe() {
  local url="$1"
  curl -s -o /tmp/stability_probe.tmp -w "%{http_code} %{time_total}" "$url" || true
}

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

{
  echo "# Stabilization Burn-in ($DATE_TAG)"
  echo
  echo "Cycles: \`$CYCLES\`"
  echo "Interval: \`$INTERVAL_SECONDS\` seconds"
  echo
  echo "| Cycle | Auth /status | Gateway /status | Gateway /fixtures | Result |"
  echo "|---|---|---|---|---|"
} >"$RESULT_FILE"

auth_time_file="$(mktemp)"
gateway_time_file="$(mktemp)"
fixtures_time_file="$(mktemp)"
failures=0

for cycle in $(seq 1 "$CYCLES"); do
  auth_probe="$(probe "$AUTH_BASE/api/v1/status")"
  auth_code="$(echo "$auth_probe" | awk '{print $1}')"
  auth_time="$(echo "$auth_probe" | awk '{print $2}')"

  gateway_probe="$(probe "$GATEWAY_BASE/api/v1/status")"
  gateway_code="$(echo "$gateway_probe" | awk '{print $1}')"
  gateway_time="$(echo "$gateway_probe" | awk '{print $2}')"

  fixtures_probe="$(probe "$GATEWAY_BASE/api/v1/fixtures")"
  fixtures_code="$(echo "$fixtures_probe" | awk '{print $1}')"
  fixtures_time="$(echo "$fixtures_probe" | awk '{print $2}')"

  echo "$auth_time" >>"$auth_time_file"
  echo "$gateway_time" >>"$gateway_time_file"
  echo "$fixtures_time" >>"$fixtures_time_file"

  cycle_result="pass"
  if [[ "$auth_code" != "200" || "$gateway_code" != "200" || "$fixtures_code" != "200" ]]; then
    cycle_result="fail"
    failures=$((failures + 1))
  fi

  echo "| $cycle | $auth_code (${auth_time}s) | $gateway_code (${gateway_time}s) | $fixtures_code (${fixtures_time}s) | $cycle_result |" >>"$RESULT_FILE"
  sleep "$INTERVAL_SECONDS"
done

avg() {
  local file="$1"
  awk '{sum += $1; n += 1} END {if (n == 0) print "0"; else printf "%.4f", sum/n}' "$file"
}

auth_avg="$(avg "$auth_time_file")"
gateway_avg="$(avg "$gateway_time_file")"
fixtures_avg="$(avg "$fixtures_time_file")"

rm -f "$auth_time_file" "$gateway_time_file" "$fixtures_time_file" /tmp/stability_probe.tmp

metrics_snapshot="$ARTIFACT_DIR/stability_metrics_${TS_TAG}.txt"
{
  echo "# Auth metrics"
  curl -s "$AUTH_BASE/metrics" | rg "phoenix_http_requests_total|phoenix_http_request_duration_ms_sum" || true
  echo
  echo "# Gateway metrics"
  curl -s "$GATEWAY_BASE/metrics" | rg "phoenix_http_requests_total|phoenix_http_request_duration_ms_sum" || true
} >"$metrics_snapshot"

result="pass"
if [[ "$failures" -gt 0 ]]; then
  result="fail"
fi

{
  echo "# Post-Launch Stabilization Baseline ($DATE_TAG)"
  echo
  echo "Command: \`make release-stability-burnin\`"
  echo
  echo "- Result: **$result**"
  echo "- Cycles: \`$CYCLES\`"
  echo "- Interval seconds: \`$INTERVAL_SECONDS\`"
  echo "- Failed cycles: \`$failures\`"
  echo "- Avg auth /status latency: \`${auth_avg}s\`"
  echo "- Avg gateway /status latency: \`${gateway_avg}s\`"
  echo "- Avg gateway /fixtures latency: \`${fixtures_avg}s\`"
  echo "- Burn-in artifact: \`$RESULT_FILE\`"
  echo "- Metrics snapshot: \`$metrics_snapshot\`"
  echo "- Auth log: \`$AUTH_LOG\`"
  echo "- Gateway log: \`$GATEWAY_LOG\`"
  echo
  echo "## Exit Criteria"
  echo
  echo "1. No failed cycles during burn-in window."
  echo "2. Metrics endpoints reachable and counters increasing."
  echo "3. No service crash/restart during run."
} >"$REPORT_FILE"

echo "Stabilization burn-in artifact: $RESULT_FILE"
if [[ "$failures" -gt 0 ]]; then
  exit 1
fi
