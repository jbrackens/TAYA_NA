#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHAT_PUBLIC_URL="${CHAT_PUBLIC_URL:-http://localhost:3002}"
CHAT_PARENT_ORIGIN="${CHAT_PARENT_ORIGIN:-http://localhost:3000}"
ROCKETCHAT_ADMIN_USERNAME="${ROCKETCHAT_ADMIN_USERNAME:-tiangge-admin}"
ROCKETCHAT_ADMIN_PASSWORD="${ROCKETCHAT_ADMIN_PASSWORD:-ChangeMe123!}"
ROCKETCHAT_GLOBAL_ROOM="${CHAT_DEFAULT_ROOM:-global}"
OUTPUT_ENV_FILE="${CHAT_SPIKE_OUTPUT_ENV_FILE:-$ROOT/.env.chat-spike}"

json_get() {
  local expr="$1"
  node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(0, 'utf8'));
const value = ${expr};
if (value === undefined || value === null) process.exit(1);
if (typeof value === 'object') console.log(JSON.stringify(value));
else console.log(String(value));
"
}

request_json() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local user_id="${4:-}"
  local token="${5:-}"
  local tmp_body tmp_code code
  tmp_body="$(mktemp)"
  tmp_code="$(mktemp)"
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "$CHAT_PUBLIC_URL$path" \
      -H 'Content-Type: application/json' \
      ${user_id:+-H "X-User-Id: $user_id"} \
      ${token:+-H "X-Auth-Token: $token"} \
      -d "$body" \
      -o "$tmp_body" -w '%{http_code}' > "$tmp_code"
  else
    curl -sS -X "$method" "$CHAT_PUBLIC_URL$path" \
      ${user_id:+-H "X-User-Id: $user_id"} \
      ${token:+-H "X-Auth-Token: $token"} \
      -o "$tmp_body" -w '%{http_code}' > "$tmp_code"
  fi
  code="$(cat "$tmp_code")"
  cat "$tmp_body"
  rm -f "$tmp_body" "$tmp_code"
  [[ "$code" =~ ^2|400$ ]]
}

echo "==> Waiting for Rocket.Chat at $CHAT_PUBLIC_URL"
for _ in $(seq 1 60); do
  if curl -fsS "$CHAT_PUBLIC_URL/api/info" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
info="$(curl -fsS "$CHAT_PUBLIC_URL/api/info")"
version="$(printf '%s' "$info" | json_get 'data.version')"
echo "Rocket.Chat API is reachable: version $version"

echo "==> Logging in as configured spike admin"
login_body="{\"user\":\"$ROCKETCHAT_ADMIN_USERNAME\",\"password\":\"$ROCKETCHAT_ADMIN_PASSWORD\"}"
login="$(curl -fsS -X POST "$CHAT_PUBLIC_URL/api/v1/login" -H 'Content-Type: application/json' -d "$login_body")"
admin_user_id="$(printf '%s' "$login" | json_get 'data.data.userId')"
admin_auth_token="$(printf '%s' "$login" | json_get 'data.data.authToken')"
echo "Admin REST login succeeded."
umask 077
cat > "$OUTPUT_ENV_FILE" <<EOF
ROCKETCHAT_ADMIN_USER_ID=$admin_user_id
ROCKETCHAT_ADMIN_AUTH_TOKEN=$admin_auth_token
EOF
echo "Gateway admin credentials written to $OUTPUT_ENV_FILE"

echo "==> Ensuring #$ROCKETCHAT_GLOBAL_ROOM exists"
create_room="$(request_json POST /api/v1/channels.create "{\"name\":\"$ROCKETCHAT_GLOBAL_ROOM\"}" "$admin_user_id" "$admin_auth_token" || true)"
if printf '%s' "$create_room" | grep -q '"success":true'; then
  echo "Created #$ROCKETCHAT_GLOBAL_ROOM."
elif printf '%s' "$create_room" | grep -Eqi 'already.*exist|duplicate-channel-name|error-room-already-exist'; then
  echo "#$ROCKETCHAT_GLOBAL_ROOM already exists."
else
  echo "WARN: could not confirm #$ROCKETCHAT_GLOBAL_ROOM creation:" >&2
  printf '%s\n' "$create_room" >&2
fi

echo "==> Checking required settings by ID"
for setting in FileUpload_Enabled Accounts_iframe_enabled Iframe_Integration_send_enable Iframe_Integration_receive_enable Iframe_Integration_send_target_origin Iframe_Integration_receive_origin Iframe_X_Frame_Options; do
  setting_body="$(request_json GET "/api/v1/settings/$setting" "" "$admin_user_id" "$admin_auth_token" || true)"
  if printf '%s' "$setting_body" | grep -q '"success":true'; then
    value="$(printf '%s' "$setting_body" | json_get 'data.value' || true)"
    echo "$setting=$value"
  else
    echo "WARN: could not read setting $setting" >&2
  fi
done

echo "==> Checking iframe response headers"
headers="$(curl -sI "$CHAT_PUBLIC_URL/channel/$ROCKETCHAT_GLOBAL_ROOM" | tr -d '\r')"
xfo="$(printf '%s\n' "$headers" | sed -n 's/^[Xx]-[Ff]rame-[Oo]ptions:[[:space:]]*//p' | head -1)"
lower_xfo="$(printf '%s' "$xfo" | tr '[:upper:]' '[:lower:]')"
chat_origin="$(node -e "console.log(new URL(process.argv[1]).origin)" "$CHAT_PUBLIC_URL")"
parent_origin="$(node -e "console.log(new URL(process.argv[1]).origin)" "$CHAT_PARENT_ORIGIN")"
if [[ "$chat_origin" != "$parent_origin" && "$lower_xfo" == "sameorigin" ]]; then
  echo "ERROR: Rocket.Chat returns X-Frame-Options: sameorigin, which blocks embedding $chat_origin inside $parent_origin." >&2
  echo "Configure Rocket.Chat/proxy headers before launch; see docs/chat-launch-runbook.md." >&2
  exit 1
fi
echo "X-Frame-Options=${xfo:-<absent>}"

cat <<EOF

Next manual checks:
  1. Complete any remaining Rocket.Chat setup wizard step in the browser.
  2. Verify iframe origin settings for the real Tiangge origin.
  3. Verify mute/ban/delete/report moderation in the Rocket.Chat admin UI.
  4. Verify Chrome cookie behavior under the same-site chat domain.
EOF
