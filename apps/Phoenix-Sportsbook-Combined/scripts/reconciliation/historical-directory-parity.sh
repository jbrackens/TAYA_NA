#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INPUT_DIR="${1:-"$ROOT/phoenix-backend/services/src/test/resources/data/reports/application"}"
TODAY="$(date +%F)"
OUT_FILE="${2:-"$ROOT/revival/artifacts/reconciliation_parity_batch_${TODAY}.md"}"
FIXTURE_PATH="internal/http/testdata/reconciliation/lifecycle_cases.json"

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

mkdir -p "$(dirname "$OUT_FILE")"

total=0
pass=0
fail=0
skipped=0
rows=()

for file in "${csv_files[@]}"; do
  total=$((total + 1))
  rel_file="${file#"$ROOT/"}"
  header="$(head -n 1 "$file" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
  if [[ "$header" != *"eventtype"* || "$header" != *"betid"* ]]; then
    skipped=$((skipped + 1))
    rows+=("| \`${rel_file}\` | SKIPPED | n/a | missing required columns (eventType, betId) |")
    continue
  fi

  base="$(basename "$file" .csv)"
  safe_base="$(echo "$base" | tr -cs 'A-Za-z0-9._-' '_')"
  report_path="$ROOT/revival/artifacts/reconciliation_parity_${safe_base}_${TODAY}.md"
  rel_report="${report_path#"$ROOT/"}"

  set +e
  output="$(
    cd "$ROOT/go-platform/services/gateway" && \
      go run ./cmd/reconciliation-report \
        -fixture "$FIXTURE_PATH" \
        -historical-bets-csv "$file" \
        -fail-on-skipped \
        -out "$report_path" 2>&1
  )"
  rc=$?
  set -e

  if [[ $rc -eq 0 ]]; then
    pass=$((pass + 1))
    rows+=("| \`${rel_file}\` | PASS | \`${rel_report}\` | strict parity passed |")
  else
    fail=$((fail + 1))
    one_line="$(echo "$output" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g' | cut -c1-220)"
    rows+=("| \`${rel_file}\` | FAIL | \`${rel_report}\` | ${one_line} |")
  fi
done

{
  echo "# Historical Parity Batch Report"
  echo
  echo "- Input directory: \`${INPUT_DIR}\`"
  echo "- Total CSV files: \`${total}\`"
  echo "- Passed: \`${pass}\`"
  echo "- Failed: \`${fail}\`"
  echo "- Skipped (schema): \`${skipped}\`"
  echo
  echo "| CSV | Status | Report | Notes |"
  echo "|---|---|---|---|"
  for row in "${rows[@]}"; do
    echo "$row"
  done
} > "$OUT_FILE"

echo "wrote batch report: $OUT_FILE"
if [[ $fail -gt 0 ]]; then
  exit 1
fi
