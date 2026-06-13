#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/.env.demo"
ARTIFACT_DIR="$ROOT/docs/runbooks/artifacts"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
ARTIFACT_PATH="${ARTIFACT_PATH:-$ARTIFACT_DIR/payment_provider_simulator_${STAMP}.md}"
GATEWAY="${GATEWAY:-http://localhost:8080}"
DEMO_ADMIN_USERNAME="${DEMO_ADMIN_USERNAME:-demoadmin}"
DEMO_PASSWORD="${DEMO_PASSWORD:-Password123!}"
SCENARIO="${1:-list}"

PENDING_DEPOSIT_REF="demo-pxp-deposit-001"
PENDING_WITHDRAWAL_REF="demo-pxp-withdrawal-001"
SUCCEEDED_DEPOSIT_REF="demo-pxp-settled-deposit-001"

mkdir -p "$ARTIFACT_DIR"

json_field() {
  local json="$1"
  local field="$2"
  printf '%s' "$json" | sed -n "s/.*\"${field}\":\"\([^\"]*\)\".*/\1/p" | head -1
}

request_json() {
  local method="$1"
  local url="$2"
  local token="${3:-}"
  local body="${4:-}"
  local tmp_body tmp_code
  tmp_body="$(mktemp)"
  tmp_code="$(mktemp)"
  local curl_args=(-sS -X "$method" "$url" -o "$tmp_body" -w '%{http_code}')
  if [[ -n "$token" ]]; then
    curl_args+=(-H "Authorization: Bearer $token")
  fi
  if [[ -n "$body" ]]; then
    curl_args+=(-H 'Content-Type: application/json' -d "$body")
  fi
  curl "${curl_args[@]}" > "$tmp_code"
  local code body_out
  code="$(cat "$tmp_code")"
  body_out="$(cat "$tmp_body")"
  rm -f "$tmp_body" "$tmp_code"
  printf '%s\n%s' "$code" "$body_out"
}

request_xml_basic() {
  local url="$1"
  local body="$2"
  local tmp_body tmp_code
  tmp_body="$(mktemp)"
  tmp_code="$(mktemp)"
  curl -sS -u "$PXP_WEBHOOK_USERNAME:$PXP_WEBHOOK_PASSWORD" \
    -H 'Content-Type: application/xml' \
    -X POST "$url" \
    --data-binary "$body" \
    -o "$tmp_body" -w '%{http_code}' > "$tmp_code"
  local code body_out
  code="$(cat "$tmp_code")"
  body_out="$(cat "$tmp_body")"
  rm -f "$tmp_body" "$tmp_code"
  printf '%s\n%s' "$code" "$body_out"
}

load_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: missing $ENV_FILE" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

login_admin() {
  local result code body token
  result="$(request_json POST "$GATEWAY/auth/login" "" "{\"identifier\":\"$DEMO_ADMIN_USERNAME\",\"password\":\"$DEMO_PASSWORD\"}")"
  code="$(printf '%s' "$result" | sed -n '1p')"
  body="$(printf '%s' "$result" | sed -n '2,$p')"
  if [[ "$code" != "200" ]]; then
    echo "Admin login failed with status $code" >&2
    printf '%s\n' "$body" >&2
    exit 1
  fi
  token="$(json_field "$body" access_token)"
  printf '%s' "$token"
}

reset_cases() {
  "$ROOT/scripts/demo-seed.sh" --payment-provider-cases-only >/dev/null
}

write_header() {
  cat > "$ARTIFACT_PATH" <<MARKDOWN
# Payment Provider Simulator

- Ran at: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- Gateway: $GATEWAY
- Scenario request: $SCENARIO

MARKDOWN
}

append_json_section() {
  local title="$1"
  local code="$2"
  local body="$3"
  cat >> "$ARTIFACT_PATH" <<MARKDOWN
## $title

- HTTP status: $code

\`\`\`json
$body
\`\`\`

MARKDOWN
}

append_xml_section() {
  local title="$1"
  local code="$2"
  local body="$3"
  cat >> "$ARTIFACT_PATH" <<MARKDOWN
## $title

- HTTP status: $code

\`\`\`xml
$body
\`\`\`

MARKDOWN
}

capture_payment_state() {
  local token="$1"
  local provider_ref="$2"
  local detail_result detail_code detail_body events_result events_code events_body
  detail_result="$(request_json GET "$GATEWAY/admin/payments/transactions/by-provider-reference/$provider_ref" "$token")"
  detail_code="$(printf '%s' "$detail_result" | sed -n '1p')"
  detail_body="$(printf '%s' "$detail_result" | sed -n '2,$p')"
  append_json_section "Final transaction detail for $provider_ref" "$detail_code" "$detail_body"

  events_result="$(request_json GET "$GATEWAY/admin/payments/transactions/by-provider-reference/$provider_ref/events" "$token")"
  events_code="$(printf '%s' "$events_result" | sed -n '1p')"
  events_body="$(printf '%s' "$events_result" | sed -n '2,$p')"
  append_json_section "Event history for $provider_ref" "$events_code" "$events_body"
}

callback_payment_state() {
  local provider_ref="$1"
  local state="$2"
  local payment_method="$3"
  local reason="$4"
  local decision="$5"
  local message="$6"
  local required_action="$7"
  local xml_body response code body
  xml_body="<PaymentStateChangedNotification><merchantTransactionId>$provider_ref</merchantTransactionId><providerReference>$provider_ref</providerReference><state>$state</state><paymentMethod>$payment_method</paymentMethod><reason>$reason</reason><providerDecision>$decision</providerDecision><providerMessage>$message</providerMessage><requiredAction>$required_action</requiredAction></PaymentStateChangedNotification>"
  response="$(request_xml_basic "$GATEWAY/pxp/payment-state-changed/handlePaymentStateChangedNotification" "$xml_body")"
  code="$(printf '%s' "$response" | sed -n '1p')"
  body="$(printf '%s' "$response" | sed -n '2,$p')"
  append_xml_section "Provider callback $state for $provider_ref" "$code" "$body"
}

admin_action() {
  local token="$1"
  local provider_ref="$2"
  local action="$3"
  local reason="$4"
  local response code body
  response="$(request_json POST "$GATEWAY/admin/payments/transactions/by-provider-reference/$provider_ref/$action" "$token" "{\"reason\":\"$reason\"}")"
  code="$(printf '%s' "$response" | sed -n '1p')"
  body="$(printf '%s' "$response" | sed -n '2,$p')"
  append_json_section "Admin action $action for $provider_ref" "$code" "$body"
}

preview_reconcile() {
  local token="$1"
  local provider_ref="$2"
  local state="$3"
  local payment_method="$4"
  local reason="$5"
  local response code body
  response="$(request_json POST "$GATEWAY/admin/payments/transactions/reconcile/preview" "$token" "{\"providerReference\":\"$provider_ref\",\"state\":\"$state\",\"paymentMethod\":\"$payment_method\",\"reason\":\"$reason\"}")"
  code="$(printf '%s' "$response" | sed -n '1p')"
  body="$(printf '%s' "$response" | sed -n '2,$p')"
  append_json_section "Reconciliation preview for $provider_ref" "$code" "$body"
}

reconcile_payment() {
  local token="$1"
  local provider_ref="$2"
  local state="$3"
  local payment_method="$4"
  local reason="$5"
  local response code body
  response="$(request_json POST "$GATEWAY/admin/payments/transactions/reconcile" "$token" "{\"providerReference\":\"$provider_ref\",\"state\":\"$state\",\"paymentMethod\":\"$payment_method\",\"reason\":\"$reason\"}")"
  code="$(printf '%s' "$response" | sed -n '1p')"
  body="$(printf '%s' "$response" | sed -n '2,$p')"
  append_json_section "Reconcile request for $provider_ref" "$code" "$body"
}

run_single_scenario() {
  local scenario="$1"
  local admin_token="$2"
  reset_cases
  cat >> "$ARTIFACT_PATH" <<MARKDOWN
## Scenario: $scenario

MARKDOWN
  case "$scenario" in
    deposit_action_required)
      callback_payment_state "$PENDING_DEPOSIT_REF" "ACTION_REQUIRED" "card" "seeded action required" "manual_review" "demo action required" "upload_document"
      capture_payment_state "$admin_token" "$PENDING_DEPOSIT_REF"
      ;;
    deposit_approve)
      callback_payment_state "$PENDING_DEPOSIT_REF" "PENDING_APPROVAL" "card" "ready for ops approval" "awaiting_review" "demo approval required" ""
      admin_action "$admin_token" "$PENDING_DEPOSIT_REF" "approve" "approved in investor demo simulator"
      capture_payment_state "$admin_token" "$PENDING_DEPOSIT_REF"
      ;;
    reconcile_pending_deposit)
      preview_reconcile "$admin_token" "$PENDING_DEPOSIT_REF" "SUCCEEDED" "card" "reconcile seeded pending deposit"
      reconcile_payment "$admin_token" "$PENDING_DEPOSIT_REF" "SUCCEEDED" "card" "reconcile seeded pending deposit"
      capture_payment_state "$admin_token" "$PENDING_DEPOSIT_REF"
      ;;
    withdrawal_review_decline)
      callback_payment_state "$PENDING_WITHDRAWAL_REF" "MANUAL_REVIEW" "bank-transfer" "provider requested manual review" "manual_review" "demo withdrawal review" "operator_review"
      admin_action "$admin_token" "$PENDING_WITHDRAWAL_REF" "decline" "declined in investor demo simulator"
      capture_payment_state "$admin_token" "$PENDING_WITHDRAWAL_REF"
      ;;
    withdrawal_retry)
      callback_payment_state "$PENDING_WITHDRAWAL_REF" "FAILED" "bank-transfer" "temporary provider outage" "retryable_failure" "demo retry path" "retry"
      admin_action "$admin_token" "$PENDING_WITHDRAWAL_REF" "retry" "retry requested in investor demo simulator"
      capture_payment_state "$admin_token" "$PENDING_WITHDRAWAL_REF"
      ;;
    deposit_refund)
      admin_action "$admin_token" "$SUCCEEDED_DEPOSIT_REF" "refund" "refund requested in investor demo simulator"
      capture_payment_state "$admin_token" "$SUCCEEDED_DEPOSIT_REF"
      ;;
    deposit_reverse)
      admin_action "$admin_token" "$SUCCEEDED_DEPOSIT_REF" "reverse" "reverse requested in investor demo simulator"
      capture_payment_state "$admin_token" "$SUCCEEDED_DEPOSIT_REF"
      ;;
    deposit_chargeback)
      admin_action "$admin_token" "$SUCCEEDED_DEPOSIT_REF" "chargeback" "chargeback requested in investor demo simulator"
      capture_payment_state "$admin_token" "$SUCCEEDED_DEPOSIT_REF"
      ;;
    *)
      echo "Unknown scenario: $scenario" >&2
      exit 1
      ;;
  esac
}

print_usage() {
  cat <<USAGE
Usage:
  ./scripts/payment-provider-simulator.sh <scenario>

Scenarios:
  deposit_action_required
  deposit_approve
  reconcile_pending_deposit
  withdrawal_review_decline
  withdrawal_retry
  deposit_refund
  deposit_reverse
  deposit_chargeback
  full_pack
  list
USAGE
}

load_env

if [[ "$SCENARIO" == "list" || "$SCENARIO" == "--help" || "$SCENARIO" == "-h" ]]; then
  print_usage
  exit 0
fi

write_header
reset_cases
ADMIN_TOKEN="$(login_admin)"

if [[ "$SCENARIO" == "full_pack" ]]; then
  for entry in \
    deposit_action_required \
    deposit_approve \
    reconcile_pending_deposit \
    withdrawal_review_decline \
    withdrawal_retry \
    deposit_refund \
    deposit_reverse \
    deposit_chargeback; do
    run_single_scenario "$entry" "$ADMIN_TOKEN"
  done
else
  run_single_scenario "$SCENARIO" "$ADMIN_TOKEN"
fi

echo "Wrote payment simulator artifact: $ARTIFACT_PATH"
