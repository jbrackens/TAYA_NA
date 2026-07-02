# Scenario 11 API Surface Gate

- Generated: `2026-06-29T17:23:10.531Z`
- Result: **pass**
- OpenAPI: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/go-platform/services/gateway/api/openapi.yaml`
- Decision: Scenario 11 requires all required public/internal API surfaces or shared service methods to be documented and reviewable.

## Summary

| Requirement | Status | OpenAPI Evidence | Client/Service Evidence |
|---|---|---|---|
| List markets | pass | pass GET /api/v1/markets | pass getMarkets |
| Search and filter markets | pass | pass GET /api/v1/markets<br>pass /api/v1/markets query q<br>pass /api/v1/markets query sort<br>pass /api/v1/markets query seriesId<br>pass /api/v1/markets query tag | pass getMarkets |
| Get market | pass | pass GET /api/v1/markets/{ticker} | pass getMarket |
| List categories, series, and tags | pass | pass GET /api/v1/categories<br>pass GET /api/v1/series<br>pass GET /api/v1/tags | pass getCategories<br>pass getSeries<br>pass getTags |
| Get price history | pass | pass GET /api/v1/markets/{id}/prices | pass getMarketPriceHistory |
| Get order book/depth | pass | pass GET /api/v1/markets/{id}/orderbook | pass getOrderBook |
| Create prediction/trade/order | pass | pass POST /api/v1/orders | pass placeOrder |
| Cancel order | pass | pass DELETE /api/v1/orders/{id} | pass cancelOrder |
| Get user positions | pass | pass GET /api/v1/portfolio | pass getPositions |
| Get user orders | pass | pass GET /api/v1/orders | pass getOrders |
| Get user and global activity | pass | pass GET /api/v1/social/users/{userId}/activity<br>pass GET /api/v1/social/activity | not required |
| Get and create comments/replies | pass | pass GET /api/v1/social/markets/{marketId}/comments<br>pass POST /api/v1/social/markets/{marketId}/comments | not required |
| React to and report comments | pass | pass POST /api/v1/social/comments/{commentId}/react<br>pass POST /api/v1/social/comments/{commentId}/report | not required |
| Follow user and read profile | pass | pass GET /api/v1/social/users/{userId}/profile<br>pass POST /api/v1/social/users/{userId}/follow | not required |
| Get leaderboard and entries | pass | pass GET /api/v1/leaderboards<br>pass GET /api/v1/leaderboards/{id}/entries<br>pass GET /api/v1/me/leaderboards | not required |
| Rewards, missions, streaks, point packs, and badges | pass | pass POST /api/v1/wallet/daily-claim<br>pass GET /api/v1/wallet/point-packs<br>pass POST /api/v1/wallet/point-packs/claim<br>pass GET /api/v1/wallet/missions<br>pass POST /api/v1/wallet/missions/claim<br>pass GET /api/v1/wallet/streaks<br>pass POST /api/v1/wallet/streaks/claim<br>pass GET /api/v1/wallet/badges<br>pass GET /api/v1/wallet/reward-limits | not required |
| Resolve market | pass | pass POST /api/v1/admin/markets/{id}/propose<br>pass POST /api/v1/admin/markets/{id}/finalize | pass settleMarket |
| Settle and replay settlement | pass | pass POST /api/v1/admin/settlements/{marketId}<br>pass POST /api/v1/admin/settlements/replay | pass settleMarket<br>pass replayIncompleteSettlements |
| Get point ledger | pass | pass GET /api/v1/wallet/{userId}/ledger<br>pass GET /api/v1/admin/punters/{id}/wallet | pass getWalletLedger |
| Admin market, taxonomy, user, report, and export APIs | pass | pass GET /api/v1/admin/markets<br>pass POST /api/v1/admin/markets<br>pass GET /api/v1/admin/markets/{id}/lifecycle<br>pass GET /api/v1/admin/categories<br>pass GET /api/v1/admin/series<br>pass GET /api/v1/admin/tags<br>pass GET /api/v1/admin/punters<br>pass GET /api/v1/admin/prediction/risk<br>pass GET /api/v1/admin/social/reports<br>pass GET /api/v1/admin/dashboard/volume<br>pass GET /api/v1/admin/wallet/reconciliation | pass getAdminMarkets<br>pass createMarket<br>pass getMarketLifecycleAudit<br>pass exportMarketLifecycleAudit |

## Verification

- Every Scenario 11 API requirement has an OpenAPI operation or documented parameter.
- Required shared client methods for central prediction, portfolio, order, settlement, taxonomy, and wallet-ledger flows are present.
- This gate checks API/data surface completeness; safety, abuse, dependency, deployment, and no-money runtime proof remain Scenario 12 concerns.
