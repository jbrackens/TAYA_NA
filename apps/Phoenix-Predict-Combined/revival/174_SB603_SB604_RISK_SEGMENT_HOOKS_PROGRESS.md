# SB-603/SB-604 Risk Scoring and Segmentation Hooks Progress

Date: 2026-03-05  
Backlog reference: `SB-603`, `SB-604` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Added SB-603 player scoring hook:
   - churn, LTV, and risk scores
   - model version + feature vector for auditability.
2. Added SB-604 segmentation and override hooks:
   - automated segment assignment from score/signals
   - suspicious signal envelope
   - manual segment override API.
3. Added admin endpoints:
   - `GET /api/v1/admin/risk/player-scores?userId=...`
   - `GET /api/v1/admin/risk/segments?userId=...&limit=...`
   - `POST /api/v1/admin/risk/segments/{userId}/override`.
4. Surfaced risk/correction data in Talon Risk Management Summary:
   - risk score metrics
   - risk segment table
   - wallet correction task table.

## Key Files

1. Gateway hook logic:
   - `go-platform/services/gateway/internal/riskintel/service.go`
   - `go-platform/services/gateway/internal/http/risk_handlers.go`
   - `go-platform/services/gateway/internal/http/handlers.go`
   - `go-platform/services/gateway/internal/http/handlers_test.go`
2. Talon surface:
   - `talon-backoffice/packages/office/containers/risk-management-summary/index.tsx`
   - `talon-backoffice/packages/office/containers/risk-management-summary/contracts.ts`
   - `talon-backoffice/packages/office/translations/en/page-risk-management-summary.js`
   - `talon-backoffice/packages/office/containers/risk-management-summary/__tests__/contracts.test.ts`
   - `talon-backoffice/packages/office/containers/risk-management-summary/__tests__/risk-management-summary.test.tsx`

## Validation

1. `cd go-platform/services/gateway && go test ./internal/http -run 'TestAdminRiskScoresAndSegmentsEndpoints'`
   - pass
2. `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/risk-management-summary/__tests__/contracts.test.ts containers/risk-management-summary/__tests__/risk-management-summary.test.tsx --passWithNoTests`
   - pass

## Remaining

1. None for SB-603/SB-604 hook scope in this execution slice.
