# Loop 359 - Office Admin Lifecycle Browser Proof

Generated: 2026-06-28 22:06 Europe/Malta

## Summary

Loop 359 adds a maintained office-browser proof for the prediction market
lifecycle controls. The proof runs the real Talon Office UI against live auth,
gateway, wallet, prediction SQL repositories, migrations, and demo seed data.

The browser journey creates a synthetic draft market through the admin API setup,
logs into `/auth/login?returnUrl=/prediction-admin/markets`, opens the draft
market from the rendered office table, closes it through the destructive confirm
modal with an audit reason, opens the lifecycle audit modal, verifies the Open
and Closed stages plus the close reason, and verifies retired office money routes
return 404.

## Production-Relevant Fixes

- `packages/office/app/api/auth/login/route.ts` now scopes the `authToken`
  cookie to `path: "/"`. Without this, the office login proxy set `authToken`
  only for `/api/auth/login`, and the dashboard proxy could not see it.
- `talon-backoffice/e2e/prediction/office-admin-lifecycle.ui.spec.ts` waits
  for the browser login form to hydrate, verifies the input values, and requires
  a successful `/api/auth/login` POST before asserting the dashboard route.
- The proof environment runs office in same-origin API mode:
  `NEXT_PUBLIC_API_URL=""` with the gateway on the default rewrite target
  `18080`. This lets browser client calls use `/api/v1/*` through Next rewrites
  so HttpOnly auth cookies and CSRF cookies are sent correctly.

## Verification

- Started fresh `postgres:16-alpine` container `tiangge-e2e-pg-360` on
  `127.0.0.1:56554`.
- Migrated gateway DB through version 48.
- Seeded deterministic demo data, including 15 markets, 11 events, 122
  positions, and 840 trades.
- Started auth on `18081` with `AUTH_STORE_MODE=db`.
- Started gateway on `18080` with DB-backed prediction and wallet stores,
  `MARKET_SYNC_ENABLED=false`, and legacy money routes disabled.
- Started Talon Office on `3330` with same-origin API mode.
- Health checks returned `auth=200`, `gateway=200`, and office `/auth/login=200`.
- `npx playwright test --config playwright.prediction.config.ts e2e/prediction/office-admin-lifecycle.ui.spec.ts --list` listed setup plus the office UI spec.
- `git diff --check -- apps/Phoenix-Predict-Combined/talon-backoffice/e2e/prediction/office-admin-lifecycle.ui.spec.ts` passed.
- Final live command passed twice after stabilizing the login wait:

```sh
PREDICT_OFFICE_BASE_URL=http://localhost:3330 \
PREDICT_ADMIN_API_URL=http://127.0.0.1:18080 \
npx playwright test --config playwright.prediction.config.ts \
  e2e/prediction/office-admin-lifecycle.ui.spec.ts \
  --project=ui --no-deps --reporter=list
```

Result: `1 passed`.

## Scenario Impact

- Scenario 10 Admin and market operations: still Partial, but office-browser
  market open/close/audit controls now have live DB-backed evidence.
- Scenario 12 Safety, compliance, and trust boundary: still Partial, but the
  proof now combines authenticated office UI operations with 404 evidence for
  retired office money routes.

Remaining before RC: backend terminology cleanup, complete preservation review,
dependency/security risk triage, broader final RC audit, and any additional
office settlement variants not covered by this open/close/audit browser proof.
