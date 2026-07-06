#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GO_DIR="$ROOT_DIR/go-platform"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/27_GO_LOAD_PERF_BASELINE.md"
DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
RESULT_FILE="$ARTIFACT_DIR/go_load_baseline_${TS_TAG}.md"
AUTH_LOG="$ARTIFACT_DIR/go_load_auth_${TS_TAG}.log"
GATEWAY_LOG="$ARTIFACT_DIR/go_load_gateway_${TS_TAG}.log"

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
SAMPLES="${SAMPLES:-200}"
CONCURRENCY="${CONCURRENCY:-20}"
START_SERVICES="${START_SERVICES:-true}"

mkdir -p "$ARTIFACT_DIR"

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required" >&2
  exit 1
fi

gateway_status_raw=""
gateway_fixtures_raw=""
auth_status_raw=""

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
    wait "$GATEWAY_PID" 2>/dev/null || true
  fi
  if [[ -n "${AUTH_PID:-}" ]]; then
    kill "$AUTH_PID" >/dev/null 2>&1 || true
    wait "$AUTH_PID" 2>/dev/null || true
  fi
  if [[ -n "$gateway_status_raw" ]]; then
    rm -f "$gateway_status_raw"
  fi
  if [[ -n "$gateway_fixtures_raw" ]]; then
    rm -f "$gateway_fixtures_raw"
  fi
  if [[ -n "$auth_status_raw" ]]; then
    rm -f "$auth_status_raw"
  fi
}
trap cleanup EXIT

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

run_load_probe() {
  local name="$1"
  local url="$2"
  local out_file="$3"

  seq "$SAMPLES" | xargs -n1 -P"$CONCURRENCY" -I{} \
    curl -s -o /dev/null -w "%{http_code} %{time_total}\n" "$url" >"$out_file"
}

percentile() {
  local p="$1"
  local file="$2"
  local n
  n="$(wc -l <"$file" | tr -d ' ')"
  if [[ "$n" -eq 0 ]]; then
    echo "0"
    return 0
  fi
  local idx
  idx="$(awk -v p="$p" -v n="$n" 'BEGIN { i=int((p/100)*n); if (i < 1) i=1; if (i > n) i=n; print i }')"
  sed -n "${idx}p" "$file"
}

summarize_probe() {
  local name="$1"
  local raw_file="$2"

  awk '{print $1}' "$raw_file" >"${raw_file}.codes"
  awk '{print $2}' "$raw_file" | sort -n >"${raw_file}.times"

  total="$(wc -l <"${raw_file}.codes" | tr -d ' ')"
  ok="$(grep -c '^200$' "${raw_file}.codes" || true)"
  fail=$((total - ok))
  p50="$(percentile 50 "${raw_file}.times")"
  p95="$(percentile 95 "${raw_file}.times")"
  p99="$(percentile 99 "${raw_file}.times")"

  echo "| $name | $total | $ok | $fail | $p50 | $p95 | $p99 |" >>"$RESULT_FILE"

  rm -f "${raw_file}.codes" "${raw_file}.times"
}

gateway_status_raw="$(mktemp)"
gateway_fixtures_raw="$(mktemp)"
auth_status_raw="$(mktemp)"

run_load_probe "gateway_status" "$GATEWAY_BASE/api/v1/status" "$gateway_status_raw"
run_load_probe "gateway_fixtures" "$GATEWAY_BASE/api/v1/fixtures" "$gateway_fixtures_raw"
run_load_probe "auth_status" "$AUTH_BASE/api/v1/status" "$auth_status_raw"

{
  echo "# Go Load/Perf Baseline ($DATE_TAG)"
  echo
  echo "Samples per probe: \`$SAMPLES\`"
  echo
  echo "Concurrency: \`$CONCURRENCY\`"
  echo
  echo "| Probe | Total | HTTP 200 | Non-200 | P50 (s) | P95 (s) | P99 (s) |"
  echo "|---|---|---|---|---|---|---|"
} >"$RESULT_FILE"

summarize_probe "gateway /api/v1/status" "$gateway_status_raw"
summarize_probe "gateway /api/v1/fixtures" "$gateway_fixtures_raw"
summarize_probe "auth /api/v1/status" "$auth_status_raw"

{
  echo "# Go Load and Performance Baseline ($DATE_TAG)"
  echo
  echo "Command: \`make qa-load-baseline\`"
  echo
  echo "- Result: **completed**"
  echo "- Samples per probe: \`$SAMPLES\`"
  echo "- Concurrency: \`$CONCURRENCY\`"
  echo "- Artifact: \`$RESULT_FILE\`"
  if [[ "$START_SERVICES" == "true" ]]; then
    echo "- Auth log: \`$AUTH_LOG\`"
    echo "- Gateway log: \`$GATEWAY_LOG\`"
  fi
} >"$REPORT_FILE"

echo "Load baseline report: $RESULT_FILE"
