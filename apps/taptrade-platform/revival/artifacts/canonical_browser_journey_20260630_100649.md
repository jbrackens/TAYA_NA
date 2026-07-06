# Canonical Browser Journey Proof (2026-06-30)

Command: `make qa-canonical-browser-journey`

- Result: **pass**
- Player base URL: `http://127.0.0.1:3022`
- Artifact: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/revival/artifacts/canonical_browser_journey_20260630_100649.md`
- Log: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/revival/artifacts/canonical_browser_journey_20260630_100649.log`

## Scope

This gate runs the maintained Playwright proof at:

- `talon-backoffice/e2e/prediction/canonical-browser.ui.spec.ts`

The proof registers a new user through the rendered player app, accepts the
points-only no-cashout disclosure, verifies starter points, watches/searches
markets, opens market detail, buys YES and NO, comments/upvotes/follows,
checks portfolio and point ledger, claims or verifies reward progress, uses
admin APIs for close/settlement/leaderboard recompute, verifies settlement
ledger and portfolio history, verifies leaderboard/activity visibility, and
checks retired player money routes return 404.

## Runtime Contract

- Requires a running seeded player stack at `PREDICT_BASE_URL`.
- Requires the player same-origin `/api/v1/status` proxy to reach the gateway.
- Requires seeded credentials for `demo@phoenix.local` and `admin@phoenix.local`.
- Does not start or seed the stack itself.

## Result Note

Playwright completed successfully against the running seeded stack. See the log for the exact test output.
