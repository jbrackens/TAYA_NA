#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GIT_ROOT="$(git -C "$ROOT" rev-parse --show-toplevel)"
REVIVAL_DIR="$ROOT/revival"
ARTIFACT_DIR="$REVIVAL_DIR/artifacts"
REPORT_PATH="${PRESERVATION_PRODUCTION_DOSSIER_REPORT:-$REVIVAL_DIR/93_PRODUCTION_PRESERVATION_DOSSIER.md}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%S")"
ARTIFACT_PATH="$ARTIFACT_DIR/production_preservation_dossier_${TIMESTAMP}.md"

status_file="$(mktemp)"
compat_file="$(mktemp)"
high_risk_file="$(mktemp)"
untracked_file="$(mktemp)"
untracked_classified_file="$(mktemp)"
untracked_unclassified_file="$(mktemp)"
cleanup() {
  rm -f \
    "$status_file" \
    "$compat_file" \
    "$high_risk_file" \
    "$untracked_file" \
    "$untracked_classified_file" \
    "$untracked_unclassified_file"
}
trap cleanup EXIT

git -C "$GIT_ROOT" diff --name-status -- "$ROOT" > "$status_file"
git -C "$GIT_ROOT" status --porcelain=v1 -- "$ROOT" \
  | awk '$1 == "??" { sub(/^\?\? /, ""); print }' > "$untracked_file"
shortstat="$(git -C "$GIT_ROOT" diff --shortstat -- "$ROOT" || true)"
[[ -n "$shortstat" ]] || shortstat="No tracked diff"

count_status() {
  local pattern="$1"
  awk -v pattern="$pattern" '$0 ~ pattern { count++ } END { print count + 0 }' "$status_file"
}

classify_untracked_path() {
  local path="$1"

  case "$path" in
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/*)
      printf 'high\tuntracked gateway HTTP/admin behavior or tests'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/alphacashier/*)
      printf 'high\tuntracked guarded legacy transfer compatibility behavior or tests'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/compliance/*)
      printf 'high\tuntracked compliance behavior or tests'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/*)
      printf 'high\tuntracked prediction engine behavior or tests'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/prediction-reconciliation-report/*)
      printf 'high\tuntracked point-reconciliation proof command'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/launch-boundary-report/*|\
apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/windowed-resolution-live-proof/*)
      printf 'medium\tuntracked launch proof command'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/seed/*|\
apps/Phoenix-Predict-Combined/go-platform/services/gateway/migrations/*)
      printf 'medium\tuntracked schema or seed artifact'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/scripts/qa/*|\
apps/Phoenix-Predict-Combined/scripts/security/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/scripts/qa/*)
      printf 'medium\tuntracked verification or security governance'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/talon-backoffice/e2e/prediction/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/tests/*)
      printf 'low\tuntracked regression or browser proof'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/rewards/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/activity/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/series/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/users/*)
      printf 'medium\tuntracked player launch surface'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/*)
      printf 'low\tuntracked market visual asset'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/translations/|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/translations/*)
      printf 'low\tuntracked player locale runtime scaffolding'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/components/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/containers/*)
      printf 'medium\tuntracked office admin surface'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/revival/artifacts/*)
      printf 'low\tuntracked revival evidence artifact'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/revival/signoffs/|\
apps/Phoenix-Predict-Combined/revival/signoffs/*)
      printf 'medium\tuntracked launch signoff governance record'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/revival/*)
      printf 'low\tuntracked revival evidence report'
      return 0
      ;;
  esac

  return 1
}

modified_count="$(awk '$1 ~ /M/ { count++ } END { print count + 0 }' "$status_file")"
deleted_count="$(awk '$1 == "D" { count++ } END { print count + 0 }' "$status_file")"
added_count="$(awk '$1 == "A" { count++ } END { print count + 0 }' "$status_file")"
renamed_count="$(awk '$1 ~ /^R/ { count++ } END { print count + 0 }' "$status_file")"
untracked_count="$(wc -l < "$untracked_file" | tr -d ' ')"

auth_contract_count="$(count_status 'apps/Phoenix-Predict-Combined/go-platform/services/auth/')"
gateway_http_count="$(count_status 'apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/')"
gateway_alpha_cashier_count="$(count_status 'apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/alphacashier/')"
prediction_engine_count="$(count_status 'apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/')"
wallet_ledger_count="$(count_status 'apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/')"
economy_count="$(count_status 'apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/(bonus|leaderboards|loyalty|compliance)/')"
public_contract_count="$(count_status 'apps/Phoenix-Predict-Combined/(go-platform/services/gateway/api/openapi.yaml|talon-backoffice/packages/api-client/src/)')"
office_ops_count="$(count_status 'apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/')"
player_surface_count="$(count_status 'apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/')"
prohibited_deleted_count="$(awk '$1 == "D" && $0 ~ /(cashier|cashout|crypto|deposit|payment|withdraw|redemption|redeem)/ { count++ } END { print count + 0 }' "$status_file")"

{
  awk '$1 ~ /M|D|A|R/ && $0 ~ /apps\/Phoenix-Predict-Combined\/go-platform\/services\/auth\// { print }' "$status_file"
  awk '$1 ~ /M|D|A|R/ && $0 ~ /apps\/Phoenix-Predict-Combined\/go-platform\/services\/gateway\/internal\/http\// { print }' "$status_file"
  awk '$1 ~ /M|D|A|R/ && $0 ~ /apps\/Phoenix-Predict-Combined\/go-platform\/services\/gateway\/internal\/alphacashier\// { print }' "$status_file"
  awk '$1 ~ /M|D|A|R/ && $0 ~ /apps\/Phoenix-Predict-Combined\/go-platform\/services\/gateway\/internal\/prediction\// { print }' "$status_file"
  awk '$1 ~ /M|D|A|R/ && $0 ~ /apps\/Phoenix-Predict-Combined\/go-platform\/services\/gateway\/internal\/wallet\// { print }' "$status_file"
  awk '$1 ~ /M|D|A|R/ && $0 ~ /apps\/Phoenix-Predict-Combined\/go-platform\/services\/gateway\/api\/openapi.yaml/ { print }' "$status_file"
  awk '$1 ~ /M|D|A|R/ && $0 ~ /apps\/Phoenix-Predict-Combined\/talon-backoffice\/packages\/api-client\/src\// { print }' "$status_file"
} | sort -u > "$high_risk_file"

: > "$untracked_classified_file"
: > "$untracked_unclassified_file"
while IFS= read -r path; do
  [[ -n "$path" ]] || continue
  if group="$(classify_untracked_path "$path")"; then
    risk="${group%%$'\t'*}"
    classification="${group#*$'\t'}"
    printf '%s\t%s\t%s\n' "$risk" "$classification" "$path" >> "$untracked_classified_file"
  else
    printf '%s\n' "$path" >> "$untracked_unclassified_file"
  fi
done < "$untracked_file"
untracked_unclassified_count="$(wc -l < "$untracked_unclassified_file" | tr -d ' ')"

check_token() {
  local label="$1"
  local path="$2"
  local pattern="$3"
  local note="$4"
  local rel="apps/Phoenix-Predict-Combined/$path"

  if [[ -f "$ROOT/$path" ]] && rg -q "$pattern" "$ROOT/$path"; then
    printf 'pass\t%s\t`%s`\t%s\n' "$label" "$rel" "$note" >> "$compat_file"
    return 0
  fi

  printf 'missing\t%s\t`%s`\t%s\n' "$label" "$rel" "$note" >> "$compat_file"
  return 1
}

missing=0
check_token \
  "Inherited Phoenix API client class retained" \
  "talon-backoffice/packages/api-client/src/client.ts" \
  'export class PhoenixApiClient' \
  "Preserves existing shared-client imports while launch code can adopt TapTrade naming." || missing=1
check_token \
  "TapTrade API client alias added instead of replacing class" \
  "talon-backoffice/packages/api-client/src/client.ts" \
  'export const TapTradeApiClient = PhoenixApiClient' \
  "Adds launch-facing naming without deleting the inherited class." || missing=1
check_token \
  "Shared entrypoint exports both API-client names" \
  "talon-backoffice/packages/api-client/src/index.ts" \
  'PhoenixApiClient, TapTradeApiClient' \
  "Keeps old and new consumers on the same implementation." || missing=1
check_token \
  "Legacy wallet payload reads remain private" \
  "talon-backoffice/packages/api-client/src/client.ts" \
  'LegacyWalletBalancePayload' \
  "Older wallet payloads are normalized rather than re-exported as launch contracts." || missing=1
check_token \
  "Legacy audit payload reads remain private" \
  "talon-backoffice/packages/api-client/src/client.ts" \
  'LegacyAuditLogEntryPayload' \
  "Older promo audit fields are mapped into point-native review fields." || missing=1
check_token \
  "Historical reconciliation Make alias retained" \
  "Makefile" \
  'go-reconciliation-report-historical:' \
  "Inherited command muscle memory now routes to point-native reconciliation proof." || missing=1
check_token \
  "Discovery QA compatibility alias retained" \
  "scripts/qa/sports-regression-gate.sh" \
  'compatibility alias for TapTrade discovery/API contract regression' \
  "Legacy sports regression naming remains as a launch-safe compatibility wrapper." || missing=1

review_focus_for_path() {
  local path="$1"

  case "$path" in
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/testdata/reconciliation/*)
      echo "retired lifecycle fixture coverage versus point-native reconciliation proof fixtures"
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/testdata/seeds/read-model.seed\ 2.json)
      echo "duplicate seed removal versus remaining canonical read-model seed fixture"
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/auth/*)
      echo "registration/session persistence, disclosure acceptance fields, cookie/auth compatibility"
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/api/openapi.yaml)
      echo "public API compatibility, launch-safe point-native schema names, removed money-path docs"
      return 0
      ;;
    apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/*)
      echo "shared client imports, legacy payload normalization, launch-facing type aliases"
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/*)
      echo "route behavior, admin authorization, request/response compatibility, unsafe copy rejection"
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/alphacashier/*)
      echo "guarded legacy transfer compatibility routes, disabled launch behavior, unsafe copy redaction"
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/*)
      echo "market lifecycle, order matching, settlement math, position and audit persistence"
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/*)
      echo "point balance invariants, ledger idempotency, reservations, capture/release semantics"
      return 0
      ;;
  esac

  echo "domain-specific inherited behavior and point-only launch adaptation"
}

mkdir -p "$ARTIFACT_DIR"

{
  echo "# Production Preservation Dossier"
  echo ""
  echo "- Generated: \`$(date -u +"%Y-%m-%dT%H:%M:%SZ")\`"
  echo "- Git root: \`$GIT_ROOT\`"
  echo "- Scope: \`$ROOT\`"
  echo "- Shortstat: \`$shortstat\`"
  echo "- Decision: inherited production artifacts are not assumed preserved merely because tests pass; this dossier keeps the broad rewrite risk visible and fails if key compatibility anchors disappear."
  echo ""
  echo "## Change Magnitude"
  echo ""
  echo "| Status | Count |"
  echo "|---|---:|"
  echo "| Modified tracked files | $modified_count |"
  echo "| Deleted tracked files | $deleted_count |"
  echo "| Added tracked files | $added_count |"
  echo "| Renamed tracked files | $renamed_count |"
  echo "| Untracked artifacts in scope | $untracked_count |"
  echo "| Unclassified untracked artifacts | $untracked_unclassified_count |"
  echo "| Deleted launch-prohibited money-path files | $prohibited_deleted_count |"
  echo ""
  echo "## High-Risk Domain Counts"
  echo ""
  echo "| Domain | Changed Tracked Files |"
  echo "|---|---:|"
  echo "| Auth/session contract | $auth_contract_count |"
  echo "| Gateway HTTP/admin handlers | $gateway_http_count |"
  echo "| Gateway guarded legacy transfer compatibility | $gateway_alpha_cashier_count |"
  echo "| Prediction engine and persistence | $prediction_engine_count |"
  echo "| Point wallet ledger contract | $wallet_ledger_count |"
  echo "| Economy, rank, or compliance logic | $economy_count |"
  echo "| Public OpenAPI/shared API-client contracts | $public_contract_count |"
  echo "| Office admin/operations surface | $office_ops_count |"
  echo "| Player launch surface | $player_surface_count |"
  echo ""
  echo "## Compatibility Anchors"
  echo ""
  echo "| Status | Anchor | File | Why It Matters |"
  echo "|---|---|---|---|"
  while IFS="$(printf '\t')" read -r status label file note; do
    printf '| %s | %s | %s | %s |\n' "$status" "$label" "$file" "$note"
  done < "$compat_file"
  echo ""
  echo "## High-Risk Review Queue"
  echo ""
  echo "| Status | Path | Review Focus |"
  echo "|---|---|---|"
  if [[ -s "$high_risk_file" ]]; then
    while IFS="$(printf '\t')" read -r status path rest; do
      printf '| %s | `%s` | %s |\n' "$status" "$path" "$(review_focus_for_path "$path")"
    done < "$high_risk_file"
  else
    echo "| none | none | none |"
  fi
  echo ""
  echo "## Human Review Checklist"
  echo ""
  echo "- Auth/session changes: compare registration, login, session payload, cookie behavior, and disclosure persistence against inherited behavior plus the launch disclosure contract."
  echo "- Gateway HTTP/admin changes: review route availability, authz, error envelopes, audit writes, CSV/export behavior, and unsafe launch wording rejection."
  echo "- Gateway guarded legacy transfer compatibility changes: review disabled launch behavior, compatibility route contracts, point-only response copy, and raw-state preservation."
  echo "- Prediction engine changes: review matching, reservation, settlement, lifecycle, replay, cancellation, and audit invariants with before/after tests or SQL evidence."
  echo "- Wallet ledger changes: review idempotency keys, available/locked balance math, reservation/capture/release rows, and point-only ledger reasons."
  echo "- Public API/client changes: review OpenAPI and shared client compatibility so inherited consumers either still work or have explicit launch-safe aliases."
  echo "- This checklist is required review guidance; it is not a substitute for sign-off on each high-risk queue entry."
  echo ""
  echo "## Untracked Artifacts"
  echo ""
  echo "### Summary"
  echo ""
  echo "| Risk | Classification | Count |"
  echo "|---|---|---:|"
  if [[ -s "$untracked_classified_file" ]]; then
    awk -F '\t' '{ counts[$1 "\t" $2]++ } END { for (key in counts) { split(key, parts, "\t"); printf "%s\t%s\t%s\n", parts[1], parts[2], counts[key] } }' "$untracked_classified_file" \
      | sort -t "$(printf '\t')" -k1,1 -k2,2 \
      | while IFS="$(printf '\t')" read -r risk classification count; do
          printf '| %s | %s | %s |\n' "$risk" "$classification" "$count"
        done
  else
    echo "| none | none | 0 |"
  fi
  echo ""
  echo "### Unclassified"
  echo ""
  if [[ -s "$untracked_unclassified_file" ]]; then
    sed 's/^/- `/' "$untracked_unclassified_file" | sed 's/$/`/'
  else
    echo "- None"
  fi
  echo ""
  echo "### Classified Paths"
  echo ""
  echo "| Risk | Classification | Path |"
  echo "|---|---|---|"
  if [[ -s "$untracked_classified_file" ]]; then
    sort -t "$(printf '\t')" -k1,1 -k2,2 -k3,3 "$untracked_classified_file" \
      | while IFS="$(printf '\t')" read -r risk classification path; do
          printf '| %s | %s | `%s` |\n' "$risk" "$classification" "$path"
        done
  else
    echo "| none | none | none |"
  fi
  echo ""
  echo "## Preservation Rules"
  echo ""
  echo "- This dossier does not mark RC complete."
  echo "- High-risk business logic changes still require human review before release sign-off."
  echo "- Launch-prohibited money, crypto, withdrawal, cashout, and redeemable-prize paths may be removed when deletion gates classify them."
  echo "- Inherited public/client names should be wrapped or aliased when possible instead of being silently replaced."
  echo "- Private compatibility normalizers may read inherited payload fields, but launch-facing exports must stay point-native."
  echo "- Untracked artifacts must be classified; unclassified untracked paths fail this gate because they are invisible to tracked diff review."
} > "$REPORT_PATH"

cp "$REPORT_PATH" "$ARTIFACT_PATH"

if ((missing != 0)); then
  echo "Production preservation dossier failed: required compatibility anchors are missing." >&2
  echo "See: $REPORT_PATH" >&2
  exit 1
fi

if ((untracked_unclassified_count > 0)); then
  echo "Production preservation dossier failed: unclassified untracked artifacts found." >&2
  echo "See: $REPORT_PATH" >&2
  exit 1
fi

echo "Production preservation dossier passed:"
echo "  - Tracked diff: $shortstat"
echo "  - High-risk review queue entries: $(wc -l < "$high_risk_file" | tr -d ' ')"
echo "  - Untracked artifacts classified: $untracked_count"
echo "  - Report: $REPORT_PATH"
echo "  - Artifact: $ARTIFACT_PATH"
