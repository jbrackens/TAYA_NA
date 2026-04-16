# Historical Export Parity Readiness (B021)

Date: 2026-03-02
Status: Archived reference for relaunch (legacy historical migration onboarding is out-of-scope)

## Goal
Identify available historical bet-export CSV sources and validate strict reconciliation parity compatibility before onboarding production migration extracts.

This readiness report is retained as historical context only. Current relaunch scope does not include production legacy export onboarding.

## Discovery Scope
- Root searched: `/Users/johnb/Desktop/PhoenixBotRevival`
- CSV files discovered: `38`
- CSV files matching bet-event shape (`eventType,betId`): `4`

Matched files:
- `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-backend/services/src/main/resources/data/reports/sample-bets.csv`
- `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-backend/services/src/test/resources/data/reports/application/multiple-states-bets.csv`
- `/Users/johnb/Desktop/PhoenixBotRevival/phoenix-core/attaboy-phoenix-backend/phoenix-backend/services/src/main/resources/data/reports/sample-bets.csv`
- `/Users/johnb/Desktop/PhoenixBotRevival/phoenix-core/attaboy-phoenix-backend/phoenix-backend/services/src/test/resources/data/reports/application/multiple-states-bets.csv`

## Batch Parity Results

### Combined Repo Test Resources
- Directory:
  - `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-backend/services/src/test/resources/data/reports/application`
- Batch report:
  - `revival/artifacts/reconciliation_parity_batch_combined_test_resources_2026-03-02.md`
- Outcome:
  - `PASS=1`, `FAIL=0`, `SKIPPED=1`
  - strict parity passed for `multiple-states-bets.csv`
  - `fixture-market.csv` skipped (not a bet-event schema CSV)

### Combined Repo Main Resources
- Directory:
  - `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-backend/services/src/main/resources/data/reports`
- Batch report:
  - `revival/artifacts/reconciliation_parity_batch_combined_main_resources_2026-03-02.md`
- Outcome:
  - `PASS=0`, `FAIL=1`, `SKIPPED=0`
  - `sample-bets.csv` fails strict mode due skipped/incomplete lifecycle rows (OPEN-only baseline sample)

### Legacy Core Test Resources
- Directory:
  - `/Users/johnb/Desktop/PhoenixBotRevival/phoenix-core/attaboy-phoenix-backend/phoenix-backend/services/src/test/resources/data/reports/application`
- Batch report:
  - `revival/artifacts/reconciliation_parity_batch_legacycore_test_resources_2026-03-02.md`
- Outcome:
  - `PASS=1`, `FAIL=0`, `SKIPPED=1`
  - strict parity passed for `multiple-states-bets.csv`
  - `fixture-market.csv` skipped (not a bet-event schema CSV)

### Legacy Core Main Resources
- Directory:
  - `/Users/johnb/Desktop/PhoenixBotRevival/phoenix-core/attaboy-phoenix-backend/phoenix-backend/services/src/main/resources/data/reports`
- Batch report:
  - `revival/artifacts/reconciliation_parity_batch_legacycore_main_resources_2026-03-02.md`
- Outcome:
  - `PASS=0`, `FAIL=1`, `SKIPPED=0`
  - `sample-bets.csv` fails strict mode due skipped/incomplete lifecycle rows (OPEN-only baseline sample)

## Readiness Assessment
- Strict historical parity tooling is operational and green for realistic multi-state lifecycle exports.
- Existing test export fixture (`multiple-states-bets.csv`) is currently the only validated strict-compatible baseline in both codebase variants.
- Main-resource sample CSVs are not suitable as strict parity gates without additional lifecycle rows.

## If Historical Migration Is Reintroduced Later
1. Run batch parity on production migration-export directories:
   - `make go-reconciliation-report-historical-dir HISTORICAL_BETS_DIR=/path/to/production/exports`
2. Triage failures into:
   - schema incompatibility
   - unsupported lifecycle patterns
   - data completeness issues (non-terminal rows only)
3. Promote cleaned production export set as canonical B021 gating dataset.
