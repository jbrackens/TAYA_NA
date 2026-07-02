#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GO_GATEWAY_DIR="$ROOT_DIR/go-platform/services/gateway"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/171_SB504_CAPABILITY_SLO_GATE_REPORT.md"

DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
RESULT_FILE="$ARTIFACT_DIR/capability_launch_gate_${TS_TAG}.md"
BOUNDARY_REPORT="$ARTIFACT_DIR/capability_launch_boundary_${TS_TAG}.md"
RECONCILIATION_REPORT="$ARTIFACT_DIR/capability_prediction_reconciliation_${TS_TAG}.md"

mkdir -p "$ARTIFACT_DIR"

run_timed_step() {
  local name="$1"
  local out_file="$2"
  shift 2

  local start end elapsed
  start="$(date +%s)"
  "$@" >"$out_file"
  end="$(date +%s)"
  elapsed=$((end - start))
  echo "| $name | pass | ${elapsed}s | \`$out_file\` |" >>"$RESULT_FILE"
}

{
  echo "# Launch Capability Gate ($DATE_TAG)"
  echo
  echo "| Capability | Result | Duration | Artifact |"
  echo "|---|---:|---:|---|"
} >"$RESULT_FILE"

(
  cd "$GO_GATEWAY_DIR"
  run_timed_step "launch boundary" "$BOUNDARY_REPORT" \
    go run ./cmd/launch-boundary-report
  run_timed_step "point reconciliation" "$RECONCILIATION_REPORT" \
    go run ./cmd/prediction-reconciliation-report \
      -fixture internal/http/testdata/prediction_reconciliation/lifecycle_cases.json
)

{
  echo "# SB-504 Launch Capability Gate Report ($DATE_TAG)"
  echo
  echo "Command: \`make qa-capability-slo\`"
  echo
  echo "- Result: **pass**"
  echo "- Retired legacy load probes: old order-placement/cashout latency checks are no longer launch gates."
  echo "- Artifact: \`$RESULT_FILE\`"
  echo "- Launch boundary report: \`$BOUNDARY_REPORT\`"
  echo "- Point reconciliation report: \`$RECONCILIATION_REPORT\`"
  echo
  echo "## Gate Policy"
  echo
  echo "1. Launch capability proof must keep inherited money routes disabled by default."
  echo "2. Launch reconciliation proof must use PTS point-ledger contracts."
  echo "3. Retired legacy betting or money-route performance probes must not be used as launch readiness gates."
} >"$REPORT_FILE"

echo "Launch capability gate report: $RESULT_FILE"
