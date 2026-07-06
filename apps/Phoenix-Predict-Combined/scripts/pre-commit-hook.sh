#!/usr/bin/env bash
#
# PRE-COMMIT HOOK — TapTrade Launch Safety
# ---------------------------------------
# Install: cp scripts/pre-commit-hook.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
# Or with Husky: npx husky add .husky/pre-commit './scripts/pre-commit-hook.sh'
#
# This hook runs launch-safe proof gates before every commit.
# Commit is REJECTED if any launch gate fails.
#

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Find project root (works from .git/hooks/ or .husky/ or direct invocation)
if [ -f "$SCRIPT_DIR/../../Makefile" ]; then
  ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
elif [ -f "$SCRIPT_DIR/../Makefile" ]; then
  ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
elif [ -f "$SCRIPT_DIR/Makefile" ]; then
  ROOT_DIR="$SCRIPT_DIR"
else
  echo "Cannot find project Makefile. Aborting commit."
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║         PRE-COMMIT: TAPTRADE LAUNCH GATES               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

FAILED=false

run_gate() {
  local label="$1"
  shift
  echo "▸ $label..."
  if "$@"; then
    echo ""
  else
    FAILED=true
    echo ""
  fi
}

run_gate "Point-native regression pack" make -C "$ROOT_DIR" qa-regression-pack
run_gate "Launch boundary and reconciliation proof" make -C "$ROOT_DIR" qa-e2e-critical
run_gate "Reward/social abuse boundary proof" make -C "$ROOT_DIR" qa-abuse-boundary
run_gate "Frontend residual advisory governance" make -C "$ROOT_DIR" qa-frontend-residual-advisories
run_gate "JVM direct residual advisory governance" make -C "$ROOT_DIR" security-jvm-direct-residual-advisories
run_gate "Preservation deletion classification" make -C "$ROOT_DIR" qa-preservation-deletions
run_gate "Preservation modification classification" make -C "$ROOT_DIR" qa-preservation-modifications
run_gate "Preservation public contract anchors" make -C "$ROOT_DIR" qa-preservation-contract-anchors

if $FAILED; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║  COMMIT BLOCKED — launch gates failed                   ║"
  echo "║                                                          ║"
  echo "║  Re-run the failing gate for full logs:                  ║"
  echo "║    make qa-regression-pack                               ║"
  echo "║    make qa-e2e-critical                                  ║"
  echo "║    make qa-abuse-boundary                                ║"
  echo "║    make qa-frontend-residual-advisories                  ║"
  echo "║    make security-jvm-direct-residual-advisories          ║"
  echo "║    make qa-preservation-deletions                        ║"
  echo "║    make qa-preservation-modifications                    ║"
  echo "║    make qa-preservation-contract-anchors                 ║"
  echo "║                                                          ║"
  echo "║  Launch gates must not depend on retired money paths.    ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  exit 1
else
  echo "All TapTrade launch gates passed. Commit allowed."
  exit 0
fi
