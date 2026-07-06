#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/201_PREDICTION_MARKET_STAGING_GATE.md"
RESET_SCRIPT="$ROOT_DIR/scripts/qa/reset-local-prediction-state.sh"
JAVA_HOME_DEFAULT="/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home"

API_BASE="${API_BASE:-http://127.0.0.1:13551}"
RESET_PREDICTION_STATE="${RESET_PREDICTION_STATE:-0}"
PUNTER_USERNAME="${PUNTER_USERNAME:-punter}"
PUNTER_PASSWORD="${PUNTER_PASSWORD:-Password123!}"
OPERATOR_USERNAME="${OPERATOR_USERNAME:-operator}"
OPERATOR_PASSWORD="${OPERATOR_PASSWORD:-Password123!}"
TRADER_USERNAME="${TRADER_USERNAME:-trader}"
TRADER_PASSWORD="${TRADER_PASSWORD:-Password123!}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Password123!}"

DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
LOG_FILE="$ARTIFACT_DIR/prediction_staging_gate_${TS_TAG}.md"

mkdir -p "$ARTIFACT_DIR"

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required" >&2
  exit 1
fi

PASS_COUNT=0
FAIL_COUNT=0

tmp_files=()

cleanup() {
  local file
  for file in "${tmp_files[@]:-}"; do
    rm -f "$file" >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT

new_tmp() {
  local tmp
  tmp="$(mktemp)"
  tmp_files+=("$tmp")
  echo "$tmp"
}

run_check() {
  local name="$1"
  local status="$2"
  local detail="$3"
  echo "| $name | $status | $detail |" >>"$LOG_FILE"
  if [[ "$status" == "pass" ]]; then
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

fatal_check() {
  run_check "$1" "fail" "$2"
  cat "$LOG_FILE" >&2
  exit 1
}

http_json() {
  local method="$1"
  local path="$2"
  local token="${3:-}"
  local body="${4:-}"
  local outfile="$5"
  local -a args

  args=(-sS -o "$outfile" -w "%{http_code}" -X "$method")
  if [[ -n "$token" ]]; then
    args+=(-H "Authorization: Bearer $token")
  fi
  if [[ -n "$body" ]]; then
    args+=(-H 'Content-Type: application/json' -d "$body")
  fi

  curl "${args[@]}" "${API_BASE}${path}"
}

login_token() {
  local username="$1"
  local password="$2"
  local outfile
  local code

  outfile="$(new_tmp)"
  code="$(curl -sS -o "$outfile" -w "%{http_code}" -X POST "${API_BASE}/login" \
    -H 'Content-Type: application/json' \
    -H 'X-Forwarded-For: 127.0.0.1' \
    -d "{\"username\":\"${username}\",\"password\":\"${password}\"}")"

  if [[ "$code" != "200" ]]; then
    fatal_check "login ${username}" "expected 200, got ${code}"
  fi

  jq -r '.token.token // empty' "$outfile"
}

json_number() {
  jq -r "$1" "$2"
}

assert_status() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  local detail="$4"
  if [[ "$actual" == "$expected" ]]; then
    run_check "$name" "pass" "$detail"
  else
    fatal_check "$name" "expected ${expected}, got ${actual}"
  fi
}

{
  echo "# Prediction Market Staging Gate ($DATE_TAG)"
  echo
  echo "API base: \`${API_BASE}\`"
  echo "Reset prediction state: \`${RESET_PREDICTION_STATE}\`"
  echo
  echo "| Check | Result | Detail |"
  echo "|---|---|---|"
} >"$LOG_FILE"

if [[ "$RESET_PREDICTION_STATE" == "1" ]]; then
  if [[ ! -x "$RESET_SCRIPT" ]]; then
    fatal_check "reset local prediction state" "reset script is not executable: $RESET_SCRIPT"
  fi
  "$RESET_SCRIPT"
  run_check "reset local prediction state" "pass" "prediction tables and audit rows were cleared and reseeded before validation"
fi

PUNTER_TOKEN="$(login_token "$PUNTER_USERNAME" "$PUNTER_PASSWORD")"
OPERATOR_TOKEN="$(login_token "$OPERATOR_USERNAME" "$OPERATOR_PASSWORD")"
TRADER_TOKEN="$(login_token "$TRADER_USERNAME" "$TRADER_PASSWORD")"
ADMIN_TOKEN="$(login_token "$ADMIN_USERNAME" "$ADMIN_PASSWORD")"
run_check "login punter/operator/trader/admin" "pass" "all required staging identities authenticated"

MARKETS_FILE="$(new_tmp)"
MARKETS_CODE="$(http_json GET "/api/v1/prediction/markets" "" "" "$MARKETS_FILE")"
if [[ "$MARKETS_CODE" != "200" ]]; then
  fatal_check "list prediction markets" "expected 200, got ${MARKETS_CODE}"
fi
run_check "list prediction markets" "pass" "market catalog reachable"

EXISTING_ORDERS_FILE="$(new_tmp)"
code="$(http_json GET "/api/v1/prediction/orders" "$PUNTER_TOKEN" "" "$EXISTING_ORDERS_FILE")"
assert_status "list punter orders before staging picks" "200" "$code" "player order activity reachable before market selection"
EXCLUDED_MARKETS_FILE="$(new_tmp)"
jq -r '.orders[] | select(.status == "open") | .marketId' "$EXISTING_ORDERS_FILE" | sort -u >"$EXCLUDED_MARKETS_FILE"
CANDIDATE_MARKETS_FILE="$(new_tmp)"
jq -r '.markets[] | select(.status == "open" or .status == "live") | .marketId' "$MARKETS_FILE" \
  | while IFS= read -r market_id; do
      if [[ -z "$market_id" ]]; then
        continue
      fi
      if [[ ! -s "$EXCLUDED_MARKETS_FILE" ]] || ! grep -qx "$market_id" "$EXCLUDED_MARKETS_FILE"; then
        echo "$market_id"
      fi
    done >"$CANDIDATE_MARKETS_FILE"

REVERSIBLE_MARKET="$(sed -n '1p' "$CANDIDATE_MARKETS_FILE")"
SETTLEMENT_MARKET="$(sed -n '2p' "$CANDIDATE_MARKETS_FILE")"
CANCEL_MARKET="$(sed -n '3p' "$CANDIDATE_MARKETS_FILE")"

if [[ -z "$REVERSIBLE_MARKET" || -z "$SETTLEMENT_MARKET" || -z "$CANCEL_MARKET" ]]; then
  fatal_check "select mutable markets" "need at least three open/live prediction markets without existing punter exposure for the staging gate"
fi

run_check "select mutable markets" "pass" "reversible=\`$REVERSIBLE_MARKET\`, settlement=\`$SETTLEMENT_MARKET\`, cancel=\`$CANCEL_MARKET\`"

probe_file="$(new_tmp)"
code="$(http_json GET "/admin/prediction/summary" "$OPERATOR_TOKEN" "" "$probe_file")"
assert_status "operator prediction summary" "200" "$code" "operator can view prediction oversight"
code="$(http_json GET "/admin/prediction/orders" "$OPERATOR_TOKEN" "" "$probe_file")"
assert_status "operator order flow blocked" "403" "$code" "operator cannot inspect punter prediction order flow"
code="$(http_json GET "/admin/audit-logs?product=prediction" "$OPERATOR_TOKEN" "" "$probe_file")"
assert_status "operator audit pivot blocked" "403" "$code" "operator cannot open prediction-scoped audit trail"

code="$(http_json GET "/admin/prediction/summary" "$TRADER_TOKEN" "" "$probe_file")"
assert_status "trader prediction summary" "200" "$code" "trader can view prediction oversight"
code="$(http_json GET "/admin/prediction/orders" "$TRADER_TOKEN" "" "$probe_file")"
assert_status "trader order flow" "200" "$code" "trader can inspect prediction order flow"
code="$(http_json GET "/admin/audit-logs?product=prediction" "$TRADER_TOKEN" "" "$probe_file")"
assert_status "trader audit pivot" "200" "$code" "trader can inspect prediction audit trail"

code="$(http_json GET "/admin/prediction/summary" "$ADMIN_TOKEN" "" "$probe_file")"
assert_status "admin prediction summary" "200" "$code" "admin can view prediction oversight"
code="$(http_json GET "/admin/prediction/orders" "$ADMIN_TOKEN" "" "$probe_file")"
assert_status "admin order flow" "200" "$code" "admin can inspect prediction order flow"
code="$(http_json GET "/admin/audit-logs?product=prediction" "$ADMIN_TOKEN" "" "$probe_file")"
assert_status "admin audit pivot" "200" "$code" "admin can inspect prediction audit trail"

BALANCE_FILE="$(new_tmp)"
code="$(http_json GET "/punters/wallet/balance" "$PUNTER_TOKEN" "" "$BALANCE_FILE")"
assert_status "punter wallet balance before order" "200" "$code" "wallet balance endpoint reachable"
BALANCE_BEFORE="$(json_number '.realMoney.value.amount' "$BALANCE_FILE")"

PLACE_FILE="$(new_tmp)"
SETTLEMENT_OUTCOME_ID="$(jq -r --arg market "$SETTLEMENT_MARKET" '.markets[] | select(.marketId == $market) | .outcomes[0].outcomeId' "$MARKETS_FILE")"
SETTLEMENT_ALT_OUTCOME_ID="$(jq -r --arg market "$SETTLEMENT_MARKET" '.markets[] | select(.marketId == $market) | .outcomes[1].outcomeId' "$MARKETS_FILE")"
SETTLEMENT_STAKE="11"
PLACE_BODY="$(jq -nc --arg marketId "$SETTLEMENT_MARKET" --arg outcomeId "$SETTLEMENT_OUTCOME_ID" --argjson stakeUsd "$SETTLEMENT_STAKE" '{marketId:$marketId, outcomeId:$outcomeId, stakeUsd:$stakeUsd}')"
code="$(http_json POST "/api/v1/prediction/orders" "$PUNTER_TOKEN" "$PLACE_BODY" "$PLACE_FILE")"
assert_status "place prediction order" "200" "$code" "punter can place prediction order on \`$SETTLEMENT_MARKET\`"
SETTLEMENT_ORDER_ID="$(jq -r '.order.orderId // .orderId // empty' "$PLACE_FILE")"
if [[ -z "$SETTLEMENT_ORDER_ID" ]]; then
  fatal_check "extract placed order id" "prediction order placement response did not include an order id"
fi

code="$(http_json GET "/punters/wallet/balance" "$PUNTER_TOKEN" "" "$BALANCE_FILE")"
assert_status "punter wallet balance after place" "200" "$code" "wallet balance reachable after reservation"
BALANCE_AFTER_PLACE="$(json_number '.realMoney.value.amount' "$BALANCE_FILE")"
EXPECTED_AFTER_PLACE="$(python3 - <<PY
before = float("$BALANCE_BEFORE")
stake = float("$SETTLEMENT_STAKE")
print(f"{before - stake:.2f}")
PY
)"
if [[ "$(printf '%.2f' "$BALANCE_AFTER_PLACE")" == "$(printf '%.2f' "$EXPECTED_AFTER_PLACE")" ]]; then
  run_check "wallet reservation after place" "pass" "balance moved from \`$BALANCE_BEFORE\` to \`$BALANCE_AFTER_PLACE\`"
else
  fatal_check "wallet reservation after place" "expected balance \`$EXPECTED_AFTER_PLACE\`, got \`$BALANCE_AFTER_PLACE\`"
fi

LIFECYCLE_FILE="$(new_tmp)"
code="$(http_json POST "/admin/prediction/markets/${REVERSIBLE_MARKET}/lifecycle/suspend" "$TRADER_TOKEN" '{"reason":"trader suspend validation"}' "$LIFECYCLE_FILE")"
assert_status "trader suspend market" "200" "$code" "trader can suspend \`$REVERSIBLE_MARKET\`"
code="$(http_json POST "/admin/prediction/markets/${REVERSIBLE_MARKET}/lifecycle/open" "$TRADER_TOKEN" '{"reason":"trader reopen validation"}' "$LIFECYCLE_FILE")"
assert_status "trader reopen market" "200" "$code" "trader can reopen \`$REVERSIBLE_MARKET\`"
code="$(http_json POST "/admin/prediction/markets/${SETTLEMENT_MARKET}/lifecycle/resolve" "$TRADER_TOKEN" "{\"outcomeId\":\"${SETTLEMENT_OUTCOME_ID}\",\"reason\":\"trader resolve blocked validation\"}" "$LIFECYCLE_FILE")"
assert_status "trader resolve blocked" "403" "$code" "trader cannot settle markets"

code="$(http_json POST "/admin/prediction/markets/${CANCEL_MARKET}/lifecycle/cancel" "$ADMIN_TOKEN" '{"reason":"admin cancel validation"}' "$LIFECYCLE_FILE")"
assert_status "admin cancel market" "200" "$code" "admin can cancel \`$CANCEL_MARKET\`"
code="$(http_json POST "/admin/prediction/markets/${SETTLEMENT_MARKET}/lifecycle/resolve" "$ADMIN_TOKEN" "{\"outcomeId\":\"${SETTLEMENT_OUTCOME_ID}\",\"reason\":\"admin resolve validation\"}" "$LIFECYCLE_FILE")"
assert_status "admin resolve market" "200" "$code" "admin can resolve \`$SETTLEMENT_MARKET\`"
code="$(http_json POST "/admin/prediction/markets/${SETTLEMENT_MARKET}/lifecycle/resettle" "$ADMIN_TOKEN" "{\"outcomeId\":\"${SETTLEMENT_ALT_OUTCOME_ID}\",\"reason\":\"admin resettle validation\"}" "$LIFECYCLE_FILE")"
assert_status "admin resettle market" "200" "$code" "admin can resettle \`$SETTLEMENT_MARKET\`"

ORDERS_FILE="$(new_tmp)"
code="$(http_json GET "/api/v1/prediction/orders" "$PUNTER_TOKEN" "" "$ORDERS_FILE")"
assert_status "list punter prediction orders" "200" "$code" "player order activity endpoint reachable"
ORDER_STATUS="$(jq -r --arg orderId "$SETTLEMENT_ORDER_ID" '.orders[] | select(.orderId == $orderId) | .status' "$ORDERS_FILE")"
PREVIOUS_STATUS="$(jq -r --arg orderId "$SETTLEMENT_ORDER_ID" '.orders[] | select(.orderId == $orderId) | .previousSettlementStatus // empty' "$ORDERS_FILE")"
if [[ "$ORDER_STATUS" == "resettled" && -n "$PREVIOUS_STATUS" ]]; then
  run_check "order resettlement context" "pass" "order \`$SETTLEMENT_ORDER_ID\` moved to \`$ORDER_STATUS\` with previous status \`$PREVIOUS_STATUS\`"
else
  fatal_check "order resettlement context" "expected resettled order with previous settlement status, got status=\`$ORDER_STATUS\` previous=\`$PREVIOUS_STATUS\`"
fi

code="$(http_json GET "/punters/wallet/balance" "$PUNTER_TOKEN" "" "$BALANCE_FILE")"
assert_status "punter wallet balance after resettle" "200" "$code" "wallet balance reachable after settlement correction"
BALANCE_AFTER_RESETTLE="$(json_number '.realMoney.value.amount' "$BALANCE_FILE")"
if [[ "$(printf '%.2f' "$BALANCE_AFTER_RESETTLE")" == "$(printf '%.2f' "$EXPECTED_AFTER_PLACE")" ]]; then
  run_check "wallet reconciliation after resettle" "pass" "balance corrected to \`$BALANCE_AFTER_RESETTLE\` after resettlement"
else
  fatal_check "wallet reconciliation after resettle" "expected corrected balance \`$EXPECTED_AFTER_PLACE\`, got \`$BALANCE_AFTER_RESETTLE\`"
fi

TRANSACTIONS_FILE="$(new_tmp)"
PREDICTION_TX_COUNT=0
HAS_PREVIOUS_SETTLEMENT=0
for _ in $(seq 1 20); do
  code="$(http_json GET "/punters/wallet/transactions" "$PUNTER_TOKEN" "" "$TRANSACTIONS_FILE")"
  assert_status "punter wallet history" "200" "$code" "wallet transaction history reachable"
  PREDICTION_TX_COUNT="$(jq -r --arg orderId "$SETTLEMENT_ORDER_ID" '[.data[] | select(.product == "PREDICTION" and .predictionContext.orderId == $orderId)] | length' "$TRANSACTIONS_FILE")"
  HAS_PREVIOUS_SETTLEMENT="$(jq -r --arg orderId "$SETTLEMENT_ORDER_ID" '[.data[] | select(.product == "PREDICTION" and .predictionContext.orderId == $orderId and .predictionContext.previousSettlementStatus != null)] | length' "$TRANSACTIONS_FILE")"
  if [[ "$PREDICTION_TX_COUNT" -ge 1 && "$HAS_PREVIOUS_SETTLEMENT" -ge 1 ]]; then
    break
  fi
  sleep 1
done
if [[ "$PREDICTION_TX_COUNT" -ge 1 && "$HAS_PREVIOUS_SETTLEMENT" -ge 1 ]]; then
  run_check "prediction wallet descriptors" "pass" "wallet history carries product and prior-settlement context for \`$SETTLEMENT_ORDER_ID\`"
else
  fatal_check "prediction wallet descriptors" "missing product-aware prediction settlement descriptors in wallet history"
fi

CANCEL_ORDER_FILE="$(new_tmp)"
CANCEL_BODY="$(jq -nc --arg marketId "$REVERSIBLE_MARKET" --arg outcomeId "$(jq -r --arg market "$REVERSIBLE_MARKET" '.markets[] | select(.marketId == $market) | .outcomes[0].outcomeId' "$MARKETS_FILE")" '{marketId:$marketId, outcomeId:$outcomeId, stakeUsd:7}')"
code="$(http_json POST "/api/v1/prediction/orders" "$PUNTER_TOKEN" "$CANCEL_BODY" "$CANCEL_ORDER_FILE")"
assert_status "place cancellable prediction order" "200" "$code" "created a second prediction order to validate cancel path"
CANCEL_ORDER_ID="$(jq -r '.order.orderId // .orderId // empty' "$CANCEL_ORDER_FILE")"
if [[ -z "$CANCEL_ORDER_ID" ]]; then
  fatal_check "extract cancellable order id" "second prediction order placement response did not include an order id"
fi
code="$(http_json POST "/api/v1/prediction/orders/${CANCEL_ORDER_ID}/cancel" "$PUNTER_TOKEN" "" "$CANCEL_ORDER_FILE")"
assert_status "cancel open prediction order" "200" "$code" "punter can cancel an open prediction order"
code="$(http_json POST "/api/v1/prediction/orders/${CANCEL_ORDER_ID}/cancel" "$PUNTER_TOKEN" "" "$CANCEL_ORDER_FILE")"
assert_status "cancel non-open prediction order rejected" "400" "$code" "second cancel is rejected cleanly"

AUDIT_FILE="$(new_tmp)"
SUSPEND_AUDIT_COUNT=0
for _ in $(seq 1 20); do
  code="$(http_json GET "/admin/audit-logs?product=prediction&targetId=${REVERSIBLE_MARKET}&action=prediction.market.suspended" "$TRADER_TOKEN" "" "$AUDIT_FILE")"
  assert_status "audit filter suspended action" "200" "$code" "prediction audit filter reachable for suspended action"
  SUSPEND_AUDIT_COUNT="$(jq -r '.data | length' "$AUDIT_FILE")"
  if [[ "$SUSPEND_AUDIT_COUNT" -ge 1 ]]; then
    break
  fi
  sleep 1
done
if [[ "$SUSPEND_AUDIT_COUNT" -ge 1 ]]; then
  run_check "audit suspended entry present" "pass" "found \`$SUSPEND_AUDIT_COUNT\` suspended audit entries for \`$REVERSIBLE_MARKET\`"
else
  fatal_check "audit suspended entry present" "no suspended audit entries found for \`$REVERSIBLE_MARKET\`"
fi

RESETTLE_AUDIT_COUNT=0
for _ in $(seq 1 20); do
  code="$(http_json GET "/admin/audit-logs?product=prediction&targetId=${SETTLEMENT_MARKET}&action=prediction.market.resettled" "$ADMIN_TOKEN" "" "$AUDIT_FILE")"
  assert_status "audit filter resettled action" "200" "$code" "prediction audit filter reachable for resettled action"
  RESETTLE_AUDIT_COUNT="$(jq -r '.data | length' "$AUDIT_FILE")"
  if [[ "$RESETTLE_AUDIT_COUNT" -ge 1 ]]; then
    break
  fi
  sleep 1
done
if [[ "$RESETTLE_AUDIT_COUNT" -ge 1 ]]; then
  run_check "audit resettled entry present" "pass" "found \`$RESETTLE_AUDIT_COUNT\` resettled audit entries for \`$SETTLEMENT_MARKET\`"
else
  fatal_check "audit resettled entry present" "no resettled audit entries found for \`$SETTLEMENT_MARKET\`"
fi

code="$(http_json GET "/admin/prediction/markets/${REVERSIBLE_MARKET}/lifecycle" "$TRADER_TOKEN" "" "$LIFECYCLE_FILE")"
assert_status "prediction lifecycle history endpoint" "200" "$code" "lifecycle history reachable for \`$REVERSIBLE_MARKET\`"
LIFECYCLE_COUNT="$(jq -r '.totalCount // 0' "$LIFECYCLE_FILE")"
if [[ "$LIFECYCLE_COUNT" -ge 2 ]]; then
  run_check "prediction lifecycle history contents" "pass" "captured \`$LIFECYCLE_COUNT\` lifecycle entries for \`$REVERSIBLE_MARKET\`"
else
  fatal_check "prediction lifecycle history contents" "expected at least two lifecycle entries for \`$REVERSIBLE_MARKET\`, got \`$LIFECYCLE_COUNT\`"
fi

(
  cd "$ROOT_DIR/phoenix-backend"
  export JAVA_HOME="${JAVA_HOME:-$JAVA_HOME_DEFAULT}"
  sbt -batch 'phoenix-backend/runMain phoenix.prediction.tools.ReconcilePredictionProjection'
)
run_check "prediction projection reconciliation" "pass" "event log replay matches live prediction projection state"

{
  echo "# Prediction Market Staging Gate ($DATE_TAG)"
  echo
  echo "- Result: **pass**"
  echo "- API base: \`$API_BASE\`"
  echo "- Artifact: \`$LOG_FILE\`"
  echo "- Passed checks: \`$PASS_COUNT\`"
  echo "- Failed checks: \`$FAIL_COUNT\`"
  echo
  echo "Validated live:"
  echo "- role matrix for operator / trader / admin"
  echo "- punter order placement"
  echo "- wallet reservation"
  echo "- trader suspend/open"
  echo "- admin cancel / resolve / resettle"
  echo "- wallet reconciliation after resettle"
  echo "- double-cancel negative path"
  echo "- prediction audit filters"
  echo "- lifecycle-history endpoint"
} >"$REPORT_FILE"

echo "prediction staging gate report: $LOG_FILE"
