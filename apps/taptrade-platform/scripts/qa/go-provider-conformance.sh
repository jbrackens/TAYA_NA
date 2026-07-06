#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GO_DIR="$ROOT_DIR/go-platform"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/178_SB501_PROVIDER_CONFORMANCE_REPORT.md"

DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
RESULT_FILE="$ARTIFACT_DIR/provider_conformance_${TS_TAG}.md"

mkdir -p "$ARTIFACT_DIR"

run_step() {
  local name="$1"
  shift
  local cmd=("$@")
  local log_file="$ARTIFACT_DIR/provider_conformance_${TS_TAG}_$(echo "$name" | tr ' ' '_' | tr -cd '[:alnum:]_').log"

  if "${cmd[@]}" >"$log_file" 2>&1; then
    echo "| $name | pass | \`$log_file\` |" >>"$RESULT_FILE"
    return 0
  fi

  echo "| $name | fail | \`$log_file\` |" >>"$RESULT_FILE"
  return 1
}

{
  echo "# Provider Conformance Suite ($DATE_TAG)"
  echo
  echo "| Suite | Result | Log |"
  echo "|---|---|---|"
} >"$RESULT_FILE"

overall=0

run_step "canonical adapter registry contract" \
  bash -lc "cd \"$GO_DIR\" && go test ./modules/platform/canonical/adapter -run 'TestRegistryRegisterAndGet|TestRegistryRejectsDuplicate|TestRegistryRejectsIncompatibleSchema|TestRegistryNamesSorted'" || overall=1

run_step "provider adapter conformance profile" \
  bash -lc "cd \"$GO_DIR\" && go test ./services/gateway/internal/provider -run 'TestProviderAdapterConformanceProfile'" || overall=1

result="pass"
if [[ $overall -ne 0 ]]; then
  result="fail"
fi

{
  echo "# SB-501 Provider Conformance Report ($DATE_TAG)"
  echo
  echo "Command: \`make qa-provider-conformance\`"
  echo
  echo "- Result: **$result**"
  echo "- Artifact: \`$RESULT_FILE\`"
  echo
  echo "## Scope"
  echo
  echo "1. Canonical adapter registry contract invariants."
  echo "2. Provider adapter conformance profile (stream + command behavior)."
  echo
  echo "## Gate Policy"
  echo
  echo "1. All conformance suites must pass to keep SB-501 green."
  echo "2. Any failure requires regression fix before merge/release."
} >"$REPORT_FILE"

echo "Provider conformance artifact: $RESULT_FILE"
if [[ $overall -ne 0 ]]; then
  exit 1
fi
