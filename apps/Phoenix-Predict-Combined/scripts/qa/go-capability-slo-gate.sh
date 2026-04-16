#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GO_DIR="$ROOT_DIR/go-platform"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/171_SB504_CAPABILITY_SLO_GATE_REPORT.md"
DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
RESULT_FILE="$ARTIFACT_DIR/capability_slo_gate_${TS_TAG}.md"
AUTH_LOG="$ARTIFACT_DIR/capability_slo_auth_${TS_TAG}.log"
GATEWAY_LOG="$ARTIFACT_DIR/capability_slo_gateway_${TS_TAG}.log"

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

AUTH_BASE="${AUTH_BASE:-http://127.0.0.1:${AUTH_PORT}}"
GATEWAY_BASE="${GATEWAY_BASE:-http://127.0.0.1:${GATEWAY_PORT}}"
START_SERVICES="${START_SERVICES:-true}"
SAMPLES="${SAMPLES:-150}"
CONCURRENCY="${CONCURRENCY:-20}"

PLACEMENT_P95_MAX_SEC="${PLACEMENT_P95_MAX_SEC:-0.30}"
PLACEMENT_P99_MAX_SEC="${PLACEMENT_P99_MAX_SEC:-0.60}"
PLACEMENT_MIN_RPS="${PLACEMENT_MIN_RPS:-15}"
PLACEMENT_MIN_SUCCESS_RATE="${PLACEMENT_MIN_SUCCESS_RATE:-0.98}"

CASHOUT_P95_MAX_SEC="${CASHOUT_P95_MAX_SEC:-0.30}"
CASHOUT_P99_MAX_SEC="${CASHOUT_P99_MAX_SEC:-0.60}"
CASHOUT_MIN_RPS="${CASHOUT_MIN_RPS:-15}"
CASHOUT_MIN_SUCCESS_RATE="${CASHOUT_MIN_SUCCESS_RATE:-0.98}"

REALTIME_P95_MAX_SEC="${REALTIME_P95_MAX_SEC:-0.20}"
REALTIME_P99_MAX_SEC="${REALTIME_P99_MAX_SEC:-0.40}"
REALTIME_MIN_RPS="${REALTIME_MIN_RPS:-40}"
REALTIME_MIN_SUCCESS_RATE="${REALTIME_MIN_SUCCESS_RATE:-0.99}"

mkdir -p "$ARTIFACT_DIR"

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required" >&2
  exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required" >&2
  exit 1
fi

placement_raw=""
cashout_raw=""
realtime_raw=""

cleanup() {
  if [[ -n "${GATEWAY_PID:-}" ]]; then
    kill "$GATEWAY_PID" >/dev/null 2>&1 || true
    wait "$GATEWAY_PID" 2>/dev/null || true
  fi
  if [[ -n "${AUTH_PID:-}" ]]; then
    kill "$AUTH_PID" >/dev/null 2>&1 || true
    wait "$AUTH_PID" 2>/dev/null || true
  fi
  if [[ -n "$placement_raw" ]]; then
    rm -f "$placement_raw"
  fi
  if [[ -n "$cashout_raw" ]]; then
    rm -f "$cashout_raw"
  fi
  if [[ -n "$realtime_raw" ]]; then
    rm -f "$realtime_raw"
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

seed_key="slo-seed-${TS_TAG}"
seed_credit_payload="$(jq -n \
  --arg user "u-slo-gate-1" \
  --arg key "${seed_key}-credit" \
  '{userId:$user,amountCents:250000,idempotencyKey:$key}')"
seed_credit_code="$(curl -s -o /tmp/slo-seed-credit.json -w "%{http_code}" -X POST "$GATEWAY_BASE/api/v1/wallet/credit" -H 'Content-Type: application/json' -d "$seed_credit_payload")"
if [[ "$seed_credit_code" != "200" ]]; then
  echo "error: failed to seed wallet for SLO gate (status=$seed_credit_code)" >&2
  cat /tmp/slo-seed-credit.json >&2 || true
  rm -f /tmp/slo-seed-credit.json
  exit 1
fi
rm -f /tmp/slo-seed-credit.json

seed_place_payload="$(jq -n \
  --arg user "u-slo-gate-1" \
  --arg key "${seed_key}-bet" \
  '{userId:$user,marketId:"m:local:001",selectionId:"home",stakeCents:500,odds:1.91,idempotencyKey:$key}')"
seed_place_code="$(curl -s -o /tmp/slo-seed-bet.json -w "%{http_code}" -X POST "$GATEWAY_BASE/api/v1/bets/place" -H 'Content-Type: application/json' -d "$seed_place_payload")"
if [[ "$seed_place_code" != "200" ]]; then
  echo "error: failed to place seed bet for cashout probe (status=$seed_place_code)" >&2
  cat /tmp/slo-seed-bet.json >&2 || true
  rm -f /tmp/slo-seed-bet.json
  exit 1
fi
seed_bet_id="$(jq -r '.betId // empty' /tmp/slo-seed-bet.json)"
rm -f /tmp/slo-seed-bet.json
if [[ -z "$seed_bet_id" ]]; then
  echo "error: missing seed bet id for cashout probe" >&2
  exit 1
fi

run_post_probe_with_sequence() {
  local url="$1"
  local payload_template="$2"
  local out_file="$3"

  seq "$SAMPLES" | xargs -n1 -P"$CONCURRENCY" -I{} sh -c '
    seq_id="$1"
    payload_template="$2"
    payload="${payload_template/__SEQ__/${seq_id}}"
    curl -s -o /dev/null -w "%{http_code} %{time_total}\n" -X POST "$3" \
      -H "Content-Type: application/json" \
      -d "$payload"
  ' sh {} "$payload_template" "$url" >"$out_file"
}

run_get_probe() {
  local url="$1"
  local out_file="$2"

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
  local raw_file="$1"
  local prefix="$2"

  awk '{print $1}' "$raw_file" >"${raw_file}.codes"
  awk '{print $2}' "$raw_file" | sort -n >"${raw_file}.times"

  local total ok fail p50 p95 p99 sum_times success_rate rps
  total="$(wc -l <"${raw_file}.codes" | tr -d ' ')"
  ok="$(grep -c '^200$' "${raw_file}.codes" || true)"
  fail=$((total - ok))
  p50="$(percentile 50 "${raw_file}.times")"
  p95="$(percentile 95 "${raw_file}.times")"
  p99="$(percentile 99 "${raw_file}.times")"
  sum_times="$(awk '{s+=$1} END {if (s==0) {print "0"} else {printf "%.6f", s}}' "${raw_file}.times")"
  success_rate="$(awk -v ok="$ok" -v total="$total" 'BEGIN { if (total == 0) print "0"; else printf "%.4f", ok/total }')"
  rps="$(awk -v total="$total" -v sum="$sum_times" 'BEGIN { if (sum <= 0) print "0"; else printf "%.2f", total/sum }')"

  eval "${prefix}_total='${total}'"
  eval "${prefix}_ok='${ok}'"
  eval "${prefix}_fail='${fail}'"
  eval "${prefix}_p50='${p50}'"
  eval "${prefix}_p95='${p95}'"
  eval "${prefix}_p99='${p99}'"
  eval "${prefix}_success_rate='${success_rate}'"
  eval "${prefix}_rps='${rps}'"

  rm -f "${raw_file}.codes" "${raw_file}.times"
}

evaluate_probe() {
  local name="$1"
  local p95="$2"
  local p99="$3"
  local rps="$4"
  local success_rate="$5"
  local p95_max="$6"
  local p99_max="$7"
  local min_rps="$8"
  local min_success="$9"

  local result="pass"
  if ! awk -v left="$p95" -v right="$p95_max" 'BEGIN { exit !(left <= right) }'; then
    result="fail"
  fi
  if ! awk -v left="$p99" -v right="$p99_max" 'BEGIN { exit !(left <= right) }'; then
    result="fail"
  fi
  if ! awk -v left="$rps" -v right="$min_rps" 'BEGIN { exit !(left >= right) }'; then
    result="fail"
  fi
  if ! awk -v left="$success_rate" -v right="$min_success" 'BEGIN { exit !(left >= right) }'; then
    result="fail"
  fi

  echo "| $name | $p95 | $p99 | $rps | $success_rate | p95<=${p95_max}, p99<=${p99_max}, rps>=${min_rps}, success>=${min_success} | $result |" >>"$RESULT_FILE"
  if [[ "$result" == "fail" ]]; then
    return 1
  fi
  return 0
}

placement_raw="$(mktemp)"
cashout_raw="$(mktemp)"
realtime_raw="$(mktemp)"

placement_payload_template="$(jq -nc \
  '{userId:"u-slo-gate-1",marketId:"m:local:001",selectionId:"home",stakeCents:200,odds:1.91,idempotencyKey:("slo-place-__SEQ__") }')"
cashout_payload_template="$(jq -nc \
  --arg betId "$seed_bet_id" \
  '{betId:$betId,userId:"u-slo-gate-1",requestId:("slo-cashout-__SEQ__") }')"

run_post_probe_with_sequence "$GATEWAY_BASE/api/v1/bets/place" "$placement_payload_template" "$placement_raw"
run_post_probe_with_sequence "$GATEWAY_BASE/api/v1/bets/cashout/quote" "$cashout_payload_template" "$cashout_raw"
run_get_probe "$GATEWAY_BASE/api/v1/match-tracker/fixtures/f:local:001" "$realtime_raw"

summarize_probe "$placement_raw" "placement"
summarize_probe "$cashout_raw" "cashout"
summarize_probe "$realtime_raw" "realtime"

{
  echo "# Capability SLO Gate ($DATE_TAG)"
  echo
  echo "Samples: \`$SAMPLES\`"
  echo
  echo "Concurrency: \`$CONCURRENCY\`"
  echo
  echo "| Capability | P95 (s) | P99 (s) | Throughput (rps) | Success Rate | Thresholds | Result |"
  echo "|---|---|---|---|---|---|---|"
} >"$RESULT_FILE"

overall=0
evaluate_probe "placement" "$placement_p95" "$placement_p99" "$placement_rps" "$placement_success_rate" "$PLACEMENT_P95_MAX_SEC" "$PLACEMENT_P99_MAX_SEC" "$PLACEMENT_MIN_RPS" "$PLACEMENT_MIN_SUCCESS_RATE" || overall=1
evaluate_probe "cashout_quote" "$cashout_p95" "$cashout_p99" "$cashout_rps" "$cashout_success_rate" "$CASHOUT_P95_MAX_SEC" "$CASHOUT_P99_MAX_SEC" "$CASHOUT_MIN_RPS" "$CASHOUT_MIN_SUCCESS_RATE" || overall=1
evaluate_probe "realtime_match_tracker" "$realtime_p95" "$realtime_p99" "$realtime_rps" "$realtime_success_rate" "$REALTIME_P95_MAX_SEC" "$REALTIME_P99_MAX_SEC" "$REALTIME_MIN_RPS" "$REALTIME_MIN_SUCCESS_RATE" || overall=1

result="pass"
if [[ $overall -ne 0 ]]; then
  result="fail"
fi

{
  echo "# SB-504 Capability SLO Gate Report ($DATE_TAG)"
  echo
  echo "Command: \`make qa-capability-slo\`"
  echo
  echo "- Result: **$result**"
  echo "- Artifact: \`$RESULT_FILE\`"
  if [[ "$START_SERVICES" == "true" ]]; then
    echo "- Auth log: \`$AUTH_LOG\`"
    echo "- Gateway log: \`$GATEWAY_LOG\`"
  fi
  echo "- Seed bet id: \`$seed_bet_id\`"
} >"$REPORT_FILE"

echo "Capability SLO gate report: $RESULT_FILE"
if [[ $overall -ne 0 ]]; then
  exit 1
fi
