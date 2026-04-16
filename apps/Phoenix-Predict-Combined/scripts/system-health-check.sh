#!/usr/bin/env bash
#
# SYSTEM HEALTH CHECK — Phoenix Sportsbook Player App
# =====================================================
# This script verifies that all 24 core systems are wired into the frontend.
# Run before EVERY commit, EVERY PR, EVERY deploy. No exceptions.
#
# Exit code 0 = all systems present
# Exit code 1 = missing systems detected (BLOCKS deployment)
#
# Usage:
#   ./scripts/system-health-check.sh
#   ./scripts/system-health-check.sh --verbose
#   ./scripts/system-health-check.sh --fix  (shows what to do for each failure)
#
# This script exists because a previous refactor silently dropped all 24 core
# systems from the frontend. That must never happen again.
#

set -uo pipefail

VERBOSE=false
FIX_MODE=false
for arg in "$@"; do
  case $arg in
    --verbose) VERBOSE=true ;;
    --fix) FIX_MODE=true; VERBOSE=true ;;
  esac
done

# ── Configuration ──────────────────────────────────────────────────────────

# Player app source root (App Router)
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)/phoenix-frontend/packages/app"
APP_SRC="$APP_DIR/app"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0
FAILURES=()

# ── Check functions ────────────────────────────────────────────────────────

check_exists() {
  local label="$1"
  local pattern="$2"
  local fix_hint="${3:-}"

  if compgen -G "$pattern" > /dev/null 2>&1; then
    PASS=$((PASS + 1))
    $VERBOSE && echo -e "  ${GREEN}✓${NC} $label"
    return 0
  else
    FAIL=$((FAIL + 1))
    FAILURES+=("$label")
    echo -e "  ${RED}✗${NC} $label"
    $FIX_MODE && [ -n "$fix_hint" ] && echo -e "    ${YELLOW}→ FIX: $fix_hint${NC}"
    return 0
  fi
}

check_grep() {
  local label="$1"
  local pattern="$2"
  local search_dir="$3"
  local fix_hint="${4:-}"

  if grep -r "$pattern" "$search_dir" --include="*.ts" --include="*.tsx" --include="*.js" -q 2>/dev/null; then
    PASS=$((PASS + 1))
    $VERBOSE && echo -e "  ${GREEN}✓${NC} $label"
    return 0
  else
    FAIL=$((FAIL + 1))
    FAILURES+=("$label")
    echo -e "  ${RED}✗${NC} $label"
    $FIX_MODE && [ -n "$fix_hint" ] && echo -e "    ${YELLOW}→ FIX: $fix_hint${NC}"
    return 0
  fi
}

check_warn() {
  local label="$1"
  local pattern="$2"
  local search_dir="$3"

  if grep -r "$pattern" "$search_dir" --include="*.ts" --include="*.tsx" --include="*.js" -q 2>/dev/null; then
    PASS=$((PASS + 1))
    $VERBOSE && echo -e "  ${GREEN}✓${NC} $label"
  else
    WARN=$((WARN + 1))
    echo -e "  ${YELLOW}⚠${NC} $label (warning — not blocking)"
  fi
}

# ── Header ─────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║        PHOENIX SPORTSBOOK — SYSTEM HEALTH CHECK            ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  App directory: ${CYAN}$APP_SRC${NC}"
echo ""

# ── GATE 1: State Management ──────────────────────────────────────────────

echo -e "${BOLD}─── Gate 1: State Management ───${NC}"
check_grep "Redux/Zustand store provider in layout" \
  "Provider\|StoreProvider\|createStore\|useStore" "$APP_SRC" \
  "Add Redux Provider or Zustand store to app/layout.tsx"
check_grep "betSlice or betslip state" \
  "betSlice\|useBetslip\|BetslipProvider\|betslipContext" "$APP_SRC" \
  "Port betSlice.ts or BetslipProvider.tsx into app/"
check_grep "sportSlice or sport state" \
  "sportSlice\|useSports\|SportProvider" "$APP_SRC" \
  "Port sportSlice.ts — required for sidebar sport navigation"
check_grep "authSlice or auth state" \
  "authSlice\|useAuth\|AuthProvider\|authContext" "$APP_SRC" \
  "Port authSlice.ts — required for login/session management"
check_grep "settingsSlice or user preferences" \
  "settingsSlice\|useSettings\|oddsFormat\|DisplayOddsEnum" "$APP_SRC" \
  "Port settingsSlice.ts — required for odds format, language, preferences"
echo ""

# ── GATE 2: API Client Layer ──────────────────────────────────────────────

echo -e "${BOLD}─── Gate 2: API Client Layer ───${NC}"
check_grep "HTTP client with auth headers" \
  "Authorization.*Bearer\|apiClient\|createClient\|axiosInstance\|fetchWithAuth" "$APP_SRC" \
  "Port go-api/client.ts — base HTTP client with token injection"
check_grep "Betting API client (place bets)" \
  "placeBet\|placeParlay\|/api/v1/bets\|betting-client\|usePlaceBet" "$APP_SRC" \
  "Port betting-client.ts + betting-hooks.ts"
check_grep "Wallet API client (balance/deposit)" \
  "wallet-client\|useWallet\|getBalance\|deposit\|withdrawal" "$APP_SRC" \
  "Port wallet-client.ts + wallet-hooks.ts"
check_grep "Events/Fixtures API client" \
  "events-client\|useEvents\|useFixtures\|getFixtures\|eventsHooks" "$APP_SRC" \
  "Port events-client.ts + events-hooks.ts"
check_grep "Markets API client" \
  "markets-client\|useMarkets\|getMarkets\|marketsHooks" "$APP_SRC" \
  "Port markets-client.ts + markets-hooks.ts"
echo ""

# ── GATE 3: Betslip System ────────────────────────────────────────────────

echo -e "${BOLD}─── Gate 3: Betslip System (Revenue Critical) ───${NC}"
check_grep "Betslip component renders selections" \
  "selections\|BetslipList\|betslip.*list\|selection.*map" "$APP_SRC" \
  "Port Betslip.tsx + betslip/list/ components"
check_grep "Stake input exists" \
  "stake.*input\|setStake\|stakePerLeg\|stake.*onChange\|enterStake" "$APP_SRC" \
  "Betslip must have stake input — port betslip/summary/"
check_grep "Place Bet button wired to API" \
  "placeBet\|placeParlay\|handlePlaceBet\|submitBet\|confirmBet" "$APP_SRC" \
  "Place Bet must call POST /api/v1/bets — port betting-client"
check_grep "Odds button adds to betslip" \
  "addToBetSlip\|toggleBetElement\|addSelection\|bet-button" "$APP_SRC" \
  "Port bet-button/ component — clicking odds adds to betslip"
check_grep "Single/Parlay tab toggle" \
  "SINGLE\|MULTI\|parlay\|parlayMode\|betType\|main-tabs" "$APP_SRC" \
  "Port betslip/main-tabs/ — single and multi-leg bet types"
echo ""

# ── GATE 4: WebSocket Real-Time ───────────────────────────────────────────

echo -e "${BOLD}─── Gate 4: WebSocket Real-Time Data ───${NC}"
check_grep "WebSocket connection established" \
  "WebSocket\|websocket\|new WebSocket\|socket.*connect\|useWebSocket" "$APP_SRC" \
  "Port websocket-service.ts — connect to Go backend WS endpoint"
check_grep "Live odds update handler" \
  "markets.*handler\|odds.*update\|priceChange\|marketUpdate\|onOddsChange" "$APP_SRC" \
  "Port channels-data-handler/markets-data-handler.ts"
check_grep "Bet status update handler" \
  "betUpdate\|wsBetUpdate\|bet.*channel\|betStatusChange" "$APP_SRC" \
  "Port channels-data-handler/bets-channel-handler.ts"
echo ""

# ── GATE 5: Authentication & Session ──────────────────────────────────────

echo -e "${BOLD}─── Gate 5: Authentication & Session ───${NC}"
check_grep "Login calls auth API" \
  "/api/auth/login\|auth.*login\|loginUser\|handleLogin" "$APP_SRC" \
  "Wire login form to Go auth service (:18081)"
check_grep "Token storage/refresh" \
  "tokenStore\|refreshToken\|setToken\|getToken\|authToken" "$APP_SRC" \
  "Port token-store-service.ts for JWT persistence"
check_grep "Session timeout or idle detection" \
  "sessionTimer\|idleActivity\|idle.*detect\|session.*timeout\|SessionTimer" "$APP_SRC" \
  "Port SessionTimerComponent + IdleActivityComponent"
check_grep "Registration flow exists" \
  "register\|signup\|createAccount\|RegisterComponent\|registration" "$APP_SRC" \
  "Port multi-step RegisterComponent from original auth/"
echo ""

# ── GATE 6: Navigation Structure ──────────────────────────────────────────

echo -e "${BOLD}─── Gate 6: Navigation Structure ───${NC}"
check_grep "Sidebar lists individual sports from API" \
  "sports.*map\|sportsList\|sportSlice\|fetchSports\|sport\.name" "$APP_SRC" \
  "Sidebar must fetch and render sports from /api/v1/sports"
check_grep "Wallet/balance in header" \
  "balance\|wallet.*header\|userBalance\|walletDisplay" "$APP_SRC" \
  "Header must show wallet balance when authenticated"
check_grep "Search bar or search functionality" \
  "search.*input\|searchBar\|typeahead\|autocomplete\|handleSearch\|Search.*events\|searchOpen\|topbar-search" "$APP_SRC" \
  "Add search functionality to header or content area"
echo ""

# ── GATE 7: Odds Format System ────────────────────────────────────────────

echo -e "${BOLD}─── Gate 7: Odds Format System ───${NC}"
check_grep "Odds format conversion (American/Decimal/Fractional)" \
  "DisplayOddsEnum\|AMERICAN\|DECIMAL\|FRACTIONAL\|oddsFormat\|convertOdds" "$APP_SRC" \
  "Port odds format system from utils-core/types/common/odd.ts"
echo ""

# ── GATE 8: Core Pages ───────────────────────────────────────────────────

echo -e "${BOLD}─── Gate 8: Core Pages Exist ───${NC}"
check_exists "Home page" "$APP_SRC/page.tsx"
check_exists "Live betting page (/live)" "$APP_SRC/live/page.tsx" \
  "Create app/live/page.tsx for in-play events"
# Sport detail page — check both /sports/[sport] and /sports/[sportId]
if find "$APP_SRC/sports" -name "page.tsx" -mindepth 2 2>/dev/null | grep -q .; then
  PASS=$((PASS + 1)); $VERBOSE && echo -e "  ${GREEN}✓${NC} Sport detail page (/sports/[id])"
else
  FAIL=$((FAIL + 1)); FAILURES+=("Sport detail page (/sports/[id])")
  echo -e "  ${RED}✗${NC} Sport detail page (/sports/[id])"
  $FIX_MODE && echo -e "    ${YELLOW}→ FIX: Create app/sports/[sportId]/page.tsx${NC}"
fi
# Fixture/Match detail page — check both /fixture/[id] and /match/[id]
if find "$APP_SRC" -path "*/match/*/page.tsx" -o -path "*/fixture/*/page.tsx" 2>/dev/null | grep -q .; then
  PASS=$((PASS + 1)); $VERBOSE && echo -e "  ${GREEN}✓${NC} Fixture detail page (/fixture/[id] or /match/[id])"
else
  FAIL=$((FAIL + 1)); FAILURES+=("Fixture detail page (/fixture/[id])")
  echo -e "  ${RED}✗${NC} Fixture detail page (/fixture/[id])"
  $FIX_MODE && echo -e "    ${YELLOW}→ FIX: Create app/fixture/[fixtureId]/page.tsx with all markets${NC}"
fi
check_exists "Bet history page (/bets)" "$APP_SRC/bets/page.tsx" \
  "Create app/bets/page.tsx for bet history"
check_exists "Cashier page (/cashier)" "$APP_SRC/cashier/page.tsx" \
  "Create app/cashier/page.tsx for deposit/withdrawal"
# Account/profile page — check both /account and /profile
if [ -f "$APP_SRC/account/page.tsx" ] || [ -f "$APP_SRC/profile/page.tsx" ]; then
  PASS=$((PASS + 1)); $VERBOSE && echo -e "  ${GREEN}✓${NC} Account/profile page"
else
  FAIL=$((FAIL + 1)); FAILURES+=("Account/profile page")
  echo -e "  ${RED}✗${NC} Account/profile page"
  $FIX_MODE && echo -e "    ${YELLOW}→ FIX: Create app/account/page.tsx for user settings${NC}"
fi
check_exists "Responsible gaming page" "$APP_SRC/responsible-gaming/page.tsx" \
  "Create app/responsible-gaming/page.tsx (regulatory requirement)"
echo ""

# ── GATE 9: Compliance (Warning level — required for licensed markets) ────

echo -e "${BOLD}─── Gate 9: Compliance & Responsible Gaming ───${NC}"
check_warn "GeoComply integration" "geocomply\|GeoComply\|geolocation.*comply" "$APP_SRC"
check_warn "Deposit limits UI" "depositLimit\|deposit.*limit\|setLimit\|retention-client" "$APP_SRC"
check_warn "Self-exclusion flow" "selfExclu\|self.*exclusion\|excludeUser" "$APP_SRC"
check_warn "KYC/Identity verification" "verification\|kyc\|identityVerif\|documentUpload" "$APP_SRC"
check_warn "Terms & conditions page" "terms.*condition\|acceptTerms" "$APP_SRC"
echo ""

# ── GATE 10: i18n ─────────────────────────────────────────────────────────

echo -e "${BOLD}─── Gate 10: Internationalization ───${NC}"
check_warn "i18n provider or translation setup" "i18next\|useTranslation\|TranslationProvider\|t\(" "$APP_SRC"
echo ""

# ── GATE 11: Error Handling ───────────────────────────────────────────────

echo -e "${BOLD}─── Gate 11: Error Handling ───${NC}"
check_exists "Global error boundary" "$APP_SRC/error.tsx" \
  "Create app/error.tsx — Next.js App Router error boundary"
check_warn "API error interceptor" "interceptor\|onError\|errorHandler\|apiError" "$APP_SRC"
echo ""

# ── Summary ───────────────────────────────────────────────────────────────

TOTAL=$((PASS + FAIL))
echo -e "${BOLD}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}Passed:${NC}  $PASS / $TOTAL"
echo -e "  ${RED}Failed:${NC}  $FAIL / $TOTAL"
echo -e "  ${YELLOW}Warnings:${NC} $WARN"
echo ""

if [ $FAIL -gt 0 ]; then
  echo -e "  ${RED}${BOLD}❌ HEALTH CHECK FAILED${NC}"
  echo ""
  echo -e "  ${RED}Missing systems:${NC}"
  for f in "${FAILURES[@]}"; do
    echo -e "    ${RED}•${NC} $f"
  done
  echo ""
  echo -e "  Run ${CYAN}./scripts/system-health-check.sh --fix${NC} to see remediation steps."
  echo ""
  echo -e "  ${RED}${BOLD}DO NOT deploy or merge until all gates pass.${NC}"
  echo -e "  ${RED}${BOLD}DO NOT take shortcuts. Port the original systems.${NC}"
  echo ""
  exit 1
else
  echo -e "  ${GREEN}${BOLD}✅ ALL SYSTEMS PRESENT${NC}"
  echo ""
  exit 0
fi
