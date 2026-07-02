#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SMOKE_SCRIPT="$ROOT/scripts/qa/sports-route-smoke.sh"
API_CONTRACT_SCRIPT="$ROOT/scripts/frontend/verify-api-contract-fixtures.sh"
ITERATIONS="${ITERATIONS:-1}"

if ! [[ "$ITERATIONS" =~ ^[0-9]+$ ]] || [[ "$ITERATIONS" -lt 1 ]]; then
  echo "error: ITERATIONS must be a positive integer" >&2
  exit 1
fi

echo "[gate] qa-sports-regression is a compatibility alias for Tiangge discovery/API contract regression"
echo "[info] ITERATIONS=$ITERATIONS"

for ((i = 1; i <= ITERATIONS; i++)); do
  echo "[iteration] discovery smoke $i/$ITERATIONS"
  bash "$SMOKE_SCRIPT"
done

echo "[gate] running Tiangge API/client contract verifier"
bash "$API_CONTRACT_SCRIPT"

echo "[ok] Tiangge discovery/API contract regression gate passed"
