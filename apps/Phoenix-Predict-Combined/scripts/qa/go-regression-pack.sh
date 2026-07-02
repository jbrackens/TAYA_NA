#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GO_DIR="$ROOT_DIR/go-platform"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/179_SB502_CANONICAL_REGRESSION_PACK_REPORT.md"

DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
RESULT_FILE="$ARTIFACT_DIR/regression_pack_${TS_TAG}.md"

mkdir -p "$ARTIFACT_DIR"

run_step() {
  local name="$1"
  shift
  local cmd=("$@")
  local log_file="$ARTIFACT_DIR/regression_pack_${TS_TAG}_$(echo "$name" | tr ' ' '_' | tr -cd '[:alnum:]_').log"

  if "${cmd[@]}" >"$log_file" 2>&1; then
    echo "| $name | pass | \`$log_file\` |" >>"$RESULT_FILE"
    return 0
  fi

  echo "| $name | fail | \`$log_file\` |" >>"$RESULT_FILE"
  return 1
}

{
  echo "# Canonical Regression Pack ($DATE_TAG)"
  echo
  echo "| Suite | Result | Log |"
  echo "|---|---|---|"
} >"$RESULT_FILE"

overall=0

run_step "canonical replay invariants" \
  bash -lc "cd \"$GO_DIR\" && go test ./modules/platform/canonical/replay -run 'TestReplayAppliesSortedAndUpdatesCheckpoint|TestReplaySkipsOldEvents|TestReplayStopsOnApplyError' -count=1" || overall=1

run_step "prediction order lifecycle transitions" \
  bash -lc "cd \"$GO_DIR\" && go test ./services/gateway/internal/prediction -run 'TestValidMarketTransitions|TestInvalidMarketTransitions|TestTransitionMarket|TestDescribeTianggeMarketLifecycleMapsLaunchStages|TestPlaceOrder_OrderBookBuyYes_WalletPlanCapturesAndCreditsSeller|TestPlaceOrder_OrderBookBuyNo_IssuanceCapturesBothReservations|TestPlaceOrder_OrderBookSellYes_CreditsSellerWithoutCashHold|TestPlaceOrder_OrderBookBuyYes_InsufficientPointsRejectsBeforeCapture|TestCancelOrder_OrderBookRestingBuy_ReleasesHeldPointsAndRGCommit|TestCancelOrder_OrderBookRestingSell_ReleasesReservedShares|TestResolveMarket_CreditsWinnersOnly|TestResolveMarket_UsesAtomicSettlementWhenAvailable|TestResolveMarket_AtomicSettlement_ZerosPositions|TestVoidMarket_RefundsAllPositions|TestVoidMarket_UsesAtomicVoidWhenAvailable|TestProposeThenFinalizeResolution|TestResolveDisputeDualControlAndReject|TestFinalizeClaimedExactlyOnce|TestFileDisputeUnderLockBlocksFinalize|TestPreviewOrder_OrderBookUsesExchangeEngine|TestPreviewOrder_OrderBookPartialMarketBuyReportsPartialFill|TestPlaceOrder_ConcurrentIdempotentReplay_DoesNotDoubleRecord' -count=1" || overall=1

run_step "point wallet ledger transitions" \
  bash -lc "cd \"$GO_DIR\" && go test ./services/gateway/internal/wallet -run 'TestCreditAndDebitFlow|TestCreditIsIdempotentByKey|TestIdempotencyKeyConflictReturnsError|TestDebitFailsWhenInsufficientFunds|TestReconciliationSummaryLocalStore|TestManualCorrectionTaskLifecycle|TestWalletStatePersistsAcrossServiceInstances|TestRewardClusterDBStoreBlocksAcrossServiceInstances' -count=1" || overall=1

run_step "http order admin and launch-boundary transitions" \
  bash -lc "cd \"$GO_DIR\" && go test ./services/gateway/internal/http -run 'TestLegacyMoneyRoutesAreAbsentByDefault|TestStatusEndpointReportsLaunchPointBoundary|TestLaunchDocsStayPointsOnly|TestPlaceOrderRejectsMissingMarketID|TestPlaceOrderRejectsRetiredRequestAliasesAtHTTPBoundary|TestOrderPreviewRejectsRetiredRequestAliasesAtHTTPBoundary|TestPublicWalletMutationRoutesRemoved|TestAdminWalletMutationRequiresValidatedAdmin|TestAdminWalletCreditRecordsAuditEntry|TestWalletCreditDebitBalanceAndLedgerFlow|TestAdminWalletMutationRequestRequiresPointAmountAlias|TestWalletCreditIsIdempotentAcrossRetries|TestWalletIdempotencyReplayConflictReturnsConflict|TestPredictionAdminCreateMarketRejectsLaunchProhibitedSettlementSource|TestPredictionAdminSettlementReplayResumesIncompleteDisbursements|TestWalletReconciliationReportUsesPointFields' -count=1" || overall=1

run_step "point reconciliation report contract" \
  bash -lc "cd \"$GO_DIR/services/gateway\" && go test ./cmd/prediction-reconciliation-report -run 'TestDefaultFixtureReconcilesPointNativeLedger|TestFixtureRejectsRetiredMoneyAndBetFields|TestReportUsesPointNativeVocabulary|TestReconciliationFixtureFollowsLaunchGatewayContracts' -count=1" || overall=1

result="pass"
if [[ $overall -ne 0 ]]; then
  result="fail"
fi

{
  echo "# SB-502 Canonical Regression Pack Report ($DATE_TAG)"
  echo
  echo "Command: \`make qa-regression-pack\`"
  echo
  echo "- Result: **$result**"
  echo "- Artifact: \`$RESULT_FILE\`"
  echo
  echo "## Scope"
  echo
  echo "1. Canonical replay ordering/checkpoint invariants."
  echo "2. Prediction order lifecycle transitions (buy/sell/cancel/preview/idempotency)."
  echo "3. Point wallet ledger transitions (credit/debit/idempotency/reconciliation/corrections)."
  echo "4. HTTP order, admin wallet, launch-boundary, and settlement replay transitions."
  echo "5. Point-native prediction reconciliation report contract."
  echo
  echo "## Gate Policy"
  echo
  echo "1. This pack is a mandatory merge/release gate for SB-502."
  echo "2. Any failing suite blocks merge until resolved."
  echo "3. Retired sportsbook bet lifecycle suites must not be used as launch readiness gates."
} >"$REPORT_FILE"

echo "Regression pack artifact: $RESULT_FILE"
if [[ $overall -ne 0 ]]; then
  exit 1
fi
