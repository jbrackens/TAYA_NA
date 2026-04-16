#!/usr/bin/env bash
#
# SYSTEM HEALTH CHECK — Talon Backoffice (Admin Panel)
# =====================================================
# This script verifies that all core backoffice systems are wired into the frontend.
# Run before EVERY commit, EVERY PR, EVERY deploy. No exceptions.
#
# Exit code 0 = all systems present
# Exit code 1 = missing systems detected (BLOCKS deployment)
#
# Usage:
#   ./scripts/backoffice-health-check.sh
#   ./scripts/backoffice-health-check.sh --verbose
#   ./scripts/backoffice-health-check.sh --fix  (shows what to do for each failure)
#
# This script exists because the same refactor that dropped 24 systems from the
# player app ALSO dropped 62% of backoffice pages and 89% of state management.
# That must never happen again.
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

# Backoffice source root (App Router)
OFFICE_DIR="$(cd "$(dirname "$0")/.." && pwd)/talon-backoffice/packages/office"
APP_SRC="$OFFICE_DIR/app"

# Also check containers and original code
CONTAINERS_DIR="$OFFICE_DIR/containers"
COMPONENTS_DIR="$OFFICE_DIR/components"

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
echo -e "${BOLD}║        TALON BACKOFFICE — SYSTEM HEALTH CHECK              ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  App directory: ${CYAN}$APP_SRC${NC}"
echo ""

# ── GATE 1: Core Admin Pages ────────────────────────────────────────────

echo -e "${BOLD}─── Gate 1: Core Admin Pages ───${NC}"
check_exists "Dashboard page" "$APP_SRC/**/dashboard/page.tsx"
check_exists "Login page" "$APP_SRC/*/auth/login/page.tsx"
check_exists "Trading board page" "$APP_SRC/**/trading/page.tsx"
check_exists "Audit logs page" "$APP_SRC/**/audit-logs/page.tsx"
check_exists "Reports page" "$APP_SRC/**/reports/page.tsx"
echo ""

# ── GATE 2: Risk Management Pages ───────────────────────────────────────

echo -e "${BOLD}─── Gate 2: Risk Management Pages ───${NC}"
check_exists "Risk management hub" "$APP_SRC/**/risk-management/page.tsx"
check_exists "Markets list page" "$APP_SRC/*/risk-management/markets/page.tsx"
check_exists "Market detail page" "$APP_SRC/*/risk-management/markets/*/page.tsx"
check_exists "Fixtures list page" "$APP_SRC/*/risk-management/fixtures/page.tsx"
check_exists "Fixture detail page" "$APP_SRC/*/risk-management/fixtures/*/page.tsx"
check_exists "Fixed exotics page" "$APP_SRC/**/fixed-exotics/page.tsx" \
  "Port pages/risk-management/fixed-exotics/ — exotic fixed odds management"
check_exists "Market categories page" "$APP_SRC/**/market-categories/page.tsx" \
  "Port pages/risk-management/market-categories/ — market category CRUD"
check_exists "Prediction markets page" "$APP_SRC/**/prediction/page.tsx" \
  "Port pages/risk-management/prediction/ — prediction market operations"
check_exists "Provider operations page" "$APP_SRC/**/provider-ops/page.tsx" \
  "Port pages/risk-management/provider-ops/ — cashier review, verification"
check_exists "Risk summary page" "$APP_SRC/**/summary/page.tsx" \
  "Port pages/risk-management/summary/ — risk summary dashboard + export"
echo ""

# ── GATE 3: User Management ─────────────────────────────────────────────

echo -e "${BOLD}─── Gate 3: User Management ───${NC}"
check_exists "Users list page" "$APP_SRC/**/users/page.tsx"
check_exists "User detail page" "$APP_SRC/**/users/*/page.tsx"
check_grep "User wallet management" \
  "wallet\|userWallet\|walletHistory\|punterWallet" "$APP_SRC" \
  "Port containers/users/ wallet sub-feature"
check_grep "User betting history" \
  "betHistory\|userBets\|punterBets\|betting.*history" "$APP_SRC" \
  "Port containers/users/ betting history sub-feature"
check_grep "User session history" \
  "sessionHistory\|userSessions\|loginHistory" "$APP_SRC" \
  "Port containers/users/ session history sub-feature"
check_grep "User limits management" \
  "limitsHistory\|userLimits\|depositLimit\|betLimit\|coolOff" "$APP_SRC" \
  "Port containers/users/ limits + cool-off history"
check_grep "User support notes" \
  "supportNotes\|userNotes\|annotations\|addNote" "$APP_SRC" \
  "Port containers/users/ support notes sub-feature"
check_grep "Modify punter modal" \
  "ModifyPunter\|modifyUser\|editPunter\|suspendUser\|blockUser" "$APP_SRC" \
  "Port components/users/ModifyPunterModal"
echo ""

# ── GATE 4: Account & Settings Pages ────────────────────────────────────

echo -e "${BOLD}─── Gate 4: Account & Settings Pages ───${NC}"
check_exists "Account settings page" "$APP_SRC/**/account/settings/page.tsx" \
  "Port pages/account/settings/ — admin account preferences"
check_exists "Account security page" "$APP_SRC/**/account/security/page.tsx" \
  "Port pages/account/security/ — password change, 2FA"
check_exists "Terms & conditions page" "$APP_SRC/**/terms*/page.tsx" \
  "Port pages/terms-and-conditions/ — T&C management"
check_exists "Not authorized page" "$APP_SRC/**/not-authorized/page.tsx" \
  "Create not-authorized page for RBAC denied access"
echo ""

# ── GATE 5: State Management ────────────────────────────────────────────

echo -e "${BOLD}─── Gate 5: State Management (Redux/Zustand) ───${NC}"
check_grep "Store provider in layout" \
  "Provider\|StoreProvider\|createStore\|useStore" "$APP_SRC" \
  "Add Redux/Zustand Provider to app/layout.tsx"
check_grep "Auth state slice" \
  "authSlice\|useAuth\|AuthProvider\|authContext" "$APP_SRC" \
  "Port authSlice from store.config.ts"
check_grep "Users state slice" \
  "usersSlice\|useUsers\|usersReducer" "$APP_SRC" \
  "Port usersSlice + usersDetailsSlice from store.config.ts"
check_grep "Markets state slice" \
  "marketsSlice\|useMarkets\|marketsReducer\|marketsDetails" "$APP_SRC" \
  "Port marketsSlice + marketsDetailsSlice from store.config.ts"
check_grep "Fixtures state slice" \
  "fixturesSlice\|useFixtures\|fixturesReducer\|fixturesDetails" "$APP_SRC" \
  "Port fixturesSlice + fixturesDetailsSlice from store.config.ts"
check_grep "Audit logs state slice" \
  "logsSlice\|auditLogsSlice\|useAuditLogs\|logsReducer" "$APP_SRC" \
  "Port logsSlice (auditLogsSlice) from store.config.ts"
check_grep "Market categories state" \
  "marketCategoriesSlice\|useMarketCategories" "$APP_SRC" \
  "Port marketCategoriesSlice from store.config.ts"
echo ""

# ── GATE 6: API Client & Services ───────────────────────────────────────

echo -e "${BOLD}─── Gate 6: API Client & Services ───${NC}"
check_grep "Admin API client or hook" \
  "useAdminApi\|adminClient\|apiClient\|createClient" "$APP_SRC" \
  "Port hooks/useAdminApi.ts — admin REST client"
check_grep "Trading WebSocket hook" \
  "useTradingWebSocket\|tradingSocket\|tradingWs\|WebSocket.*trading" "$APP_SRC" \
  "Port hooks/useTradingWebSocket.ts — real-time trading feed"
check_grep "Data export functionality" \
  "export.*csv\|exportData\|downloadCsv\|exportReport\|generateReport" "$APP_SRC" \
  "Port export functionality from containers (audit logs, risk summary, reports)"
echo ""

# ── GATE 7: Containers (Business Logic) ─────────────────────────────────

echo -e "${BOLD}─── Gate 7: Business Logic Containers ───${NC}"
check_grep "Audit logs container logic" \
  "fetchLogs\|logsFilter\|logsPagination\|auditQuery" "$APP_SRC" \
  "Port containers/audit-logs/ — filtering, pagination, export"
check_grep "Markets container logic" \
  "updateMarket\|suspendMarket\|marketActions\|toggleMarket" "$APP_SRC" \
  "Port containers/markets/ — market management actions"
check_grep "Fixtures container logic" \
  "updateFixture\|fixtureActions\|resultFixture\|settleFixture" "$APP_SRC" \
  "Port containers/fixtures/ — fixture management + settlement"
check_grep "Users container logic (search/filter)" \
  "searchUsers\|filterUsers\|usersQuery\|usersPagination" "$APP_SRC" \
  "Port containers/users/ — user search, filter, pagination"
check_grep "Risk summary container logic" \
  "riskSummary\|riskExposure\|liabilityReport\|riskMetrics" "$APP_SRC" \
  "Port containers/risk-management-summary/"
check_grep "Provider ops container logic" \
  "providerOps\|cashierReview\|verificationReview\|pendingWithdrawals" "$APP_SRC" \
  "Port containers/provider-ops/"
echo ""

# ── GATE 8: Authentication & Authorization ──────────────────────────────

echo -e "${BOLD}─── Gate 8: Authentication & Authorization ───${NC}"
check_grep "Auth middleware (token check)" \
  "middleware\|NextResponse.*redirect\|token.*cookie\|getToken" "$OFFICE_DIR" \
  "Ensure middleware.ts checks auth token on protected routes"
check_grep "Role-based access control" \
  "role\|permission\|isAdmin\|hasRole\|authorize\|RBAC" "$APP_SRC" \
  "Port role-based access guards from original utils/auth.ts securedPage()"
check_grep "Secured page wrapper or guard" \
  "securedPage\|withAuth\|ProtectedRoute\|authGuard\|requireAuth" "$APP_SRC" \
  "Port utils/auth.ts securedPage() — per-route permission checks"
echo ""

# ── GATE 9: Layout & Navigation ─────────────────────────────────────────

echo -e "${BOLD}─── Gate 9: Layout & Navigation ───${NC}"
check_grep "Sidebar with navigation items" \
  "sidebar\|Sidebar\|nav.*item\|navigation\|menuItem" "$APP_SRC" \
  "Ensure sidebar has all admin navigation items"
check_grep "Dashboard layout with header" \
  "header\|Header\|topbar\|TopBar" "$APP_SRC" \
  "Ensure dashboard layout has header with user info"
check_grep "Menu provider or navigation state" \
  "MenuProvider\|useMenu\|menuContext\|navigationState" "$APP_SRC" \
  "Port providers/menu/ — navigation menu provider"
echo ""

# ── GATE 10: Utilities & Infrastructure ──────────────────────────────────

echo -e "${BOLD}─── Gate 10: Utilities & Infrastructure ───${NC}"
check_grep "Risk calculators" \
  "calculat\|riskCalc\|marginCalc\|liabilityCalc" "$APP_SRC" \
  "Port lib/utils/calculators.ts — risk calculation utilities"
check_grep "Table filtering utilities" \
  "filter\|tableFilter\|columnFilter\|sortBy\|pagination" "$APP_SRC" \
  "Port lib/utils/filters.ts — reusable table filtering"
check_grep "Confirmation dialog/modal" \
  "useConfirm\|confirmDialog\|ConfirmModal\|confirmAction" "$APP_SRC" \
  "Port hooks/useConfirm.ts — confirmation dialog hook"
check_warn "i18n/translations provider" "i18next\|useTranslation\|TranslationProvider" "$APP_SRC"
check_warn "Telemetry/analytics" "telemetry\|analytics\|trackEvent\|scoped.*event" "$APP_SRC"
echo ""

# ── GATE 11: Error Handling ──────────────────────────────────────────────

echo -e "${BOLD}─── Gate 11: Error Handling ───${NC}"
check_exists "Global error boundary" "$APP_SRC/**/error.tsx" \
  "Create app/error.tsx — Next.js App Router error boundary"
check_exists "Not-found page" "$APP_SRC/**/not-found.tsx" \
  "Create app/not-found.tsx — 404 page for unknown routes"
check_grep "API error handling" \
  "apiError\|errorHandler\|interceptor\|handleError\|onError" "$APP_SRC" \
  "Add centralized API error handling"
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
  echo -e "  ${RED}${BOLD}❌ BACKOFFICE HEALTH CHECK FAILED${NC}"
  echo ""
  echo -e "  ${RED}Missing systems:${NC}"
  for f in "${FAILURES[@]}"; do
    echo -e "    ${RED}•${NC} $f"
  done
  echo ""
  echo -e "  Run ${CYAN}./scripts/backoffice-health-check.sh --fix${NC} to see remediation steps."
  echo ""
  echo -e "  ${RED}${BOLD}DO NOT deploy or merge until all gates pass.${NC}"
  echo -e "  ${RED}${BOLD}DO NOT take shortcuts. Port the original systems.${NC}"
  echo ""
  exit 1
else
  echo -e "  ${GREEN}${BOLD}✅ ALL BACKOFFICE SYSTEMS PRESENT${NC}"
  echo ""
  exit 0
fi
