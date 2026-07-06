#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GIT_ROOT="$(git -C "$ROOT" rev-parse --show-toplevel)"
REVIVAL_DIR="$ROOT/revival"
ARTIFACT_DIR="$REVIVAL_DIR/artifacts"
REPORT_PATH="${PRESERVATION_CONTRACT_ANCHOR_REPORT:-$REVIVAL_DIR/38_PRESERVATION_CONTRACT_ANCHORS.md}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%S")"
ARTIFACT_PATH="$ARTIFACT_DIR/preservation_contract_anchors_${TIMESTAMP}.md"

OPENAPI_PATH="apps/taptrade-platform/go-platform/services/gateway/api/openapi.yaml"
HANDLERS_PATH="apps/taptrade-platform/go-platform/services/gateway/internal/http/handlers.go"
WALLET_HANDLERS_PATH="apps/taptrade-platform/go-platform/services/gateway/internal/http/wallet_handlers.go"
PREDICTION_HANDLERS_PATH="apps/taptrade-platform/go-platform/services/gateway/internal/http/prediction_handlers.go"
API_CLIENT_PATH="apps/taptrade-platform/frontend/packages/api-client/src/client.ts"
PREDICTION_CLIENT_PATH="apps/taptrade-platform/frontend/packages/api-client/src/prediction-client.ts"
APP_WALLET_CLIENT_PATH="apps/taptrade-platform/frontend/packages/app/app/lib/api/wallet-client.ts"

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

read_file() {
  local ref="$1"
  local path="$2"

  if [[ "$ref" == "WORKTREE" ]]; then
    cat "$GIT_ROOT/$path"
  else
    git -C "$GIT_ROOT" show "$ref:$path"
  fi
}

extract_openapi_paths() {
  local ref="$1"

  read_file "$ref" "$OPENAPI_PATH" \
    | awk '/^  \// && /:$/ { gsub(":", "", $1); print $1 }' \
    | sort -u
}

extract_handler_routes() {
	local ref="$1"

	read_file "$ref" "$HANDLERS_PATH" \
		| rg -o '"/[^"]+"' \
    | tr -d '"' \
		| sort -u
}

extract_gateway_route_strings() {
	local ref="$1"

	for path in "$HANDLERS_PATH" "$WALLET_HANDLERS_PATH" "$PREDICTION_HANDLERS_PATH"; do
		read_file "$ref" "$path"
	done \
		| rg -o '"/[^" ]+"' \
		| tr -d '"' \
		| sort -u
}

extract_api_client_methods() {
	local ref="$1"

	read_file "$ref" "$API_CLIENT_PATH" \
		| awk '/^  async [A-Za-z0-9_]+/ { sub(/^  async /, "", $0); sub(/\(.*/, "", $0); print $0 }' \
		| sort -u
}

extract_prediction_client_methods() {
	local ref="$1"

	read_file "$ref" "$PREDICTION_CLIENT_PATH" \
		| awk '/^  async [A-Za-z0-9_]+/ { sub(/^  async /, "", $0); sub(/\(.*/, "", $0); print $0 }' \
		| sort -u
}

extract_app_wallet_client_exports() {
	local ref="$1"

	read_file "$ref" "$APP_WALLET_CLIENT_PATH" \
		| awk '/^export async function [A-Za-z0-9_]+/ { sub(/^export async function /, "", $0); sub(/\(.*/, "", $0); print $0 }' \
		| sort -u
}

is_launch_prohibited_anchor() {
	local value="$1"
	local lowered
	lowered="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"

	[[ "$lowered" =~ (cashier|cashout|crypto|deposit|deposits|fiat|payment|payments|prize|prizes|redeem|redemption|transactionstatus|withdraw|withdrawal|withdrawals) ]]
}

compare_anchor_set() {
  local label="$1"
  local baseline="$2"
  local current="$3"
  local removed="$4"
  local added="$5"
  local allowed_removed="$6"
  local unexpected_removed="$7"

  comm -23 "$baseline" "$current" > "$removed"
  comm -13 "$baseline" "$current" > "$added"
  : > "$allowed_removed"
  : > "$unexpected_removed"

  while IFS= read -r anchor; do
    [[ -n "$anchor" ]] || continue
    if is_launch_prohibited_anchor "$anchor"; then
      printf '%s\n' "$anchor" >> "$allowed_removed"
    else
      printf '%s\n' "$anchor" >> "$unexpected_removed"
    fi
  done < "$removed"

  printf '%s\t%s\t%s\t%s\t%s\n' \
    "$label" \
    "$(wc -l < "$baseline" | tr -d ' ')" \
    "$(wc -l < "$current" | tr -d ' ')" \
    "$(wc -l < "$added" | tr -d ' ')" \
    "$(wc -l < "$unexpected_removed" | tr -d ' ')"
}

mkdir -p "$ARTIFACT_DIR"

extract_openapi_paths HEAD > "$tmp_dir/openapi.head"
extract_openapi_paths WORKTREE > "$tmp_dir/openapi.current"
extract_handler_routes HEAD > "$tmp_dir/handler-routes.head"
extract_handler_routes WORKTREE > "$tmp_dir/handler-routes.current"
extract_gateway_route_strings HEAD > "$tmp_dir/gateway-routes.head"
extract_gateway_route_strings WORKTREE > "$tmp_dir/gateway-routes.current"
extract_api_client_methods HEAD > "$tmp_dir/api-client-methods.head"
extract_api_client_methods WORKTREE > "$tmp_dir/api-client-methods.current"
extract_prediction_client_methods HEAD > "$tmp_dir/prediction-client-methods.head"
extract_prediction_client_methods WORKTREE > "$tmp_dir/prediction-client-methods.current"
extract_app_wallet_client_exports HEAD > "$tmp_dir/app-wallet-client-exports.head"
extract_app_wallet_client_exports WORKTREE > "$tmp_dir/app-wallet-client-exports.current"

summary_rows="$tmp_dir/summary.tsv"
: > "$summary_rows"

compare_anchor_set \
  "Gateway OpenAPI paths" \
  "$tmp_dir/openapi.head" \
  "$tmp_dir/openapi.current" \
  "$tmp_dir/openapi.removed" \
  "$tmp_dir/openapi.added" \
  "$tmp_dir/openapi.allowed_removed" \
  "$tmp_dir/openapi.unexpected_removed" >> "$summary_rows"

compare_anchor_set \
	"Gateway handler route strings" \
	"$tmp_dir/handler-routes.head" \
	"$tmp_dir/handler-routes.current" \
	"$tmp_dir/handler-routes.removed" \
  "$tmp_dir/handler-routes.added" \
	"$tmp_dir/handler-routes.allowed_removed" \
	"$tmp_dir/handler-routes.unexpected_removed" >> "$summary_rows"

compare_anchor_set \
	"Gateway route strings across core handlers" \
	"$tmp_dir/gateway-routes.head" \
	"$tmp_dir/gateway-routes.current" \
	"$tmp_dir/gateway-routes.removed" \
	"$tmp_dir/gateway-routes.added" \
	"$tmp_dir/gateway-routes.allowed_removed" \
	"$tmp_dir/gateway-routes.unexpected_removed" >> "$summary_rows"

compare_anchor_set \
	"TapTrade API-client methods" \
	"$tmp_dir/api-client-methods.head" \
	"$tmp_dir/api-client-methods.current" \
	"$tmp_dir/api-client-methods.removed" \
	"$tmp_dir/api-client-methods.added" \
	"$tmp_dir/api-client-methods.allowed_removed" \
	"$tmp_dir/api-client-methods.unexpected_removed" >> "$summary_rows"

compare_anchor_set \
	"Prediction API-client methods" \
	"$tmp_dir/prediction-client-methods.head" \
	"$tmp_dir/prediction-client-methods.current" \
	"$tmp_dir/prediction-client-methods.removed" \
	"$tmp_dir/prediction-client-methods.added" \
	"$tmp_dir/prediction-client-methods.allowed_removed" \
	"$tmp_dir/prediction-client-methods.unexpected_removed" >> "$summary_rows"

compare_anchor_set \
	"Player wallet client exports" \
	"$tmp_dir/app-wallet-client-exports.head" \
	"$tmp_dir/app-wallet-client-exports.current" \
	"$tmp_dir/app-wallet-client-exports.removed" \
	"$tmp_dir/app-wallet-client-exports.added" \
	"$tmp_dir/app-wallet-client-exports.allowed_removed" \
	"$tmp_dir/app-wallet-client-exports.unexpected_removed" >> "$summary_rows"

unexpected_total="$(awk -F '\t' '{ total += $5 } END { print total + 0 }' "$summary_rows")"

{
  echo "# Preservation Contract Anchors"
  echo ""
  echo "- Generated: \`$(date -u +"%Y-%m-%dT%H:%M:%SZ")\`"
  echo "- Git root: \`$GIT_ROOT\`"
  echo "- Scope: \`$ROOT\`"
  echo "- Baseline: \`HEAD\`"
  echo "- Decision: public contract anchors are compared against the inherited baseline; unexpected removals fail this gate."
  echo ""
  echo "## Summary"
  echo ""
  echo "| Anchor Set | Baseline Count | Current Count | Added | Unexpected Removed |"
  echo "|---|---:|---:|---:|---:|"
  while IFS="$(printf '\t')" read -r label baseline_count current_count added_count unexpected_count; do
    printf '| %s | %s | %s | %s | %s |\n' "$label" "$baseline_count" "$current_count" "$added_count" "$unexpected_count"
  done < "$summary_rows"
  echo ""
  echo "## Added Anchors"
  echo ""
	for slug in openapi handler-routes gateway-routes api-client-methods prediction-client-methods app-wallet-client-exports; do
		case "$slug" in
			openapi) label="Gateway OpenAPI paths" ;;
			handler-routes) label="Gateway handler route strings" ;;
			gateway-routes) label="Gateway route strings across core handlers" ;;
			api-client-methods) label="TapTrade API-client methods" ;;
			prediction-client-methods) label="Prediction API-client methods" ;;
			app-wallet-client-exports) label="Player wallet client exports" ;;
		esac
    echo "### $label"
    echo ""
    if [[ -s "$tmp_dir/$slug.added" ]]; then
      sed 's/^/- `/' "$tmp_dir/$slug.added" | sed 's/$/`/'
    else
      echo "- None"
    fi
    echo ""
  done
  echo "## Allowed Launch-Prohibited Removals"
  echo ""
	for slug in openapi handler-routes gateway-routes api-client-methods prediction-client-methods app-wallet-client-exports; do
		case "$slug" in
			openapi) label="Gateway OpenAPI paths" ;;
			handler-routes) label="Gateway handler route strings" ;;
			gateway-routes) label="Gateway route strings across core handlers" ;;
			api-client-methods) label="TapTrade API-client methods" ;;
			prediction-client-methods) label="Prediction API-client methods" ;;
			app-wallet-client-exports) label="Player wallet client exports" ;;
		esac
    echo "### $label"
    echo ""
    if [[ -s "$tmp_dir/$slug.allowed_removed" ]]; then
      sed 's/^/- `/' "$tmp_dir/$slug.allowed_removed" | sed 's/$/`/'
    else
      echo "- None"
    fi
    echo ""
  done
  echo "## Unexpected Removals"
  echo ""
	for slug in openapi handler-routes gateway-routes api-client-methods prediction-client-methods app-wallet-client-exports; do
		case "$slug" in
			openapi) label="Gateway OpenAPI paths" ;;
			handler-routes) label="Gateway handler route strings" ;;
			gateway-routes) label="Gateway route strings across core handlers" ;;
			api-client-methods) label="TapTrade API-client methods" ;;
			prediction-client-methods) label="Prediction API-client methods" ;;
			app-wallet-client-exports) label="Player wallet client exports" ;;
		esac
    echo "### $label"
    echo ""
    if [[ -s "$tmp_dir/$slug.unexpected_removed" ]]; then
      sed 's/^/- `/' "$tmp_dir/$slug.unexpected_removed" | sed 's/$/`/'
    else
      echo "- None"
    fi
    echo ""
  done
  echo "## Preservation Rule"
  echo ""
  echo "- Additions are allowed and listed for review."
  echo "- Launch-prohibited money-path removals are allowed only when they match the explicit no-fiat/no-crypto/no-withdrawal boundary."
  echo "- Any other inherited public path or API-client method removal must be restored, classified more narrowly, or replaced with reviewable compatibility evidence."
} > "$REPORT_PATH"

cp "$REPORT_PATH" "$ARTIFACT_PATH"

if ((unexpected_total > 0)); then
  echo "Unexpected inherited contract anchor removals found: $unexpected_total" >&2
  echo "See: $REPORT_PATH" >&2
  exit 1
fi

echo "Preservation contract anchor gate passed:"
while IFS="$(printf '\t')" read -r label baseline_count current_count added_count unexpected_count; do
  printf '  - %s: baseline=%s current=%s added=%s unexpected_removed=%s\n' \
    "$label" "$baseline_count" "$current_count" "$added_count" "$unexpected_count"
done < "$summary_rows"
echo "Wrote preservation contract anchor report:"
echo "  - $REPORT_PATH"
echo "  - $ARTIFACT_PATH"
