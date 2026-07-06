# Loop 356 Artifact - Leaderboard Appearance API Journey

Fresh stack:

- Postgres container: `tiangge-e2e-pg-356`
- Postgres port: `56550`
- Auth: `http://127.0.0.1:18081`
- Gateway: `http://127.0.0.1:18180`
- Player proxy: `http://127.0.0.1:3022`

Commands proven:

```bash
go test ./internal/leaderboards ./internal/http -run 'Test(RecomputeNow_RefreshesStaticAndCategoryBoards|PredictAdminRecomputeRefreshesSnapshots|PredictLeaderboards|PredictLeaderboard)'
npx playwright test --config playwright.prediction.config.ts e2e/prediction/critical-paths.api.spec.ts --list
PREDICT_BASE_URL=http://127.0.0.1:3022 npx playwright test --config playwright.prediction.config.ts e2e/prediction/critical-paths.api.spec.ts
```

Result:

- Focused Go tests passed.
- Playwright suite listed 8 API tests.
- Fresh-stack health checks returned `auth=200`, `gateway=200`, `player=200`.
- Final Playwright API suite passed `8 passed (5.0s)`.

Contract proven:

- Admin settlement creates point-native leaderboard source data.
- `POST /api/v1/admin/leaderboards/pnl_weekly/recompute` performs a real recompute and returns `status: "recomputed"`.
- Authenticated `/api/v1/me/leaderboards` includes the settled fresh user on `pnl_weekly`.
- Public `/api/v1/leaderboards/pnl_weekly/entries?limit=50` includes the same user row.
