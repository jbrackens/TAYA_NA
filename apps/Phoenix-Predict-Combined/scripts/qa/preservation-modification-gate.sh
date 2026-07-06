#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GIT_ROOT="$(git -C "$ROOT" rev-parse --show-toplevel)"
REVIVAL_DIR="$ROOT/revival"
ARTIFACT_DIR="$REVIVAL_DIR/artifacts"
REPORT_PATH="${PRESERVATION_MODIFICATION_REPORT:-$REVIVAL_DIR/36_PRESERVATION_MODIFICATION_MAP.md}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%S")"
ARTIFACT_PATH="$ARTIFACT_DIR/preservation_modification_map_${TIMESTAMP}.md"
LARGE_CHANGE_THRESHOLD="${PRESERVATION_LARGE_CHANGE_THRESHOLD:-250}"

classify_modified_path() {
  local path="$1"

  case "$path" in
    apps/Phoenix-Predict-Combined/go-platform/services/auth/*)
      printf 'high\tauth service account/session contract'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/api/openapi.yaml|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/*)
      printf 'high\tpublic API/client contract'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/gateway/*)
      printf 'high\tgateway runtime wiring'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/*)
      printf 'high\tgateway HTTP and admin handlers'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/alphacashier/*)
      printf 'high\tgateway guarded legacy transfer compatibility'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/*)
      printf 'high\tgateway prediction engine and persistence'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/*)
      printf 'high\tgateway point-wallet ledger contract'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/bonus/*|\
apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/leaderboards/*|\
apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/loyalty/*|\
apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/compliance/*)
      printf 'high\tgateway economy, rank, or compliance logic'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/discover/*|\
apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/payments/*)
      printf 'medium\tgateway discovery or guarded legacy compatibility'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/seed/*|\
apps/Phoenix-Predict-Combined/go-platform/services/gateway/migrations/*|\
apps/Phoenix-Predict-Combined/go-platform/services/gateway/seed-data/*)
      printf 'medium\tgateway schema and seed data'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/go-platform/services/gateway/Makefile|\
apps/Phoenix-Predict-Combined/go-platform/README.md|\
apps/Phoenix-Predict-Combined/go-platform/go.work.sum)
      printf 'low\tgo platform documentation or dependency metadata'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/phoenix-backend/project/Dependencies.scala)
      printf 'high\tbackend JVM dependency and classpath contract'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/phoenix-backend/build.sbt)
      printf 'high\tbackend JVM build and dependency override contract'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/phoenix-backend/project/Build.scala|\
apps/Phoenix-Predict-Combined/phoenix-backend/project/plugins.sbt)
      printf 'high\tbackend JVM build and scalafix toolchain contract'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/phoenix-backend/core/src/test/scala/*)
      printf 'medium\tbackend integration test harness compatibility'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/phoenix-backend/data-pipeline/oddin/lib/src/test/scala/*)
      printf 'low\tbackend inherited feed regression test compatibility'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/phoenix-backend/services/src/test/scala/*)
      printf 'low\tbackend service regression test compatibility'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/phoenix-backend/core/src/main/scala/phoenix/core/*)
      printf 'high\tbackend core compiler compatibility contract'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/phoenix-backend/data-pipeline/oddin/lib/src/main/scala/*)
      printf 'high\tbackend inherited feed compiler compatibility contract'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/phoenix-backend/services/src/main/scala/*)
      printf 'high\tbackend inherited runtime compiler compatibility contract'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/phoenix-backend/core/src/main/scala/phoenix/jwt/*)
      printf 'high\tbackend auth/session compatibility contract'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/tests/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/e2e/prediction/*)
      printf 'low\tplayer regression tests'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/about/page.tsx|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/privacy-policy/page.tsx|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/privacy/page.tsx|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/responsible-gaming/page.tsx|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/terms/page.tsx)
      printf 'medium\tplayer static legal and trust copy'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/AuthProvider.tsx|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/CurrentBalance.tsx|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/WageringProgress.tsx|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/WalletBreakdown.tsx|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/chat/*)
      printf 'medium\tplayer shared account and social components'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/market/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/portfolio/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/rewards/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/leaderboards/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/account/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/auth/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/discover/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/predict/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/profile/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/category/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/globals.css|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/page.tsx|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/layout.tsx)
      printf 'medium\tplayer launch user surface'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/api/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/store/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/services/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/i18n/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/features.ts|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/compliance-denial.ts|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/orderIdempotency.ts)
      printf 'medium\tplayer client state and API normalization'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/*)
      printf 'low\tplayer launch copy and locale bundle'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/next-env.d.ts|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/next.config.js|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/proxy.ts)
      printf 'medium\tplayer runtime configuration'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/tests/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/*/__tests__/*)
      printf 'low\toffice regression tests'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/components/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/containers/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/lib/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/translations/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/types/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/README.md|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/providers/*|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/proxy.ts|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/next.config.js|\
apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/next-env.d.ts)
      printf 'medium\toffice admin and operations surface'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/talon-backoffice/package.json|\
apps/Phoenix-Predict-Combined/talon-backoffice/yarn.lock)
      printf 'low\tfrontend package metadata'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/scripts/qa/*|\
apps/Phoenix-Predict-Combined/scripts/release/*|\
apps/Phoenix-Predict-Combined/scripts/frontend/*|\
apps/Phoenix-Predict-Combined/scripts/security/*|\
apps/Phoenix-Predict-Combined/scripts/data/*|\
apps/Phoenix-Predict-Combined/scripts/reconciliation/*|\
apps/Phoenix-Predict-Combined/scripts/local-stack.sh|\
apps/Phoenix-Predict-Combined/scripts/pre-commit-hook.sh|\
apps/Phoenix-Predict-Combined/Makefile)
      printf 'medium\tverification and release governance'
      return 0
      ;;
    apps/Phoenix-Predict-Combined/revival/*)
      printf 'low\trevival evidence report'
      return 0
      ;;
  esac

  return 1
}

modified_paths=()
while IFS= read -r -d '' entry; do
  status="${entry:0:2}"
  path="${entry:3}"
  if [[ "$status" == *M* ]]; then
    modified_paths+=("$path")
  fi
done < <(git -C "$GIT_ROOT" status --porcelain=v1 -z -- "$ROOT")

if ((${#modified_paths[@]} == 0)); then
  echo "No modified tracked artifacts in the current TapTrade diff."
  exit 0
fi

classified_rows="$(mktemp)"
unclassified=()
cleanup() {
  rm -f "$classified_rows"
}
trap cleanup EXIT

total_additions=0
total_deletions=0
high_risk_count=0
large_change_count=0

for path in "${modified_paths[@]}"; do
  if group="$(classify_modified_path "$path")"; then
    risk="${group%%$'\t'*}"
    classification="${group#*$'\t'}"
  else
    unclassified+=("$path")
    continue
  fi

  numstat="$(git -C "$GIT_ROOT" diff --numstat -- "$path" | tail -n 1 || true)"
  additions="$(awk '{print $1}' <<< "$numstat")"
  deletions="$(awk '{print $2}' <<< "$numstat")"
  [[ "$additions" =~ ^[0-9]+$ ]] || additions=0
  [[ "$deletions" =~ ^[0-9]+$ ]] || deletions=0
  churn=$((additions + deletions))
  total_additions=$((total_additions + additions))
  total_deletions=$((total_deletions + deletions))
  if [[ "$risk" == "high" ]]; then
    high_risk_count=$((high_risk_count + 1))
  fi
  if ((churn >= LARGE_CHANGE_THRESHOLD)); then
    large_change_count=$((large_change_count + 1))
  fi

  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$risk" "$classification" "$additions" "$deletions" "$churn" "$path" >> "$classified_rows"
done

if ((${#unclassified[@]} > 0)); then
  echo "Unclassified modified artifacts require preservation review:" >&2
  for path in "${unclassified[@]}"; do
    echo "  - $path" >&2
  done
  echo "" >&2
  echo "Classify the modification, split it out, or restore the inherited artifact before continuing." >&2
  exit 1
fi

echo "Classified ${#modified_paths[@]} modified artifacts for preservation review:"
echo "  - High-risk contract files: $high_risk_count"
echo "  - Large-change files (>= ${LARGE_CHANGE_THRESHOLD} changed lines): $large_change_count"
echo "  - Total tracked line churn: +${total_additions} / -${total_deletions}"

mkdir -p "$ARTIFACT_DIR"

{
  echo "# Preservation Modification Map"
  echo ""
  echo "- Generated: \`$(date -u +"%Y-%m-%dT%H:%M:%SZ")\`"
  echo "- Git root: \`$GIT_ROOT\`"
  echo "- Scope: \`$ROOT\`"
  echo "- Modified tracked artifacts classified: \`${#modified_paths[@]}\`"
  echo "- High-risk contract files: \`$high_risk_count\`"
  echo "- Large-change threshold: \`${LARGE_CHANGE_THRESHOLD}\` changed lines"
  echo "- Large-change files: \`$large_change_count\`"
  echo "- Tracked line churn: \`+${total_additions} / -${total_deletions}\`"
  echo "- Unclassified modified artifacts: \`0\`"
  echo "- Decision: current modifications are classified for preservation review; this is not an RC completion claim and does not prove each inherited contract is preserved."
  echo ""
  echo "## Summary"
  echo ""
  echo "| Risk | Classification | Count |"
  echo "|---|---|---:|"
  awk -F '\t' '{ counts[$1 "\t" $2]++ } END { for (key in counts) { split(key, parts, "\t"); printf "%s\t%s\t%s\n", parts[1], parts[2], counts[key] } }' "$classified_rows" \
    | sort -t "$(printf '\t')" -k1,1 -k2,2 \
    | while IFS="$(printf '\t')" read -r risk classification count; do
        printf '| %s | %s | %s |\n' "$risk" "$classification" "$count"
      done
  echo ""
  echo "## High-Risk Or Large-Change Files"
  echo ""
  echo "| Risk | Classification | + | - | Churn | Path |"
  echo "|---|---|---:|---:|---:|---|"
  awk -F '\t' -v threshold="$LARGE_CHANGE_THRESHOLD" '$1 == "high" || $5 >= threshold { print }' "$classified_rows" \
    | sort -t "$(printf '\t')" -k5,5nr -k6,6 \
    | while IFS="$(printf '\t')" read -r risk classification additions deletions churn path; do
        printf '| %s | %s | %s | %s | %s | `%s` |\n' "$risk" "$classification" "$additions" "$deletions" "$churn" "$path"
      done
  echo ""
  echo "## All Modified Paths"
  echo ""
  echo "| Risk | Classification | + | - | Churn | Path |"
  echo "|---|---|---:|---:|---:|---|"
  sort -t "$(printf '\t')" -k1,1 -k2,2 -k6,6 "$classified_rows" \
    | while IFS="$(printf '\t')" read -r risk classification additions deletions churn path; do
        printf '| %s | %s | %s | %s | %s | `%s` |\n' "$risk" "$classification" "$additions" "$deletions" "$churn" "$path"
      done
  echo ""
  echo "## Preservation Rules"
  echo ""
  echo "- High-risk contract files require human review before an RC claim."
  echo "- Large-change files require extra diff review even when they are tests, docs, or generated contracts."
  echo "- Public launch surfaces may remove prohibited money routes, crypto rails, cashout language, and redeemable-prize affordances."
  echo "- Private production business logic should be preserved unless the diff proves the change is required for the points-only launch contract."
  echo "- This map complements, but does not replace, the deletion map and live canonical journey proof."
} > "$REPORT_PATH"

cp "$REPORT_PATH" "$ARTIFACT_PATH"

echo "Wrote preservation modification map:"
echo "  - $REPORT_PATH"
echo "  - $ARTIFACT_PATH"
