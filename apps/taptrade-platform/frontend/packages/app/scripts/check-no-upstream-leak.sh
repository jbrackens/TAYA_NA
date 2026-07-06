#!/usr/bin/env bash
# Build-time leak gate.
#
# The /discover feed re-serves markets pulled from upstream venues. Their
# brand names ("polymarket", "kalshi", "manifold") and host substrings
# ("gamma-api", "manifold.markets") must NEVER appear in the production
# bundle. This script greps the .next build output and exits non-zero on
# any hit, so the build fails loudly instead of leaking on prod.
#
# Run by `next build` postbuild or invoked directly:
#   ./scripts/check-no-upstream-leak.sh

set -euo pipefail

DIR="${1:-.next}"

if [ ! -d "$DIR" ]; then
  echo "leak-check: $DIR not found, skipping (build did not run)" >&2
  exit 0
fi

PATTERN='polymarket|kalshi|manifold|gamma-api|manifold\.metrics|manifold\.markets'

# Search compiled JS + RSC chunks. Case-insensitive. Only files Next.js ships.
HITS=$(grep -riIE --include='*.js' --include='*.mjs' --include='*.cjs' \
  --include='*.html' --include='*.json' \
  -l "$PATTERN" "$DIR/static" "$DIR/server" 2>/dev/null || true)

if [ -n "$HITS" ]; then
  echo "leak-check: FAIL — upstream venue names found in build output:" >&2
  echo "$HITS" >&2
  echo "" >&2
  echo "Sample matches:" >&2
  echo "$HITS" | head -3 | while read -r f; do
    grep -onIE "$PATTERN" "$f" | head -3
  done
  exit 1
fi

echo "leak-check: ok — no upstream venue names in $DIR"
