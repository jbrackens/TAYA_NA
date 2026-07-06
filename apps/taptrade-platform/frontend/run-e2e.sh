#!/bin/bash
# M3 Playwright Live Validation Runner
# Usage: bash run-e2e.sh
set -e

echo "=== M3 Playwright Live Validation ==="
echo ""

# Step 0: Ensure Playwright is installed
if ! npx playwright --version &>/dev/null; then
  echo "Installing Playwright..."
  npm install --save-dev @playwright/test --ignore-engines
  npx playwright install chromium
else
  echo "Playwright: $(npx playwright --version)"
fi

# Step 1: Create auth storage directory
mkdir -p e2e/.auth

# Step 2: Run smoke tests first (no auth needed for basic page load checks)
echo ""
echo "=== Running M3 Smoke Tests ==="
npx playwright test e2e/m3-smoke.spec.ts --reporter=list 2>&1 || true

# Step 3: Run mutation validation tests
echo ""
echo "=== Running M3 Market Mutation Tests ==="
npx playwright test e2e/m3-market-mutations.spec.ts --reporter=list 2>&1 || true

# Step 4: Run bet intervention + multi-leg guard tests
echo ""
echo "=== Running M3 Bet Intervention Tests ==="
npx playwright test e2e/m3-bet-intervention.spec.ts --reporter=list 2>&1 || true

# Step 5: Run false control audit
echo ""
echo "=== Running M3 False Control Audit ==="
npx playwright test e2e/m3-false-controls.spec.ts --reporter=list 2>&1|| true

# Step 6: Run WebSocket contract validation (B4)
echo ""
echo "=== Running B4 WebSocket Contract Tests ==="
npx playwright test e2e/b4-websocket-contract.spec.ts --reporter=list 2>&1 || true

echo ""
echo "========================================="
echo "  Playwright Validation Complete"
echo "========================================="
echo ""
echo "Results saved to playwright-report/"
echo "View: npx playwright show-report"
