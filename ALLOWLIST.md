# ALLOWLIST — legitimate/coincidental legacy-term matches (do not rename)

(Empty after iteration 1. Lockfiles verified: no third-party phoenix/talon deps.
Candidates will be added here with one-line justifications as classification proceeds.)

## Preservation-contract trees (decided iteration 2, VERIFIED)
- apps/Phoenix-Predict-Combined/phoenix-backend/ — archived JVM stack; parity/reconciliation
  oracle (Makefile sbt compile checks, historical-bets CSVs, jvm-* security baselines).
- apps/Phoenix-Predict-Combined/phoenix-frontend/ + phoenix-frontend-brand-viegg/ — archived
  legacy frontends referenced by preservation gates and dependency baselines.
- apps/Phoenix-Predict-Combined/revival/ — preservation governance artifacts (deletion maps,
  reconciliation reports). Gates in scripts/qa/preservation-* enforce this contract.
Justification: renaming/deleting an archive falsifies the preservation record; 40+ active
scripts (qa/security/release/reconciliation) read these paths. Their INTERNAL legacy names
stay. Scripts' own identifiers and any ACTIVE-surface references remain LEGACY (renamed in
later batches; path-coupled text rides with the directory-rename batch).
