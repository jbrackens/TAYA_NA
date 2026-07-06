#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/30_LAUNCH_READINESS_GATE.md"
DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
RESULT_FILE="$ARTIFACT_DIR/launch_readiness_${TS_TAG}.md"
RUN_TAPTRADE_DISCOVERY_CONTRACT_GATE="${RUN_TAPTRADE_DISCOVERY_CONTRACT_GATE:-${RUN_TIANGGE_DISCOVERY_CONTRACT_GATE:-${RUN_MULTI_SPORT_RUNTIME_GATE:-0}}}"
TAPTRADE_DISCOVERY_CONTRACT_ITERATIONS="${TAPTRADE_DISCOVERY_CONTRACT_ITERATIONS:-${TIANGGE_DISCOVERY_CONTRACT_ITERATIONS:-${MULTI_SPORT_ITERATIONS:-1}}}"

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
run_step "required JVM/SBT dependency baseline" make -C "$ROOT_DIR" security-jvm-required || overall=1
run_step "jvm direct OSV baseline" make -C "$ROOT_DIR" security-jvm-osv-direct || overall=1
run_step "jvm resolved classpath OSV baseline" make -C "$ROOT_DIR" security-jvm-osv-resolved-classpath || overall=1
run_step "jvm direct residual advisory governance" make -C "$ROOT_DIR" security-jvm-direct-residual-advisories || overall=1
run_step "jvm resolved residual advisory governance" make -C "$ROOT_DIR" security-jvm-resolved-residual-advisories || overall=1
run_step "frontend residual advisory governance" make -C "$ROOT_DIR" qa-frontend-residual-advisories || overall=1
run_step "reward and social abuse boundary proof" make -C "$ROOT_DIR" qa-abuse-boundary || overall=1
run_step "preservation deletion classification" make -C "$ROOT_DIR" qa-preservation-deletions || overall=1
run_step "preservation modification classification" make -C "$ROOT_DIR" qa-preservation-modifications || overall=1
run_step "preservation public contract anchors" make -C "$ROOT_DIR" qa-preservation-contract-anchors || overall=1
run_step "preservation production dossier" make -C "$ROOT_DIR" qa-preservation-production-dossier || overall=1
run_step "Scenario 11 API/data surface gate" make -C "$ROOT_DIR" qa-scenario-11-api-surface || overall=1
run_step "Scenario 12 signoff gate" make -C "$ROOT_DIR" qa-scenario-12-signoff || overall=1
run_step "platform health baseline" make -C "$ROOT_DIR" platform-health || overall=1
run_step "platform metrics baseline" make -C "$ROOT_DIR" platform-metrics || overall=1
run_step "critical path e2e" make -C "$ROOT_DIR" qa-e2e-critical || overall=1
run_step "load baseline" make -C "$ROOT_DIR" qa-load-baseline || overall=1
run_step "capability slo gate" make -C "$ROOT_DIR" qa-capability-slo || overall=1
run_step "cutover rehearsal" make -C "$ROOT_DIR" release-cutover-rehearsal || overall=1

if [[ "$RUN_TAPTRADE_DISCOVERY_CONTRACT_GATE" == "1" || "$RUN_TAPTRADE_DISCOVERY_CONTRACT_GATE" == "true" ]]; then
  run_step \
    "TapTrade discovery/API compatibility regression gate" \
    env \
    ITERATIONS="$TAPTRADE_DISCOVERY_CONTRACT_ITERATIONS" \
    make -C "$ROOT_DIR" qa-sports-regression || overall=1
else
  run_skip_step \
    "TapTrade discovery/API compatibility regression gate" \
    "disabled (set RUN_TAPTRADE_DISCOVERY_CONTRACT_GATE=1; legacy RUN_TIANGGE_* and RUN_MULTI_SPORT_RUNTIME_GATE are accepted as compatibility aliases)"
fi

run_step "RC completion audit" make -C "$ROOT_DIR" qa-rc-completion-audit || overall=1

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
  echo "- TapTrade discovery/API compatibility gate enabled: \`$RUN_TAPTRADE_DISCOVERY_CONTRACT_GATE\`"
  echo
  echo "## Decision Notes"
  echo
  echo "1. GO only when all checklist steps pass in the same run."
  echo "2. Any failed step requires remediation and full gate rerun."
  echo "3. Keep this report and checklist artifact attached to release sign-off records."
  echo "4. The compatibility discovery/API gate is optional by default to keep CI deterministic."
  echo "5. Enable the compatibility gate for local release sign-off rehearsal when the extra TapTrade contract pass is desired."
  echo "6. Preservation deletion, modification, public contract-anchor, and production-dossier gates are mandatory for launch readiness; inherited artifact removals or broad rewrites must stay classified and reviewable."
  echo "7. Reward/social abuse-boundary proof is mandatory for launch readiness; blocked reward claims and social writes must remain non-persistent and reviewable."
  echo "8. Scenario 12 security residual and production-preservation signoffs are mandatory for launch readiness; unsigned packets or templates are not sufficient."
} >"$REPORT_FILE"

echo "Launch readiness checklist: $RESULT_FILE"
if [[ $overall -ne 0 ]]; then
  exit 1
fi
