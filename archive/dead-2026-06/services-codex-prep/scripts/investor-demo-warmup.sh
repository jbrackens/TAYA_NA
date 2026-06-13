#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
ENV_FILE="${INVESTOR_DEMO_ENV_FILE:-$ROOT/.env.demo}"

# shellcheck disable=SC1091
source "$ROOT/scripts/investor-demo-common.sh"
investor_demo_load_env "$ROOT" "$ENV_FILE"

DEMO_PLAYER_USERNAME="${DEMO_PLAYER_USERNAME:-demoplayer}"
DEMO_ADMIN_USERNAME="${DEMO_ADMIN_USERNAME:-demoadmin}"
DEMO_PASSWORD="${DEMO_PASSWORD:-Password123!}"

json_field() {
  local json="$1"
  local field="$2"
  printf '%s' "$json" | sed -n "s/.*\"${field}\":\"\([^\"]*\)\".*/\1/p" | head -1
}

login_and_extract() {
  local identifier="$1"
  local tmp_body tmp_code code body token user_id
  tmp_body="$(mktemp)"
  tmp_code="$(mktemp)"
  curl -sS -X POST "$API_BASE/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"identifier\":\"$identifier\",\"password\":\"$DEMO_PASSWORD\"}" \
    -o "$tmp_body" -w '%{http_code}' > "$tmp_code"
  code="$(cat "$tmp_code")"
  body="$(cat "$tmp_body")"
  rm -f "$tmp_body" "$tmp_code"
  if [[ "$code" != "200" ]]; then
    echo "ERROR: login failed for $identifier with status $code" >&2
    printf '%s\n' "$body" >&2
    return 1
  fi
  token="$(json_field "$body" access_token)"
  user_id="$(json_field "$body" user_id)"
  printf '%s|%s' "$token" "$user_id"
}

echo "==> Warming player, Talon, and gateway routes..."
curl -fsS "$PLAYER_BASE/" >/dev/null
curl -fsS "$TALON_BASE/" >/dev/null
curl -fsS "$API_BASE/health" >/dev/null
curl -fsS "$API_BASE/ready" >/dev/null
curl -fsS "$REALTIME_BASE/health" >/dev/null
curl -fsS "$API_BASE/api/v1/markets" >/dev/null
curl -fsS "$API_BASE/api/v1/events" >/dev/null
curl -fsS "$API_BASE/api/v1/sports" >/dev/null
curl -fsS "$API_BASE/api/v1/prediction/overview" >/dev/null
curl -fsS "$API_BASE/api/v1/terms/current" >/dev/null

echo "==> Warming authenticated player and operator flows..."
player_auth="$(login_and_extract "$DEMO_PLAYER_USERNAME")"
admin_auth="$(login_and_extract "$DEMO_ADMIN_USERNAME")"

player_token="${player_auth%%|*}"
player_user_id="${player_auth##*|}"
admin_token="${admin_auth%%|*}"

curl -fsS -H "Authorization: Bearer $player_token" "$API_BASE/api/v1/wallets/$player_user_id" >/dev/null
curl -fsS -H "Authorization: Bearer $player_token" "$API_BASE/api/v1/wallets/$player_user_id/transactions" >/dev/null
curl -fsS -H "Authorization: Bearer $admin_token" "$API_BASE/admin/payments/transactions" >/dev/null
curl -fsS -H "Authorization: Bearer $admin_token" "$API_BASE/admin/punters/$player_user_id/timeline" >/dev/null

echo "==> Investor-demo warmup complete."
