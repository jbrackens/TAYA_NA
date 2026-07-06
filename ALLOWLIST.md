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

## Dated historical records (decided iteration 3)
- docs/audit/** — point-in-time audit reports (e.g. COMPONENT_DISPOSITION.md); renaming
  brand tokens inside dated records falsifies the historical account. Living docs are
  renamed; dated reports are not.

## Temporary compat shims (decided iteration 4 — scheduled for removal post-rollout)
- scripts/release/{launch-readiness-gate.sh,runtime-gate-profile.sh,profiles/runtime-gate.env}
  and spec.md: TIANGGE_DISCOVERY_CONTRACT_ITERATIONS / RUN_TIANGGE_DISCOVERY_CONTRACT_GATE
  appear ONLY as legacy fallback keys in ${TAPTRADE_X:-${TIANGGE_X:-…}} chains (the same
  pattern these scripts already used for RUN_MULTI_SPORT_RUNTIME_GATE). Operators/CI may
  still export the old keys during rollout. Remove after one release cycle.
