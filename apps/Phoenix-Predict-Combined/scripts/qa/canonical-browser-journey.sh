#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TALON_DIR="$ROOT_DIR/talon-backoffice"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/42_CANONICAL_BROWSER_JOURNEY.md"

DATE_TAG="$(date -u +%F)"
TS_TAG="$(date -u +%Y%m%d_%H%M%S)"
RESULT_FILE="$ARTIFACT_DIR/canonical_browser_journey_${TS_TAG}.md"
LOG_FILE="$ARTIFACT_DIR/canonical_browser_journey_${TS_TAG}.log"

PLAYER_PORT="${PLAYER_PORT:-${SPORTSBOOK_PORT:-3022}}"
PREDICT_BASE_URL="${PREDICT_BASE_URL:-http://127.0.0.1:${PLAYER_PORT}}"

mkdir -p "$ARTIFACT_DIR"

write_report() {
  local result="$1"
  local note="$2"

  {
    echo "# Canonical Browser Journey Proof ($DATE_TAG)"
    echo
    echo "Command: \`make qa-canonical-browser-journey\`"
    echo
    echo "- Result: **$result**"
    echo "- Player base URL: \`$PREDICT_BASE_URL\`"
    echo "- Artifact: \`$RESULT_FILE\`"
    echo "- Log: \`$LOG_FILE\`"
    echo
    echo "## Scope"
    echo
    echo "This gate runs the maintained Playwright proof at:"
    echo
    echo "- \`talon-backoffice/e2e/prediction/canonical-browser.ui.spec.ts\`"
    echo
    echo "The proof registers a new user through the rendered player app, accepts the"
    echo "points-only no-cashout disclosure, verifies starter points, watches/searches"
    echo "markets, opens market detail, buys YES and NO, comments/upvotes/follows,"
    echo "checks portfolio and point ledger, claims or verifies reward progress, uses"
    echo "admin APIs for close/settlement/leaderboard recompute, verifies settlement"
    echo "ledger and portfolio history, verifies leaderboard/activity visibility, and"
    echo "checks retired player money routes return 404."
    echo
    echo "## Runtime Contract"
    echo
    echo "- Requires a running seeded player stack at \`PREDICT_BASE_URL\`."
    echo "- Requires the player same-origin \`/api/v1/status\` proxy to reach the gateway."
    echo "- Requires seeded credentials for \`demo@phoenix.local\` and \`admin@phoenix.local\`."
    echo "- Does not start or seed the stack itself."
    echo
    echo "## Result Note"
    echo
    echo "$note"
  } >"$RESULT_FILE"

  cp "$RESULT_FILE" "$REPORT_FILE"
}

probe_url() {
  local url="$1"
  local expected="$2"
  local status
  status="$(curl -sSL -o /dev/null -w "%{http_code}" "$url" || true)"
  if [[ "$status" != "$expected" ]]; then
    echo "expected $url to return $expected, got $status"
    return 1
  fi
}

{
  echo "PREDICT_BASE_URL=$PREDICT_BASE_URL"
  echo "Probing player root and gateway status through the player proxy..."
} >"$LOG_FILE"

if ! probe_url "$PREDICT_BASE_URL/" "200" >>"$LOG_FILE" 2>&1; then
  write_report "fail" "The player root probe failed before Playwright ran. Start a seeded stack and rerun the gate."
  echo "Canonical browser journey report: $REPORT_FILE"
  exit 1
fi

if ! probe_url "$PREDICT_BASE_URL/api/v1/status" "200" >>"$LOG_FILE" 2>&1; then
  write_report "fail" "The same-origin gateway status probe failed before Playwright ran. The player app must proxy \`/api/v1/status\` to the running gateway."
  echo "Canonical browser journey report: $REPORT_FILE"
  exit 1
fi

if (
  cd "$TALON_DIR"
  PREDICT_BASE_URL="$PREDICT_BASE_URL" \
    npx playwright test \
      --config playwright.prediction.config.ts \
      e2e/prediction/canonical-browser.ui.spec.ts \
      --project=ui \
      --reporter=list
) >>"$LOG_FILE" 2>&1; then
  write_report "pass" "Playwright completed successfully against the running seeded stack. See the log for the exact test output."
  echo "Canonical browser journey report: $REPORT_FILE"
  exit 0
fi

write_report "fail" "Playwright failed against the running stack. See the log for the failing assertion, request, or page state."
echo "Canonical browser journey report: $REPORT_FILE"
exit 1
