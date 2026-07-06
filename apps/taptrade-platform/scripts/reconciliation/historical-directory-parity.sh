#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INPUT_DIR="${1:-"$ROOT/phoenix-backend/services/src/test/resources/data/reports/application"}"
TODAY="$(date +%F)"
OUT_FILE="${2:-"$ROOT/revival/artifacts/reconciliation_parity_batch_${TODAY}.md"}"
FIXTURE_PATH="internal/http/testdata/prediction_reconciliation/lifecycle_cases.json"
POINT_NATIVE_REPORT="$ROOT/revival/artifacts/prediction_reconciliation_report_${TODAY}.md"

if [[ ! -d "$INPUT_DIR" ]]; then
  echo "historical directory not found: $INPUT_DIR" >&2
  exit 1
fi

csv_files=()
while IFS= read -r path; do
  csv_files+=("$path")
done < <(find "$INPUT_DIR" -type f -name '*.csv' | sort)
if [[ ${#csv_files[@]} -eq 0 ]]; then
  echo "no csv files found in: $INPUT_DIR" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT_FILE")" "$(dirname "$POINT_NATIVE_REPORT")"

(
  cd "$ROOT/go-platform/services/gateway"
  go run ./cmd/prediction-reconciliation-report \
    -fixture "$FIXTURE_PATH" \
    -out "$POINT_NATIVE_REPORT"
)

{
  echo "# Historical Parity Batch Report"
  echo
  echo "- Input directory: \`${INPUT_DIR}\`"
  echo "- Historical bet CSV replay: retired for TapTrade launch."
  echo "- Point-native replacement report: \`${POINT_NATIVE_REPORT#"$ROOT/"}\`"
  echo
  echo "| CSV | Status | Report | Notes |"
  echo "|---|---|---|---|"
  for file in "${csv_files[@]}"; do
    rel_file="${file#"$ROOT/"}"
    echo "| \`${rel_file}\` | RETIRED | \`${POINT_NATIVE_REPORT#"$ROOT/"}\` | historical bet CSV replay is launch-retired; point-native prediction reconciliation ran instead |"
  done
} > "$OUT_FILE"

echo "wrote batch report: $OUT_FILE"
