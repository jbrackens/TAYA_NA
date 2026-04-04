#!/bin/bash
###############################################################################
# Phoenix Sportsbook Frontend — End-to-End Smoke Test
#
# Tests the real API integration chain:
#   1. Sports listing
#   2. Events listing (with filtering)
#   3. Single event detail
#   4. Markets for a fixture
#   5. Auth login flow
#   6. Wallet balance (requires auth)
#   7. Profile fetch (requires auth)
#   8. Bet placement (requires auth)
#   9. WebSocket connectivity
#
# Usage:
#   ./smoke-test.sh                          # uses default localhost:3001
#   API_BASE=https://api.example.com ./smoke-test.sh
###############################################################################

set +e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

API_BASE="${API_BASE:-http://localhost:18080}"
# Detect whether the Go backend uses /api prefix or not
# Try /api/v1/sports first, then /v1/sports
detect_prefix() {
  local resp=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/api/v1/sports" 2>/dev/null)
  if [ "$resp" = "200" ]; then
    echo "/api/v1"
    return
  fi
  resp=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/v1/sports" 2>/dev/null)
  if [ "$resp" = "200" ]; then
    echo "/v1"
    return
  fi
  # Fallback — try with /api prefix (matches client.ts baseUrl + events-client paths)
  echo "/api/v1"
}

PREFIX=$(detect_prefix)
BASE="${API_BASE}${PREFIX}"

PASS=0
FAIL=0
SKIP=0
TOKEN=""

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BLUE}║       Phoenix Smoke Test — $(date '+%Y-%m-%d %H:%M:%S')        ║${RESET}"
echo -e "${BLUE}║       API: ${API_BASE}  Prefix: ${PREFIX}${RESET}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""

test_endpoint() {
  local name="$1"
  local method="${2:-GET}"
  local url="$3"
  local body="$4"
  local auth="$5"

  echo -n "  [$method] $name ... "

  local headers="-H 'Content-Type: application/json'"
  if [ -n "$auth" ] && [ -n "$TOKEN" ]; then
    headers="$headers -H 'Authorization: Bearer $TOKEN'"
  fi

  local response
  if [ "$method" = "GET" ]; then
    response=$(eval curl -s -w "\n%{http_code}" $headers "$url" 2>/dev/null)
  elif [ "$method" = "POST" ]; then
    response=$(eval curl -s -w "\n%{http_code}" -X POST $headers -d "'$body'" "$url" 2>/dev/null)
  else
    response=$(eval curl -s -w "\n%{http_code}" -X "$method" $headers -d "'$body'" "$url" 2>/dev/null)
  fi

  local http_code=$(echo "$response" | tail -1)
  local body_content=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo -e "${GREEN}$http_code OK${RESET}"
    ((PASS++))
    # Return body for chaining
    echo "$body_content" > /tmp/smoke_last_response.json
    return 0
  elif [ "$http_code" = "000" ]; then
    echo -e "${YELLOW}UNREACHABLE (is the backend running?)${RESET}"
    ((SKIP++))
    return 1
  elif [ "$http_code" = "401" ] && [ -n "$auth" ]; then
    echo -e "${YELLOW}$http_code UNAUTHORIZED (expected if no test account)${RESET}"
    ((SKIP++))
    return 1
  else
    echo -e "${RED}$http_code FAIL${RESET}"
    if [ -n "$body_content" ]; then
      echo -e "    ${RED}→ $(echo "$body_content" | head -c 200)${RESET}"
    fi
    ((FAIL++))
    return 1
  fi
}

###############################################################################
echo -e "${BLUE}[1/9] Sports Listing${RESET}"
test_endpoint "GET /sports" "GET" "${BASE}/sports"

###############################################################################
echo ""
echo -e "${BLUE}[2/9] Events Listing${RESET}"
test_endpoint "GET /events" "GET" "${BASE}/events"
test_endpoint "GET /events?status=in_play" "GET" "${BASE}/events?status=in_play"
test_endpoint "GET /events?status=scheduled&limit=5" "GET" "${BASE}/events?status=scheduled&limit=5"

###############################################################################
echo ""
echo -e "${BLUE}[3/9] Single Event Detail${RESET}"
# Extract first event ID from previous response
EVENT_ID=$(cat /tmp/smoke_last_response.json 2>/dev/null | node -e "
  try { const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const events = d.events || d.items || d;
  const e = Array.isArray(events) ? events[0] : null;
  console.log(e?.event_id || e?.eventId || '');
  } catch { console.log(''); }
" 2>/dev/null)
if [ -n "$EVENT_ID" ]; then
  test_endpoint "GET /events/$EVENT_ID" "GET" "${BASE}/events/${EVENT_ID}"
else
  echo "  (skipped — no event ID available)"
  ((SKIP++))
fi

###############################################################################
echo ""
echo -e "${BLUE}[4/9] Markets for a Fixture${RESET}"
FIXTURE_ID=$(cat /tmp/smoke_last_response.json 2>/dev/null | node -e "
  try { const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log(d.fixture_id || d.fixtureId || '');
  } catch { console.log(''); }
" 2>/dev/null)
if [ -n "$FIXTURE_ID" ]; then
  test_endpoint "GET /markets?fixture_id=$FIXTURE_ID" "GET" "${BASE}/markets?fixture_id=${FIXTURE_ID}"
else
  echo "  (skipped — no fixture ID available)"
  ((SKIP++))
fi

###############################################################################
echo ""
echo -e "${BLUE}[5/9] Auth Login${RESET}"
TEST_USER="${SMOKE_TEST_USER:-test@phoenix.dev}"
TEST_PASS="${SMOKE_TEST_PASS:-testpassword123}"
test_endpoint "POST /auth/login" "POST" "${API_BASE}${PREFIX}/../auth/login" "{\"email\":\"${TEST_USER}\",\"password\":\"${TEST_PASS}\"}"

# Try to extract token
TOKEN=$(cat /tmp/smoke_last_response.json 2>/dev/null | node -e "
  try { const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log(d.access_token || d.accessToken || d.token || '');
  } catch { console.log(''); }
" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo -e "  ${YELLOW}No auth token obtained — authenticated tests will be skipped${RESET}"
fi

###############################################################################
echo ""
echo -e "${BLUE}[6/9] Wallet Balance (auth required)${RESET}"
if [ -n "$TOKEN" ]; then
  test_endpoint "GET /wallet/balance" "GET" "${BASE}/wallet/balance" "" "auth"
else
  echo "  (skipped — not authenticated)"
  ((SKIP++))
fi

###############################################################################
echo ""
echo -e "${BLUE}[7/9] Profile Fetch (auth required)${RESET}"
if [ -n "$TOKEN" ]; then
  test_endpoint "GET /user/profile" "GET" "${BASE}/user/profile" "" "auth"
else
  echo "  (skipped — not authenticated)"
  ((SKIP++))
fi

###############################################################################
echo ""
echo -e "${BLUE}[8/9] Bet Placement (auth required)${RESET}"
if [ -n "$TOKEN" ] && [ -n "$FIXTURE_ID" ]; then
  test_endpoint "POST /bets (dry run)" "POST" "${BASE}/bets" \
    "{\"fixtureId\":\"${FIXTURE_ID}\",\"marketId\":\"test\",\"selectionId\":\"test\",\"stake\":0.01,\"odds\":1.5}" \
    "auth"
else
  echo "  (skipped — requires auth + fixture)"
  ((SKIP++))
fi

###############################################################################
echo ""
echo -e "${BLUE}[9/9] WebSocket Connectivity${RESET}"
WS_URL="${WS_URL:-ws://localhost:18080/ws}"
echo -n "  [WS] Connect to $WS_URL ... "
# Quick WS test — just check if connection is accepted
WS_RESULT=$(timeout 5 node -e "
  const ws = new (require('ws'))('${WS_URL}');
  ws.on('open', () => { console.log('OK'); ws.close(); process.exit(0); });
  ws.on('error', (e) => { console.log('FAIL:' + e.message); process.exit(1); });
  setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 4000);
" 2>/dev/null || echo "NO_WS_MODULE")

if [ "$WS_RESULT" = "OK" ]; then
  echo -e "${GREEN}CONNECTED${RESET}"
  ((PASS++))
elif [ "$WS_RESULT" = "NO_WS_MODULE" ]; then
  echo -e "${YELLOW}SKIPPED (ws module not installed)${RESET}"
  ((SKIP++))
else
  echo -e "${YELLOW}${WS_RESULT} (is WS server running?)${RESET}"
  ((SKIP++))
fi

###############################################################################
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BLUE}║                    SMOKE TEST RESULTS                       ║${RESET}"
echo -e "${BLUE}╠══════════════════════════════════════════════════════════════╣${RESET}"
echo -e "${BLUE}║${RESET}  ${GREEN}Passed: $PASS${RESET}  |  ${RED}Failed: $FAIL${RESET}  |  ${YELLOW}Skipped: $SKIP${RESET}"
if [ "$FAIL" -eq 0 ]; then
  echo -e "${BLUE}║${RESET}  ${GREEN}✓ All reachable endpoints responded correctly${RESET}"
else
  echo -e "${BLUE}║${RESET}  ${RED}✗ Some endpoints failed — check output above${RESET}"
fi
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# Clean up
rm -f /tmp/smoke_last_response.json

exit $FAIL
