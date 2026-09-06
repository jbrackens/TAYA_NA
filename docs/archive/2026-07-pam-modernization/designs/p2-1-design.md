> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> Written on branch `pam/p0-modernization` (2026-07-02 → 2026-07-06); never merged. The reference
> implementation (345 commits, migrations 057–061) lives at tag `archive/pam-p0-modernization-2026-07-06`.
> Paths here are PRE-REBRAND (`apps/Phoenix-Predict-Combined/go-platform` = `apps/taptrade-platform/go-platform`;
> `talon-backoffice/packages/app` = `frontend/packages/office`) and units are pre-points ("cents", before
> migration 050). Commit hashes cited inside resolve only at that tag.
> For what of this main still lacks, see `docs/licensability-gaps.md`. See `CLAUDE.md` for current architecture.

# P2-1 Design Note — Activate Multitenancy (query/auth scoping on tenant_id)

Status: The **query-scoping core** of P2-1 is PROTECTED CORE (it edits
`internal/prediction/*` and `internal/wallet/*` SQL) → design note + BLOCKED,
no autonomous code. The **peripheral pieces** (tenant/brand admin UI, global
jurisdiction admin UI, DB-backed feature-flag/config store) are buildable
outside protected paths and are tracked separately below.

## Current state (verified in code, 2026-07-02)

`migrations/037_multitenancy_foundation.sql` is ADDITIVE and DORMANT
(self-documented): it creates a `tenants` directory (seeded with `hula`) and
adds `tenant_id TEXT NOT NULL DEFAULT 'hula'` to the six core transactional
tables (punters, prediction_markets/orders/positions/payouts, + wallet tables
via the wallet service's `ensureSchema`). Its own header states: "nothing reads
tenant_id yet — query-boundary scoping, the auth claim, RLS, and per-tenant
RBAC are later epic steps (2–6). Until those land, behavior is identical to
today." So the discriminator column exists everywhere; NO read path filters on
it. Every SELECT/UPDATE in `internal/prediction/sql_repository.go`,
`internal/prediction/sql_exchange_repository.go`, and `internal/wallet/
service.go` is tenant-blind today.

Why the core is protected: adding `AND tenant_id = $tenant` to the trading and
wallet queries is a change to the settlement/money-path SQL. A wrong predicate
(missing clause, wrong parameter, an OR precedence bug) either leaks another
tenant's book/balance or silently drops rows from a balance calc — a
correctness-and-isolation hazard in exactly the code the guardrails protect.
Autonomous edits here are forbidden.

## Target design (for human-reviewed implementation)

1. **Tenant context propagation.** Resolve the caller's tenant once at the
   edge (from the authenticated session claim; default `hula` when absent) and
   carry it in `context.Context` via a typed key, exactly like the existing
   `httpx` user/role context. A single `tenantFromContext(ctx)` accessor; never
   read a request header directly (same anti-spoof rule as admin role).

2. **Repository scoping.** Every tenant-owned query gains `AND tenant_id = $n`
   (reads) and every INSERT sets `tenant_id` from context. Do this behind the
   `Repository`/`WalletAdapter` interfaces so the scoping is centralized, not
   sprinkled. Add a belt-and-braces DB layer: Postgres Row-Level Security
   policies keyed on a `SET LOCAL app.tenant_id` GUC, so a missing WHERE clause
   fails closed (no rows) instead of leaking. RLS is the safety net; explicit
   WHERE clauses are the primary path (RLS alone is too easy to bypass with a
   `SECURITY DEFINER` or a superuser connection).

3. **Backfill/rollout.** Column + default already shipped (037). The epic:
   (a) enable RLS per table with a permissive default-tenant policy (no behavior
   change), (b) switch the app to `SET LOCAL app.tenant_id` per request, (c)
   tighten RLS to deny cross-tenant, (d) add the tenant claim to auth. Each step
   is independently revertable and dark-launchable behind a `TENANCY_ENFORCED`
   flag (default OFF).

4. **Testing gates.** A cross-tenant isolation test per repository (tenant A
   cannot read/mutate tenant B's rows), race tests on the context propagation,
   and an RLS test that a raw query with the wrong GUC returns zero rows.

## Peripheral pieces (buildable outside protected core — candidate slices)

- **DB-backed feature-flag/config store.** Today flags are env-only. A
  `feature_flags` table (key, value, updated_by/at) + a service + an admin API
  (RBAC-gated, audited) + a typed read helper the rest of the app consults with
  an env fallback. No protected-core edit. High value independent of tenancy.
- **Tenant/brand admin UI.** CRUD over the `tenants` table (list/create/
  suspend) — a new admin route + office page, RBAC-gated, audited. Read/writes
  the tenants directory only, not the trading core.
- **Global jurisdiction admin UI.** Surface the existing geo allowlist / per-
  market jurisdiction config (already env/DB-driven) in the office. No new
  money-path or trading-core code.

## Open decisions for the human (blockers for the core)

1. Approve RLS-plus-explicit-WHERE as the isolation model (vs. explicit-WHERE
   only, or separate schemas per tenant).
2. Confirm the tenant claim source (session JWT claim) and the default-tenant
   fallback policy for legacy sessions.
3. Sequencing: the core scoping is a multi-step epic on protected code — it
   should land in human-reviewed PRs, step by step, behind `TENANCY_ENFORCED`.

## Unblock criteria

Human approval of the isolation model + tenant-claim source, and a decision to
proceed on the protected trading/wallet SQL under human review. The peripheral
feature-flag store and admin UIs can proceed independently as normal backlog
slices (they carry no protected-core edit).
