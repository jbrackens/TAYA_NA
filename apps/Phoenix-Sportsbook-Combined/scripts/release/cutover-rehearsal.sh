#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/26_CUTOVER_REHEARSAL_AND_ROLLBACK_DRILL.md"
DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
RESULT_FILE="$ARTIFACT_DIR/cutover_rehearsal_${TS_TAG}.md"
ENABLE_DB_MIGRATION_VALIDATION="${ENABLE_DB_MIGRATION_VALIDATION:-false}"

mkdir -p "$ARTIFACT_DIR"

run_step() {
  local name="$1"
  shift
  local cmd=("$@")
  local log_file="$ARTIFACT_DIR/cutover_${TS_TAG}_$(echo "$name" | tr ' ' '_' | tr -cd '[:alnum:]_').log"

  if "${cmd[@]}" >"$log_file" 2>&1; then
    echo "| $name | pass | \`$log_file\` |" >>"$RESULT_FILE"
    return 0
  fi

  echo "| $name | fail | \`$log_file\` |" >>"$RESULT_FILE"
  return 1
}

{
  echo "# Cutover Rehearsal Checklist ($DATE_TAG)"
  echo
  echo "| Step | Result | Log |"
  echo "|---|---|---|"
} >"$RESULT_FILE"

overall=0

run_step "go verify gate" make -C "$ROOT_DIR" verify-go || overall=1
if [[ "$ENABLE_DB_MIGRATION_VALIDATION" == "true" ]]; then
  run_step "db migration validation" make -C "$ROOT_DIR" validate-migrations || overall=1
else
  echo "| db migration validation | skipped | \`de-scoped (ENABLE_DB_MIGRATION_VALIDATION=false)\` |" >>"$RESULT_FILE"
fi
run_step "frontend talon verify" make -C "$ROOT_DIR" verify-talon || overall=1
run_step "frontend sportsbook verify" make -C "$ROOT_DIR" verify-sportsbook || overall=1
run_step "go critical path e2e" make -C "$ROOT_DIR" qa-e2e-critical || overall=1
run_step "go load baseline" make -C "$ROOT_DIR" qa-load-baseline || overall=1

result="pass"
if [[ $overall -ne 0 ]]; then
  result="fail"
fi

{
  echo "# Cutover Rehearsal and Rollback Drill ($DATE_TAG)"
  echo
  echo "Command: \`make release-cutover-rehearsal\`"
  echo
  echo "- Result: **$result**"
  echo "- Checklist artifact: \`$RESULT_FILE\`"
  echo "- DB migration validation enabled: \`$ENABLE_DB_MIGRATION_VALIDATION\`"
  echo
  echo "## Rollback Drill Baseline"
  echo
  echo "1. Preserve latest DB snapshot before migration rehearsal."
  echo "2. Capture service image tags and config digests used in rehearsal."
  echo "3. On failure, restore DB snapshot and redeploy previous known-good image set."
  echo "4. Re-run health checks and critical E2E smoke before reopening traffic."
} >"$REPORT_FILE"

echo "Cutover rehearsal checklist: $RESULT_FILE"
if [[ $overall -ne 0 ]]; then
  exit 1
fi
