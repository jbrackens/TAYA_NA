#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
RESULT_FILE="$ARTIFACT_DIR/private_governance_release_gate_${TS_TAG}.md"
RUN_STABILIZATION_BURNIN="${RUN_STABILIZATION_BURNIN:-1}"

mkdir -p "$ARTIFACT_DIR"

run_step() {
  local name="$1"
  shift
  local cmd=("$@")
  local log_file="$ARTIFACT_DIR/private_governance_${TS_TAG}_$(echo "$name" | tr ' ' '_' | tr -cd '[:alnum:]_').log"

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
  echo "# Private Repo Release Governance Gate ($TS_TAG)"
  echo
  echo "| Step | Result | Log |"
  echo "|---|---|---|"
} >"$RESULT_FILE"

overall=0

run_step "verify-go" make -C "$ROOT_DIR" verify-go || overall=1
run_step "verify-talon" make -C "$ROOT_DIR" verify-talon || overall=1
run_step "verify-sportsbook" make -C "$ROOT_DIR" verify-sportsbook || overall=1
run_step "phase-9-launch-readiness" make -C "$ROOT_DIR" release-launch-readiness || overall=1
run_step "phase-9-runtime-profile-launch-readiness" make -C "$ROOT_DIR" release-launch-readiness-runtime-profile || overall=1

if [[ "$RUN_STABILIZATION_BURNIN" == "1" || "$RUN_STABILIZATION_BURNIN" == "true" ]]; then
  run_step "phase-10-stabilization-burnin" make -C "$ROOT_DIR" release-stability-burnin || overall=1
else
  run_skip_step "phase-10-stabilization-burnin" "disabled (set RUN_STABILIZATION_BURNIN=1 to enforce)"
fi

result="pass"
if [[ $overall -ne 0 ]]; then
  result="fail"
fi

{
  echo
  echo "## Result"
  echo
  echo "- Overall: **$result**"
  echo "- Command: \`make release-governance-private\`"
  echo "- Runtime profile gate required: **yes**"
  echo "- Stabilization burn-in required: \`$RUN_STABILIZATION_BURNIN\`"
  echo "- Checklist artifact: \`$RESULT_FILE\`"
} >>"$RESULT_FILE"

echo "Private governance checklist: $RESULT_FILE"
if [[ $overall -ne 0 ]]; then
  exit 1
fi
