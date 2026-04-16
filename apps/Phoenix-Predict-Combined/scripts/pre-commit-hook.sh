#!/usr/bin/env bash
#
# PRE-COMMIT HOOK — Phoenix Sportsbook
# =====================================
# Install: cp scripts/pre-commit-hook.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
# Or with Husky: npx husky add .husky/pre-commit './scripts/pre-commit-hook.sh'
#
# This hook runs BOTH health checks before every commit.
# Commit is REJECTED if any system is missing.
#

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Find scripts directory (works from .git/hooks/ or .husky/ or direct invocation)
if [ -f "$SCRIPT_DIR/../../scripts/system-health-check.sh" ]; then
  SCRIPTS="$SCRIPT_DIR/../../scripts"
elif [ -f "$SCRIPT_DIR/../scripts/system-health-check.sh" ]; then
  SCRIPTS="$SCRIPT_DIR/../scripts"
elif [ -f "$SCRIPT_DIR/system-health-check.sh" ]; then
  SCRIPTS="$SCRIPT_DIR"
else
  echo "❌ Cannot find health check scripts. Aborting commit."
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║         PRE-COMMIT: SYSTEM HEALTH CHECKS               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

FAILED=false

echo "▸ Player App..."
if bash "$SCRIPTS/system-health-check.sh" 2>&1 | tail -8; then
  echo ""
else
  FAILED=true
  echo ""
fi

echo "▸ Backoffice..."
if bash "$SCRIPTS/backoffice-health-check.sh" 2>&1 | tail -8; then
  echo ""
else
  FAILED=true
  echo ""
fi

if $FAILED; then
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║  ❌  COMMIT BLOCKED — Health checks failed              ║"
  echo "║                                                          ║"
  echo "║  Run with --fix to see remediation steps:                ║"
  echo "║    ./scripts/system-health-check.sh --fix                ║"
  echo "║    ./scripts/backoffice-health-check.sh --fix            ║"
  echo "║                                                          ║"
  echo "║  DO NOT take shortcuts. Port the original systems.       ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  exit 1
else
  echo "✅ All health checks passed. Commit allowed."
  exit 0
fi
