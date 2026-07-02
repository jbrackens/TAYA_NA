# Preservation Contract Anchors

- Generated: `2026-06-29T17:03:13Z`
- Git root: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict`
- Scope: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined`
- Baseline: `HEAD`
- Decision: public contract anchors are compared against the inherited baseline; unexpected removals fail this gate.

## Summary

| Anchor Set | Baseline Count | Current Count | Added | Unexpected Removed |
|---|---:|---:|---:|---:|
| Gateway OpenAPI paths | 18 | 116 | 98 | 0 |
| Gateway handler route strings | 9 | 9 | 0 | 0 |
| Prediction API-client methods | 26 | 38 | 12 | 0 |

## Added Anchors

### Gateway OpenAPI paths

- `/api/v1/admin/ai-budget`
- `/api/v1/admin/ai-budget/reserve`
- `/api/v1/admin/audit-logs`
- `/api/v1/admin/bonuses`
- `/api/v1/admin/bonuses/grant`
- `/api/v1/admin/bonuses/{id}`
- `/api/v1/admin/bonuses/{id}/forfeit`
- `/api/v1/admin/campaigns`
- `/api/v1/admin/campaigns/{id}`
- `/api/v1/admin/campaigns/{id}/activate`
- `/api/v1/admin/campaigns/{id}/close`
- `/api/v1/admin/campaigns/{id}/pause`
- `/api/v1/admin/categories`
- `/api/v1/admin/dashboard/volume`
- `/api/v1/admin/disputes`
- `/api/v1/admin/disputes/{id}/resolve`
- `/api/v1/admin/events`
- `/api/v1/admin/leaderboards`
- `/api/v1/admin/leaderboards/{id}`
- `/api/v1/admin/leaderboards/{id}/entries`
- `/api/v1/admin/leaderboards/{id}/recompute`
- `/api/v1/admin/loyalty/accounts`
- `/api/v1/admin/loyalty/accounts/{playerId}`
- `/api/v1/admin/loyalty/adjustments`
- `/api/v1/admin/loyalty/config`
- `/api/v1/admin/loyalty/rules`
- `/api/v1/admin/loyalty/rules/{ruleId}`
- `/api/v1/admin/loyalty/tiers/{tierCode}`
- `/api/v1/admin/market-sources`
- `/api/v1/admin/markets`
- `/api/v1/admin/markets/{id}`
- `/api/v1/admin/markets/{id}/finalize`
- `/api/v1/admin/markets/{id}/lifecycle`
- `/api/v1/admin/markets/{id}/lifecycle/{action}`
- `/api/v1/admin/markets/{id}/propose`
- `/api/v1/admin/partner-keys`
- `/api/v1/admin/prediction/drift-alerts`
- `/api/v1/admin/prediction/risk`
- `/api/v1/admin/promotions/usage`
- `/api/v1/admin/punters`
- `/api/v1/admin/punters/{id}`
- `/api/v1/admin/punters/{id}/notes`
- `/api/v1/admin/punters/{id}/settlements`
- `/api/v1/admin/punters/{id}/status`
- `/api/v1/admin/punters/{id}/wallet`
- `/api/v1/admin/resolution-sources`
- `/api/v1/admin/series`
- `/api/v1/admin/settlements/replay`
- `/api/v1/admin/settlements/{marketId}`
- `/api/v1/admin/social/activity`
- `/api/v1/admin/social/reports`
- `/api/v1/admin/social/reports/{id}/resolve`
- `/api/v1/admin/tags`
- `/api/v1/admin/wallet/reconciliation`
- `/api/v1/admin/wallet/reward-clusters`
- `/api/v1/bonuses/active`
- `/api/v1/bonuses/claim`
- `/api/v1/bonuses/{id}`
- `/api/v1/bonuses/{id}/progress`
- `/api/v1/bot/keys/{id}`
- `/api/v1/categories/{slug}`
- `/api/v1/compliance/rg/check-point-use`
- `/api/v1/compliance/rg/check-prediction`
- `/api/v1/compliance/rg/cool-off`
- `/api/v1/compliance/rg/point-use-limit`
- `/api/v1/compliance/rg/point-use-limits`
- `/api/v1/compliance/rg/prediction-limit`
- `/api/v1/compliance/rg/prediction-limits`
- `/api/v1/compliance/rg/restrictions`
- `/api/v1/compliance/rg/self-exclude`
- `/api/v1/disputes`
- `/api/v1/leaderboards`
- `/api/v1/leaderboards/{id}/entries`
- `/api/v1/loyalty`
- `/api/v1/loyalty/ledger`
- `/api/v1/loyalty/standing`
- `/api/v1/loyalty/tiers`
- `/api/v1/markets/{id}/orderbook`
- `/api/v1/markets/{id}/prices`
- `/api/v1/me/leaderboards`
- `/api/v1/series`
- `/api/v1/social/activity`
- `/api/v1/social/comments/{commentId}/react`
- `/api/v1/social/comments/{commentId}/report`
- `/api/v1/social/markets/{marketId}/comments`
- `/api/v1/social/users/{userId}/activity`
- `/api/v1/social/users/{userId}/follow`
- `/api/v1/social/users/{userId}/profile`
- `/api/v1/tags`
- `/api/v1/wallet/badges`
- `/api/v1/wallet/daily-claim`
- `/api/v1/wallet/missions`
- `/api/v1/wallet/missions/claim`
- `/api/v1/wallet/point-packs`
- `/api/v1/wallet/point-packs/claim`
- `/api/v1/wallet/reward-limits`
- `/api/v1/wallet/streaks`
- `/api/v1/wallet/streaks/claim`

### Gateway handler route strings

- None

### Prediction API-client methods

- `createCategory`
- `createSeries`
- `exportAdminMarkets`
- `exportMarketLifecycleAudit`
- `getAdminCategories`
- `getAdminSeries`
- `getAdminTags`
- `getMarketLifecycleAudit`
- `getSeries`
- `getTags`
- `replayIncompleteSettlements`
- `updateMarket`

## Allowed Launch-Prohibited Removals

### Gateway OpenAPI paths

- None

### Gateway handler route strings

- None

### Prediction API-client methods

- None

## Unexpected Removals

### Gateway OpenAPI paths

- None

### Gateway handler route strings

- None

### Prediction API-client methods

- None

## Preservation Rule

- Additions are allowed and listed for review.
- Launch-prohibited money-path removals are allowed only when they match the explicit no-fiat/no-crypto/no-withdrawal boundary.
- Any other inherited public path or API-client method removal must be restored, classified more narrowly, or replaced with reviewable compatibility evidence.
