#!/usr/bin/env bash
set -euo pipefail

CHAT_PUBLIC_URL="${CHAT_PUBLIC_URL:?CHAT_PUBLIC_URL is required, e.g. https://chat.hulana.com}"
CHAT_PARENT_ORIGIN="${CHAT_PARENT_ORIGIN:?CHAT_PARENT_ORIGIN is required, e.g. https://app.hulana.com}"
CHAT_ROOM="${CHAT_DEFAULT_ROOM:-global}"

origin_of() {
  node -e "console.log(new URL(process.argv[1]).origin)" "$1"
}

chat_origin="$(origin_of "$CHAT_PUBLIC_URL")"
parent_origin="$(origin_of "$CHAT_PARENT_ORIGIN")"

echo "==> Validating Rocket.Chat origin"
echo "chat_origin=$chat_origin"
echo "parent_origin=$parent_origin"

info="$(curl -fsS "$CHAT_PUBLIC_URL/api/info")"
version="$(printf '%s' "$info" | node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); console.log(data.version || 'unknown')")"
echo "Rocket.Chat API reachable: version $version"

headers="$(curl -sI "$CHAT_PUBLIC_URL/channel/$CHAT_ROOM" | tr -d '\r')"
xfo="$(printf '%s\n' "$headers" | sed -n 's/^[Xx]-[Ff]rame-[Oo]ptions:[[:space:]]*//p' | head -1)"
csp="$(printf '%s\n' "$headers" | sed -n 's/^[Cc]ontent-[Ss]ecurity-[Pp]olicy:[[:space:]]*//p' | head -1)"
lower_xfo="$(printf '%s' "$xfo" | tr '[:upper:]' '[:lower:]')"

echo "X-Frame-Options=${xfo:-<absent>}"
echo "Content-Security-Policy=${csp:-<absent>}"

if [[ "$chat_origin" != "$parent_origin" && "$lower_xfo" == "sameorigin" ]]; then
  echo "FAIL: X-Frame-Options: sameorigin blocks embedding $chat_origin inside $parent_origin." >&2
  exit 1
fi

if [[ "$lower_xfo" == allow-from* ]]; then
  echo "WARN: X-Frame-Options ALLOW-FROM is legacy and is not a modern Chromium allowlist." >&2
fi

if [[ -z "$csp" ]]; then
  echo "FAIL: missing Content-Security-Policy header on Rocket.Chat channel response." >&2
  exit 1
fi

if ! printf '%s' "$csp" | grep -qi 'frame-ancestors'; then
  echo "FAIL: CSP does not include frame-ancestors. Add a tight edge policy for the Hula app origin." >&2
  exit 1
fi

if ! printf '%s' "$csp" | grep -Fq "$parent_origin"; then
  echo "FAIL: CSP frame-ancestors does not include $parent_origin." >&2
  exit 1
fi

echo "PASS: Rocket.Chat origin headers are compatible with the configured parent origin."
