#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/.env.demo"
ARTIFACT_DIR="$ROOT/docs/runbooks/artifacts"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
ARTIFACT_PATH="${ARTIFACT_PATH:-$ARTIFACT_DIR/verification_provider_simulator_${STAMP}.md}"
GATEWAY="${GATEWAY:-http://localhost:8080}"
DEMO_ADMIN_USERNAME="${DEMO_ADMIN_USERNAME:-demoadmin}"
DEMO_PASSWORD="${DEMO_PASSWORD:-Password123!}"
IDCOMPLY_WEBHOOK_USERNAME="${IDCOMPLY_WEBHOOK_USERNAME:-idcomply}"
IDCOMPLY_WEBHOOK_PASSWORD="${IDCOMPLY_WEBHOOK_PASSWORD:-idcomply-secret}"
SCENARIO="${1:-list}"

IDPV_CASE_ID="demo-idcomply-case-001"
IDPV_PROVIDER_REF="demo-idcomply-idpv-001"
KBA_CASE_ID="demo-idcomply-case-002"
KBA_PROVIDER_REF="demo-idcomply-kba-001"

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

request_json_basic() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local tmp_body tmp_code
  tmp_body="$(mktemp)"
  tmp_code="$(mktemp)"
  local curl_args=(-sS -u "$IDCOMPLY_WEBHOOK_USERNAME:$IDCOMPLY_WEBHOOK_PASSWORD" -X "$method" "$url" -o "$tmp_body" -w '%{http_code}')
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
  local result code body token user_id
  result="$(request_json POST "$GATEWAY/auth/login" "" "{\"identifier\":\"$DEMO_ADMIN_USERNAME\",\"password\":\"$DEMO_PASSWORD\"}")"
  code="$(printf '%s' "$result" | sed -n '1p')"
  body="$(printf '%s' "$result" | sed -n '2,$p')"
  if [[ "$code" != "200" ]]; then
    echo "Admin login failed with status $code" >&2
    printf '%s\n' "$body" >&2
    exit 1
  fi
  token="$(json_field "$body" access_token)"
  user_id="$(json_field "$body" user_id)"
  printf '%s|%s' "$token" "$user_id"
}

reset_cases() {
  "$ROOT/scripts/demo-seed.sh" --verification-provider-cases-only >/dev/null
}

write_header() {
  cat > "$ARTIFACT_PATH" <<MARKDOWN
# Verification Provider Simulator

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

capture_verification_state() {
  local token="$1"
  local case_id="$2"
  local detail_result detail_code detail_body session_id events_result events_code events_body queue_result queue_code queue_body
  detail_result="$(request_json GET "$GATEWAY/admin/providers/idcomply/verification-sessions/by-case/$case_id" "$token")"
  detail_code="$(printf '%s' "$detail_result" | sed -n '1p')"
  detail_body="$(printf '%s' "$detail_result" | sed -n '2,$p')"
  append_json_section "Verification detail for $case_id" "$detail_code" "$detail_body"

  session_id="$(json_field "$detail_body" id)"
  if [[ -z "$session_id" ]]; then
    session_id="$(json_field "$detail_body" sessionId)"
  fi
  if [[ -n "$session_id" ]]; then
    events_result="$(request_json GET "$GATEWAY/admin/users/verification-sessions/$session_id/events" "$token")"
    events_code="$(printf '%s' "$events_result" | sed -n '1p')"
    events_body="$(printf '%s' "$events_result" | sed -n '2,$p')"
    append_json_section "Verification events for $case_id" "$events_code" "$events_body"
  fi

  queue_result="$(request_json GET "$GATEWAY/admin/providers/idcomply/verification-sessions/review-queue" "$token")"
  queue_code="$(printf '%s' "$queue_result" | sed -n '1p')"
  queue_body="$(printf '%s' "$queue_result" | sed -n '2,$p')"
  append_json_section "Review queue snapshot after $case_id" "$queue_code" "$queue_body"
}

provider_callback_by_case() {
  local case_id="$1"
  local body="$2"
  local response code body_out
  response="$(request_json_basic POST "$GATEWAY/providers/idcomply/verification-sessions/by-case/$case_id/status" "$body")"
  code="$(printf '%s' "$response" | sed -n '1p')"
  body_out="$(printf '%s' "$response" | sed -n '2,$p')"
  append_json_section "Provider callback for $case_id" "$code" "$body_out"
}

admin_decision_by_case() {
  local token="$1"
  local case_id="$2"
  local decision="$3"
  local reason="$4"
  local response code body
  response="$(request_json POST "$GATEWAY/admin/providers/idcomply/verification-sessions/by-case/$case_id/decision" "$token" "{\"decision\":\"$decision\",\"reason\":\"$reason\"}")"
  code="$(printf '%s' "$response" | sed -n '1p')"
  body="$(printf '%s' "$response" | sed -n '2,$p')"
  append_json_section "Admin decision $decision for $case_id" "$code" "$body"
}

assign_case() {
  local token="$1"
  local case_id="$2"
  local assigned_to="$3"
  local detail_result detail_body session_id response code body
  detail_result="$(request_json GET "$GATEWAY/admin/providers/idcomply/verification-sessions/by-case/$case_id" "$token")"
  detail_body="$(printf '%s' "$detail_result" | sed -n '2,$p')"
  session_id="$(json_field "$detail_body" id)"
  if [[ -z "$session_id" ]]; then
    session_id="$(json_field "$detail_body" sessionId)"
  fi
  if [[ -z "$session_id" ]]; then
    echo "Failed to resolve session id for case $case_id" >&2
    exit 1
  fi
  response="$(request_json POST "$GATEWAY/admin/users/verification-sessions/$session_id/assign" "$token" "{\"assignedTo\":\"$assigned_to\",\"reason\":\"assigned in investor demo simulator\"}")"
  code="$(printf '%s' "$response" | sed -n '1p')"
  body="$(printf '%s' "$response" | sed -n '2,$p')"
  append_json_section "Assignment for $case_id" "$code" "$body"
}

add_note_by_case() {
  local token="$1"
  local case_id="$2"
  local note="$3"
  local detail_result detail_body session_id response code body
  detail_result="$(request_json GET "$GATEWAY/admin/providers/idcomply/verification-sessions/by-case/$case_id" "$token")"
  detail_body="$(printf '%s' "$detail_result" | sed -n '2,$p')"
  session_id="$(json_field "$detail_body" id)"
  if [[ -z "$session_id" ]]; then
    session_id="$(json_field "$detail_body" sessionId)"
  fi
  if [[ -z "$session_id" ]]; then
    echo "Failed to resolve session id for case $case_id" >&2
    exit 1
  fi
  response="$(request_json POST "$GATEWAY/admin/users/verification-sessions/$session_id/notes" "$token" "{\"note\":\"$note\"}")"
  code="$(printf '%s' "$response" | sed -n '1p')"
  body="$(printf '%s' "$response" | sed -n '2,$p')"
  append_json_section "Note for $case_id" "$code" "$body"
}

run_single_scenario() {
  local scenario="$1"
  local admin_token="$2"
  reset_cases
  cat >> "$ARTIFACT_PATH" <<MARKDOWN
## Scenario: $scenario

MARKDOWN
  case "$scenario" in
    idpv_manual_review)
      provider_callback_by_case "$IDPV_CASE_ID" '{"status":"manual_review","reason":"seeded manual review","payload":{"providerCaseId":"demo-idcomply-case-001","providerDecision":"manual_review"}}'
      capture_verification_state "$admin_token" "$IDPV_CASE_ID"
      ;;
    idpv_approve)
      provider_callback_by_case "$IDPV_CASE_ID" '{"status":"completed","reason":"seeded approval","payload":{"providerCaseId":"demo-idcomply-case-001","providerDecision":"verified"}}'
      capture_verification_state "$admin_token" "$IDPV_CASE_ID"
      ;;
    idpv_assign_and_note)
      assign_case "$admin_token" "$IDPV_CASE_ID" "$ADMIN_USER_ID"
      add_note_by_case "$admin_token" "$IDPV_CASE_ID" "Investor demo note: reviewed by operator flow."
      capture_verification_state "$admin_token" "$IDPV_CASE_ID"
      ;;
    kba_questionnaire)
      provider_callback_by_case "$KBA_CASE_ID" '{"status":"questionnaire","reason":"seeded questionnaire refresh","questions":[{"questionId":"occupation","text":"What is your occupation?","choices":["Engineer","Teacher","Nurse"]},{"questionId":"residence","text":"How long have you lived at your address?","choices":["<1 year","1-3 years","3+ years"]}],"payload":{"providerCaseId":"demo-idcomply-case-002","providerDecision":"questionnaire"}}'
      capture_verification_state "$admin_token" "$KBA_CASE_ID"
      ;;
    kba_approve)
      admin_decision_by_case "$admin_token" "$KBA_CASE_ID" "approve" "approved in investor demo simulator"
      capture_verification_state "$admin_token" "$KBA_CASE_ID"
      ;;
    kba_reject)
      admin_decision_by_case "$admin_token" "$KBA_CASE_ID" "reject" "rejected in investor demo simulator"
      capture_verification_state "$admin_token" "$KBA_CASE_ID"
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
  ./scripts/verification-provider-simulator.sh <scenario>

Scenarios:
  idpv_manual_review
  idpv_approve
  idpv_assign_and_note
  kba_questionnaire
  kba_approve
  kba_reject
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
ADMIN_AUTH="$(login_admin)"
ADMIN_TOKEN="${ADMIN_AUTH%%|*}"
ADMIN_USER_ID="${ADMIN_AUTH##*|}"

if [[ "$SCENARIO" == "full_pack" ]]; then
  for entry in \
    idpv_manual_review \
    idpv_assign_and_note \
    idpv_approve \
    kba_questionnaire \
    kba_approve \
    kba_reject; do
    run_single_scenario "$entry" "$ADMIN_TOKEN"
  done
else
  run_single_scenario "$SCENARIO" "$ADMIN_TOKEN"
fi

echo "Wrote verification simulator artifact: $ARTIFACT_PATH"
