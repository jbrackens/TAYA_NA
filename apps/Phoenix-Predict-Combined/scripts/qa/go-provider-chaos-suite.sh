#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GO_DIR="$ROOT_DIR/go-platform"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/180_SB503_PROVIDER_CHAOS_SUITE_REPORT.md"

DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
RESULT_FILE="$ARTIFACT_DIR/provider_chaos_suite_${TS_TAG}.md"
JSON_LOG="$ARTIFACT_DIR/provider_chaos_suite_${TS_TAG}.json"
TEXT_LOG="$ARTIFACT_DIR/provider_chaos_suite_${TS_TAG}.log"

CHAOS_MIN_CASES="${CHAOS_MIN_CASES:-4}"
CHAOS_MAX_FAILED_CASES="${CHAOS_MAX_FAILED_CASES:-0}"

mkdir -p "$ARTIFACT_DIR"

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required for chaos suite gating" >&2
  exit 1
fi

{
  echo "# Provider Chaos Suite ($DATE_TAG)"
  echo
  echo "| Check | Result | Detail |"
  echo "|---|---|---|"
} >"$RESULT_FILE"

if (cd "$GO_DIR" && go test -json ./services/gateway/internal/provider -run '^TestRuntimeChaos') >"$JSON_LOG" 2>"$TEXT_LOG"; then
  echo "| chaos test execution | pass | \`$JSON_LOG\` |" >>"$RESULT_FILE"
else
  echo "| chaos test execution | fail | \`$JSON_LOG\` + \`$TEXT_LOG\` |" >>"$RESULT_FILE"
  {
    echo "# SB-503 Provider Chaos Suite Report ($DATE_TAG)"
    echo
    echo "Command: \`make qa-provider-chaos\`"
    echo
    echo "- Result: **fail**"
    echo "- Artifact: \`$RESULT_FILE\`"
    echo "- JSON log: \`$JSON_LOG\`"
    echo "- stderr log: \`$TEXT_LOG\`"
  } >"$REPORT_FILE"
  exit 1
fi

total_cases="$(jq -s '[.[] | select(.Action=="pass" and ((.Test // "")|startswith("TestRuntimeChaos")))] | length' "$JSON_LOG")"
failed_cases="$(jq -s '[.[] | select(.Action=="fail" and ((.Test // "")|startswith("TestRuntimeChaos")))] | length' "$JSON_LOG")"

threshold_status="pass"
if (( total_cases < CHAOS_MIN_CASES )); then
  threshold_status="fail"
fi
if (( failed_cases > CHAOS_MAX_FAILED_CASES )); then
  threshold_status="fail"
fi

echo "| scenario threshold gate | $threshold_status | totalCases=$total_cases, failedCases=$failed_cases, minCases=$CHAOS_MIN_CASES, maxFailed=$CHAOS_MAX_FAILED_CASES |" >>"$RESULT_FILE"

result="pass"
if [[ "$threshold_status" != "pass" ]]; then
  result="fail"
fi

{
  echo "# SB-503 Provider Chaos Suite Report ($DATE_TAG)"
  echo
  echo "Command: \`make qa-provider-chaos\`"
  echo
  echo "- Result: **$result**"
  echo "- Artifact: \`$RESULT_FILE\`"
  echo "- JSON log: \`$JSON_LOG\`"
  echo "- stderr log: \`$TEXT_LOG\`"
  echo
  echo "## Thresholds"
  echo
  echo "1. Minimum executed chaos scenarios: \`$CHAOS_MIN_CASES\`."
  echo "2. Maximum failed chaos scenarios: \`$CHAOS_MAX_FAILED_CASES\`."
  echo
  echo "## Covered Scenarios"
  echo
  echo "1. Reconnect replay with checkpoint deduplication."
  echo "2. Reordered stream delivery and duplicate telemetry."
  echo "3. Dropped revision detection with gap telemetry."
  echo "4. Stream error propagation and error telemetry."
} >"$REPORT_FILE"

echo "Provider chaos artifact: $RESULT_FILE"
if [[ "$result" != "pass" ]]; then
  exit 1
fi
