#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GIT_ROOT="$(git -C "$ROOT" rev-parse --show-toplevel)"
REVIVAL_DIR="$ROOT/revival"
ARTIFACT_DIR="$REVIVAL_DIR/artifacts"
REPORT_PATH="${PRESERVATION_DELETION_REPORT:-$REVIVAL_DIR/33_PRESERVATION_DELETION_MAP.md}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%S")"
ARTIFACT_PATH="$ARTIFACT_DIR/preservation_deletion_map_${TIMESTAMP}.md"

classify_deleted_path() {
  local path="$1"

  case "$path" in
    apps/taptrade-platform/frontend/packages/app/app/cashier/*)
      echo "player launch-prohibited cashier route"
      return 0
      ;;
    apps/taptrade-platform/frontend/packages/app/app/components/CashierCanaryPanel.tsx|\
apps/taptrade-platform/frontend/packages/app/app/components/CryptoDepositCard.tsx|\
apps/taptrade-platform/frontend/packages/app/app/components/DepositThresholdModal.tsx|\
apps/taptrade-platform/frontend/packages/app/app/components/NonCustodialCashierStatus.tsx)
      echo "player launch-prohibited cashier/payment component"
      return 0
      ;;
    apps/taptrade-platform/frontend/packages/app/app/lib/api/alpha-cashier-client.ts|\
apps/taptrade-platform/frontend/packages/app/app/lib/api/crypto-client.ts|\
apps/taptrade-platform/frontend/packages/app/app/lib/api/noncustodial-cashier-client.ts)
      echo "player launch-prohibited cashier/crypto API client"
      return 0
      ;;
    apps/taptrade-platform/frontend/packages/app/app/lib/store/cashierSlice.ts|\
apps/taptrade-platform/frontend/packages/app/app/lib/store/predictionSlice.ts|\
apps/taptrade-platform/frontend/packages/app/app/lib/services/currency.ts|\
apps/taptrade-platform/frontend/packages/app/app/lib/utils/odds.ts|\
apps/taptrade-platform/frontend/packages/app/app/lib/format.ts)
      echo "player retired money/sportsbook helper replaced by point-native surfaces"
      return 0
      ;;
    apps/taptrade-platform/frontend/packages/app/app/__tests__/alpha-cashier.test.ts|\
apps/taptrade-platform/frontend/packages/app/app/__tests__/bet-placement.test.ts|\
apps/taptrade-platform/frontend/packages/app/app/__tests__/odds.test.ts)
      echo "player retired launch-incompatible test replaced by point-native regressions"
      return 0
      ;;
    apps/taptrade-platform/frontend/packages/app/public/static/locales/*/cashier.json|\
apps/taptrade-platform/frontend/packages/app/public/static/locales/*/deposit-limits.json|\
apps/taptrade-platform/frontend/packages/app/public/static/locales/*/deposit-threshold.json)
      echo "player launch-prohibited cashier/deposit locale bundle"
      return 0
      ;;
    apps/taptrade-platform/frontend/packages/office/app/\(dashboard\)/cashier/page.tsx|\
apps/taptrade-platform/frontend/packages/office/containers/provider-ops/cashier-review.tsx|\
apps/taptrade-platform/frontend/packages/office/components/users/transaction-modal/index.tsx|\
apps/taptrade-platform/frontend/packages/office/components/users/wallet/table-actions/index.tsx|\
apps/taptrade-platform/frontend/packages/office/components/users/wallet/table-actions/index.styled.ts)
      echo "office launch-prohibited or launch-adjacent money admin surface"
      return 0
      ;;
    apps/taptrade-platform/frontend/packages/office/tests/alpha-cashier-review.test.ts)
      echo "office retired launch-incompatible cashier test replaced by route/account-review regressions"
      return 0
      ;;
    apps/taptrade-platform/frontend/packages/office/components/audit-logs/utils/__tests__/resolvers.test.ts|\
apps/taptrade-platform/frontend/packages/office/lib/slices/__tests__/logsSlice.test.ts|\
apps/taptrade-platform/frontend/packages/office/lib/slices/__tests__/usersDetailsAuditSlice.test.ts|\
apps/taptrade-platform/frontend/packages/office/lib/slices/__tests__/usersRecentActivitySlices.test.ts)
      echo "office test relocated to package-level regression suite"
      return 0
      ;;
    apps/taptrade-platform/go-platform/services/gateway/cmd/reconciliation-report/*|\
apps/taptrade-platform/go-platform/services/gateway/internal/http/testdata/reconciliation/*)
      echo "gateway retired bet replay proof replaced by point-native reconciliation report"
      return 0
      ;;
    apps/taptrade-platform/go-platform/services/gateway/internal/http/testdata/seeds/read-model.seed\ 2.json)
      echo "gateway duplicate seed fixture retired during point-native seed cleanup"
      return 0
      ;;
  esac

  return 1
}

verify_replacement_evidence() {
  local group="$1"

  case "$group" in
    "player launch-prohibited cashier route"|\
"player launch-prohibited cashier/payment component"|\
"player launch-prohibited cashier/crypto API client"|\
"player launch-prohibited cashier/deposit locale bundle"|\
"office launch-prohibited or launch-adjacent money admin surface")
      [[ -f "$ROOT/scripts/qa/live-no-money-boundary.sh" ]] || return 1
      [[ -f "$ROOT/frontend/scripts/qa/live-no-money-boundary.mjs" ]] || return 1
      rg -q '"/cashier"|"/cashout"|"/crypto"|"/deposit"|"/withdraw' "$ROOT/frontend/scripts/qa/live-no-money-boundary.mjs" || return 1
      echo "\`scripts/qa/live-no-money-boundary.sh\` + \`frontend/scripts/qa/live-no-money-boundary.mjs\` prove retired money routes/API paths remain absent at runtime."
      return 0
      ;;
    "player retired money/sportsbook helper replaced by point-native surfaces")
      [[ -f "$ROOT/frontend/packages/app/app/lib/point-ledger.ts" ]] || return 1
      [[ -f "$ROOT/frontend/packages/app/app/lib/api/wallet-client.ts" ]] || return 1
      [[ -f "$ROOT/frontend/packages/app/app/__tests__/point-ledger.test.ts" ]] || return 1
      rg -q 'Order points locked|Settlement points|Starter points' "$ROOT/frontend/packages/app/app/lib/point-ledger.ts" || return 1
      rg -q 'does not preserve retired deposit or withdrawal type branches' "$ROOT/frontend/packages/app/app/__tests__/point-ledger.test.ts" || return 1
      echo "\`app/lib/point-ledger.ts\`, \`app/lib/api/wallet-client.ts\`, and \`app/__tests__/point-ledger.test.ts\` replace money helpers with PTS ledger presentation."
      return 0
      ;;
    "player retired launch-incompatible test replaced by point-native regressions")
      [[ -f "$ROOT/frontend/packages/app/app/__tests__/point-ledger.test.ts" ]] || return 1
      rg -q 'forbiddenValueTerms|does not preserve retired deposit or withdrawal type branches' "$ROOT/frontend/packages/app/app/__tests__/point-ledger.test.ts" || return 1
      echo "\`app/__tests__/point-ledger.test.ts\` covers point-only labels and rejects retired deposit/withdrawal branches."
      return 0
      ;;
    "office retired launch-incompatible cashier test replaced by route/account-review regressions")
      [[ -f "$ROOT/frontend/packages/office/tests/recent-activities.test.ts" ]] || return 1
      [[ -f "$ROOT/frontend/packages/office/tests/users-recent-activity-slices.test.ts" ]] || return 1
      rg -q 'PTS|wallet_transaction' "$ROOT/frontend/packages/office/tests/recent-activities.test.ts" || return 1
      rg -q 'PTS|wallet_transaction' "$ROOT/frontend/packages/office/tests/users-recent-activity-slices.test.ts" || return 1
      echo "\`office/tests/recent-activities.test.ts\` and \`office/tests/users-recent-activity-slices.test.ts\` replace cashier review with point-native account activity review."
      return 0
      ;;
    "office test relocated to package-level regression suite")
      [[ -f "$ROOT/frontend/packages/office/tests/audit-log-resolvers.test.ts" ]] || return 1
      [[ -f "$ROOT/frontend/packages/office/tests/audit-log-slices.test.ts" ]] || return 1
      [[ -f "$ROOT/frontend/packages/office/tests/users-recent-activity-slices.test.ts" ]] || return 1
      rg -q 'legacy audit|legacy actions|audit log' "$ROOT/frontend/packages/office/tests/audit-log-resolvers.test.ts" || return 1
      rg -q 'legacy audit|auditLogs|legacy actions' "$ROOT/frontend/packages/office/tests/audit-log-slices.test.ts" || return 1
      echo "\`office/tests/audit-log-resolvers.test.ts\`, \`office/tests/audit-log-slices.test.ts\`, and \`office/tests/users-recent-activity-slices.test.ts\` preserve relocated audit/activity coverage."
      return 0
      ;;
    "gateway retired bet replay proof replaced by point-native reconciliation report")
      [[ -f "$ROOT/go-platform/services/gateway/cmd/prediction-reconciliation-report/main.go" ]] || return 1
      [[ -f "$ROOT/go-platform/services/gateway/internal/http/testdata/prediction_reconciliation/lifecycle_cases.json" ]] || return 1
      rg -q 'retiredMoneyTerms|PTS|prediction reconciliation' "$ROOT/go-platform/services/gateway/cmd/prediction-reconciliation-report/main.go" || return 1
      echo "\`cmd/prediction-reconciliation-report\` and \`internal/http/testdata/prediction_reconciliation/lifecycle_cases.json\` replace retired bet replay with point-native reconciliation proof."
      return 0
      ;;
    "gateway duplicate seed fixture retired during point-native seed cleanup")
      [[ -f "$ROOT/go-platform/services/gateway/internal/http/testdata/read-model.seed.json" || -f "$ROOT/go-platform/services/gateway/internal/http/testdata/seeds/read-model.seed.json" ]] || return 1
      echo "Canonical read-model seed fixture remains; only the duplicate \`read-model.seed 2.json\` is retired."
      return 0
      ;;
  esac

  return 1
}

deleted_paths=()
while IFS= read -r -d '' entry; do
  status="${entry:0:2}"
  path="${entry:3}"
  if [[ "$status" == *D* ]]; then
    deleted_paths+=("$path")
  fi
done < <(git -C "$GIT_ROOT" status --porcelain=v1 -z -- "$ROOT")

if ((${#deleted_paths[@]} == 0)); then
  echo "No deleted artifacts in the current TapTrade diff."
  exit 0
fi

groups=()
classified_rows="$(mktemp)"
unclassified=()
cleanup() {
  rm -f "$classified_rows"
}
trap cleanup EXIT

for path in "${deleted_paths[@]}"; do
  if group="$(classify_deleted_path "$path")"; then
    if ! evidence="$(verify_replacement_evidence "$group")"; then
      echo "Deleted artifact classification has no replacement evidence:" >&2
      echo "  - $path" >&2
      echo "  - classification: $group" >&2
      echo "" >&2
      echo "Restore the artifact or add durable replacement evidence before continuing." >&2
      exit 1
    fi
    groups+=("$group")
    printf '%s\t%s\t%s\n' "$group" "$evidence" "$path" >> "$classified_rows"
  else
    unclassified+=("$path")
  fi
done

if ((${#unclassified[@]} > 0)); then
  echo "Unclassified deleted artifacts require preservation review:" >&2
  for path in "${unclassified[@]}"; do
    echo "  - $path" >&2
  done
  echo "" >&2
  echo "Classify the deletion, restore it, or add a point-native replacement before continuing." >&2
  exit 1
fi

echo "Classified ${#deleted_paths[@]} deleted artifacts for preservation review:"
printf '%s\n' "${groups[@]}" | sort | uniq -c | while read -r count group; do
  printf '  - %s: %s\n' "$group" "$count"
done

mkdir -p "$ARTIFACT_DIR"

{
  echo "# Preservation Deletion Map"
  echo ""
  echo "- Generated: \`$(date -u +"%Y-%m-%dT%H:%M:%SZ")\`"
  echo "- Git root: \`$GIT_ROOT\`"
  echo "- Scope: \`$ROOT\`"
  echo "- Deleted artifacts classified: \`${#deleted_paths[@]}\`"
  echo "- Unclassified deleted artifacts: \`0\`"
  echo "- Decision: current deletions are classified for preservation review; this is not an RC completion claim."
  echo ""
  echo "## Summary"
  echo ""
  echo "| Classification | Count |"
  echo "|---|---:|"
  printf '%s\n' "${groups[@]}" | sort | uniq -c | while read -r count group; do
    printf '| %s | %s |\n' "$group" "$count"
  done
  echo ""
  echo "## Deleted Paths"
  echo ""
  echo "| Classification | Replacement Evidence | Path |"
  echo "|---|---|---|"
  sort "$classified_rows" | while IFS="$(printf '\t')" read -r group evidence path; do
    printf '| %s | %s | `%s` |\n' "$group" "$evidence" "$path"
  done
  echo ""
  echo "## Preservation Rules"
  echo ""
  echo "- Launch-prohibited public money paths stay absent from shipped player and office routes."
  echo "- Private compatibility internals should be preserved unless they create a launch-facing money path."
  echo "- Deleted operational proof tools must have point-native replacement evidence before related scenarios can pass."
  echo "- New deleted artifacts must either be classified here, restored, or replaced before review."
} > "$REPORT_PATH"

cp "$REPORT_PATH" "$ARTIFACT_PATH"

echo "Wrote preservation deletion map:"
echo "  - $REPORT_PATH"
echo "  - $ARTIFACT_PATH"
