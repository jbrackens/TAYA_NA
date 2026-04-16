#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SMOKE_SCRIPT="$ROOT/scripts/qa/sports-route-smoke.sh"

FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-http://127.0.0.1:3002}"
GATEWAY_BASE_URL="${GATEWAY_BASE_URL:-http://127.0.0.1:18080}"
SPORTS_CSV="${SPORTS_CSV:-mlb,nfl,nba,ufc,ncaa_baseball}"
ITERATIONS="${ITERATIONS:-10}"
CHECK_ESPORTS_COMPAT="${CHECK_ESPORTS_COMPAT:-1}"

IFS=',' read -r -a SPORTS <<<"$SPORTS_CSV"

http_code() {
  local url="$1"
  curl -sS -o /dev/null -w "%{http_code}" "$url"
}

echo "[gate] running baseline cross-sport smoke checks"
FRONTEND_BASE_URL="$FRONTEND_BASE_URL" \
GATEWAY_BASE_URL="$GATEWAY_BASE_URL" \
SPORTS_CSV="$SPORTS_CSV" \
CHECK_ESPORTS_COMPAT="$CHECK_ESPORTS_COMPAT" \
bash "$SMOKE_SCRIPT"

echo "[gate] running lightweight cross-sport load loop"
echo "[info] FRONTEND_BASE_URL=$FRONTEND_BASE_URL"
echo "[info] GATEWAY_BASE_URL=$GATEWAY_BASE_URL"
echo "[info] SPORTS=${SPORTS[*]}"
echo "[info] ITERATIONS=$ITERATIONS"
echo "[info] CHECK_ESPORTS_COMPAT=$CHECK_ESPORTS_COMPAT"

failures=0

for ((i = 1; i <= ITERATIONS; i++)); do
  echo "[iteration] $i/$ITERATIONS"

  if [[ "$CHECK_ESPORTS_COMPAT" == "1" || "$CHECK_ESPORTS_COMPAT" == "true" ]]; then
    esports_canonical_code="$(http_code "$GATEWAY_BASE_URL/api/v1/sports/esports/events?page=1&pageSize=1")"
    if [[ "$esports_canonical_code" != "200" ]]; then
      echo "[fail] canonical esports events returned HTTP $esports_canonical_code (iteration=$i)"
      failures=$((failures + 1))
    fi
    esports_wrapper_code="$(http_code "$GATEWAY_BASE_URL/api/v1/esports/events?page=1&pageSize=1")"
    if [[ "$esports_wrapper_code" != "200" ]]; then
      echo "[fail] esports wrapper events returned HTTP $esports_wrapper_code (iteration=$i)"
      failures=$((failures + 1))
    fi
  fi

  for sport in "${SPORTS[@]}"; do
    sport="${sport// /}"
    if [[ -z "$sport" ]]; then
      continue
    fi

    gateway_events_code="$(http_code "$GATEWAY_BASE_URL/api/v1/sports/$sport/events?page=1&pageSize=5")"
    if [[ "$gateway_events_code" != "200" ]]; then
      echo "[fail] gateway events ($sport) returned HTTP $gateway_events_code (iteration=$i)"
      failures=$((failures + 1))
    fi

    frontend_fixtures_code="$(http_code "$FRONTEND_BASE_URL/api/odds-feed/fixtures/?sport=$sport&page=1&itemsPerPage=5")"
    if [[ "$frontend_fixtures_code" != "200" ]]; then
      echo "[fail] frontend fixtures ($sport) returned HTTP $frontend_fixtures_code (iteration=$i)"
      failures=$((failures + 1))
    fi
  done
done

if ((failures > 0)); then
  echo "[error] cross-sport regression gate failed with $failures error(s)"
  exit 1
fi

echo "[ok] cross-sport regression gate passed"
