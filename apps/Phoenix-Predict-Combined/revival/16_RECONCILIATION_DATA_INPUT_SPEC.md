# Reconciliation Data Input Spec (B021)

Date: 2026-03-02
Status: Archived reference for relaunch (legacy historical migration onboarding is out-of-scope)

## Purpose
Define the input format and mapping rules used to plug migrated historical ledgers into the Go reconciliation parity report pipeline.

This document is retained for historical reference only. Current relaunch scope does not include legacy dataset migration/onboarding.

## Current Pipeline
- Fixture-driven parity harness:
  - `go-platform/services/gateway/internal/http/testdata/reconciliation/lifecycle_cases.json`
- Report command:
  - `make go-reconciliation-report`
  - output: `revival/artifacts/reconciliation_parity_report_2026-03-02.md`
  - historical mode: `make go-reconciliation-report-historical`
  - strict historical mode: `make go-reconciliation-report-historical-strict`
  - historical directory batch mode: `make go-reconciliation-report-historical-dir`
  - historical output: `revival/artifacts/reconciliation_parity_report_historical_2026-03-02.md`

## Required Historical CSV Shape (Implemented Baseline)
CSV header fields consumed by converter:
- `eventType`
- `betId`
- `punterId`
- `selectionId`
- `stake`
- `odds`
- `paidAmount`
- `unsettledAmount` (used for `RESETTLED` debit reversal)
- `resettledAmount` (used for `RESETTLED` credit replay)

Notes:
- Additional columns are ignored.
- Rows with missing `betId` are ignored.
- Cases are grouped by `betId` and converted into deterministic fixture cases.

## Mapping Rules
- Seed credit is injected from report flag:
  - `-seed-cents` (default `500000`)
- Required open event:
  - `OPEN` must exist with positive `stake` and `odds`
- Terminal state mapping:
  - `SETTLED` with `paidAmount > 0` -> winning settlement
  - `SETTLED` with `paidAmount <= 0` -> losing settlement
  - `CANCELLED` or `VOIDED` -> cancel lifecycle case
- `RESETTLED` mapping (implemented):
  - requires a corresponding `SETTLED` event for the same `betId`
  - `unsettledAmount` -> admin debit adjustment in replay
  - `resettledAmount` -> admin credit adjustment in replay
  - expected reconciliation totals include these extra debit/credit entries
- Local harness normalization:
  - historical selection IDs are normalized to local fixture-compatible IDs (`home` / `away`) for parity execution.

## If Historical Migration Is Reintroduced Later
1. Export migrated ledger CSVs in the supported header shape above.
2. Run `make go-reconciliation-report-historical HISTORICAL_BETS_CSV=/path/to/export.csv`.
3. Validate report has zero failed rows, then enforce strict gate:
   - `make go-reconciliation-report-historical-strict HISTORICAL_BETS_CSV=/path/to/export.csv`
4. For multi-file export folders, run:
   - `make go-reconciliation-report-historical-dir HISTORICAL_BETS_DIR=/path/to/exports`
   - review `revival/artifacts/reconciliation_parity_batch_YYYY-MM-DD.md` summary.
5. CI gate is available via `.github/workflows/verify-go.yml` (`make verify-go`).
6. Expand CI coverage and branch protections so merges fail on any parity mismatch.
