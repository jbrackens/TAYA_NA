#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SEED_SRC_DIR="$ROOT_DIR/go-platform/services/gateway/internal/http/testdata/seeds"
RUNTIME_DIR="$ROOT_DIR/.runtime"
SEED_OUT_DIR="$RUNTIME_DIR/seeds"
ENV_FILE="$RUNTIME_DIR/go-seed.env"
DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
ARTIFACT_FILE="$ROOT_DIR/revival/artifacts/deterministic_seed_manifest_${TS_TAG}.md"
REPORT_FILE="$ROOT_DIR/revival/20_DETERMINISTIC_SEED_FIXTURES.md"

mkdir -p "$SEED_OUT_DIR" "$(dirname "$ARTIFACT_FILE")"

READ_MODEL_SRC="$SEED_SRC_DIR/read-model.seed.json"
WALLET_SRC="$SEED_SRC_DIR/wallet.seed.json"
BETS_SRC="$SEED_SRC_DIR/bets.seed.json"

for file in "$READ_MODEL_SRC" "$WALLET_SRC" "$BETS_SRC"; do
  if [[ ! -f "$file" ]]; then
    echo "error: seed source file not found: $file" >&2
    exit 1
  fi
done

READ_MODEL_OUT="$SEED_OUT_DIR/read-model.seed.json"
WALLET_OUT="$SEED_OUT_DIR/wallet.seed.json"
BETS_OUT="$SEED_OUT_DIR/bets.seed.json"

cp "$READ_MODEL_SRC" "$READ_MODEL_OUT"
cp "$WALLET_SRC" "$WALLET_OUT"
cp "$BETS_SRC" "$BETS_OUT"

cat >"$ENV_FILE" <<EOF
# Deterministic Phoenix local seed profile.
export GATEWAY_READ_MODEL_FILE="$READ_MODEL_OUT"
export WALLET_LEDGER_FILE="$WALLET_OUT"
export BET_STORE_FILE="$BETS_OUT"
export AUTH_DEMO_USERNAME="seed.admin@phoenix.local"
export AUTH_DEMO_PASSWORD="SeedPassword!2026"
EOF

read_model_sha="$(shasum -a 256 "$READ_MODEL_OUT" | awk '{print $1}')"
wallet_sha="$(shasum -a 256 "$WALLET_OUT" | awk '{print $1}')"
bets_sha="$(shasum -a 256 "$BETS_OUT" | awk '{print $1}')"

{
  echo "# Deterministic Seed Manifest ($DATE_TAG)"
  echo
  echo "Environment file: \`$ENV_FILE\`"
  echo
  echo "| File | SHA256 |"
  echo "|---|---|"
  echo "| \`$READ_MODEL_OUT\` | \`$read_model_sha\` |"
  echo "| \`$WALLET_OUT\` | \`$wallet_sha\` |"
  echo "| \`$BETS_OUT\` | \`$bets_sha\` |"
} >"$ARTIFACT_FILE"

{
  echo "# Deterministic Seed Fixtures ($DATE_TAG)"
  echo
  echo "Seed profile command:"
  echo
  echo '```bash'
  echo "source \"$ENV_FILE\""
  echo '```'
  echo
  echo "Seeded credentials:"
  echo
  echo "- Username: \`seed.admin@phoenix.local\`"
  echo "- Password: \`SeedPassword!2026\`"
  echo
  echo "Seed artifacts:"
  echo
  echo "- Read model: \`$READ_MODEL_OUT\`"
  echo "- Wallet state: \`$WALLET_OUT\`"
  echo "- Bet state: \`$BETS_OUT\`"
  echo "- Manifest: \`$ARTIFACT_FILE\`"
} >"$REPORT_FILE"

echo "Prepared deterministic seeds."
echo "Environment file: $ENV_FILE"
echo "Manifest: $ARTIFACT_FILE"
