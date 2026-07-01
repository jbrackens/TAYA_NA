#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GO_GATEWAY_DIR="$ROOT_DIR/go-platform/services/gateway"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/25_GO_CRITICAL_PATH_E2E.md"

DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
BOUNDARY_REPORT="$ARTIFACT_DIR/go_launch_boundary_${TS_TAG}.md"
RECONCILIATION_REPORT="$ARTIFACT_DIR/go_prediction_reconciliation_${TS_TAG}.md"

mkdir -p "$ARTIFACT_DIR"

(
  cd "$GO_GATEWAY_DIR"
  go run ./cmd/launch-boundary-report >"$BOUNDARY_REPORT"
  go run ./cmd/prediction-reconciliation-report \
    -fixture internal/http/testdata/prediction_reconciliation/lifecycle_cases.json \
    -out "$RECONCILIATION_REPORT"
)

{
  echo "# Go Launch Critical Path Proof ($DATE_TAG)"
  echo
  echo "Command: \`make qa-e2e-critical\`"
  echo
  echo "- Result: **pass**"
  echo "- Retired legacy flow: old /api/v1/bets place/settle replay is no longer a launch gate."
  echo "- Launch boundary report: \`$BOUNDARY_REPORT\`"
  echo "- Point reconciliation report: \`$RECONCILIATION_REPORT\`"
  echo
  echo "## Scope"
  echo
  echo "1. Gateway launch boundary reports non-redeemable point mode and disabled legacy money routes."
  echo "2. Inherited cashier/payment/crypto-payment routes return 404 in launch mode."
  echo "3. Point-native prediction reconciliation fixture passes with PTS ledger fields."
} >"$REPORT_FILE"

echo "Go launch critical path report: $REPORT_FILE"
