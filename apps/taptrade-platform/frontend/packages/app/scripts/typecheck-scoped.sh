#!/usr/bin/env bash
# typecheck-scoped.sh — runs tsc --noEmit on the whole project, then filters
# output to errors in tests/ only. Phase 0.5 of PLAN-liquid-glass-redesign.md
# added Playwright smoke specs; this gate verifies THEY compile cleanly.
#
# Why this scope: the project has pre-existing TS debt in legacy components/,
# services/, hooks/, lib/slices/, AND in app/ itself (wallet-client response
# union narrowing, Promise.allSettled lib target, unused imports, implicit
# any in portfolio callbacks). ~400 total errors. Fixing that is outside
# the Liquid Glass redesign scope.
#
# Later phases that modify app/ will want a baseline comparator instead
# of a path filter. See PLAN-liquid-glass-redesign.md Phase 1 for how we
# handle that (TODO added during Phase 0.5 run).
#
# Exits 0 if tests/ is clean. Exits 1 if tests/ has errors.

set -euo pipefail

cd "$(dirname "$0")/.."

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

# Run tsc; don't abort on non-zero (we expect pre-existing errors).
npx tsc --noEmit 2>&1 >"$TMP" || true

# Errors in paths this phase added.
TESTS_ERRORS=$(grep -E '^tests/' "$TMP" | grep -cE 'error TS[0-9]+:' || true)
TESTS_ERRORS=$(echo "$TESTS_ERRORS" | tr -d ' ')

# Pre-existing baseline count for context (everything else).
BASELINE_ERRORS=$(grep -vE '^tests/' "$TMP" | grep -cE 'error TS[0-9]+:' || true)
BASELINE_ERRORS=$(echo "$BASELINE_ERRORS" | tr -d ' ')

if [ "$TESTS_ERRORS" -eq 0 ]; then
  echo "✓ typecheck (tests/): 0 errors"
  echo "  (pre-existing project baseline: $BASELINE_ERRORS errors — out of scope for Phase 0.5)"
  exit 0
fi

echo "✗ typecheck (tests/): $TESTS_ERRORS NEW errors introduced by Phase 0.5"
echo ""
echo "--- errors in tests/: ---"
grep -E '^tests/' "$TMP" | grep -E 'error TS[0-9]+:' || true
echo ""
echo "  (pre-existing project baseline: $BASELINE_ERRORS errors — not this phase's concern)"
exit 1
