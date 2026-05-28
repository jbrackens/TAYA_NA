#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GATEWAY="$ROOT/apps/Phoenix-Predict-Combined/go-platform/services/gateway"

echo "alpha cashier: running Stage 1 backend smoke checks"
(
  cd "$GATEWAY"
  go test ./internal/alphacashier -run 'TestAlphaCashierFakeChainSmoke|TestServicePreflight|TestServiceApproveWithdrawalRequiresReviewNote'
  go test ./internal/http -run 'TestAlphaCashierAdmin'
)

if [[ "${RUN_ALPHA_CASHIER_FRONTEND_CHECKS:-}" == "1" ]]; then
  echo "alpha cashier: running backoffice source-wiring check"
  (
    cd "$ROOT/apps/Phoenix-Predict-Combined/talon-backoffice/packages/office"
    yarn test tests/alpha-cashier-review.test.ts
  )
fi

echo "alpha cashier: Stage 1 checks passed"
