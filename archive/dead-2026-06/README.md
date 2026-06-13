# Archived 2026-06 (P2-01)

These directories were moved here by improvement-plan task **P2-01** (see
`docs/audit/AUDIT_REPORT.md` finding **ORG-01** and
`docs/audit/IMPROVEMENT_PLAN.md`). They were verified dead before moving:
nothing in the active build/CI/compose path referenced them (the only
references were within the dead set itself, or prose in docs).

Nothing here is imported, built, or deployed by the live platform
(`apps/Phoenix-Predict-Combined/`). History is preserved — `git log --follow`
works across the move, and a full pre-cleanup snapshot is on branch
`archive/2026-06-pre-cleanup`.

| Archived path | What it was | Why dead |
|---|---|---|
| `services-codex-prep/` | A complete 46-service parallel **sportsbook** backend (phoenix-user, phoenix-settlement, phoenix-betting-engine, …) with its own compose files. | Built during the sportsbook era, never integrated into the gateway-based prediction stack. Zero code imports in active apps; CI ignores it. |
| `libs/` (`phoenix-core/`) | 11 pre-fork reference implementations (attaboy-gmx-*, attaboy-phoenix-*): wallet, identity, OIDC, backend templates. | Reference only; zero production imports. Only ever referenced by `services-codex-prep`'s compose. |
| `review/` | Sportsbook infra trees (gmx-infrastructure, gmx-streaming, idefix-backoffice). | Dead; only the (also-archived) `scripts/Makefile` referenced it. |
| `configs-workspace/` | A service-catalog placeholder (`services.yaml`) for the old workspace tooling. | Compatibility shim; no active code reads it. |
| `scripts-Makefile/` | The old root `scripts/Makefile`. | Hardcoded `/Users/johnb/Desktop/PhoenixBotRevival` (another machine/user) and sportsbook commands (waysun, talon-core). Not in CI. The live `scripts/check-*.sh` cashier guards stayed in `scripts/`. |

**Convenience symlinks removed in the same change** (they pointed into the
archived trees): root `codex-prep` → `services/codex-prep`, `phoenix-core` →
`libs/phoenix-core`, `workspace` → `configs/workspace`.

**Preserved (NOT dead):** the on-chain / non-custodial seeds the audit flagged
as the hybrid-CLOB future — `contracts/`, `packages/cashier-sdk`, and
`services/{relayer,bridge-watcher,cashier-api}` — stay at the repo root. They
are executed by improvement-plan task **P3-09**.

## `docs-sportsbook/` (P2-04)

Eight sportsbook-era docs that described fixtures/betslips/freebets and a
fictional Kubernetes/Cloud-SQL/Memorystore topology that never existed
(audit ARCH-05 / ORG-02). Replaced by accurate, prediction-native versions at
`apps/Phoenix-Predict-Combined/{ARCHITECTURE,RUNBOOKS,DEPLOYMENT}.md`:

| Archived | Disposition |
|---|---|
| `ARCHITECTURE.md` | rewritten (real services/ports/money-path/deploy) |
| `RUNBOOKS.md` | rewritten (prediction ops: lifecycle, settlement, cashier, restore) |
| `DEPLOYMENT.md` | rewritten (real Hetzner SSH + docker-compose + Caddy pipeline) |
| `LAUNCH_CHECKLIST.md` | archived (unchecked K8s template; no replacement) |
| `PLAYER_APP_GAP_ANALYSIS.md` | archived (describes the abandoned betslip app) |
| `INTEGRATION_GUIDE.md` / `INTEGRATION_SETUP.md` / `INTEGRATION_COMPLETE.md` | archived (sportsbook-era migration artifacts) |

To restore something: `git mv archive/dead-2026-06/<path> <original-location>`.
