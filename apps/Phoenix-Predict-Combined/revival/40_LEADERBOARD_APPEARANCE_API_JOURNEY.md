# Loop 356 - Leaderboard Appearance API Journey

Date: 2026-06-28

## Summary

The authenticated critical-path API proof now verifies that a fresh settled user appears on the weekly prediction leaderboard in the same live stack run.

## Changes

- Added `PredictService.RecomputeNow` so prediction leaderboard snapshots can be refreshed synchronously through the existing admin recompute route.
- Updated `POST /api/v1/admin/leaderboards/{id}/recompute` from acknowledgement-only to a real point-native snapshot refresh that returns per-board row counts.
- Added service and HTTP handler tests for synchronous recompute across static and category boards.
- Extended the Playwright critical-path API journey so, after admin settlement, the admin recomputes leaderboards and the user verifies:
  - `/api/v1/me/leaderboards` contains their `pnl_weekly` standing.
  - `/api/v1/leaderboards/pnl_weekly/entries?limit=50` includes their public board row.

## Verification

- `go test ./internal/leaderboards ./internal/http -run 'Test(RecomputeNow_RefreshesStaticAndCategoryBoards|PredictAdminRecomputeRefreshesSnapshots|PredictLeaderboards|PredictLeaderboard)'` passed.
- `npx playwright test --config playwright.prediction.config.ts e2e/prediction/critical-paths.api.spec.ts --list` listed 8 API tests.
- Started a fresh `postgres:16-alpine` container `tiangge-e2e-pg-356` on port `56550`.
- Migrated the gateway database through version 48 with `MIGRATIONS_DIR` set to the gateway migrations directory.
- Seeded demo data with DB-backed wallet/prediction storage and point-grant settings.
- Started auth on `18081`, gateway on `18180`, and the Tiangge player proxy on `3022`.
- Health checks returned `auth=200`, `gateway=200`, and `player=200`.
- Final clean-stack command passed with 8/8 tests:

```bash
PREDICT_BASE_URL=http://127.0.0.1:3022 npx playwright test --config playwright.prediction.config.ts e2e/prediction/critical-paths.api.spec.ts
```

## Notes

An intermediate run exposed that `/api/v1/leaderboards/{id}/entries?userId=...` lives under the public leaderboard prefix and correctly cannot infer the authenticated session for `viewerEntry`. The proof now uses the authenticated `/api/v1/me/leaderboards` contract for self-rank and the public entries endpoint only for public row inclusion.

## Scenario Impact

- Scenario 9 Game economy and monetization: still Partial, but fresh-user leaderboard appearance is now live API-backed after settlement and recompute.
- Scenario 10 Admin and market operations: still Partial, but admin leaderboard recompute is now a real point-native operation rather than a no-op acknowledgement.
- Scenario 11 API/data surface: still Partial, but the same deployed-like API journey now includes admin recompute plus authenticated/public leaderboard appearance contracts.
- Scenario 12 Safety, compliance, and trust boundary: still Partial; this removes the new-user leaderboard-appearance gap, but full browser journey proof, dual-admin variants, backend terminology cleanup, complete preservation review, and broader abuse evidence remain incomplete.
