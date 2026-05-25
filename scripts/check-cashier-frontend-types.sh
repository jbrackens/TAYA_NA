#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT/apps/Phoenix-Predict-Combined/talon-backoffice/packages/app"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

cd "$APP_DIR"
npx tsc --noEmit >"$TMP" 2>&1 || true

CASHIER_ERRORS="$(
  grep -E '^(app/cashier/page\.tsx|app/components/(CryptoDepositCard|NonCustodialCashierStatus|CashierCanaryPanel)\.tsx|app/lib/api/(client|crypto-client|index|noncustodial-cashier-client)\.ts)' "$TMP" \
    | grep -E 'error TS[0-9]+:' || true
)"

if [ -n "$CASHIER_ERRORS" ]; then
  echo "cashier frontend TypeScript errors detected:"
  echo "$CASHIER_ERRORS"
  exit 1
fi

echo "cashier frontend type checks passed"
