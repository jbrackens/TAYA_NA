# Preservation Modification Map

- Generated: `2026-06-28T20:15:36Z`
- Git root: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict`
- Scope: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined`
- Modified tracked artifacts classified: `392`
- High-risk contract files: `89`
- Large-change threshold: `250` changed lines
- Large-change files: `35`
- Tracked line churn: `+31355 / -6143`
- Unclassified modified artifacts: `0`
- Decision: current modifications are classified for preservation review; this is not an RC completion claim and does not prove each inherited contract is preserved.

## Summary

| Risk | Classification | Count |
|---|---|---:|
| high | auth service account/session contract | 2 |
| high | gateway HTTP and admin handlers | 41 |
| high | gateway economy, rank, or compliance logic | 16 |
| high | gateway point-wallet ledger contract | 4 |
| high | gateway prediction engine and persistence | 20 |
| high | gateway runtime wiring | 2 |
| high | public API/client contract | 4 |
| low | frontend package metadata | 2 |
| low | go platform documentation or dependency metadata | 2 |
| low | office regression tests | 2 |
| low | player launch copy and locale bundle | 137 |
| low | player regression tests | 11 |
| low | revival evidence report | 8 |
| medium | gateway discovery or guarded legacy compatibility | 5 |
| medium | gateway schema and seed data | 9 |
| medium | office admin and operations surface | 39 |
| medium | player client state and API normalization | 19 |
| medium | player launch user surface | 36 |
| medium | player runtime configuration | 3 |
| medium | player shared account and social components | 5 |
| medium | player static legal and trust copy | 5 |
| medium | verification and release governance | 20 |

## High-Risk Or Large-Change Files

| Risk | Classification | + | - | Churn | Path |
|---|---|---:|---:|---:|---|
| high | public API/client contract | 3472 | 106 | 3578 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/api/openapi.yaml` |
| high | gateway HTTP and admin handlers | 2856 | 25 | 2881 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/wallet_handlers_test.go` |
| low | player regression tests | 1878 | 34 | 1912 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/qa-regressions-2026-04-18.test.ts` |
| high | gateway HTTP and admin handlers | 1414 | 56 | 1470 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_admin_handlers_test.go` |
| high | gateway HTTP and admin handlers | 1367 | 35 | 1402 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/wallet_handlers.go` |
| high | public API/client contract | 1061 | 25 | 1086 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/prediction-client.ts` |
| high | gateway HTTP and admin handlers | 857 | 160 | 1017 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_handlers.go` |
| medium | player client state and API normalization | 471 | 320 | 791 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/api/wallet-client.ts` |
| medium | player launch user surface | 675 | 28 | 703 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/rewards/page.tsx` |
| medium | player launch user surface | 615 | 82 | 697 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/market/[ticker]/page.tsx` |
| low | player regression tests | 647 | 26 | 673 | `apps/Phoenix-Predict-Combined/talon-backoffice/e2e/prediction/critical-paths.api.spec.ts` |
| low | player regression tests | 591 | 26 | 617 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/wallet-paths.test.ts` |
| low | office regression tests | 563 | 8 | 571 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/tests/app-router-legacy-routes.test.ts` |
| high | gateway point-wallet ledger contract | 523 | 24 | 547 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/service.go` |
| high | gateway economy, rank, or compliance logic | 517 | 4 | 521 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/bonus/service_test.go` |
| high | gateway prediction engine and persistence | 512 | 5 | 517 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/wallet_wiring_test.go` |
| high | gateway economy, rank, or compliance logic | 471 | 43 | 514 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/bonus/models_test.go` |
| medium | office admin and operations surface | 450 | 64 | 514 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/containers/prediction-markets/index.tsx` |
| high | gateway HTTP and admin handlers | 475 | 3 | 478 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/leaderboard_handlers_test.go` |
| high | gateway prediction engine and persistence | 448 | 9 | 457 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/types.go` |
| high | gateway prediction engine and persistence | 425 | 0 | 425 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/json_defaults_test.go` |
| high | gateway HTTP and admin handlers | 369 | 53 | 422 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/bonus_handlers.go` |
| high | public API/client contract | 323 | 64 | 387 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/prediction-types.ts` |
| high | gateway prediction engine and persistence | 303 | 76 | 379 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/service.go` |
| high | gateway HTTP and admin handlers | 331 | 36 | 367 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/loyalty_handlers.go` |
| high | gateway HTTP and admin handlers | 328 | 35 | 363 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/leaderboard_handlers.go` |
| high | gateway runtime wiring | 312 | 50 | 362 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/gateway/main_test.go` |
| high | gateway economy, rank, or compliance logic | 346 | 0 | 346 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/compliance/handlers_d6_test.go` |
| high | gateway economy, rank, or compliance logic | 272 | 61 | 333 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/compliance/handlers.go` |
| medium | player launch user surface | 280 | 41 | 321 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/AllMarketsSection.tsx` |
| medium | verification and release governance | 38 | 280 | 318 | `apps/Phoenix-Predict-Combined/scripts/qa/go-capability-slo-gate.sh` |
| high | gateway economy, rank, or compliance logic | 276 | 24 | 300 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/bonus/models.go` |
| medium | player launch user surface | 133 | 137 | 270 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/account/transactions/page.tsx` |
| high | gateway economy, rank, or compliance logic | 174 | 92 | 266 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/bonus/service.go` |
| high | gateway HTTP and admin handlers | 265 | 0 | 265 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/bot_compliance_gate_test.go` |
| high | gateway HTTP and admin handlers | 242 | 4 | 246 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/loyalty_handlers_test.go` |
| high | auth service account/session contract | 186 | 59 | 245 | `apps/Phoenix-Predict-Combined/go-platform/services/auth/internal/http/handlers.go` |
| high | gateway HTTP and admin handlers | 212 | 12 | 224 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/order_validation_test.go` |
| high | gateway HTTP and admin handlers | 134 | 80 | 214 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/handlers.go` |
| high | gateway HTTP and admin handlers | 190 | 3 | 193 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/admin_risk_handlers.go` |
| high | gateway HTTP and admin handlers | 164 | 8 | 172 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_leaderboard_handlers_test.go` |
| high | gateway HTTP and admin handlers | 109 | 31 | 140 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/admin_handlers.go` |
| high | gateway prediction engine and persistence | 139 | 0 | 139 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/lifecycle.go` |
| high | gateway point-wallet ledger contract | 134 | 0 | 134 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/service_test.go` |
| high | auth service account/session contract | 99 | 6 | 105 | `apps/Phoenix-Predict-Combined/go-platform/services/auth/internal/http/handlers_test.go` |
| high | gateway prediction engine and persistence | 81 | 22 | 103 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/sql_repository.go` |
| high | gateway prediction engine and persistence | 53 | 38 | 91 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/risk.go` |
| high | gateway HTTP and admin handlers | 67 | 22 | 89 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_admin_handlers.go` |
| high | gateway runtime wiring | 52 | 19 | 71 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/gateway/main.go` |
| high | gateway prediction engine and persistence | 66 | 0 | 66 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/preview_test.go` |
| high | gateway HTTP and admin handlers | 43 | 22 | 65 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/reports_handlers.go` |
| high | gateway HTTP and admin handlers | 32 | 32 | 64 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/pretrade_gate_test.go` |
| high | gateway HTTP and admin handlers | 51 | 10 | 61 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_admin_routes_test.go` |
| high | gateway prediction engine and persistence | 59 | 0 | 59 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/sql_exchange_repository.go` |
| high | gateway HTTP and admin handlers | 53 | 5 | 58 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_loyalty_handlers_test.go` |
| high | gateway economy, rank, or compliance logic | 54 | 2 | 56 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/leaderboards/predict_service.go` |
| high | gateway prediction engine and persistence | 51 | 0 | 51 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/lifecycle_test.go` |
| high | gateway HTTP and admin handlers | 42 | 4 | 46 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_leaderboard_handlers.go` |
| high | gateway economy, rank, or compliance logic | 42 | 4 | 46 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/leaderboards/predict_service_test.go` |
| high | gateway economy, rank, or compliance logic | 23 | 23 | 46 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/leaderboards/service.go` |
| high | gateway HTTP and admin handlers | 38 | 7 | 45 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/bot_handlers.go` |
| high | gateway HTTP and admin handlers | 44 | 0 | 44 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/ratelimit.go` |
| high | gateway HTTP and admin handlers | 41 | 2 | 43 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/dispute_handlers.go` |
| high | gateway HTTP and admin handlers | 24 | 18 | 42 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_leaderboards_admin_handlers.go` |
| high | gateway prediction engine and persistence | 40 | 0 | 40 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/market_filter_test.go` |
| high | gateway point-wallet ledger contract | 21 | 19 | 40 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/wagering.go` |
| high | gateway HTTP and admin handlers | 39 | 0 | 39 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/metrics_infra_test.go` |
| high | gateway economy, rank, or compliance logic | 25 | 14 | 39 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/loyalty/predict_admin_service.go` |
| high | gateway HTTP and admin handlers | 29 | 8 | 37 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_admin_audit_test.go` |
| high | gateway prediction engine and persistence | 35 | 0 | 35 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/orderbook_test.go` |
| high | gateway HTTP and admin handlers | 25 | 9 | 34 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_loyalty_admin_handlers_test.go` |
| high | gateway economy, rank, or compliance logic | 22 | 5 | 27 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/bonus/repository.go` |
| high | gateway HTTP and admin handlers | 15 | 11 | 26 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_loyalty_handlers.go` |
| high | gateway HTTP and admin handlers | 11 | 14 | 25 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/pretrade_gate.go` |
| high | gateway prediction engine and persistence | 16 | 9 | 25 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/compliance_gate_test.go` |
| high | gateway economy, rank, or compliance logic | 24 | 0 | 24 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/leaderboards/service_test.go` |
| high | gateway HTTP and admin handlers | 20 | 0 | 20 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/partner_admin_handlers_test.go` |
| high | gateway prediction engine and persistence | 20 | 0 | 20 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/settlement_audit_test.go` |
| high | gateway prediction engine and persistence | 11 | 9 | 20 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/sql_admin_repository.go` |
| high | gateway point-wallet ledger contract | 10 | 10 | 20 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/bonus_ops.go` |
| high | gateway prediction engine and persistence | 9 | 9 | 18 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/feed/crypto.go` |
| high | gateway economy, rank, or compliance logic | 17 | 0 | 17 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/leaderboards/predict_recomputer_test.go` |
| high | gateway prediction engine and persistence | 9 | 8 | 17 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/settlement.go` |
| high | gateway HTTP and admin handlers | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/rbac_admin_handlers.go` |
| high | gateway economy, rank, or compliance logic | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/leaderboards/predict_boards.go` |
| high | gateway prediction engine and persistence | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/feed/resolution_source.go` |
| high | gateway prediction engine and persistence | 16 | 0 | 16 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/repository.go` |
| high | gateway economy, rank, or compliance logic | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/compliance/gate_surface.go` |
| high | gateway HTTP and admin handlers | 7 | 5 | 12 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/metrics_infra.go` |
| high | gateway HTTP and admin handlers | 7 | 5 | 12 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/partner_admin_handlers.go` |
| high | gateway HTTP and admin handlers | 5 | 5 | 10 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/authz_hardening_test.go` |
| high | gateway HTTP and admin handlers | 6 | 2 | 8 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_loyalty_admin_handlers.go` |
| high | gateway prediction engine and persistence | 6 | 2 | 8 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/amm.go` |
| high | gateway HTTP and admin handlers | 4 | 3 | 7 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/webhook_wiring.go` |
| high | gateway economy, rank, or compliance logic | 7 | 0 | 7 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/leaderboards/predict_recomputer.go` |
| high | gateway HTTP and admin handlers | 3 | 3 | 6 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/admin_dispute_handlers.go` |
| high | gateway HTTP and admin handlers | 2 | 2 | 4 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/webhook_admin_handlers.go` |
| high | public API/client contract | 3 | 0 | 3 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/index.ts` |
| high | gateway HTTP and admin handlers | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/edge_auth_gate_test.go` |
| high | gateway HTTP and admin handlers | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/kyc_admin_handlers.go` |

## All Modified Paths

| Risk | Classification | + | - | Churn | Path |
|---|---|---:|---:|---:|---|
| high | auth service account/session contract | 186 | 59 | 245 | `apps/Phoenix-Predict-Combined/go-platform/services/auth/internal/http/handlers.go` |
| high | auth service account/session contract | 99 | 6 | 105 | `apps/Phoenix-Predict-Combined/go-platform/services/auth/internal/http/handlers_test.go` |
| high | gateway HTTP and admin handlers | 3 | 3 | 6 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/admin_dispute_handlers.go` |
| high | gateway HTTP and admin handlers | 109 | 31 | 140 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/admin_handlers.go` |
| high | gateway HTTP and admin handlers | 190 | 3 | 193 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/admin_risk_handlers.go` |
| high | gateway HTTP and admin handlers | 5 | 5 | 10 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/authz_hardening_test.go` |
| high | gateway HTTP and admin handlers | 369 | 53 | 422 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/bonus_handlers.go` |
| high | gateway HTTP and admin handlers | 265 | 0 | 265 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/bot_compliance_gate_test.go` |
| high | gateway HTTP and admin handlers | 38 | 7 | 45 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/bot_handlers.go` |
| high | gateway HTTP and admin handlers | 41 | 2 | 43 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/dispute_handlers.go` |
| high | gateway HTTP and admin handlers | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/edge_auth_gate_test.go` |
| high | gateway HTTP and admin handlers | 134 | 80 | 214 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/handlers.go` |
| high | gateway HTTP and admin handlers | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/kyc_admin_handlers.go` |
| high | gateway HTTP and admin handlers | 328 | 35 | 363 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/leaderboard_handlers.go` |
| high | gateway HTTP and admin handlers | 475 | 3 | 478 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/leaderboard_handlers_test.go` |
| high | gateway HTTP and admin handlers | 331 | 36 | 367 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/loyalty_handlers.go` |
| high | gateway HTTP and admin handlers | 242 | 4 | 246 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/loyalty_handlers_test.go` |
| high | gateway HTTP and admin handlers | 7 | 5 | 12 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/metrics_infra.go` |
| high | gateway HTTP and admin handlers | 39 | 0 | 39 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/metrics_infra_test.go` |
| high | gateway HTTP and admin handlers | 212 | 12 | 224 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/order_validation_test.go` |
| high | gateway HTTP and admin handlers | 7 | 5 | 12 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/partner_admin_handlers.go` |
| high | gateway HTTP and admin handlers | 20 | 0 | 20 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/partner_admin_handlers_test.go` |
| high | gateway HTTP and admin handlers | 42 | 4 | 46 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_leaderboard_handlers.go` |
| high | gateway HTTP and admin handlers | 164 | 8 | 172 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_leaderboard_handlers_test.go` |
| high | gateway HTTP and admin handlers | 24 | 18 | 42 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_leaderboards_admin_handlers.go` |
| high | gateway HTTP and admin handlers | 6 | 2 | 8 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_loyalty_admin_handlers.go` |
| high | gateway HTTP and admin handlers | 25 | 9 | 34 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_loyalty_admin_handlers_test.go` |
| high | gateway HTTP and admin handlers | 15 | 11 | 26 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_loyalty_handlers.go` |
| high | gateway HTTP and admin handlers | 53 | 5 | 58 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/predict_loyalty_handlers_test.go` |
| high | gateway HTTP and admin handlers | 29 | 8 | 37 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_admin_audit_test.go` |
| high | gateway HTTP and admin handlers | 67 | 22 | 89 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_admin_handlers.go` |
| high | gateway HTTP and admin handlers | 1414 | 56 | 1470 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_admin_handlers_test.go` |
| high | gateway HTTP and admin handlers | 51 | 10 | 61 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_admin_routes_test.go` |
| high | gateway HTTP and admin handlers | 857 | 160 | 1017 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_handlers.go` |
| high | gateway HTTP and admin handlers | 11 | 14 | 25 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/pretrade_gate.go` |
| high | gateway HTTP and admin handlers | 32 | 32 | 64 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/pretrade_gate_test.go` |
| high | gateway HTTP and admin handlers | 44 | 0 | 44 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/ratelimit.go` |
| high | gateway HTTP and admin handlers | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/rbac_admin_handlers.go` |
| high | gateway HTTP and admin handlers | 43 | 22 | 65 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/reports_handlers.go` |
| high | gateway HTTP and admin handlers | 1367 | 35 | 1402 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/wallet_handlers.go` |
| high | gateway HTTP and admin handlers | 2856 | 25 | 2881 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/wallet_handlers_test.go` |
| high | gateway HTTP and admin handlers | 2 | 2 | 4 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/webhook_admin_handlers.go` |
| high | gateway HTTP and admin handlers | 4 | 3 | 7 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/webhook_wiring.go` |
| high | gateway economy, rank, or compliance logic | 276 | 24 | 300 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/bonus/models.go` |
| high | gateway economy, rank, or compliance logic | 471 | 43 | 514 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/bonus/models_test.go` |
| high | gateway economy, rank, or compliance logic | 22 | 5 | 27 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/bonus/repository.go` |
| high | gateway economy, rank, or compliance logic | 174 | 92 | 266 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/bonus/service.go` |
| high | gateway economy, rank, or compliance logic | 517 | 4 | 521 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/bonus/service_test.go` |
| high | gateway economy, rank, or compliance logic | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/compliance/gate_surface.go` |
| high | gateway economy, rank, or compliance logic | 272 | 61 | 333 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/compliance/handlers.go` |
| high | gateway economy, rank, or compliance logic | 346 | 0 | 346 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/compliance/handlers_d6_test.go` |
| high | gateway economy, rank, or compliance logic | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/leaderboards/predict_boards.go` |
| high | gateway economy, rank, or compliance logic | 7 | 0 | 7 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/leaderboards/predict_recomputer.go` |
| high | gateway economy, rank, or compliance logic | 17 | 0 | 17 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/leaderboards/predict_recomputer_test.go` |
| high | gateway economy, rank, or compliance logic | 54 | 2 | 56 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/leaderboards/predict_service.go` |
| high | gateway economy, rank, or compliance logic | 42 | 4 | 46 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/leaderboards/predict_service_test.go` |
| high | gateway economy, rank, or compliance logic | 23 | 23 | 46 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/leaderboards/service.go` |
| high | gateway economy, rank, or compliance logic | 24 | 0 | 24 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/leaderboards/service_test.go` |
| high | gateway economy, rank, or compliance logic | 25 | 14 | 39 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/loyalty/predict_admin_service.go` |
| high | gateway point-wallet ledger contract | 10 | 10 | 20 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/bonus_ops.go` |
| high | gateway point-wallet ledger contract | 523 | 24 | 547 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/service.go` |
| high | gateway point-wallet ledger contract | 134 | 0 | 134 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/service_test.go` |
| high | gateway point-wallet ledger contract | 21 | 19 | 40 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/wagering.go` |
| high | gateway prediction engine and persistence | 6 | 2 | 8 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/amm.go` |
| high | gateway prediction engine and persistence | 16 | 9 | 25 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/compliance_gate_test.go` |
| high | gateway prediction engine and persistence | 9 | 9 | 18 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/feed/crypto.go` |
| high | gateway prediction engine and persistence | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/feed/resolution_source.go` |
| high | gateway prediction engine and persistence | 425 | 0 | 425 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/json_defaults_test.go` |
| high | gateway prediction engine and persistence | 139 | 0 | 139 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/lifecycle.go` |
| high | gateway prediction engine and persistence | 51 | 0 | 51 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/lifecycle_test.go` |
| high | gateway prediction engine and persistence | 40 | 0 | 40 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/market_filter_test.go` |
| high | gateway prediction engine and persistence | 35 | 0 | 35 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/orderbook_test.go` |
| high | gateway prediction engine and persistence | 66 | 0 | 66 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/preview_test.go` |
| high | gateway prediction engine and persistence | 16 | 0 | 16 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/repository.go` |
| high | gateway prediction engine and persistence | 53 | 38 | 91 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/risk.go` |
| high | gateway prediction engine and persistence | 303 | 76 | 379 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/service.go` |
| high | gateway prediction engine and persistence | 9 | 8 | 17 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/settlement.go` |
| high | gateway prediction engine and persistence | 20 | 0 | 20 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/settlement_audit_test.go` |
| high | gateway prediction engine and persistence | 11 | 9 | 20 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/sql_admin_repository.go` |
| high | gateway prediction engine and persistence | 59 | 0 | 59 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/sql_exchange_repository.go` |
| high | gateway prediction engine and persistence | 81 | 22 | 103 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/sql_repository.go` |
| high | gateway prediction engine and persistence | 448 | 9 | 457 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/types.go` |
| high | gateway prediction engine and persistence | 512 | 5 | 517 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/wallet_wiring_test.go` |
| high | gateway runtime wiring | 52 | 19 | 71 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/gateway/main.go` |
| high | gateway runtime wiring | 312 | 50 | 362 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/gateway/main_test.go` |
| high | public API/client contract | 3472 | 106 | 3578 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/api/openapi.yaml` |
| high | public API/client contract | 3 | 0 | 3 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/index.ts` |
| high | public API/client contract | 1061 | 25 | 1086 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/prediction-client.ts` |
| high | public API/client contract | 323 | 64 | 387 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/prediction-types.ts` |
| low | frontend package metadata | 3 | 1 | 4 | `apps/Phoenix-Predict-Combined/talon-backoffice/package.json` |
| low | frontend package metadata | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/yarn.lock` |
| low | go platform documentation or dependency metadata | 9 | 18 | 27 | `apps/Phoenix-Predict-Combined/go-platform/README.md` |
| low | go platform documentation or dependency metadata | 82 | 14 | 96 | `apps/Phoenix-Predict-Combined/go-platform/go.work.sum` |
| low | office regression tests | 23 | 13 | 36 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/components/users/limits/__tests__/limits.test.tsx` |
| low | office regression tests | 563 | 8 | 571 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/tests/app-router-legacy-routes.test.ts` |
| low | player launch copy and locale bundle | 5 | 5 | 10 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/de/account-status-bar.json` |
| low | player launch copy and locale bundle | 4 | 1 | 5 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/de/account.json` |
| low | player launch copy and locale bundle | 3 | 3 | 6 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/de/api-errors.json` |
| low | player launch copy and locale bundle | 5 | 5 | 10 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/de/bonus.json` |
| low | player launch copy and locale bundle | 3 | 2 | 5 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/de/register.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/account-status-bar.json` |
| low | player launch copy and locale bundle | 8 | 12 | 20 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/account.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/api-errors.json` |
| low | player launch copy and locale bundle | 8 | 5 | 13 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/bonus.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/communication-settings.json` |
| low | player launch copy and locale bundle | 10 | 10 | 20 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/footer.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/header.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/language-time-zones.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/leaderboards.json` |
| low | player launch copy and locale bundle | 9 | 9 | 18 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/market-content.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/page-about.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/page-esports-bets.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/page-home.json` |
| low | player launch copy and locale bundle | 9 | 9 | 18 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/portfolio.json` |
| low | player launch copy and locale bundle | 12 | 12 | 24 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/prediction.json` |
| low | player launch copy and locale bundle | 4 | 4 | 8 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/register.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/rewards.json` |
| low | player launch copy and locale bundle | 3 | 3 | 6 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/rg-history.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/sidebar.json` |
| low | player launch copy and locale bundle | 12 | 12 | 24 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/transaction-history.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/wallet-preferences.json` |
| low | player launch copy and locale bundle | 17 | 17 | 34 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/en/win-loss-statistics.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/account-status-bar.json` |
| low | player launch copy and locale bundle | 8 | 12 | 20 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/account.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/api-errors.json` |
| low | player launch copy and locale bundle | 5 | 5 | 10 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/bonus.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/communication-settings.json` |
| low | player launch copy and locale bundle | 10 | 10 | 20 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/footer.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/header.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/language-time-zones.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/leaderboards.json` |
| low | player launch copy and locale bundle | 9 | 9 | 18 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/market-content.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/page-about.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/page-esports-bets.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/page-home.json` |
| low | player launch copy and locale bundle | 7 | 7 | 14 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/portfolio.json` |
| low | player launch copy and locale bundle | 12 | 12 | 24 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/prediction.json` |
| low | player launch copy and locale bundle | 4 | 4 | 8 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/register.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/rewards.json` |
| low | player launch copy and locale bundle | 3 | 3 | 6 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/rg-history.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/sidebar.json` |
| low | player launch copy and locale bundle | 12 | 12 | 24 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/transaction-history.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/wallet-preferences.json` |
| low | player launch copy and locale bundle | 17 | 17 | 34 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/id/win-loss-statistics.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/account-status-bar.json` |
| low | player launch copy and locale bundle | 8 | 12 | 20 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/account.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/api-errors.json` |
| low | player launch copy and locale bundle | 5 | 5 | 10 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/bonus.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/communication-settings.json` |
| low | player launch copy and locale bundle | 10 | 10 | 20 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/footer.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/header.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/language-time-zones.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/leaderboards.json` |
| low | player launch copy and locale bundle | 9 | 9 | 18 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/market-content.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/page-about.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/page-esports-bets.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/page-home.json` |
| low | player launch copy and locale bundle | 7 | 7 | 14 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/portfolio.json` |
| low | player launch copy and locale bundle | 12 | 12 | 24 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/prediction.json` |
| low | player launch copy and locale bundle | 4 | 4 | 8 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/register.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/rewards.json` |
| low | player launch copy and locale bundle | 3 | 3 | 6 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/rg-history.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/sidebar.json` |
| low | player launch copy and locale bundle | 12 | 12 | 24 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/transaction-history.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/wallet-preferences.json` |
| low | player launch copy and locale bundle | 17 | 17 | 34 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/ms/win-loss-statistics.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/account-status-bar.json` |
| low | player launch copy and locale bundle | 8 | 12 | 20 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/account.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/api-errors.json` |
| low | player launch copy and locale bundle | 5 | 5 | 10 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/bonus.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/communication-settings.json` |
| low | player launch copy and locale bundle | 10 | 10 | 20 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/footer.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/header.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/language-time-zones.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/leaderboards.json` |
| low | player launch copy and locale bundle | 9 | 9 | 18 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/market-content.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/page-about.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/page-esports-bets.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/page-home.json` |
| low | player launch copy and locale bundle | 7 | 7 | 14 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/portfolio.json` |
| low | player launch copy and locale bundle | 12 | 12 | 24 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/prediction.json` |
| low | player launch copy and locale bundle | 4 | 4 | 8 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/register.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/rewards.json` |
| low | player launch copy and locale bundle | 3 | 3 | 6 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/rg-history.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/sidebar.json` |
| low | player launch copy and locale bundle | 12 | 12 | 24 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/transaction-history.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/wallet-preferences.json` |
| low | player launch copy and locale bundle | 17 | 17 | 34 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/tl/win-loss-statistics.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/account-status-bar.json` |
| low | player launch copy and locale bundle | 8 | 12 | 20 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/account.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/api-errors.json` |
| low | player launch copy and locale bundle | 5 | 5 | 10 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/bonus.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/communication-settings.json` |
| low | player launch copy and locale bundle | 10 | 10 | 20 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/footer.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/header.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/language-time-zones.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/leaderboards.json` |
| low | player launch copy and locale bundle | 9 | 9 | 18 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/market-content.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/page-about.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/page-esports-bets.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/page-home.json` |
| low | player launch copy and locale bundle | 7 | 7 | 14 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/portfolio.json` |
| low | player launch copy and locale bundle | 12 | 12 | 24 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/prediction.json` |
| low | player launch copy and locale bundle | 4 | 4 | 8 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/register.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/rewards.json` |
| low | player launch copy and locale bundle | 3 | 3 | 6 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/rg-history.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/sidebar.json` |
| low | player launch copy and locale bundle | 12 | 12 | 24 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/transaction-history.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/wallet-preferences.json` |
| low | player launch copy and locale bundle | 17 | 17 | 34 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hans/win-loss-statistics.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/account-status-bar.json` |
| low | player launch copy and locale bundle | 8 | 12 | 20 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/account.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/api-errors.json` |
| low | player launch copy and locale bundle | 5 | 5 | 10 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/bonus.json` |
| low | player launch copy and locale bundle | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/communication-settings.json` |
| low | player launch copy and locale bundle | 10 | 10 | 20 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/footer.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/header.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/language-time-zones.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/leaderboards.json` |
| low | player launch copy and locale bundle | 9 | 9 | 18 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/market-content.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/page-about.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/page-esports-bets.json` |
| low | player launch copy and locale bundle | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/page-home.json` |
| low | player launch copy and locale bundle | 7 | 7 | 14 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/portfolio.json` |
| low | player launch copy and locale bundle | 12 | 12 | 24 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/prediction.json` |
| low | player launch copy and locale bundle | 4 | 4 | 8 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/register.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/rewards.json` |
| low | player launch copy and locale bundle | 3 | 3 | 6 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/rg-history.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/sidebar.json` |
| low | player launch copy and locale bundle | 12 | 12 | 24 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/transaction-history.json` |
| low | player launch copy and locale bundle | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/wallet-preferences.json` |
| low | player launch copy and locale bundle | 17 | 17 | 34 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/static/locales/zh-Hant/win-loss-statistics.json` |
| low | player regression tests | 647 | 26 | 673 | `apps/Phoenix-Predict-Combined/talon-backoffice/e2e/prediction/critical-paths.api.spec.ts` |
| low | player regression tests | 1 | 8 | 9 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/compliance-denial.test.ts` |
| low | player regression tests | 161 | 12 | 173 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/compliance-paths.test.ts` |
| low | player regression tests | 67 | 32 | 99 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/integration/stack-smoke.test.ts` |
| low | player regression tests | 5 | 5 | 10 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/market-content-templates.test.ts` |
| low | player regression tests | 12 | 12 | 24 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/market-subcategories.test.ts` |
| low | player regression tests | 4 | 4 | 8 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/order-idempotency.test.ts` |
| low | player regression tests | 1878 | 34 | 1912 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/qa-regressions-2026-04-18.test.ts` |
| low | player regression tests | 67 | 9 | 76 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/trade-ticket-preview.test.ts` |
| low | player regression tests | 591 | 26 | 617 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/__tests__/wallet-paths.test.ts` |
| low | player regression tests | 45 | 1 | 46 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/tests/smoke/rewards.smoke.spec.ts` |
| low | revival evidence report | 7 | 7 | 14 | `apps/Phoenix-Predict-Combined/revival/05_SECRET_SCAN_BASELINE.md` |
| low | revival evidence report | 21 | 14 | 35 | `apps/Phoenix-Predict-Combined/revival/05_secret_scan_findings.csv` |
| low | revival evidence report | 18 | 16 | 34 | `apps/Phoenix-Predict-Combined/revival/06_DEPENDENCY_VULNERABILITY_BASELINE.md` |
| low | revival evidence report | 11 | 5 | 16 | `apps/Phoenix-Predict-Combined/revival/171_SB504_CAPABILITY_SLO_GATE_REPORT.md` |
| low | revival evidence report | 7 | 5 | 12 | `apps/Phoenix-Predict-Combined/revival/179_SB502_CANONICAL_REGRESSION_PACK_REPORT.md` |
| low | revival evidence report | 40 | 40 | 80 | `apps/Phoenix-Predict-Combined/revival/195_FRONTEND_DEPENDENCY_MODERNIZATION_BASELINE.md` |
| low | revival evidence report | 10 | 10 | 20 | `apps/Phoenix-Predict-Combined/revival/21_SBOM_BASELINE.md` |
| low | revival evidence report | 10 | 6 | 16 | `apps/Phoenix-Predict-Combined/revival/25_GO_CRITICAL_PATH_E2E.md` |
| medium | gateway discovery or guarded legacy compatibility | 57 | 38 | 95 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/discover/classify.go` |
| medium | gateway discovery or guarded legacy compatibility | 29 | 10 | 39 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/discover/classify_test.go` |
| medium | gateway discovery or guarded legacy compatibility | 5 | 1 | 6 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/discover/promote.go` |
| medium | gateway discovery or guarded legacy compatibility | 8 | 5 | 13 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/discover/resolution_parsing_test.go` |
| medium | gateway discovery or guarded legacy compatibility | 8 | 9 | 17 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/payments/crypto_rail.go` |
| medium | gateway schema and seed data | 53 | 22 | 75 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/seed/cleanup.go` |
| medium | gateway schema and seed data | 131 | 1 | 132 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/seed/cleanup_test.go` |
| medium | gateway schema and seed data | 23 | 0 | 23 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/seed/demo.go` |
| medium | gateway schema and seed data | 7 | 4 | 11 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/seed/demo_phase4_user.go` |
| medium | gateway schema and seed data | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/seed/main.go` |
| medium | gateway schema and seed data | 19 | 19 | 38 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/seed/wallet_topup.go` |
| medium | gateway schema and seed data | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/migrations/015_loyalty_leaderboards.sql` |
| medium | gateway schema and seed data | 12 | 12 | 24 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/migrations/028_market_translations.sql` |
| medium | gateway schema and seed data | 107 | 50 | 157 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/seed-data/seed_prediction.sql` |
| medium | office admin and operations surface | 7 | 5 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/dashboard/page.tsx` |
| medium | office admin and operations surface | 13 | 10 | 23 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/disputes/page.tsx` |
| medium | office admin and operations surface | 27 | 11 | 38 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/layout.tsx` |
| medium | office admin and operations surface | 33 | 13 | 46 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/leaderboards/[id]/page.tsx` |
| medium | office admin and operations surface | 36 | 19 | 55 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/leaderboards/page.tsx` |
| medium | office admin and operations surface | 68 | 57 | 125 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/loyalty/[id]/page.tsx` |
| medium | office admin and operations surface | 38 | 33 | 71 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/loyalty/page.tsx` |
| medium | office admin and operations surface | 60 | 15 | 75 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/loyalty/settings/page.tsx` |
| medium | office admin and operations surface | 86 | 35 | 121 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/prediction-admin/risk/page.tsx` |
| medium | office admin and operations surface | 16 | 5 | 21 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/users/[id]/page.tsx` |
| medium | office admin and operations surface | 4 | 4 | 8 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/users/page.tsx` |
| medium | office admin and operations surface | 1 | 0 | 1 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/api/auth/login/route.ts` |
| medium | office admin and operations surface | 48 | 44 | 92 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/components/users/PunterProfile.tsx` |
| medium | office admin and operations surface | 6 | 5 | 11 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/components/users/PunterSearch.tsx` |
| medium | office admin and operations surface | 24 | 6 | 30 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/components/audit-logs/utils/resolvers.ts` |
| medium | office admin and operations surface | 2 | 14 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/components/users/header/index.tsx` |
| medium | office admin and operations surface | 38 | 30 | 68 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/components/users/limits/update.tsx` |
| medium | office admin and operations surface | 13 | 18 | 31 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/components/users/recent-activity/item/index.tsx` |
| medium | office admin and operations surface | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/components/users/wallet/export/index.tsx` |
| medium | office admin and operations surface | 12 | 81 | 93 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/components/users/wallet/index.tsx` |
| medium | office admin and operations surface | 6 | 6 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/components/users/wallet/utils/resolvers.ts` |
| medium | office admin and operations surface | 450 | 64 | 514 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/containers/prediction-markets/index.tsx` |
| medium | office admin and operations surface | 63 | 18 | 81 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/containers/prediction-settlements/index.tsx` |
| medium | office admin and operations surface | 29 | 18 | 47 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/lib/utils/recent-activities.ts` |
| medium | office admin and operations surface | 1 | 2 | 3 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/next-env.d.ts` |
| medium | office admin and operations surface | 11 | 0 | 11 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/proxy.ts` |
| medium | office admin and operations surface | 16 | 16 | 32 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/translations/en/error.js` |
| medium | office admin and operations surface | 7 | 7 | 14 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/translations/en/page-audit-logs.js` |
| medium | office admin and operations surface | 7 | 7 | 14 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/translations/en/page-bets.js` |
| medium | office admin and operations surface | 3 | 3 | 6 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/translations/en/page-fixed-exotics.js` |
| medium | office admin and operations surface | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/translations/en/page-fixtures-details.js` |
| medium | office admin and operations surface | 11 | 11 | 22 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/translations/en/page-markets-details.js` |
| medium | office admin and operations surface | 3 | 3 | 6 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/translations/en/page-markets.js` |
| medium | office admin and operations surface | 2 | 2 | 4 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/translations/en/page-prediction-ops.js` |
| medium | office admin and operations surface | 7 | 100 | 107 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/translations/en/page-provider-ops.js` |
| medium | office admin and operations surface | 26 | 26 | 52 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/translations/en/page-risk-management-summary.js` |
| medium | office admin and operations surface | 14 | 21 | 35 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/translations/en/page-transactions.js` |
| medium | office admin and operations surface | 24 | 24 | 48 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/translations/en/page-users-details.js` |
| medium | office admin and operations surface | 4 | 4 | 8 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/types/punters.ts` |
| medium | player client state and API normalization | 34 | 0 | 34 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/api/auth-client.ts` |
| medium | player client state and API normalization | 186 | 36 | 222 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/api/bonus-client.ts` |
| medium | player client state and API normalization | 102 | 79 | 181 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/api/compliance-client.ts` |
| medium | player client state and API normalization | 6 | 27 | 33 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/api/index.ts` |
| medium | player client state and API normalization | 5 | 3 | 8 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/api/leaderboards-client.ts` |
| medium | player client state and API normalization | 64 | 13 | 77 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/api/loyalty-client.ts` |
| medium | player client state and API normalization | 16 | 4 | 20 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/api/user-client.ts` |
| medium | player client state and API normalization | 471 | 320 | 791 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/api/wallet-client.ts` |
| medium | player client state and API normalization | 2 | 4 | 6 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/compliance-denial.ts` |
| medium | player client state and API normalization | 5 | 8 | 13 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/features.ts` |
| medium | player client state and API normalization | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/i18n/I18nProvider.tsx` |
| medium | player client state and API normalization | 0 | 2 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/i18n/config.ts` |
| medium | player client state and API normalization | 4 | 4 | 8 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/orderIdempotency.ts` |
| medium | player client state and API normalization | 2 | 2 | 4 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/services/geocomply.ts` |
| medium | player client state and API normalization | 12 | 11 | 23 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/store/bonusSlice.ts` |
| medium | player client state and API normalization | 2 | 41 | 43 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/store/index.ts` |
| medium | player client state and API normalization | 0 | 34 | 34 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/store/settingsSlice.ts` |
| medium | player client state and API normalization | 0 | 62 | 62 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/store/siteSettingsSlice.ts` |
| medium | player client state and API normalization | 2 | 4 | 6 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/store/store.ts` |
| medium | player launch user surface | 10 | 10 | 20 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/account/notifications/page.tsx` |
| medium | player launch user surface | 28 | 31 | 59 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/account/page.tsx` |
| medium | player launch user surface | 13 | 13 | 26 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/account/rg-history/page.tsx` |
| medium | player launch user surface | 4 | 4 | 8 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/account/self-exclude/page.tsx` |
| medium | player launch user surface | 133 | 137 | 270 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/account/transactions/page.tsx` |
| medium | player launch user surface | 24 | 11 | 35 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/auth/register/page.tsx` |
| medium | player launch user surface | 6 | 4 | 10 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/category/[slug]/page.tsx` |
| medium | player launch user surface | 280 | 41 | 321 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/AllMarketsSection.tsx` |
| medium | player launch user surface | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/CategoryPills.tsx` |
| medium | player launch user surface | 9 | 9 | 18 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/DiscoveryHero.tsx` |
| medium | player launch user surface | 2 | 2 | 4 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/FeaturedCarousel.tsx` |
| medium | player launch user surface | 55 | 12 | 67 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/MarketCard.tsx` |
| medium | player launch user surface | 4 | 2 | 6 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/MarketChart.tsx` |
| medium | player launch user surface | 21 | 6 | 27 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/MarketGrid.tsx` |
| medium | player launch user surface | 4 | 4 | 8 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/MarketHead.tsx` |
| medium | player launch user surface | 21 | 23 | 44 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/OrderBook.tsx` |
| medium | player launch user surface | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/PredictFooter.tsx` |
| medium | player launch user surface | 17 | 7 | 24 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/RecentTrades.tsx` |
| medium | player launch user surface | 10 | 10 | 20 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/TierPill.tsx` |
| medium | player launch user surface | 10 | 12 | 22 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/TopBar.tsx` |
| medium | player launch user surface | 80 | 84 | 164 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/TradeTicket.tsx` |
| medium | player launch user surface | 5 | 5 | 10 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/TrendingSidebar.tsx` |
| medium | player launch user surface | 11 | 11 | 22 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/market-display.ts` |
| medium | player launch user surface | 7 | 15 | 22 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/marketSubcategories.ts` |
| medium | player launch user surface | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/utils/marketImage.ts` |
| medium | player launch user surface | 2 | 2 | 4 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/utils/useHeroPriceHistory.ts` |
| medium | player launch user surface | 94 | 26 | 120 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/discover/page.tsx` |
| medium | player launch user surface | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/globals.css` |
| medium | player launch user surface | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/layout.tsx` |
| medium | player launch user surface | 13 | 15 | 28 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/leaderboards/page.tsx` |
| medium | player launch user surface | 615 | 82 | 697 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/market/[ticker]/page.tsx` |
| medium | player launch user surface | 3 | 3 | 6 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/page.tsx` |
| medium | player launch user surface | 38 | 59 | 97 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/portfolio/page.tsx` |
| medium | player launch user surface | 4 | 4 | 8 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/predict/page.tsx` |
| medium | player launch user surface | 24 | 24 | 48 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/profile/page.tsx` |
| medium | player launch user surface | 675 | 28 | 703 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/rewards/page.tsx` |
| medium | player runtime configuration | 1 | 1 | 2 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/next-env.d.ts` |
| medium | player runtime configuration | 18 | 1 | 19 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/next.config.js` |
| medium | player runtime configuration | 11 | 1 | 12 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/proxy.ts` |
| medium | player shared account and social components | 7 | 6 | 13 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/AuthProvider.tsx` |
| medium | player shared account and social components | 9 | 6 | 15 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/CurrentBalance.tsx` |
| medium | player shared account and social components | 8 | 5 | 13 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/WageringProgress.tsx` |
| medium | player shared account and social components | 16 | 10 | 26 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/WalletBreakdown.tsx` |
| medium | player shared account and social components | 11 | 11 | 22 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/chat/ChatSidebar.tsx` |
| medium | player static legal and trust copy | 3 | 3 | 6 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/about/page.tsx` |
| medium | player static legal and trust copy | 4 | 4 | 8 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/privacy-policy/page.tsx` |
| medium | player static legal and trust copy | 16 | 19 | 35 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/privacy/page.tsx` |
| medium | player static legal and trust copy | 7 | 7 | 14 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/responsible-gaming/page.tsx` |
| medium | player static legal and trust copy | 7 | 9 | 16 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/terms/page.tsx` |
| medium | verification and release governance | 49 | 29 | 78 | `apps/Phoenix-Predict-Combined/Makefile` |
| medium | verification and release governance | 16 | 1 | 17 | `apps/Phoenix-Predict-Combined/scripts/data/prepare-deterministic-seeds.sh` |
| medium | verification and release governance | 8 | 8 | 16 | `apps/Phoenix-Predict-Combined/scripts/frontend/dependency-modernization-baseline.sh` |
| medium | verification and release governance | 26 | 11 | 37 | `apps/Phoenix-Predict-Combined/scripts/frontend/verify-api-contract-fixtures.sh` |
| medium | verification and release governance | 37 | 60 | 97 | `apps/Phoenix-Predict-Combined/scripts/frontend/verify-sportsbook.sh` |
| medium | verification and release governance | 2 | 7 | 9 | `apps/Phoenix-Predict-Combined/scripts/frontend/verify-talon.sh` |
| medium | verification and release governance | 91 | 86 | 177 | `apps/Phoenix-Predict-Combined/scripts/local-stack.sh` |
| medium | verification and release governance | 41 | 33 | 74 | `apps/Phoenix-Predict-Combined/scripts/pre-commit-hook.sh` |
| medium | verification and release governance | 38 | 280 | 318 | `apps/Phoenix-Predict-Combined/scripts/qa/go-capability-slo-gate.sh` |
| medium | verification and release governance | 21 | 177 | 198 | `apps/Phoenix-Predict-Combined/scripts/qa/go-critical-path-e2e.sh` |
| medium | verification and release governance | 15 | 10 | 25 | `apps/Phoenix-Predict-Combined/scripts/qa/go-regression-pack.sh` |
| medium | verification and release governance | 12 | 64 | 76 | `apps/Phoenix-Predict-Combined/scripts/qa/sports-regression-gate.sh` |
| medium | verification and release governance | 77 | 105 | 182 | `apps/Phoenix-Predict-Combined/scripts/qa/sports-route-smoke.sh` |
| medium | verification and release governance | 14 | 53 | 67 | `apps/Phoenix-Predict-Combined/scripts/reconciliation/historical-directory-parity.sh` |
| medium | verification and release governance | 10 | 18 | 28 | `apps/Phoenix-Predict-Combined/scripts/release/launch-readiness-gate.sh` |
| medium | verification and release governance | 4 | 5 | 9 | `apps/Phoenix-Predict-Combined/scripts/release/profiles/runtime-gate.env` |
| medium | verification and release governance | 26 | 26 | 52 | `apps/Phoenix-Predict-Combined/scripts/release/runtime-gate-profile.sh` |
| medium | verification and release governance | 75 | 21 | 96 | `apps/Phoenix-Predict-Combined/scripts/security/dependency-baseline.sh` |
| medium | verification and release governance | 7 | 4 | 11 | `apps/Phoenix-Predict-Combined/scripts/security/generate-sbom.sh` |
| medium | verification and release governance | 3 | 3 | 6 | `apps/Phoenix-Predict-Combined/scripts/security/scan-secrets.sh` |

## Preservation Rules

- High-risk contract files require human review before an RC claim.
- Large-change files require extra diff review even when they are tests, docs, or generated contracts.
- Public launch surfaces may remove prohibited money routes, crypto rails, cashout language, and redeemable-prize affordances.
- Private production business logic should be preserved unless the diff proves the change is required for the points-only launch contract.
- This map complements, but does not replace, the deletion map and live canonical journey proof.
