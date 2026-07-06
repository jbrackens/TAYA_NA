# Production Preservation Dossier

- Generated: `2026-07-01T08:14:22Z`
- Git root: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict`
- Scope: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined`
- Shortstat: ` 544 files changed, 36222 insertions(+), 14127 deletions(-)`
- Decision: inherited production artifacts are not assumed preserved merely because tests pass; this dossier keeps the broad rewrite risk visible and fails if key compatibility anchors disappear.

## Change Magnitude

| Status | Count |
|---|---:|
| Modified tracked files | 490 |
| Deleted tracked files | 54 |
| Added tracked files | 0 |
| Renamed tracked files | 0 |
| Untracked artifacts in scope | 1152 |
| Unclassified untracked artifacts | 0 |
| Deleted launch-prohibited money-path files | 33 |

## High-Risk Domain Counts

| Domain | Changed Tracked Files |
|---|---:|
| Auth/session contract | 2 |
| Gateway HTTP/admin handlers | 50 |
| Gateway guarded legacy transfer compatibility | 2 |
| Prediction engine and persistence | 24 |
| Point wallet ledger contract | 4 |
| Economy, rank, or compliance logic | 16 |
| Public OpenAPI/shared API-client contracts | 6 |
| Office admin/operations surface | 62 |
| Player launch surface | 255 |

## Compatibility Anchors

| Status | Anchor | File | Why It Matters |
|---|---|---|---|
| pass | Inherited Phoenix API client class retained | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/client.ts` | Preserves existing shared-client imports while launch code can adopt Tiangge naming. |
| pass | Tiangge API client alias added instead of replacing class | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/client.ts` | Adds launch-facing naming without deleting the inherited class. |
| pass | Shared entrypoint exports both API-client names | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/index.ts` | Keeps old and new consumers on the same implementation. |
| pass | Legacy wallet payload reads remain private | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/client.ts` | Older wallet payloads are normalized rather than re-exported as launch contracts. |
| pass | Legacy audit payload reads remain private | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/client.ts` | Older promo audit fields are mapped into point-native review fields. |
| pass | Historical reconciliation Make alias retained | `apps/Phoenix-Predict-Combined/Makefile` | Inherited command muscle memory now routes to point-native reconciliation proof. |
| pass | Discovery QA compatibility alias retained | `apps/Phoenix-Predict-Combined/scripts/qa/sports-regression-gate.sh` | Legacy sports regression naming remains as a launch-safe compatibility wrapper. |

## High-Risk Review Queue

| Status | Path | Review Focus |
|---|---|---|
| D | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/testdata/reconciliation/lifecycle_cases.json` | retired lifecycle fixture coverage versus point-native reconciliation proof fixtures |
| D | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/testdata/seeds/read-model.seed 2.json` | duplicate seed removal versus remaining canonical read-model seed fixture |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/auth/internal/http/handlers.go` | registration/session persistence, disclosure acceptance fields, cookie/auth compatibility |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/auth/internal/http/handlers_test.go` | registration/session persistence, disclosure acceptance fields, cookie/auth compatibility |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/api/openapi.yaml` | public API compatibility, launch-safe point-native schema names, removed money-path docs |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/alphacashier/handlers.go` | guarded legacy transfer compatibility routes, disabled launch behavior, unsafe copy redaction |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/alphacashier/preflight.go` | guarded legacy transfer compatibility routes, disabled launch behavior, unsafe copy redaction |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/admin_dispute_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/admin_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/admin_risk_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/alpha_cashier_admin_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/alpha_cashier_admin_handlers_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/authz_hardening_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/bonus_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/bot_compliance_gate_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/bot_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/content_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/dispute_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/edge_auth_gate_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/kyc_admin_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/leaderboard_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/leaderboard_handlers_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/loyalty_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/loyalty_handlers_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/metrics_infra.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/metrics_infra_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/order_validation_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/partner_admin_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/partner_admin_handlers_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_leaderboard_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_leaderboard_handlers_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_leaderboards_admin_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_loyalty_admin_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_loyalty_admin_handlers_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_loyalty_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_loyalty_handlers_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_admin_audit_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_admin_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_admin_handlers_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_admin_routes_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/pretrade_gate.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/pretrade_gate_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/ratelimit.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/ratelimit_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/rbac_admin_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/rbac_admin_handlers_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/reports_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/user_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/wallet_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/wallet_handlers_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/webhook_admin_handlers.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/webhook_admin_handlers_test.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/webhook_wiring.go` | route behavior, admin authorization, request/response compatibility, unsafe copy rejection |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/accounting.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/amm.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/compliance_gate_test.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/exchange.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/feed/crypto.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/feed/resolution_source.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/json_defaults_test.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/lifecycle.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/lifecycle_test.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/market_filter_test.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/orderbook_test.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/preview_test.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/repository.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/risk.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/service.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/settlement.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/settlement_audit_test.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/sql_admin_repository.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/sql_exchange_repository.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/sql_repository.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/sql_resolution_store.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/types.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/wallet_wiring_test.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/workers/expirer.go` | market lifecycle, order matching, settlement math, position and audit persistence |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/bonus_ops.go` | point balance invariants, ledger idempotency, reservations, capture/release semantics |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/service.go` | point balance invariants, ledger idempotency, reservations, capture/release semantics |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/service_test.go` | point balance invariants, ledger idempotency, reservations, capture/release semantics |
| M | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/wagering.go` | point balance invariants, ledger idempotency, reservations, capture/release semantics |
| M | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/client.ts` | shared client imports, legacy payload normalization, launch-facing type aliases |
| M | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/index.ts` | shared client imports, legacy payload normalization, launch-facing type aliases |
| M | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/prediction-client.ts` | shared client imports, legacy payload normalization, launch-facing type aliases |
| M | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/prediction-types.ts` | shared client imports, legacy payload normalization, launch-facing type aliases |
| M | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/types.ts` | shared client imports, legacy payload normalization, launch-facing type aliases |

## Human Review Checklist

- Auth/session changes: compare registration, login, session payload, cookie behavior, and disclosure persistence against inherited behavior plus the launch disclosure contract.
- Gateway HTTP/admin changes: review route availability, authz, error envelopes, audit writes, CSV/export behavior, and unsafe launch wording rejection.
- Gateway guarded legacy transfer compatibility changes: review disabled launch behavior, compatibility route contracts, point-only response copy, and raw-state preservation.
- Prediction engine changes: review matching, reservation, settlement, lifecycle, replay, cancellation, and audit invariants with before/after tests or SQL evidence.
- Wallet ledger changes: review idempotency keys, available/locked balance math, reservation/capture/release rows, and point-only ledger reasons.
- Public API/client changes: review OpenAPI and shared client compatibility so inherited consumers either still work or have explicit launch-safe aliases.
- This checklist is required review guidance; it is not a substitute for sign-off on each high-risk queue entry.

## Untracked Artifacts

### Summary

| Risk | Classification | Count |
|---|---|---:|
| high | untracked compliance behavior or tests | 1 |
| high | untracked gateway HTTP/admin behavior or tests | 24 |
| high | untracked guarded legacy transfer compatibility behavior or tests | 1 |
| high | untracked point-reconciliation proof command | 1 |
| high | untracked prediction engine behavior or tests | 1 |
| low | untracked market visual asset | 188 |
| low | untracked player locale runtime scaffolding | 1 |
| low | untracked regression or browser proof | 11 |
| low | untracked revival evidence report | 882 |
| medium | untracked launch proof command | 2 |
| medium | untracked office admin surface | 6 |
| medium | untracked player launch surface | 9 |
| medium | untracked schema or seed artifact | 9 |
| medium | untracked verification or security governance | 16 |

### Unclassified

- None

### Classified Paths

| Risk | Classification | Path |
|---|---|---|
| high | untracked compliance behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/compliance/launch_safety.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/admin_dispute_handlers_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/admin_risk_handlers_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/bonus_handlers_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/bonus_wallet_persistence_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/content_handlers_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/dispute_handlers_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/kyc_admin_handlers_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/launch_boundary.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/launch_boundary_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/launch_docs_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/launch_reason.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/launch_reason_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/market_social_handlers.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/market_social_handlers_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/market_update_payload_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/market_watchlist_handlers.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/market_watchlist_handlers_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/portfolio_history_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_public_payload_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_settlement_payload_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_settlement_wallet_persistence_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/reports_handlers_test.go` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/testdata/prediction_reconciliation/` |
| high | untracked gateway HTTP/admin behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/user_handlers_test.go` |
| high | untracked guarded legacy transfer compatibility behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/alphacashier/handlers_test.go` |
| high | untracked point-reconciliation proof command | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/prediction-reconciliation-report/` |
| high | untracked prediction engine behavior or tests | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/dashboard_json_test.go` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/02992cd7-f1d1-4aba-9529-153167bfd538.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/064de1ba-5a33-47ae-9d8f-fc07341b1a36.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/069f3f2d-c7bc-43e8-a498-19c527ba37c0.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/08897016-3ff0-4be8-886e-b7fe5c9ac1c9.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/09db3432-263a-4441-853a-bce60191bcc5.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/0b5fd0da-76d0-4831-bbbd-1f77db38f6f7.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/0b89d95a-9097-4b0f-97bf-14322c89f5c6.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/0ffae3ba-87bc-45db-98c5-f4989bca3dd5.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/11da88df-2bad-4db5-9150-df80fe91edae.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/18952bb4-edb4-4b95-a613-ed46200030aa.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/1984f188-5f8c-429f-8747-5fcf87cd5e4b.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/1d1bef08-787d-4621-b3ea-64c6c1db48d2.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/1f003ff8-6a1d-4516-912e-b4ef759e91ad.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/1f3b11d5-4b0c-4034-b3fc-39f16255875b.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/21219399-0ee1-4551-9451-2480c35b3692.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/219d7aa8-9a1b-4ae4-87cb-b78bd4c68618.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/23e66bf2-bcdb-4745-b9af-e2f89017894c.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/2766b5e4-e84c-4920-85ca-deff8b5ec0be.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/27ef14e8-8c4c-4333-8bc0-ed4f1029f4e6.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/28146510-53e8-420b-9159-02cd96450726.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/281bfd37-41fc-425c-bfcf-92813ae1e00b.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/2d9e7fd4-f80b-409d-a0fe-60a07471f5b7.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/2fcbd971-8eaf-4ac1-bbe4-559d5bf96ac8.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/3083c834-f4e7-4593-b67c-a4064d3e14f0.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/31c8fafc-59d6-41fa-a436-b54064c98d0e.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/35a557d0-27cb-4dd8-b7f5-17c739aa9b56.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/35f81b26-dd33-49a0-a89e-304b8de5da85.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/37789b56-aed9-468e-a35b-1ca9542d15dd.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/3799f048-1d80-47f8-a2d3-5263782e803c.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/37b34743-13c8-4f95-a2e7-d3e8bb0d5e40.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/3966a9bf-a860-4ac6-aaea-959d41c4e628.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/3a7a8c68-ecba-4ee4-8958-901a60e70e44.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/3c43735c-dc3e-41a2-9941-9b382a6b914f.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/3dde472a-557a-401d-9cb6-ca96f7505d4e.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/3f7f3ddf-2830-45ab-91f8-5e9c540fe061.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/41d5c304-4ad4-48de-b2bb-e448d129f531.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/41dd7db9-9904-4312-9bad-52a803cdbb4f.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/42aac83b-d321-4022-8624-efe9dc8145c1.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/432bb5ac-abae-4218-8867-574d180b1a97.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/439a6b3a-b364-4b0f-8ee8-264cf097e732.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/44972e7a-f73d-42db-a9eb-30b42fa400b3.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/44a09a39-a977-4ddb-9e56-a8f432f0c501.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/46c972eb-ddcb-4ff9-a426-e34d792b4601.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/4831eeb8-6525-42a3-8d14-3ea262abdb40.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/48ef2a7d-1b16-4f7a-b21f-623e305c3dc3.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/497d283d-fc95-4a5f-a2cf-b72d925ea324.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/498f0915-7407-4399-8b91-45bf0112edc9.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/4b080347-99e9-4990-a987-850c963182d8.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/4b28d46b-70bf-4995-8dd8-06bda4748a22.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/4b66af2e-0186-4edd-ba70-75225d7e580e.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/4bde6311-1dd3-498a-a5aa-aa489b5058a4.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/4d0cda51-3e69-454b-b12a-0884926fcf0d.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/4d0f4e4b-7455-4049-b054-214ca235ac73.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/4d6bcf22-e4b0-4d5c-83ca-25dc5f0855fc.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/4e4eb8c4-4783-4c53-9f9f-4770dc2f8096.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/4e708b86-c46a-4213-857f-34d9ed9ba8e3.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/4e7fb651-532a-494c-927a-e9a4a2ff19cb.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/4f05cef6-ffca-4a34-a34d-cf3c3fb4025f.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/4fcefdec-86b6-493e-b511-616dbe86e15f.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/514f13bd-d331-4238-97bd-1009df3ac8c7.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/54805b7f-0c03-4465-9fc8-988645390e7f.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/590729ee-4f29-4fbc-a804-a4a35694d057.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/595ac548-39f2-40d2-811e-7ea59b68d25f.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/59e33f10-01ba-46f6-ae78-c331fe67bb31.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/5a6b6be5-9c0b-4c8f-9462-5a60bc007236.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/5c64bdbb-8717-402d-9eca-b15f255aa5e3.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/5e8d9e00-38f2-4b10-97fd-188f1fefd6f8.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/5eda8a13-d610-4228-90b2-e1160f9cdc56.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/62a5d3fa-9181-43ad-86dd-6440f7d03ef2.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/6363e988-db48-422f-ad14-f63c068196e4.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/65da7080-1a29-45b0-b2d7-1c62b795a2b7.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/664ac64b-640c-4351-99b4-41eb01c5db75.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/66e938e2-d842-42c8-bf38-74f8c4fe4003.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/67d31917-a432-4d1a-8eef-f9d608dcd25c.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/69ecf48f-0c40-482f-adee-77d146914292.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/6b1e1b3f-734b-43ab-b4ba-7dac2d0f4a7a.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/6be794da-6ac4-49e2-b3ed-9ea06a291652.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/6ec0ccb8-9021-4b71-b026-5ed6f9d10f5a.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/6f11172c-a60b-4a2d-9a39-ad65dd071bc1.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/70eb163e-64c0-47a1-b6c1-95bfbbb2fd70.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/72f98fbb-8d0a-493a-86eb-4b3c899ec3f0.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/76cc2498-34e5-4c40-a40f-9775e5aec5d8.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/7769f4bc-0095-4c92-bca0-cdf5e1ff3e4e.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/78812dbe-fc8a-4f51-a6b3-884884e2f63e.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/78838b94-59d6-453a-a5bb-c488fd5d4712.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/79f28919-f719-4881-ae5c-ba35cbf1805b.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/7ad67751-f21d-4bd6-9ce9-ef08ca328a79.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/7b67d3eb-76f7-472f-b9be-08b4ac9622ca.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/7ba16efc-a73c-4c97-98da-cbd98390bdbc.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/7c942a05-c81a-45ec-8089-f23e9cb4a636.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/7dd1d3f2-78f6-402f-aa16-36180000e116.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/806e7ead-b331-45b6-a8f8-c1e4bde0ebfb.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/818417a6-cee5-41ca-8b91-f115df6481dc.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/82070982-229e-427f-bb77-2ff099a66985.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/824f7410-9b8c-441e-9178-a9006249fb10.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/82e83a21-6eff-46f8-88cb-d663d59a8f02.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/833a7b79-f2cb-4a3e-b47e-9fc5e1622d5e.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/857acdf4-a53c-442c-bbe9-d582046efcfe.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/871134d1-d2ce-4a33-bf9e-d4220c2dc7e8.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/87c31098-9388-46b9-ab4f-8264836810da.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/89e31c5e-1dfd-418a-9814-bd5ce546145a.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/8ec482c9-bf92-41b7-913f-4aad3570bab1.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/8f177e22-8bc6-4c21-b8ba-7fc9e083ee0f.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/90b783e9-ac79-409c-a051-681c21a22bf9.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/90b8abf4-a6ef-4556-a30b-126a49d6132e.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/9143450d-f7a9-43c2-a7cb-8fc0738eb0b3.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/93b00af2-64c3-4388-89a8-c8b5f57f837f.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/95b0b9f9-f695-4fa4-875f-018f211e113f.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/96cb7d9e-3c33-410c-98c1-5d213b23ac16.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/97ffc11a-4eb3-4b5e-8535-b8fbd3099522.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/98328f12-bec3-441e-a0ab-f0de8f30e828.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/9ac5cba1-e797-4ac0-bf7b-e6c8b5886624.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/9bd3d62b-e7d6-4996-9f40-337e9d361585.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/9c55e527-3ab0-4f03-8ddd-215f64c787ce.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/9cd6a787-d628-482a-bf8d-aa8434b74af9.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/a064741a-8e0c-40e7-829c-6b5e62d72df0.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/a4378245-8205-4085-88b3-221ef6290cd8.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/a53c717f-911a-4c7a-b918-6c350eaa20ca.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/a8b11d49-9990-4011-b4ac-57be946e560a.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/a96e5e49-be80-4f40-ac14-683b0974c1ff.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/a9d59e3e-7918-464d-a71c-ec196c7301c0.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/aa6f42ab-bda1-4b3b-8934-b66b83b8695f.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/aac0b2a5-8dbb-441a-bc9f-daebbfaedc85.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/ae8f45d0-7cf7-40d8-bcd5-584b9cffbbfb.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/b069870a-75b5-45d1-b7e0-3658ff638bbc.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/b75196fc-c3b0-4093-975a-bd51406bfa19.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/b7a7b036-d286-4cb0-ac44-73bd22f79906.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/b87b5c9d-aa62-4b04-be6f-8a33ae8d6d28.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/b8d04503-68da-4cac-b3d9-c6c19d284863.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/b9e9af4f-b97f-4d5a-9425-35ef0d791664.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/bbb9f12f-0de4-4e73-ab5a-f6608739f322.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/bcffcafb-ebc7-4ad1-9ed8-fcd5cfca5a9b.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/be04bac8-5bf8-4524-991b-befd4950953c.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/be143fad-47e9-44c8-89b0-f462d9673a9d.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/bf665cea-6262-46a4-9758-3e5049a9b966.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/bfc43838-5e48-4a1e-8ab6-ed85259bafd0.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/c072aaf3-8d28-4893-b389-095e072d2714.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/c3d19b1f-aaad-42e2-afa0-9e3b685f26e6.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/c5c02a1d-0474-4409-a3d6-697695291d9e.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/c609c12d-424b-4923-9788-58a3486c08cd.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/c83cb1a9-b6ea-4044-aee2-43ba17d92f3c.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/c873de6f-304a-4beb-b281-72d5d02041fc.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/c888297c-9a89-417b-93fa-752edf934720.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/c8b738ad-fe55-4c39-9746-11c185859a85.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/cb2753f1-77d8-4672-ae2a-fb630f110758.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/cba8684b-ffb7-4ec6-90cd-9e04cb286fc9.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/cbb4d0f5-f9b9-4c1d-ad8f-2a1c4ea9d043.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/cc54d08a-67b0-4fb7-87c1-3b107e8e04ed.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/cc948c0a-7fbc-46c6-b91c-bdd4542dcba5.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/cd865fa2-53e2-4b10-b4fc-52becb0bad1c.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/d0bc7fdd-f721-4a3e-bff5-e2f48d35226e.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/d16e8da4-20a4-4117-a42d-11f966bc42a0.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/d29b0705-56df-444e-85b5-fa6c5b0e7459.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/d34236d2-346b-4a63-9901-14a858e1fa4e.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/d4b09e5b-97f7-44fb-a45a-1c5054a32eb7.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/d50f8f5a-47a2-49dc-ac55-12413a14a35f.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/d7bc0e98-c060-46cb-812a-5bfa55904e8d.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/d7ccaa02-ec67-4adf-bca1-5199277672d8.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/d8812a26-453c-4d28-9455-704045621d2e.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/da97a5a8-ce7d-4b24-bf7a-f8712e35acf0.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/dadb0d02-46f3-4fcc-8349-7432b719d9f7.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/dc733219-7597-4d9c-bb6d-44f9caee389c.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/dca8cc87-19ee-42fd-b4dc-7b5cfda88c6b.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/dd0d197a-86fd-4f2a-b6ee-cf8db0e6e300.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/dd3edd85-5c58-454b-a01c-c9500c6cd82c.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/de3dced7-c627-4afd-8b6d-a82e98b8ba8d.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/df3c66f6-6334-43c9-b377-169e25d94ff3.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/df3d2719-2ced-4e8f-aad6-53241c8120b8.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/e6a484ac-e61d-4553-ab2a-fbc928f04f4b.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/e73e1426-0cba-4617-8588-15321e45243b.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/e89ef829-9929-4141-ac2b-5c4192b998ed.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/e8f13d16-f9df-449f-b07f-1e91b08061db.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/e98cec77-ea0a-43ec-8636-f9ac26387dde.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/eadd26e3-3cfa-480d-a3e5-8a3fbca861b5.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/eb78c64e-41e5-49a2-aee0-7478fc951271.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/ec4c77c7-e839-4088-8d48-4e332c710549.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/eeab9679-d6f1-4dc1-937e-abcb614ac707.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/f09e5b01-71b1-4875-a707-29f50dde252c.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/f3347e91-a59f-4da7-b3b0-bb200152a88c.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/f362d7c8-4349-49fa-b59a-8c3ee231ab14.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/f3e79176-0e1f-4eb6-861b-4946713f9ece.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/f55ebab1-aecb-4037-96b2-bb1db37bec1e.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/f63c63b9-c3c0-4fce-8a39-c2de1c3bb354.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/f96224b7-3696-4397-ba6b-3a019dc799ef.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/fa6fcb16-edd3-4607-8e79-77fb941e8a42.png` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/fb5d6512-b432-4de9-8efb-fa36a8d73101.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/fc71d2db-aa7c-4757-833d-9b73fd74df64.jpg` |
| low | untracked market visual asset | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/images/markets/ff343adb-5b6b-45fa-8057-10e77854d243.png` |
| low | untracked player locale runtime scaffolding | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/translations/` |
| low | untracked regression or browser proof | `apps/Phoenix-Predict-Combined/talon-backoffice/e2e/prediction/canonical-browser.ui.spec.ts` |
| low | untracked regression or browser proof | `apps/Phoenix-Predict-Combined/talon-backoffice/e2e/prediction/office-admin-lifecycle.ui.spec.ts` |
| low | untracked regression or browser proof | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/point-ledger.test.ts` |
| low | untracked regression or browser proof | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/prediction-order-validation.test.ts` |
| low | untracked regression or browser proof | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/rewards-active-bonus-render.test.ts` |
| low | untracked regression or browser proof | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/user-client-preferences.test.ts` |
| low | untracked regression or browser proof | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/tests/audit-log-display-sanitizer.test.ts` |
| low | untracked regression or browser proof | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/tests/audit-log-resolvers.test.ts` |
| low | untracked regression or browser proof | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/tests/audit-log-slices.test.ts` |
| low | untracked regression or browser proof | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/tests/recent-activities.test.ts` |
| low | untracked regression or browser proof | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/tests/users-recent-activity-slices.test.ts` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/32_LIVE_NO_MONEY_BOUNDARY.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/33_PRESERVATION_DELETION_MAP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/34_ABUSE_BOUNDARY_PROOF.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/35_CRITICAL_API_JOURNEY.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/36_PRESERVATION_MODIFICATION_MAP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/37_EXTENDED_CRITICAL_API_JOURNEY.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/38_PRESERVATION_CONTRACT_ANCHORS.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/39_ADMIN_SETTLEMENT_API_JOURNEY.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/40_LEADERBOARD_APPEARANCE_API_JOURNEY.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/41_DUAL_ADMIN_RESOLUTION_API_JOURNEY.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/42_CANONICAL_BROWSER_JOURNEY.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/43_OFFICE_ADMIN_LIFECYCLE_BROWSER_PROOF.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/44_BACKEND_TERMINOLOGY_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/44_CANONICAL_BROWSER_STACK_RUNNER.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/45_FRONTEND_FORM_DATA_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/46_FRONTEND_PARSE_URL_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/47_FRONTEND_TAR_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/48_FRONTEND_WS_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/49_FRONTEND_UNDICI_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/50_FRONTEND_TRIM_NEWLINES_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/51_FRONTEND_HTTP_CACHE_SEMANTICS_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/52_FRONTEND_MERGE_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/53_FRONTEND_DOT_PROP_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/54_FRONTEND_SEMVER_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/55_FRONTEND_FAST_URI_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/56_FRONTEND_TMP_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/57_FRONTEND_LODASH_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/58_FRONTEND_BRACES_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/59_FRONTEND_RESIDUAL_SECURITY_ADVISORIES.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/60_FRONTEND_RESIDUAL_ADVISORY_GATE.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/61_JVM_OSV_DIRECT_DEPENDENCY_BASELINE.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/62_JVM_DIRECT_DEPENDENCY_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/63_JVM_TEST_DEPENDENCY_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/64_JVM_SWAGGER_UI_SECURITY_REMEDIATION.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/65_JVM_DIRECT_RESIDUAL_ADVISORY_GATE.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/66_JVM_SBT_REQUIRED_RELEASE_GATE.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/67_RC_COMPLETION_AUDIT_GATE.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/68_JVM_OSV_RESOLVED_CLASSPATH_BASELINE.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/68_OFFICE_USER_LEDGER_POINT_CONTRACT_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/69_JVM_RESOLVED_RESIDUAL_ADVISORY_GATE.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/69_OFFICE_LIMITS_POINT_ADD_CONTRACT_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/70_JVM_RESOLVED_RESIDUAL_TRIAGE.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/70_OFFICE_LIMITS_POINT_USE_CONTRACT_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/71_OFFICE_LIMIT_HISTORY_ENUM_CONTRACT_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/72_OFFICE_LIMIT_HISTORY_TRANSLATION_KEY_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/73_OFFICE_FINANCIAL_SUMMARY_TRANSLATION_KEY_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/74_OFFICE_LEGACY_SPORTS_FEED_COPY_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/75_OFFICE_RETIRED_BET_CANCEL_ENDPOINT_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/76_OFFICE_BET_TRANSLATION_KEY_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/77_OFFICE_ADMIN_README_POINT_NATIVE_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/78_OFFICE_NAV_RISK_COMMENT_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/79_OFFICE_AUDIT_SCOPED_URL_BOUNDARY_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/80_OFFICE_AUDIT_DIFF_DISPLAY_BOUNDARY_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/81_GATEWAY_MAKEFILE_POINT_NATIVE_SETUP_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/82_GATEWAY_MAKEFILE_LAUNCH_SEED_TARGET_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/83_GATEWAY_DEMO_BACKOFFICE_AUDIT_SEED_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/84_GATEWAY_SEED_OPERATOR_WORDING_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/85_GATEWAY_SEED_MARKET_MAKER_WORDING_CLEANUP.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/86_LAUNCH_READINESS_PRESERVATION_GATES.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/87_LAUNCH_READINESS_ABUSE_BOUNDARY_GATE.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/88_SHARED_API_CLIENT_WALLET_POINT_CONTRACT.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/89_SHARED_API_CLIENT_AUDIT_LOG_POINT_CONTRACT.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/90_SHARED_API_CLIENT_ORDERBOOK_HINT_POINT_CONTRACT.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/91_SHARED_API_CLIENT_SETTLED_POSITION_RESULT_CONTRACT.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/92_MARKET_SETTLEMENT_POOL_POINT_CONTRACT.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/93_PRODUCTION_PRESERVATION_DOSSIER.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/94_SCENARIO_11_API_SURFACE_GATE.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260628_163608.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260629_162224.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260629_172850.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260629_173802.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260629_174638.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260629_175021.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260629_175401.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260629_180124.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260629_180634.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260629_181110.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_073743.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_074234.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_074548.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_075018.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_075250.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_075702.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_080256.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_080736.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_081256.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_081642.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_082247.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_082737.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_083238.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_090026.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_090055.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_093100.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_094023.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_094247.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_171606.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_173213.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_175145.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_175618.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_180430.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_180836.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_181634.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_182046.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_182506.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_182948.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_183555.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_184318.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_184953.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_185511.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_190000.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_190823.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_191248.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_191700.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_192111.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_192454.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_193350.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_193743.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_194124.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_194523.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_194918.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_195736.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_200326.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_200805.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_201307.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_201652.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_202314.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_202957.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260630_204129.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_061200.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_061618.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_062441.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_063021.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_063912.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_065309.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_070216.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_070720.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_071555.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_072126.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_072910.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_073848.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_074610.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_075309.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_075845.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_080532.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/admin_settlement_api_journey_20260628_181350.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/backend_terminology_cleanup_20260628_221335.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/canonical_browser_journey_20260628_194146.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/canonical_browser_journey_20260630_100402.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/canonical_browser_journey_20260630_100649.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/canonical_browser_stack_20260630_095910.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/canonical_browser_stack_20260630_100255.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/canonical_browser_stack_20260630_100541.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/capability_launch_boundary_20260628_125617.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/capability_launch_boundary_20260628_125842.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/capability_launch_gate_20260628_125617.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/capability_launch_gate_20260628_125842.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/capability_prediction_reconciliation_20260628_125617.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/capability_prediction_reconciliation_20260628_125842.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/critical_api_journey_20260628_165417.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/dual_admin_resolution_api_journey_20260628_205500.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/extended_critical_api_journey_20260628_175403.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_braces_security_remediation_20260629_102152.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_dependency_baseline_20260628_133140/` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_dot_prop_security_remediation_20260629_094716.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_fast_uri_security_remediation_20260629_095751.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_form_data_security_remediation_20260629_085923.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_http_cache_semantics_security_remediation_20260629_093716.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_lodash_security_remediation_20260629_101612.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_merge_security_remediation_20260629_094204.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_parse_url_security_remediation_20260629_090900.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_residual_advisory_gate_20260629_083726.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_residual_advisory_gate_20260630_090539.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_residual_advisory_gate_20260630_090658.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_residual_security_advisories_20260629_102847.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_semver_security_remediation_20260629_095242.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_tar_security_remediation_20260629_091401.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_tmp_security_remediation_20260629_100852.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_trim_newlines_security_remediation_20260629_093144.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_undici_security_remediation_20260629_092434.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/frontend_ws_security_remediation_20260629_091929.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/gateway_demo_backoffice_audit_seed_cleanup_20260629_180157.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/gateway_makefile_launch_seed_target_cleanup_20260629_175511.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/gateway_makefile_point_native_setup_cleanup_20260629_175109.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/gateway_seed_market_maker_wording_cleanup_20260629_181224.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/gateway_seed_operator_wording_cleanup_20260629_180705.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/go_launch_boundary_20260628_125344.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/go_launch_boundary_20260628_130512.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/go_prediction_reconciliation_20260628_125344.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/go_prediction_reconciliation_20260628_130512.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_dependency_security_remediation_20260629_085257.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260629_091534.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260629_091647.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_090547.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_090609.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_102808.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_105150.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_105254.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_125148.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_125324.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_130259.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_130421.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_131549.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_132406.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_133411.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_135741.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_141157.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_143348.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_151443.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_153927.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_153957.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_162001.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_162704.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_165053.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_170032.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_direct_residual_advisory_gate_20260630_170137.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_084940.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_084940.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_090129.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_090129.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_090808.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_090808.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_091524.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_091524.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_090606.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_090606.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_102806.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_102806.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_105139.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_105139.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_105251.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_105251.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_125139.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_125139.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_125322.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_125322.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_130257.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_130257.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_130418.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_130418.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_131548.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_131548.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_132404.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_132404.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_133403.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_133403.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_135730.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_135730.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_141157.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_141157.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_143348.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_143348.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_151443.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_151443.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_153927.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_153927.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_160841.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_160841.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_161915.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_161915.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_162631.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_162631.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_165026.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_165026.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_170016.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_170016.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_170135.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_170135.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_103139.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_103139.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_105114.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_105114.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_105239.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_105239.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_125112.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_125112.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_125301.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_125301.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_130244.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_130244.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_130358.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_130358.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_131538.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_131538.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_132354.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_132354.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_133345.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_133345.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_135649.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_135649.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_141040.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_141040.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_143322.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_143322.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_145527.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_145527.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_151443.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_151443.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_151755.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_151755.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_153607.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_153607.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_153740.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_153740.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_160600.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_160600.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_161305.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_161305.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_162558.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_162558.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_164958.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_164958.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_170002.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_170002.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_170146.json` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_170146.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_104108.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_105835.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_125331.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_130429.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_131550.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_133418.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_135749.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_141157.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_143348.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_153927.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_154009.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_162009.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_162704.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_165054.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_170032.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_170155.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_170828.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_171007.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_sbt_required_release_gate_20260629_092042.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_swagger_ui_security_remediation_20260629_090816.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/jvm_test_dependency_security_remediation_20260629_090139.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/launch_readiness_abuse_boundary_gate_20260629_182303.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/launch_readiness_preservation_gates_20260629_181913.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/leaderboard_appearance_api_journey_20260628_202428.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/live_no_money_boundary_20260628_141028.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/live_no_money_boundary_20260628_141107.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/live_no_money_boundary_20260628_141156.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/live_no_money_boundary_20260628_141848.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/live_no_money_boundary_20260630_103652.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/live_no_money_boundary_20260630_104847.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/live_no_money_boundary_20260630_105208.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/live_no_money_boundary_20260630_105330.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/live_no_money_boundary_20260630_105447.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/market_settlement_pool_point_contract_20260629_185354.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/office_admin_lifecycle_browser_20260628_220651.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/office_admin_readme_point_native_cleanup_20260629_172511.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/office_audit_diff_display_boundary_cleanup_20260629_174515.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/office_audit_scoped_url_boundary_cleanup_20260629_173751.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/office_bet_translation_key_cleanup_20260629_102324.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/office_financial_summary_translation_key_cleanup_20260629_100908.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/office_legacy_sports_feed_copy_cleanup_20260629_101320.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/office_limit_history_enum_contract_cleanup_20260629_095600.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/office_limit_history_translation_key_cleanup_20260629_100100.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/office_limits_point_add_contract_cleanup_20260629_094200.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/office_limits_point_use_contract_cleanup_20260629_095000.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/office_nav_risk_comment_cleanup_20260629_173200.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/office_retired_bet_cancel_endpoint_cleanup_20260629_101931.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/office_user_ledger_point_contract_cleanup_20260629_093600.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260628_180240.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260628_180402.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260628_181632.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260628_194523.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260629_093302.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260629_161826.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260629_170313.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260629_170932.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260629_172547.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260629_173802.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260629_174638.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260629_175021.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260629_175401.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260629_180106.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260629_180613.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260629_181051.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260630_073743.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260630_074234.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260630_074548.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260630_075017.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260630_075250.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260630_075701.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260630_080255.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260630_080736.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260630_081255.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260630_081641.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260630_082246.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260630_082737.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260630_083237.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260630_091234.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_contract_anchors_20260630_165258.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260628_163100.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260628_163229.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260628_174845.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260628_194523.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260629_093302.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260629_161826.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260629_174016.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_091216.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_165257.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_175118.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_175646.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_180430.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_180837.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_181655.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_182106.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_182519.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_183002.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_183609.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_184337.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_185015.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_185536.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_190026.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_190823.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_191248.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_191700.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_192111.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_192455.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_193401.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_193754.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_194135.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_194536.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_194931.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_195748.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_200338.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_200817.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_201317.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_201701.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_202325.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_203007.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_203720.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260630_204140.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_061210.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_061630.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_062458.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_063037.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_063931.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_065325.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_070234.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_070737.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_071605.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_072137.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_072920.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_073849.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_074611.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_075309.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_075845.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_080532.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_081349.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_human_review_queue_20260630_203609.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260628_174715.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260628_174845.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260628_194523.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260628_200821.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260628_201524.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_070334.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_071003.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_071457.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_072028.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_072545.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_073325.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_073824.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_074330.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_074826.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_075401.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_075905.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_080608.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_080804.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_081552.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_082130.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_083217.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_083737.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_084608.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_085703.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_085839.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_090309.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_090959.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_091712.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_092314.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_093104.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_093747.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_093906.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_094328.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_094422.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_095020.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_095303.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_095613.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_100105.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_101042.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_101426.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_102037.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_102430.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_152612.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_153140.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_153723.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_154417.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_155045.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_155441.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_160132.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_160638.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_161156.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_161836.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_162237.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_162742.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_163333.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_164036.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_164651.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_165327.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_170313.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_170932.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_173802.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_174638.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_175021.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_175401.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_180106.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_180613.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260629_181051.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_073731.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_074222.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_074536.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_075004.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_075238.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_075649.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_080240.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_080720.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_081242.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_081628.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_082234.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_082723.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_083216.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_091234.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_092125.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_102120.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_103230.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_104207.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_110208.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_125930.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_140140.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_141432.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_143402.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_155758.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_165234.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_170321.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_171018.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_171606.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_172020.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_172426.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_173237.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_173616.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_174053.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_174458.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_175118.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_175618.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_180430.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_180837.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_181701.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_182107.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_182521.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_183003.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_183217.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_183611.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_184339.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_185016.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_185538.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_190027.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_190823.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_191248.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_191700.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_192111.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_192455.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_193402.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_193755.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_194136.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_194537.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_194932.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_195748.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_200338.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_200818.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_201318.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_201702.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_202326.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_203008.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_203721.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260630_204140.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_061211.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_061631.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_062459.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_063038.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_063933.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_065330.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_070738.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_071606.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_072138.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_072921.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_073849.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_074611.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_075309.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_075845.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_080532.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_081356.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_contract_review_pack_20260701_081231.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260629_170920.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260629_172547.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260629_173802.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260629_174800.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260629_175043.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260629_175423.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260629_180124.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260629_180634.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260629_181110.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_073747.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_074237.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_074551.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_075022.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_075253.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_075706.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_080259.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_080740.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_081259.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_081645.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_082250.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_082741.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_083244.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_091234.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_091327.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_092125.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_093447.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_094118.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_094321.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_095420.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_101039.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_101535.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_101602.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_102120.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_103230.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_104207.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_110105.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_110208.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_125955.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_140208.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_141504.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_143430.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_155758.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_165247.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_170335.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_171019.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_171606.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_172020.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_172426.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_173237.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_173616.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_174053.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_174458.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_175145.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_175646.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_180455.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_180904.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_181720.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_182123.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_182538.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_183022.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_183107.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_183237.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_183627.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_184354.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_185033.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_185554.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_190048.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_190823.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_191248.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_191700.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_192111.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_192455.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_193416.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_193810.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_194150.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_194551.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_194948.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_195803.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_200354.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_200833.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_201333.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_201715.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_202340.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_203021.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_203734.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260630_204154.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260701_061228.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260701_061644.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260701_062514.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260701_063053.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260701_063947.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260701_065351.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260701_070757.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260701_071620.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260701_072152.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260701_072935.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260701_073849.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260701_074611.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260701_075309.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260701_075845.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260701_080533.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_092639.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_092924.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_093811.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_094328.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_095039.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_095321.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_095630.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_095753.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_100123.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_100426.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_101042.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_101426.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_102037.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_102430.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_152537.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_152612.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_153112.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_153140.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_153723.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_154436.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_155103.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_155504.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_155842.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_160132.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_160638.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_161156.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_161854.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_162255.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_162803.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_163352.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_164053.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_164709.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_165344.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_165934.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_170336.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_171013.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_171358.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_171442.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_171559.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_172547.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_172602.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_173106.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_173209.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_174005.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_174638.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_175021.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_175401.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_180124.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_180634.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260629_181110.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_073749.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_074239.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_074553.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_075024.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_075255.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_075708.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_080301.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_080742.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_081301.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_081646.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_082252.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_082743.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_083247.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_085501.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_090216.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_091341.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_091544.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_092125.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_092353.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_093140.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_093413.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_094118.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_094502.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_094605.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_095420.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_101039.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_101835.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_102120.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_102215.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_103230.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_103715.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_103847.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_104226.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_110235.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_130002.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_133528.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_140223.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_141432.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_143430.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_155758.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_162324.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_165306.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_170337.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_171019.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_171606.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_172020.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_172426.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_173258.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_173637.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_174113.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_174524.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_175313.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_175744.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_180455.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_180904.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_181729.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_182147.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_182547.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_183128.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_183240.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_183640.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_184407.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_184415.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_184535.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_185042.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_185141.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_185606.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_185708.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_190059.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_190229.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_190906.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_191315.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_191726.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_192135.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_192520.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_193418.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_193813.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_194153.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_194554.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_194950.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_195807.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_200357.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_200837.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_201336.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_201718.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_202342.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_203024.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_203744.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260630_204201.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_061309.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_061653.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_062522.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_063101.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_063956.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_065358.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_070800.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_071623.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_071755.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_072155.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_072354.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_072938.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_073124.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_074047.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_074725.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_074813.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_075426.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_080148.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_080837.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/regression_pack_20260628_130205.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/regression_pack_20260628_130508.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/sbom_20260628_132554/` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/sbom_20260628_133059/` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/sbom_20260630_122817/` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/sbom_20260630_125842/` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/sbom_20260630_145448/` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/sbom_20260630_155759/` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/sbom_20260630_161432/` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/sbom_20260630_163402/` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/sbom_20260630_174009/` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/sbom_20260630_185121/` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/scenario_11_api_surface_gate_20260629_172310.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/scenario_11_api_surface_gate_20260629_172417.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/shared_api_client_audit_log_point_contract_20260629_183359.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/shared_api_client_orderbook_hint_point_contract_20260629_184120.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/shared_api_client_settled_position_result_contract_20260629_184721.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/artifacts/shared_api_client_wallet_point_contract_20260629_182809.md` |
| low | untracked revival evidence report | `apps/Phoenix-Predict-Combined/revival/jvm_resolved_residual_allowlist.json` |
| medium | untracked launch proof command | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/launch-boundary-report/` |
| medium | untracked launch proof command | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/windowed-resolution-live-proof/` |
| medium | untracked office admin surface | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/prediction-admin/activity/` |
| medium | untracked office admin surface | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/prediction-admin/reward-clusters/` |
| medium | untracked office admin surface | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/prediction-admin/taxonomy/` |
| medium | untracked office admin surface | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/social-moderation/` |
| medium | untracked office admin surface | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/components/audit-logs/utils/display-sanitizer.ts` |
| medium | untracked office admin surface | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/containers/prediction-taxonomy/` |
| medium | untracked player launch surface | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/activity/` |
| medium | untracked player launch surface | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/MarketDiscussion.tsx` |
| medium | untracked player launch surface | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/api/market-social-client.ts` |
| medium | untracked player launch surface | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/api/market-watchlist-client.ts` |
| medium | untracked player launch surface | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/point-ledger.ts` |
| medium | untracked player launch surface | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/store/pointBalanceSlice.ts` |
| medium | untracked player launch surface | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/rewards/ActiveBonusesControl.tsx` |
| medium | untracked player launch surface | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/series/` |
| medium | untracked player launch surface | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/users/` |
| medium | untracked schema or seed artifact | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/seed/demo_phase5_bonus.go` |
| medium | untracked schema or seed artifact | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/seed/demo_phase5_leaderboards.go` |
| medium | untracked schema or seed artifact | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/seed/demo_phase5_rewards.go` |
| medium | untracked schema or seed artifact | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/migrations/044_prediction_social.sql` |
| medium | untracked schema or seed artifact | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/migrations/045_prediction_market_watchlist.sql` |
| medium | untracked schema or seed artifact | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/migrations/046_tiangge_launch_taxonomy.sql` |
| medium | untracked schema or seed artifact | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/migrations/047_tiangge_launch_translation_cleanup.sql` |
| medium | untracked schema or seed artifact | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/migrations/048_wallet_reward_clusters.sql` |
| medium | untracked schema or seed artifact | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/migrations/049_prediction_social_write_limits.sql` |
| medium | untracked verification or security governance | `apps/Phoenix-Predict-Combined/scripts/qa/abuse-boundary-proof.sh` |
| medium | untracked verification or security governance | `apps/Phoenix-Predict-Combined/scripts/qa/canonical-browser-journey.sh` |
| medium | untracked verification or security governance | `apps/Phoenix-Predict-Combined/scripts/qa/canonical-browser-stack.sh` |
| medium | untracked verification or security governance | `apps/Phoenix-Predict-Combined/scripts/qa/frontend-residual-advisory-gate.sh` |
| medium | untracked verification or security governance | `apps/Phoenix-Predict-Combined/scripts/qa/jvm-direct-residual-advisory-gate.sh` |
| medium | untracked verification or security governance | `apps/Phoenix-Predict-Combined/scripts/qa/jvm-resolved-residual-advisory-gate.sh` |
| medium | untracked verification or security governance | `apps/Phoenix-Predict-Combined/scripts/qa/live-no-money-boundary.sh` |
| medium | untracked verification or security governance | `apps/Phoenix-Predict-Combined/scripts/qa/preservation-contract-anchor-gate.sh` |
| medium | untracked verification or security governance | `apps/Phoenix-Predict-Combined/scripts/qa/preservation-deletion-gate.sh` |
| medium | untracked verification or security governance | `apps/Phoenix-Predict-Combined/scripts/qa/preservation-modification-gate.sh` |
| medium | untracked verification or security governance | `apps/Phoenix-Predict-Combined/scripts/qa/preservation-production-dossier.sh` |
| medium | untracked verification or security governance | `apps/Phoenix-Predict-Combined/scripts/qa/rc-completion-audit-gate.sh` |
| medium | untracked verification or security governance | `apps/Phoenix-Predict-Combined/scripts/qa/scenario-11-api-surface-gate.sh` |
| medium | untracked verification or security governance | `apps/Phoenix-Predict-Combined/scripts/security/jvm-osv-direct-baseline.sh` |
| medium | untracked verification or security governance | `apps/Phoenix-Predict-Combined/scripts/security/jvm-osv-resolved-classpath-baseline.sh` |
| medium | untracked verification or security governance | `apps/Phoenix-Predict-Combined/talon-backoffice/scripts/qa/` |

## Preservation Rules

- This dossier does not mark RC complete.
- High-risk business logic changes still require human review before release sign-off.
- Launch-prohibited money, crypto, withdrawal, cashout, and redeemable-prize paths may be removed when deletion gates classify them.
- Inherited public/client names should be wrapped or aliased when possible instead of being silently replaced.
- Private compatibility normalizers may read inherited payload fields, but launch-facing exports must stay point-native.
- Untracked artifacts must be classified; unclassified untracked paths fail this gate because they are invisible to tracked diff review.
