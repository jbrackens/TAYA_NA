#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-http://127.0.0.1:3002}"
GATEWAY_BASE_URL="${GATEWAY_BASE_URL:-http://127.0.0.1:18080}"
SPORTS_CSV="${SPORTS_CSV:-mlb,nfl,nba,ufc,ncaa_baseball}"
CHECK_ESPORTS_COMPAT="${CHECK_ESPORTS_COMPAT:-1}"

IFS=',' read -r -a SPORTS <<<"$SPORTS_CSV"

failures=0

http_code() {
  local url="$1"
  curl -sS -o /dev/null -w "%{http_code}" "$url"
}

json_get_field() {
  local field="$1"
  node -e '
const field = process.argv[1];
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    const parsed = JSON.parse(raw);
    if (field === "firstFixtureId") {
      const value = parsed && parsed.data && parsed.data[0] && parsed.data[0].fixtureId;
      process.stdout.write(typeof value === "string" ? value : "");
      return;
    }
    const value = parsed && parsed[field];
    process.stdout.write(typeof value === "string" ? value : "");
  } catch (_error) {
    process.stdout.write("");
  }
});
' "$field" 2>/dev/null
}

check_status_ok() {
  local code="$1"
  local label="$2"
  if [[ "$code" != "200" ]]; then
    echo "[fail] $label returned HTTP $code"
    failures=$((failures + 1))
    return 1
  fi
  echo "[ok]   $label returned HTTP 200"
  return 0
}

echo "[info] FRONTEND_BASE_URL=$FRONTEND_BASE_URL"
echo "[info] GATEWAY_BASE_URL=$GATEWAY_BASE_URL"
echo "[info] SPORTS=${SPORTS[*]}"
echo "[info] CHECK_ESPORTS_COMPAT=$CHECK_ESPORTS_COMPAT"

if [[ "$CHECK_ESPORTS_COMPAT" == "1" || "$CHECK_ESPORTS_COMPAT" == "true" ]]; then
  echo "\n[check] esports compatibility"
  esports_canonical_code="$(http_code "$GATEWAY_BASE_URL/api/v1/sports/esports/events?page=1&pageSize=1")"
  check_status_ok "$esports_canonical_code" "gateway canonical esports events" || true
  esports_wrapper_code="$(http_code "$GATEWAY_BASE_URL/api/v1/esports/events?page=1&pageSize=1")"
  check_status_ok "$esports_wrapper_code" "gateway esports wrapper events" || true
fi

for sport in "${SPORTS[@]}"; do
  sport="${sport// /}"
  if [[ -z "$sport" ]]; then
    continue
  fi

  echo "\n[check] sport=$sport"

  gateway_events_url="$GATEWAY_BASE_URL/api/v1/sports/$sport/events?page=1&pageSize=1"
  gateway_code="$(http_code "$gateway_events_url")"
  check_status_ok "$gateway_code" "gateway events ($sport)" || true

  frontend_sport_url="$FRONTEND_BASE_URL/sports/$sport"
  frontend_sport_code="$(http_code "$frontend_sport_url")"
  if [[ "$frontend_sport_code" =~ ^(200|301|302|307|308)$ ]]; then
    echo "[ok]   sportsbook route /sports/$sport returned HTTP $frontend_sport_code"
  else
    echo "[fail] sportsbook route /sports/$sport returned HTTP $frontend_sport_code"
    failures=$((failures + 1))
  fi

  fixtures_url="$FRONTEND_BASE_URL/api/odds-feed/fixtures/?sport=$sport&page=1&itemsPerPage=1"
  fixtures_code="$(http_code "$fixtures_url")"
  check_status_ok "$fixtures_code" "odds-feed fixtures ($sport)" || true
  fixtures_payload="$(curl -sS "$fixtures_url" || true)"
  if [[ -z "$fixtures_payload" ]]; then
    echo "[fail] odds-feed fixtures payload ($sport) is empty"
    failures=$((failures + 1))
    continue
  fi

  fixtures_source="$(printf "%s" "$fixtures_payload" | json_get_field source)"
  fixtures_warning="$(printf "%s" "$fixtures_payload" | json_get_field warning)"
  if [[ "$fixtures_source" == "fallback" ]]; then
    echo "[fail] odds-feed fixtures ($sport) fell back to placeholder payload"
    failures=$((failures + 1))
    continue
  fi
  if [[ -n "$fixtures_warning" ]]; then
    echo "[fail] odds-feed fixtures ($sport) warning: $fixtures_warning"
    failures=$((failures + 1))
    continue
  fi

  fixture_id="$(printf "%s" "$fixtures_payload" | json_get_field firstFixtureId)"
  if [[ -z "$fixture_id" ]]; then
    echo "[warn] no fixtureId returned for $sport (continuing)"
    continue
  fi

  details_url="$FRONTEND_BASE_URL/api/odds-feed/fixtures/$fixture_id/?sport=$sport"
  details_code="$(http_code "$details_url")"
  check_status_ok "$details_code" "odds-feed fixture details ($sport:$fixture_id)" || true

done

if (( failures > 0 )); then
  echo "\n[error] sports route smoke checks failed ($failures failure(s))"
  exit 1
fi

echo "\n[ok] sports route smoke checks passed"
