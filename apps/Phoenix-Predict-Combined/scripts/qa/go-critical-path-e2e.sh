#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GO_DIR="$ROOT_DIR/go-platform"
RUNTIME_DIR="$ROOT_DIR/.runtime"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/25_GO_CRITICAL_PATH_E2E.md"

DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
LOG_FILE="$ARTIFACT_DIR/go_critical_path_e2e_${TS_TAG}.md"
AUTH_LOG="$ARTIFACT_DIR/go_auth_${TS_TAG}.log"
GATEWAY_LOG="$ARTIFACT_DIR/go_gateway_${TS_TAG}.log"

SEED_ENV_FILE="$RUNTIME_DIR/go-seed.env"

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
AUTH_BASE="http://127.0.0.1:${AUTH_PORT}"
GATEWAY_BASE="http://127.0.0.1:${GATEWAY_PORT}"

mkdir -p "$ARTIFACT_DIR" "$RUNTIME_DIR"

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required for qa-e2e-critical" >&2
  exit 1
fi

if [[ ! -f "$SEED_ENV_FILE" ]]; then
  bash "$ROOT_DIR/scripts/data/prepare-deterministic-seeds.sh" >/dev/null
fi

# shellcheck disable=SC1090
source "$SEED_ENV_FILE"

AUTH_USER="${AUTH_DEMO_USERNAME:-seed.admin@phoenix.local}"
AUTH_PASS="${AUTH_DEMO_PASSWORD:-SeedPassword!2026}"

cleanup() {
  if [[ -n "${GATEWAY_PID:-}" ]]; then
    kill "$GATEWAY_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${AUTH_PID:-}" ]]; then
    kill "$AUTH_PID" >/dev/null 2>&1 || true
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

run_check() {
  local name="$1"
  local status="$2"
  local detail="$3"
  echo "| $name | $status | $detail |" >>"$LOG_FILE"
}

{
  echo "# Go Critical Path E2E ($DATE_TAG)"
  echo
  echo "| Check | Result | Detail |"
  echo "|---|---|---|"
} >"$LOG_FILE"

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
run_check "auth healthz" "pass" "\`$AUTH_BASE/healthz\`"
wait_for_http_200 "$GATEWAY_BASE/healthz" "gateway healthz"
run_check "gateway healthz" "pass" "\`$GATEWAY_BASE/healthz\`"

login_payload="$(jq -n --arg u "$AUTH_USER" --arg p "$AUTH_PASS" '{username:$u,password:$p}')"
login_response="$(curl -s -X POST "$AUTH_BASE/api/v1/auth/login" -H 'Content-Type: application/json' -d "$login_payload")"
access_token="$(echo "$login_response" | jq -r '.accessToken // empty')"
if [[ -z "$access_token" ]]; then
  run_check "auth login" "fail" "missing access token"
  exit 1
fi
run_check "auth login" "pass" "access token issued"

session_code="$(curl -s -o /tmp/go-e2e-session.json -w "%{http_code}" "$AUTH_BASE/api/v1/auth/session" -H "Authorization: Bearer $access_token")"
if [[ "$session_code" != "200" ]]; then
  run_check "auth session" "fail" "http=$session_code"
  rm -f /tmp/go-e2e-session.json
  exit 1
fi
session_user="$(jq -r '.userId // empty' /tmp/go-e2e-session.json)"
rm -f /tmp/go-e2e-session.json
run_check "auth session" "pass" "userId=\`$session_user\`"

fixtures_code="$(curl -s -o /tmp/go-e2e-fixtures.json -w "%{http_code}" "$GATEWAY_BASE/api/v1/fixtures")"
if [[ "$fixtures_code" != "200" ]]; then
  run_check "gateway fixtures" "fail" "http=$fixtures_code"
  rm -f /tmp/go-e2e-fixtures.json
  exit 1
fi
fixtures_count="$(jq '.data | length' /tmp/go-e2e-fixtures.json)"
rm -f /tmp/go-e2e-fixtures.json
run_check "gateway fixtures" "pass" "fixtures=\`$fixtures_count\`"

place_key="e2e-${TS_TAG}"
place_payload="$(jq -n \
  --arg user "u:seed:3002" \
  --arg market "m:seed:2002" \
  --arg selection "yes" \
  --arg key "$place_key" \
  '{userId:$user, marketId:$market, selectionId:$selection, stakeCents:500, odds:1.77, idempotencyKey:$key}')"
place_code="$(curl -s -o /tmp/go-e2e-place.json -w "%{http_code}" -X POST "$GATEWAY_BASE/api/v1/bets/place" -H 'Content-Type: application/json' -d "$place_payload")"
if [[ "$place_code" != "200" ]]; then
  run_check "place bet" "fail" "http=$place_code"
  rm -f /tmp/go-e2e-place.json
  exit 1
fi
bet_id="$(jq -r '.betId // empty' /tmp/go-e2e-place.json)"
run_check "place bet" "pass" "betId=\`$bet_id\`"

settle_payload='{"winningSelectionId":"yes","winningSelectionName":"Yes","resultSource":"e2e"}'
settle_code="$(curl -s -o /tmp/go-e2e-settle.json -w "%{http_code}" -X POST "$GATEWAY_BASE/api/v1/admin/bets/${bet_id}/lifecycle/settle" -H 'X-Admin-Role: admin' -H 'Content-Type: application/json' -d "$settle_payload")"
if [[ "$settle_code" != "200" ]]; then
  run_check "settle bet" "fail" "http=$settle_code"
  rm -f /tmp/go-e2e-place.json /tmp/go-e2e-settle.json
  exit 1
fi
settle_status="$(jq -r '.status // empty' /tmp/go-e2e-settle.json)"
run_check "settle bet" "pass" "status=\`$settle_status\`"

audit_code="$(curl -s -o /tmp/go-e2e-audit.json -w "%{http_code}" "$GATEWAY_BASE/api/v1/admin/audit-logs?type=bet.settled" -H 'X-Admin-Role: admin')"
if [[ "$audit_code" != "200" ]]; then
  run_check "audit logs" "fail" "http=$audit_code"
  rm -f /tmp/go-e2e-place.json /tmp/go-e2e-settle.json /tmp/go-e2e-audit.json
  exit 1
fi
audit_count="$(jq '.items | length' /tmp/go-e2e-audit.json)"
run_check "audit logs" "pass" "entries=\`$audit_count\`"

rec_code="$(curl -s -o /tmp/go-e2e-rec.json -w "%{http_code}" "$GATEWAY_BASE/api/v1/admin/wallet/reconciliation" -H 'X-Admin-Role: admin')"
if [[ "$rec_code" != "200" ]]; then
  run_check "wallet reconciliation" "fail" "http=$rec_code"
  rm -f /tmp/go-e2e-place.json /tmp/go-e2e-settle.json /tmp/go-e2e-audit.json /tmp/go-e2e-rec.json
  exit 1
fi
rec_entries="$(jq -r '.entryCount // 0' /tmp/go-e2e-rec.json)"
run_check "wallet reconciliation" "pass" "entryCount=\`$rec_entries\`"

rm -f /tmp/go-e2e-place.json /tmp/go-e2e-settle.json /tmp/go-e2e-audit.json /tmp/go-e2e-rec.json

{
  echo "# Go Critical Path E2E ($DATE_TAG)"
  echo
  echo "Command: \`make qa-e2e-critical\`"
  echo
  echo "- Result: **pass**"
  echo "- Auth URL: \`$AUTH_BASE\`"
  echo "- Gateway URL: \`$GATEWAY_BASE\`"
  echo "- Artifact: \`$LOG_FILE\`"
  echo "- Auth log: \`$AUTH_LOG\`"
  echo "- Gateway log: \`$GATEWAY_LOG\`"
} >"$REPORT_FILE"

echo "E2E report: $LOG_FILE"
