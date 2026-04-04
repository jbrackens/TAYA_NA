#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/30_LAUNCH_READINESS_GATE.md"
DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
RESULT_FILE="$ARTIFACT_DIR/launch_readiness_${TS_TAG}.md"
RUN_MULTI_SPORT_RUNTIME_GATE="${RUN_MULTI_SPORT_RUNTIME_GATE:-0}"
MULTI_SPORT_FRONTEND_BASE_URL="${MULTI_SPORT_FRONTEND_BASE_URL:-http://127.0.0.1:3002}"
MULTI_SPORT_GATEWAY_BASE_URL="${MULTI_SPORT_GATEWAY_BASE_URL:-http://127.0.0.1:18080}"
MULTI_SPORT_ITERATIONS="${MULTI_SPORT_ITERATIONS:-5}"
MULTI_SPORT_SPORTS_CSV="${MULTI_SPORT_SPORTS_CSV:-mlb,nfl,nba,ufc,ncaa_baseball}"
MULTI_SPORT_CHECK_ESPORTS_COMPAT="${MULTI_SPORT_CHECK_ESPORTS_COMPAT:-1}"

mkdir -p "$ARTIFACT_DIR"

run_step() {
  local name="$1"
  shift
  local cmd=("$@")
  local log_file="$ARTIFACT_DIR/launch_${TS_TAG}_$(echo "$name" | tr ' ' '_' | tr -cd '[:alnum:]_').log"

  if "${cmd[@]}" >"$log_file" 2>&1; then
    echo "| $name | pass | \`$log_file\` |" >>"$RESULT_FILE"
    return 0
  fi

  echo "| $name | fail | \`$log_file\` |" >>"$RESULT_FILE"
  return 1
}

run_skip_step() {
  local name="$1"
  local note="$2"
  echo "| $name | skip | $note |" >>"$RESULT_FILE"
}

{
  echo "# Launch Readiness Checklist ($DATE_TAG)"
  echo
  echo "| Step | Result | Log |"
  echo "|---|---|---|"
} >"$RESULT_FILE"

overall=0

run_step "go verify gate" make -C "$ROOT_DIR" verify-go || overall=1
run_step "security secrets baseline" make -C "$ROOT_DIR" security-secrets || overall=1
run_step "security sbom baseline" make -C "$ROOT_DIR" security-sbom || overall=1
run_step "platform health baseline" make -C "$ROOT_DIR" platform-health || overall=1
run_step "platform metrics baseline" make -C "$ROOT_DIR" platform-metrics || overall=1
run_step "critical path e2e" make -C "$ROOT_DIR" qa-e2e-critical || overall=1
run_step "load baseline" make -C "$ROOT_DIR" qa-load-baseline || overall=1
run_step "capability slo gate" make -C "$ROOT_DIR" qa-capability-slo || overall=1
run_step "cutover rehearsal" make -C "$ROOT_DIR" release-cutover-rehearsal || overall=1

if [[ "$RUN_MULTI_SPORT_RUNTIME_GATE" == "1" || "$RUN_MULTI_SPORT_RUNTIME_GATE" == "true" ]]; then
  run_step \
    "multi-sport runtime regression gate" \
    env \
    FRONTEND_BASE_URL="$MULTI_SPORT_FRONTEND_BASE_URL" \
    GATEWAY_BASE_URL="$MULTI_SPORT_GATEWAY_BASE_URL" \
    ITERATIONS="$MULTI_SPORT_ITERATIONS" \
    SPORTS_CSV="$MULTI_SPORT_SPORTS_CSV" \
    CHECK_ESPORTS_COMPAT="$MULTI_SPORT_CHECK_ESPORTS_COMPAT" \
    make -C "$ROOT_DIR" qa-sports-regression || overall=1
else
  run_skip_step \
    "multi-sport runtime regression gate" \
    "disabled (set RUN_MULTI_SPORT_RUNTIME_GATE=1; requires live sportsbook/go-gateway runtimes)"
fi

result="pass"
go_no_go="GO"
if [[ $overall -ne 0 ]]; then
  result="fail"
  go_no_go="NO-GO"
fi

{
  echo "# Launch Readiness Gate ($DATE_TAG)"
  echo
  echo "Command: \`make release-launch-readiness\`"
  echo
  echo "- Result: **$result**"
  echo "- Decision: **$go_no_go**"
  echo "- Checklist artifact: \`$RESULT_FILE\`"
  echo "- Multi-sport runtime gate enabled: \`$RUN_MULTI_SPORT_RUNTIME_GATE\`"
  echo
  echo "## Decision Notes"
  echo
  echo "1. GO only when all checklist steps pass in the same run."
  echo "2. Any failed step requires remediation and full gate rerun."
  echo "3. Keep this report and checklist artifact attached to release sign-off records."
  echo "4. Multi-sport runtime gate is optional by default to keep CI deterministic."
  echo "5. Enable multi-sport runtime gate for local release sign-off rehearsal where sportsbook/go-gateway are running."
} >"$REPORT_FILE"

echo "Launch readiness checklist: $RESULT_FILE"
if [[ $overall -ne 0 ]]; then
  exit 1
fi
