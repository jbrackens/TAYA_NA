#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REVIVAL_DIR="$ROOT/revival"
ARTIFACT_DIR="$REVIVAL_DIR/artifacts"
REPORT_PATH="${SCENARIO_12_SIGNOFF_REPORT:-$REVIVAL_DIR/94_SCENARIO_12_SIGNOFF_GATE.md}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%S")"
ARTIFACT_PATH="$ARTIFACT_DIR/scenario_12_signoff_gate_${TIMESTAMP}.md"

SECURITY_SIGNOFF_PATH="${SCENARIO_12_SECURITY_SIGNOFF:-$REVIVAL_DIR/signoffs/security_residual_acceptance.md}"
PRESERVATION_SIGNOFF_PATH="${SCENARIO_12_PRESERVATION_SIGNOFF:-$REVIVAL_DIR/signoffs/production_preservation_signoff.md}"

latest_artifact() {
  local pattern="$1"
  find "$ARTIFACT_DIR" -maxdepth 1 -type f -name "$pattern" | sort | tail -n 1
}

SECURITY_PACKET_PATH="${SCENARIO_12_SECURITY_PACKET:-$(latest_artifact 'security_residual_acceptance_packet_*.md')}"
PRESERVATION_REVIEW_PACK_PATH="${SCENARIO_12_PRESERVATION_REVIEW_PACK:-$(latest_artifact 'production_contract_review_pack_*.md')}"
PRESERVATION_DOSSIER_PATH="${SCENARIO_12_PRESERVATION_DOSSIER:-$(latest_artifact 'production_preservation_dossier_*.md')}"

mkdir -p "$ARTIFACT_DIR"

failures=()

require_file() {
  local label="$1"
  local file="$2"

  if [[ ! -f "$file" ]]; then
    failures+=("$label is missing: $file")
    return 1
  fi
  return 0
}

require_pattern() {
  local label="$1"
  local file="$2"
  local pattern="$3"
  local description="$4"

  if ! rg -qi "$pattern" "$file"; then
    failures+=("$label must contain $description")
  fi
}

check_signoff() {
  local label="$1"
  local file="$2"
  local required_artifact="$3"
  local required_artifact_label="$4"

  require_file "$label" "$file" || return 0
  require_pattern "$label" "$file" '^status:[[:space:]]*(accepted|approved)$' '`Status: accepted` or `Status: approved`'
  require_pattern "$label" "$file" '^signed-off-by:[[:space:]].+' '`Signed-off-by:` with a named accountable reviewer'
  require_pattern "$label" "$file" '^signed-off-at:[[:space:]][0-9]{4}-[0-9]{2}-[0-9]{2}' '`Signed-off-at:` with an ISO date'

  if [[ -n "$required_artifact" ]]; then
    local artifact_base
    artifact_base="$(basename "$required_artifact")"
    if ! rg -q "$artifact_base|$required_artifact" "$file"; then
      failures+=("$label must reference $required_artifact_label artifact: $artifact_base")
    fi
  fi
}

if [[ -z "$SECURITY_PACKET_PATH" ]]; then
  failures+=("security residual acceptance packet artifact is missing")
elif [[ ! -f "$SECURITY_PACKET_PATH" ]]; then
  failures+=("security residual acceptance packet artifact does not exist: $SECURITY_PACKET_PATH")
fi

if [[ -z "$PRESERVATION_REVIEW_PACK_PATH" ]]; then
  failures+=("production contract review pack artifact is missing")
elif [[ ! -f "$PRESERVATION_REVIEW_PACK_PATH" ]]; then
  failures+=("production contract review pack artifact does not exist: $PRESERVATION_REVIEW_PACK_PATH")
fi

if [[ -z "$PRESERVATION_DOSSIER_PATH" ]]; then
  failures+=("production preservation dossier artifact is missing")
elif [[ ! -f "$PRESERVATION_DOSSIER_PATH" ]]; then
  failures+=("production preservation dossier artifact does not exist: $PRESERVATION_DOSSIER_PATH")
fi

check_signoff \
  "security residual signoff" \
  "$SECURITY_SIGNOFF_PATH" \
  "$SECURITY_PACKET_PATH" \
  "security residual acceptance packet"

check_signoff \
  "production preservation signoff" \
  "$PRESERVATION_SIGNOFF_PATH" \
  "$PRESERVATION_REVIEW_PACK_PATH" \
  "production contract review pack"

if [[ -f "$PRESERVATION_SIGNOFF_PATH" && -n "$PRESERVATION_DOSSIER_PATH" ]]; then
  dossier_base="$(basename "$PRESERVATION_DOSSIER_PATH")"
  if ! rg -q "$dossier_base|$PRESERVATION_DOSSIER_PATH" "$PRESERVATION_SIGNOFF_PATH"; then
    failures+=("production preservation signoff must reference production preservation dossier artifact: $dossier_base")
  fi
fi

result="pass"
if (( ${#failures[@]} > 0 )); then
  result="fail"
fi

{
  echo "# Scenario 12 Signoff Gate"
  echo
  echo "- Generated: \`$(date -u +"%Y-%m-%dT%H:%M:%SZ")\`"
  echo "- Result: **$result**"
  echo "- Decision: Scenario 12 cannot pass until security residual acceptance/remediation and production preservation signoff are explicitly recorded."
  echo
  echo "## Required Signoff Files"
  echo
  echo "| Signoff | Expected Path | Required Evidence |"
  echo "|---|---|---|"
  echo "| Security residual acceptance | \`$SECURITY_SIGNOFF_PATH\` | Status accepted/approved, named reviewer, ISO date, reference to the current security residual packet. |"
  echo "| Production preservation signoff | \`$PRESERVATION_SIGNOFF_PATH\` | Status accepted/approved, named reviewer, ISO date, reference to the production contract review pack and preservation dossier. |"
  echo
  echo "## Current Evidence Artifacts"
  echo
  echo "| Evidence | Artifact |"
  echo "|---|---|"
  echo "| Security residual acceptance packet | \`${SECURITY_PACKET_PATH:-missing}\` |"
  echo "| Production contract review pack | \`${PRESERVATION_REVIEW_PACK_PATH:-missing}\` |"
  echo "| Production preservation dossier | \`${PRESERVATION_DOSSIER_PATH:-missing}\` |"
  echo
  if (( ${#failures[@]} > 0 )); then
    echo "## Failures"
    echo
    for failure in "${failures[@]}"; do
      echo "- $failure"
    done
    echo
  else
    echo "## Verification"
    echo
    echo "- Security residual acceptance is explicitly recorded."
    echo "- Production preservation signoff is explicitly recorded."
    echo "- Both signoffs reference the current review artifacts."
    echo
  fi
  echo "## Signoff File Template"
  echo
  echo '```md'
  echo "Status: accepted"
  echo "Signed-off-by: REVIEWER NAME <reviewer@example.com>"
  echo "Signed-off-at: $(date -u +%F)"
  echo
  echo "Reviewed artifacts:"
  echo "- ARTIFACT_BASENAME.md"
  echo
  echo "Decision:"
  echo "- Accepted residual risk or preservation posture:"
  echo "- Required follow-up owner:"
  echo "- Expiry/revisit condition:"
  echo '```'
  echo
  echo "## Notes"
  echo
  echo "- This gate validates recorded signoff format and artifact references; it does not judge whether a reviewer should approve."
  echo "- An unsigned packet or checklist is not enough for Scenario 12 Pass."
} > "$REPORT_PATH"

cp "$REPORT_PATH" "$ARTIFACT_PATH"

echo "Scenario 12 signoff gate: $result"
echo "Wrote report: $REPORT_PATH"
echo "Wrote artifact: $ARTIFACT_PATH"

if (( ${#failures[@]} > 0 )); then
  for failure in "${failures[@]}"; do
    echo "- $failure" >&2
  done
  exit 1
fi
