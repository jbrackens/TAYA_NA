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

## Rebrand ledger self-references (decided iteration 5)
- WORKLOG.md, CURRENT_STATE.md, RENAME_MAP.md, ALLOWLIST.md — these documents ARE the
  rename record; they necessarily name the legacy tokens they map. Excluded from the
  final grep gate by definition.

## Review artifacts (decided iteration 6)
- .codex-reviews/** — raw historical review logs; same dated-record rule as docs/audit.

## Live-box operational pins (decided iteration 6, batch I — exit via RUNBOOK cutover)
- /opt/phoenix path in .github/workflows/deploy-demo.yml (box filesystem state)
- COMPOSE_PROJECT_NAME=phoenix pin (preserves postgres/redis volume names = demo data)
Justification: renaming live-server state in an autonomous run risks demo data loss;
images/tags themselves are renamed (taptrade-gateway/taptrade-auth via explicit
compose image: entries, decoupled from the project name). Cutover runbook: ops/RUNBOOK.md.

## Additional dated records + true alias references (decided iteration 6, batch I follow-up)
- docs/parity-run-log.md, docs/prototype-audit.md — dated parity/audit ledgers (same
  rule as docs/audit; earlier prose renames in them predate this classification and
  are noted in WORKLOG).
- Remaining `PhoenixApiClient` mentions in living docs (taptrade-economy-rules.md,
  spec.md) accurately describe the REAL deprecated compatibility alias that still
  exists in code; they retire together with the alias.
