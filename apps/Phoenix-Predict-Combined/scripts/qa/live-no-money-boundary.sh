#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
REPORT_FILE="$ROOT_DIR/revival/32_LIVE_NO_MONEY_BOUNDARY.md"
ARTIFACT_FILE="$ARTIFACT_DIR/live_no_money_boundary_${TS_TAG}.md"
PROBE_SCRIPT="$ROOT_DIR/talon-backoffice/scripts/qa/live-no-money-boundary.mjs"

TALON_PORT="${TALON_PORT:-3000}"
PLAYER_PORT="${PLAYER_PORT:-${SPORTSBOOK_PORT:-3002}}"
GO_GATEWAY_PORT="${GO_GATEWAY_PORT:-18080}"

PLAYER_BASE_URL="${PLAYER_BASE_URL-http://127.0.0.1:${PLAYER_PORT}}"
OFFICE_BASE_URL="${OFFICE_BASE_URL-http://127.0.0.1:${TALON_PORT}}"
GATEWAY_BASE_URL="${GATEWAY_BASE_URL-http://127.0.0.1:${GO_GATEWAY_PORT}}"

mkdir -p "$ARTIFACT_DIR"

env \
  PLAYER_BASE_URL="$PLAYER_BASE_URL" \
  OFFICE_BASE_URL="$OFFICE_BASE_URL" \
  GATEWAY_BASE_URL="$GATEWAY_BASE_URL" \
  node "$PROBE_SCRIPT" >"$ARTIFACT_FILE"

cp "$ARTIFACT_FILE" "$REPORT_FILE"

{
  echo
  echo "## Runtime Inputs"
  echo
  echo "- Date: \`$DATE_TAG\`"
  echo "- Player: \`$PLAYER_BASE_URL\`"
  echo "- Office: \`$OFFICE_BASE_URL\`"
  echo "- Gateway: \`$GATEWAY_BASE_URL\`"
  echo "- Artifact: \`$ARTIFACT_FILE\`"
} >>"$REPORT_FILE"

echo "Live no-money boundary report: $REPORT_FILE"
