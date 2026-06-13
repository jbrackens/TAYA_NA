#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LOCK_DIR="$ROOT/.demo-seed.lock"

ENV_FILE="${INVESTOR_DEMO_ENV_FILE:-$ROOT/.env.demo}"

# shellcheck disable=SC1091
source "$ROOT/scripts/investor-demo-common.sh"
investor_demo_load_env "$ROOT" "$ENV_FILE"

COMPOSE_BASE="$ROOT/docker-compose.yml"
COMPOSE_DEMO="$ROOT/docker-compose.demo.yml"
COMPOSE=(docker compose -f "$COMPOSE_BASE" -f "$COMPOSE_DEMO" --env-file "$ENV_FILE")
GATEWAY="${GATEWAY:-$API_BASE}"

DEMO_ADMIN_EMAIL="demoadmin@phoenix.demo"
DEMO_ADMIN_USERNAME="demoadmin"
DEMO_PLAYER_EMAIL="demoplayer@phoenix.demo"
DEMO_PLAYER_USERNAME="demoplayer"
DEMO_OPS_EMAIL="demoopsplayer@phoenix.demo"
DEMO_OPS_USERNAME="demoopsplayer"
DEMO_PASSWORD="Password123!"

OPS_WALLET_ID="92000000-0000-0000-0000-000000000001"
OPS_SUCCEEDED_DEPOSIT_ID="92000000-0000-0000-0000-000000000011"
OPS_PENDING_DEPOSIT_ID="92000000-0000-0000-0000-000000000012"
OPS_PENDING_WITHDRAWAL_ID="92000000-0000-0000-0000-000000000013"
OPS_WITHDRAWAL_RESERVATION_ID="demo-reservation-withdrawal-001"

OPS_SUCCEEDED_DEPOSIT_REF="demo-pxp-settled-deposit-001"
OPS_PENDING_DEPOSIT_REF="demo-pxp-deposit-001"
OPS_PENDING_WITHDRAWAL_REF="demo-pxp-withdrawal-001"

OPS_IDPV_SESSION_ID="93000000-0000-0000-0000-000000000011"
OPS_KBA_SESSION_ID="93000000-0000-0000-0000-000000000012"
OPS_IDPV_PROVIDER_REF="demo-idcomply-idpv-001"
OPS_IDPV_CASE_ID="demo-idcomply-case-001"
OPS_KBA_PROVIDER_REF="demo-idcomply-kba-001"
OPS_KBA_CASE_ID="demo-idcomply-case-002"

SEED_PLAYER_DATA=true
SEED_PAYMENT_PROVIDER_CASES=true
SEED_VERIFICATION_PROVIDER_CASES=true

for arg in "$@"; do
  case "$arg" in
    --provider-cases-only)
      SEED_PLAYER_DATA=false
      SEED_PAYMENT_PROVIDER_CASES=true
      SEED_VERIFICATION_PROVIDER_CASES=true
      ;;
    --payment-provider-cases-only)
      SEED_PLAYER_DATA=false
      SEED_PAYMENT_PROVIDER_CASES=true
      SEED_VERIFICATION_PROVIDER_CASES=false
      ;;
    --verification-provider-cases-only)
      SEED_PLAYER_DATA=false
      SEED_PAYMENT_PROVIDER_CASES=false
      SEED_VERIFICATION_PROVIDER_CASES=true
      ;;
  esac
done

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

psql_value() {
  local sql="$1"
  "${COMPOSE[@]}" exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -Atqc "$sql"
}

psql_script() {
  "${COMPOSE[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME"
}

load_env() {
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

acquire_lock() {
  local attempts=0
  while ! mkdir "$LOCK_DIR" 2>/dev/null; do
    attempts=$((attempts + 1))
    if [[ "$attempts" -ge 150 ]]; then
      echo "Timed out waiting for demo seed lock: $LOCK_DIR" >&2
      exit 1
    fi
    sleep 0.2
  done
  trap 'rmdir "$LOCK_DIR" >/dev/null 2>&1 || true' EXIT
}

login_user() {
  local identifier="$1"
  local password="$2"
  local attempt result code body token
  for attempt in 1 2 3 4 5 6; do
    result="$(request_json POST "$GATEWAY/auth/login" "" "{\"identifier\":\"$identifier\",\"password\":\"$password\"}")"
    code="$(printf '%s' "$result" | sed -n '1p')"
    body="$(printf '%s' "$result" | sed -n '2,$p')"
    if [[ "$code" == "200" ]]; then
      token="$(json_field "$body" access_token)"
      printf '%s|%s' "$token" "$body"
      return 0
    fi
    if [[ "$code" != "429" ]]; then
      return 1
    fi
    sleep 13
  done
  return 1
}

register_user() {
  local email="$1"
  local username="$2"
  local first_name="$3"
  local last_name="$4"
  request_json POST "$GATEWAY/api/v1/users" "" "{\"email\":\"$email\",\"username\":\"$username\",\"password\":\"$DEMO_PASSWORD\",\"first_name\":\"$first_name\",\"last_name\":\"$last_name\",\"date_of_birth\":\"1990-01-01\",\"country\":\"MT\"}"
}

find_user_id() {
  local email="$1" username="$2"
  psql_value "SELECT id FROM users WHERE lower(username) = lower('$username') OR lower(email) = lower('$email') ORDER BY CASE WHEN lower(username) = lower('$username') THEN 0 ELSE 1 END LIMIT 1"
}

ensure_user_record() {
  local email="$1" username="$2" role="$3" first_name="$4" last_name="$5"
  local user_id register_result register_code
  user_id="$(find_user_id "$email" "$username")"
  if [[ -z "$user_id" ]]; then
    register_result="$(register_user "$email" "$username" "$first_name" "$last_name")"
    register_code="$(printf '%s' "$register_result" | sed -n '1p')"
    if [[ "$register_code" != "201" ]]; then
      echo "Failed to register $username" >&2
      printf '%s\n' "$register_result" >&2
      exit 1
    fi
    user_id="$(find_user_id "$email" "$username")"
  fi
  if [[ -z "$user_id" ]]; then
    echo "Failed to resolve user $username after registration" >&2
    exit 1
  fi
  if [[ "$role" != "user" ]]; then
    "${COMPOSE[@]}" exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -qc "UPDATE users SET role = '$role', updated_at = NOW() WHERE id = '$user_id'::uuid;"
  fi
  printf '%s' "$user_id"
}

ensure_wallet() {
  local user_id="$1" token="$2" wallet_code tx_count
  wallet_code="$(curl -sS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $token" "$GATEWAY/api/v1/wallets/$user_id")"
  if [[ "$wallet_code" == "404" ]]; then
    request_json POST "$GATEWAY/api/v1/wallets/$user_id" "$token" '{"currency":"USD"}' >/dev/null
  fi
  tx_count="$(psql_value "SELECT COUNT(*) FROM wallet_transactions wt JOIN wallets w ON w.id = wt.wallet_id WHERE w.user_id = '$user_id'::uuid")"
  if [[ "${tx_count:-0}" == "0" ]]; then
    request_json POST "$GATEWAY/api/v1/wallets/$user_id/deposits" "$token" '{"amount":250.00,"payment_method":"card","payment_token":"demo_seed_card","currency":"USD"}' >/dev/null
  fi
}

ensure_wallet_exists() {
  local user_id="$1" wallet_id
  wallet_id="$(psql_value "SELECT id FROM wallets WHERE user_id = '$user_id'::uuid ORDER BY created_at ASC LIMIT 1")"
  if [[ -z "$wallet_id" ]]; then
    wallet_id="$OPS_WALLET_ID"
    psql_script <<SQL >/dev/null
INSERT INTO wallets (id, user_id, balance, currency, status, created_at, updated_at)
VALUES ('$wallet_id'::uuid, '$user_id'::uuid, 0.00, 'USD', 'active', NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET user_id = EXCLUDED.user_id,
    currency = EXCLUDED.currency,
    status = EXCLUDED.status,
    updated_at = NOW();
SQL
  fi
  printf '%s' "$wallet_id"
}

ensure_payment_provider_cases() {
  local user_id="$1" wallet_id
  wallet_id="$(ensure_wallet_exists "$user_id")"
  psql_script <<SQL >/dev/null
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wallets WHERE id = '$wallet_id'::uuid) THEN
    INSERT INTO wallets (id, user_id, balance, currency, status, created_at, updated_at)
    VALUES ('$wallet_id'::uuid, '$user_id'::uuid, 0.00, 'USD', 'active', NOW(), NOW());
  END IF;
END
\$\$;

DELETE FROM payment_transaction_events
WHERE transaction_id IN (
  SELECT id FROM wallet_transactions WHERE wallet_id = '$wallet_id'::uuid
);

DELETE FROM wallet_transactions
WHERE wallet_id = '$wallet_id'::uuid;

DELETE FROM event_store
WHERE aggregate_type = 'wallet' AND aggregate_id = '$wallet_id';

DELETE FROM event_outbox
WHERE aggregate_type = 'wallet' AND aggregate_id = '$wallet_id';

UPDATE wallets
SET balance = 560.00,
    currency = 'USD',
    status = 'active',
    updated_at = NOW()
WHERE id = '$wallet_id'::uuid;

INSERT INTO wallet_transactions (
  id, wallet_id, type, status, amount, balance_before, balance_after, reference,
  provider, provider_reference, provider_updated_at, metadata, created_at
) VALUES
(
  '$OPS_SUCCEEDED_DEPOSIT_ID'::uuid,
  '$wallet_id'::uuid,
  'deposit',
  'SUCCEEDED',
  60.00,
  500.00,
  560.00,
  'card',
  'pxp',
  '$OPS_SUCCEEDED_DEPOSIT_REF',
  NOW() - INTERVAL '45 minutes',
  jsonb_build_object(
    'payment_method', 'card',
    'orchestration_mode', 'provider',
    'seed_case', 'succeeded_deposit'
  ),
  NOW() - INTERVAL '45 minutes'
),
(
  '$OPS_PENDING_DEPOSIT_ID'::uuid,
  '$wallet_id'::uuid,
  'deposit',
  'PENDING',
  75.00,
  560.00,
  560.00,
  'card',
  'pxp',
  '$OPS_PENDING_DEPOSIT_REF',
  NOW() - INTERVAL '20 minutes',
  jsonb_build_object(
    'payment_method', 'card',
    'orchestration_mode', 'provider',
    'seed_case', 'pending_deposit'
  ),
  NOW() - INTERVAL '20 minutes'
),
(
  '$OPS_PENDING_WITHDRAWAL_ID'::uuid,
  '$wallet_id'::uuid,
  'withdrawal',
  'PENDING',
  -40.00,
  560.00,
  560.00,
  'bank-transfer',
  'pxp',
  '$OPS_PENDING_WITHDRAWAL_REF',
  NOW() - INTERVAL '10 minutes',
  jsonb_build_object(
    'payment_method', 'bank-transfer',
    'orchestration_mode', 'provider',
    'reservation_id', '$OPS_WITHDRAWAL_RESERVATION_ID',
    'seed_case', 'pending_withdrawal'
  ),
  NOW() - INTERVAL '10 minutes'
);

INSERT INTO payment_transaction_events (
  id, transaction_id, status, source, reason, provider, provider_reference, payload, created_at
) VALUES
(
  gen_random_uuid(),
  '$OPS_SUCCEEDED_DEPOSIT_ID'::uuid,
  'SUCCEEDED',
  'provider',
  'seeded_provider_success',
  'pxp',
  '$OPS_SUCCEEDED_DEPOSIT_REF',
  jsonb_build_object(
    'payment_method', 'card',
    'seed_case', 'succeeded_deposit'
  ),
  NOW() - INTERVAL '45 minutes'
),
(
  gen_random_uuid(),
  '$OPS_PENDING_DEPOSIT_ID'::uuid,
  'PENDING',
  'system',
  'provider_pending_created',
  'pxp',
  '$OPS_PENDING_DEPOSIT_REF',
  jsonb_build_object(
    'payment_method', 'card',
    'transaction_type', 'deposit',
    'seed_case', 'pending_deposit'
  ),
  NOW() - INTERVAL '20 minutes'
),
(
  gen_random_uuid(),
  '$OPS_PENDING_WITHDRAWAL_ID'::uuid,
  'PENDING',
  'system',
  'provider_pending_created',
  'pxp',
  '$OPS_PENDING_WITHDRAWAL_REF',
  jsonb_build_object(
    'payment_method', 'bank-transfer',
    'transaction_type', 'withdrawal',
    'reservation_id', '$OPS_WITHDRAWAL_RESERVATION_ID',
    'seed_case', 'pending_withdrawal'
  ),
  NOW() - INTERVAL '10 minutes'
);

INSERT INTO event_store (aggregate_type, aggregate_id, event_type, version, payload, metadata)
VALUES (
  'wallet',
  '$wallet_id',
  'WalletFundsReserved',
  1,
  jsonb_build_object(
    'reservation_id', '$OPS_WITHDRAWAL_RESERVATION_ID',
    'amount', '40.00',
    'reference_id', '$OPS_WITHDRAWAL_RESERVATION_ID',
    'reference_type', 'withdrawal',
    'action', 'reserve'
  ),
  jsonb_build_object('source', 'demo-seed')
);
SQL
}

ensure_verification_provider_cases() {
  local user_id="$1"
  psql_script <<SQL >/dev/null
DELETE FROM verification_provider_events
WHERE verification_session_id IN (
  SELECT id FROM user_verification_sessions WHERE user_id = '$user_id'::uuid
);

DELETE FROM user_verification_sessions
WHERE user_id = '$user_id'::uuid;

UPDATE users
SET kyc_status = 'pending',
    updated_at = NOW()
WHERE id = '$user_id'::uuid;

INSERT INTO user_verification_sessions (
  id, user_id, flow_type, provider, status, questions, answers, redirect_url,
  provider_reference, provider_decision, provider_case_id, last_error_code,
  assigned_operator_id, assigned_at, created_at, updated_at, completed_at
) VALUES
(
  '$OPS_IDPV_SESSION_ID'::uuid,
  '$user_id'::uuid,
  'idpv',
  'idcomply',
  'pending_review',
  '[]'::jsonb,
  '[]'::jsonb,
  'https://demo.idcomply.local/sessions/$OPS_IDPV_CASE_ID',
  '$OPS_IDPV_PROVIDER_REF',
  'manual_review',
  '$OPS_IDPV_CASE_ID',
  '',
  NULL,
  NULL,
  NOW() - INTERVAL '15 minutes',
  NOW() - INTERVAL '5 minutes',
  NULL
),
(
  '$OPS_KBA_SESSION_ID'::uuid,
  '$user_id'::uuid,
  'kba',
  'idcomply',
  'questions_presented',
  jsonb_build_array(
    jsonb_build_object(
      'questionId', 'occupation',
      'text', 'What is your occupation?',
      'choices', jsonb_build_array('Engineer', 'Teacher', 'Nurse')
    ),
    jsonb_build_object(
      'questionId', 'residence',
      'text', 'How long have you lived at your address?',
      'choices', jsonb_build_array('<1 year', '1-3 years', '3+ years')
    )
  ),
  '[]'::jsonb,
  '',
  '$OPS_KBA_PROVIDER_REF',
  'questionnaire',
  '$OPS_KBA_CASE_ID',
  '',
  NULL,
  NULL,
  NOW() - INTERVAL '12 minutes',
  NOW() - INTERVAL '3 minutes',
  NULL
);

INSERT INTO verification_provider_events (
  id, verification_session_id, provider, status, source, reason, payload, created_at
) VALUES
(
  gen_random_uuid(),
  '$OPS_IDPV_SESSION_ID'::uuid,
  'idcomply',
  'submitted_to_provider',
  'provider_start',
  'seeded_idpv_started',
  jsonb_build_object(
    'providerReference', '$OPS_IDPV_PROVIDER_REF',
    'providerCaseId', '$OPS_IDPV_CASE_ID',
    'flowType', 'idpv'
  ),
  NOW() - INTERVAL '15 minutes'
),
(
  gen_random_uuid(),
  '$OPS_IDPV_SESSION_ID'::uuid,
  'idcomply',
  'pending_review',
  'provider_callback',
  'seeded_manual_review',
  jsonb_build_object(
    'providerReference', '$OPS_IDPV_PROVIDER_REF',
    'providerCaseId', '$OPS_IDPV_CASE_ID',
    'providerDecision', 'manual_review',
    'flowType', 'idpv'
  ),
  NOW() - INTERVAL '5 minutes'
),
(
  gen_random_uuid(),
  '$OPS_KBA_SESSION_ID'::uuid,
  'idcomply',
  'questions_presented',
  'provider_questionnaire',
  'seeded_questionnaire',
  jsonb_build_object(
    'providerReference', '$OPS_KBA_PROVIDER_REF',
    'providerCaseId', '$OPS_KBA_CASE_ID',
    'providerDecision', 'questionnaire',
    'questionCount', 2,
    'flowType', 'kba'
  ),
  NOW() - INTERVAL '3 minutes'
);
SQL
}

ensure_limit() {
  local user_id="$1" token="$2" count
  count="$(psql_value "SELECT COUNT(*) FROM compliance_limits WHERE user_id = '$user_id'::uuid")"
  if [[ "${count:-0}" == "0" ]]; then
    request_json POST "$GATEWAY/api/v1/users/$user_id/limits" "$token" '{"limit_type":"daily_deposit","limit_amount":500.00,"currency":"USD","effective_date":"2026-03-10T00:00:00Z"}' >/dev/null
  fi
}

ensure_page() {
  local token="$1" count
  count="$(psql_value "SELECT COUNT(*) FROM cms_pages WHERE slug = 'how-to-place-a-bet'")"
  if [[ "${count:-0}" == "0" ]]; then
    request_json POST "$GATEWAY/api/v1/pages" "$token" '{"title":"How to Place a Bet","slug":"how-to-place-a-bet","content":"<h1>How to Place a Bet</h1><p>Pick a market, choose an outcome, fund the wallet, and place the bet.</p>","meta_title":"How to Place a Bet | Phoenix","published":true}' >/dev/null
  fi
}

ensure_promotion() {
  local token="$1" count
  count="$(psql_value "SELECT COUNT(*) FROM cms_promotions WHERE name = 'Welcome Bonus'")"
  if [[ "${count:-0}" == "0" ]]; then
    request_json POST "$GATEWAY/api/v1/promotions" "$token" '{"name":"Welcome Bonus","description":"Get a 50% top-up on the first simulated deposit.","promotion_type":"deposit_bonus","rules":{"bonus_percentage":50,"max_bonus":500,"wagering_requirement":5},"start_date":"2026-03-10T00:00:00Z","end_date":"2027-03-10T00:00:00Z","active":true}' >/dev/null
  fi
}

ensure_banner() {
  local token="$1" count
  count="$(psql_value "SELECT COUNT(*) FROM cms_banners WHERE title = 'Phoenix Championship Weekend'")"
  if [[ "${count:-0}" == "0" ]]; then
    request_json POST "$GATEWAY/api/v1/banners" "$token" '{"title":"Phoenix Championship Weekend","image_url":"https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1400&q=80","link":"/sportsbook","position":"homepage_hero","start_date":"2026-03-10T00:00:00Z","end_date":"2027-03-10T00:00:00Z"}' >/dev/null
  fi
}

ensure_terms() {
  local token="$1" count
  count="$(psql_value "SELECT COUNT(*) FROM terms_documents")"
  if [[ "${count:-0}" == "0" ]]; then
    request_json POST "$GATEWAY/admin/upload-terms" "$token" '{"current_terms_version":"1","terms_content":"<h1>Phoenix Terms</h1><p>Demo terms and conditions for the Go platform.</p>","terms_days_threshold":365}' >/dev/null
  fi
}

ensure_event_and_market() {
  local token="$1" external_event_id="$2" sport="$3" league="$4" home_team="$5" away_team="$6" venue="$7" market_type="$8" outcome_a="$9" outcome_b="${10}" outcome_id_a="${11}" outcome_id_b="${12}" odds_a="${13}" odds_b="${14}"
  local event_id market_count event_result create_event_code create_event_body
  event_id="$(psql_value "SELECT id FROM events WHERE external_id = '$external_event_id' LIMIT 1")"
  if [[ -z "$event_id" ]]; then
    event_result="$(request_json POST "$GATEWAY/api/v1/events" "$token" "{\"external_event_id\":\"$external_event_id\",\"sport\":\"$sport\",\"league\":\"$league\",\"home_team\":\"$home_team\",\"away_team\":\"$away_team\",\"scheduled_start\":\"2026-04-01T18:00:00Z\",\"venue\":\"$venue\",\"country\":\"US\"}")"
    create_event_code="$(printf '%s' "$event_result" | sed -n '1p')"
    create_event_body="$(printf '%s' "$event_result" | sed -n '2,$p')"
    if [[ "$create_event_code" != "201" ]]; then
      echo "Failed to create event $external_event_id" >&2
      printf '%s\n' "$create_event_body" >&2
      exit 1
    fi
    event_id="$(json_field "$create_event_body" event_id)"
  fi
  market_count="$(psql_value "SELECT COUNT(*) FROM markets WHERE event_id = '$event_id'::uuid")"
  if [[ "${market_count:-0}" == "0" ]]; then
    request_json POST "$GATEWAY/api/v1/markets" "$token" "{\"event_id\":\"$event_id\",\"market_type\":\"$market_type\",\"status\":\"open\",\"outcomes\":[{\"name\":\"$outcome_a\",\"outcome_id\":\"$outcome_id_a\"},{\"name\":\"$outcome_b\",\"outcome_id\":\"$outcome_id_b\"}],\"odds\":{\"$outcome_id_a\":$odds_a,\"$outcome_id_b\":$odds_b}}" >/dev/null
  fi
}

ensure_demo_bet() {
  local player_id="$1" player_token="$2"
  local bet_count market_id outcome_id odds
  bet_count="$(psql_value "SELECT COUNT(*) FROM bets WHERE user_id = '$player_id'::uuid")"
  if [[ "${bet_count:-0}" != "0" ]]; then
    return
  fi
  market_id="$(psql_value "SELECT id FROM markets ORDER BY created_at ASC LIMIT 1")"
  outcome_id="$(psql_value "SELECT id FROM outcomes WHERE market_id = '$market_id'::uuid ORDER BY created_at ASC LIMIT 1")"
  odds="$(psql_value "SELECT odds FROM outcomes WHERE id = '$outcome_id'::uuid")"
  request_json POST "$GATEWAY/api/v1/bets" "$player_token" "{\"user_id\":\"$player_id\",\"market_id\":\"$market_id\",\"outcome_id\":\"$outcome_id\",\"stake\":10.00,\"odds_type\":\"decimal\",\"acceptance\":\"auto\",\"odds\":$odds}" >/dev/null
}

ensure_achievement() {
  local player_id="$1" admin_token="$2" count
  count="$(psql_value "SELECT COUNT(*) FROM user_achievements WHERE user_id = '$player_id'::uuid")"
  if [[ "${count:-0}" == "0" ]]; then
    request_json POST "$GATEWAY/api/v1/achievements/$player_id/unlock" "$admin_token" '{"achievement_id":"first-bet","description":"Placed the first bet on Phoenix Go.","reward_points":100,"badge_image":"/badges/first-bet.svg"}' >/dev/null || true
  fi
}

main() {
  acquire_lock
  load_env
  echo "==> Seeding investor-demo data..."
  local admin_login player_login admin_token admin_id player_token player_id ops_id
  admin_id="$(ensure_user_record "$DEMO_ADMIN_EMAIL" "$DEMO_ADMIN_USERNAME" admin Demo Admin)"
  if [[ "$SEED_PLAYER_DATA" == "true" ]]; then
    admin_login="$(login_user "$DEMO_ADMIN_USERNAME" "$DEMO_PASSWORD")"
    admin_token="${admin_login%%|*}"
    player_id="$(ensure_user_record "$DEMO_PLAYER_EMAIL" "$DEMO_PLAYER_USERNAME" user Demo Player)"
    player_login="$(login_user "$DEMO_PLAYER_USERNAME" "$DEMO_PASSWORD")"
    player_token="${player_login%%|*}"
    ensure_wallet "$player_id" "$player_token"
    ensure_limit "$player_id" "$player_token"
    ensure_page "$admin_token"
    ensure_promotion "$admin_token"
    ensure_banner "$admin_token"
    ensure_terms "$admin_token"
    ensure_event_and_market "$admin_token" demo_epl_match_001 soccer "English Premier League" "Manchester United" "Liverpool" "Old Trafford" moneyline "Manchester United" "Liverpool" 11111111-1111-1111-1111-111111111111 22222222-2222-2222-2222-222222222222 2.10 1.90
    ensure_event_and_market "$admin_token" demo_nba_game_001 basketball NBA "Boston Celtics" "New York Knicks" "TD Garden" moneyline "Boston Celtics" "New York Knicks" 33333333-3333-3333-3333-333333333333 44444444-4444-4444-4444-444444444444 1.85 2.05
    ensure_event_and_market "$admin_token" demo_mma_fight_001 mma UFC "Alex Hunter" "Rico Stone" "T-Mobile Arena" moneyline "Alex Hunter" "Rico Stone" 55555555-5555-5555-5555-555555555555 66666666-6666-6666-6666-666666666666 1.72 2.25
    ensure_demo_bet "$player_id" "$player_token"
    ensure_achievement "$player_id" "$admin_token"
  fi
  if [[ "$SEED_PAYMENT_PROVIDER_CASES" == "true" || "$SEED_VERIFICATION_PROVIDER_CASES" == "true" ]]; then
    ops_id="$(ensure_user_record "$DEMO_OPS_EMAIL" "$DEMO_OPS_USERNAME" user Demo Ops)"
  fi
  if [[ "$SEED_PAYMENT_PROVIDER_CASES" == "true" ]]; then
    ensure_payment_provider_cases "$ops_id"
  fi
  if [[ "$SEED_VERIFICATION_PROVIDER_CASES" == "true" ]]; then
    ensure_verification_provider_cases "$ops_id"
  fi
  echo "==> Demo users"
  echo "  Admin:  $DEMO_ADMIN_USERNAME / $DEMO_PASSWORD"
  if [[ "$SEED_PLAYER_DATA" == "true" ]]; then
    echo "  Player: $DEMO_PLAYER_USERNAME / $DEMO_PASSWORD"
  fi
  if [[ "$SEED_PAYMENT_PROVIDER_CASES" == "true" || "$SEED_VERIFICATION_PROVIDER_CASES" == "true" ]]; then
    echo "  Ops:    $DEMO_OPS_USERNAME / $DEMO_PASSWORD"
  fi
  echo "==> Demo data ready."
}

main "$@"
