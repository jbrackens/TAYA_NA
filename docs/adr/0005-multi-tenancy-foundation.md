# ADR-0005: Multi-tenancy foundation (tenant model for B2B)

**Status:** Proposed — awaiting owner decision (improvement-plan **P3-01**)

**Deciders:** John Brackens (owner)
**Date:** 2026-06-13
**Related:** AUDIT_REPORT.md G-matrix (tenancy ABSENT); IMPROVEMENT_PLAN.md P3-01; P3-02 (partner API) and P3-04 (white-label) depend on this.

## Context

The enterprise bar includes a B2B story: operators run their own branded
prediction exchange on our platform. Today the system is **single-tenant by
omission** — there is no operator concept and **zero `tenant_id` anywhere** in
the gateway (verified: 0 "tenant" references in `internal/`). Every punter,
market, order, position, payout, and wallet row implicitly belongs to one
brand.

Multi-tenancy is the kind of cross-cutting concern that gets exponentially more
expensive to retrofit the longer it waits — it touches the schema, every
repository query, auth claims, and RBAC. The point of this ADR is to **decide
the model now** (while the row count is small and one brand is live) and prove
the migration can be **additive**, so the actual build is a sequenced epic
rather than a big-bang rewrite.

This ADR decides the model only. The spike (below) and the epic execute after
the model is approved.

## Decision

Adopt **Option A: single database, shared schema, `tenant_id` discriminator
column** on the core tables, plus:

- a `tenants` table (operator directory: id, slug, display name, status);
- `tenant_id TEXT NOT NULL DEFAULT 'hula'` on the core tables — the default
  backfills existing rows to the live brand, making the migration additive (no
  data migration, no downtime);
- tenant carried in the **auth session / claims** and resolved into a
  request-scoped context at the edge of the gateway;
- **RBAC scoped per tenant** (a staff member's roles apply within their
  tenant; super-admin spans tenants);
- a **per-tenant config table** (feature flags, branding tokens, market
  catalog visibility) — this is what P3-04 white-label and P3-02 partner
  sandbox read from;
- tenant scoping **enforced at the repository boundary** (every query gains an
  `AND tenant_id = $tenant` predicate, threaded via context), with **Postgres
  Row-Level Security as a defense-in-depth backstop** so a single forgotten
  predicate cannot leak cross-tenant data.

## Options Considered

### Option A: Shared schema + `tenant_id` column *(Recommended)*
One DB, one schema, a discriminator column. Additive migration (DEFAULT
backfill). App-layer row scoping at the repository boundary + RLS backstop.
- **Pros:** cheapest path to B2B; one migration pipeline, one backup, one
  connection pool; cross-tenant analytics trivial; forward-compatible (a heavy
  tenant can later be promoted to its own DB without changing the model).
- **Cons:** isolation is logical, not physical — a missed `WHERE tenant_id`
  is a cross-tenant leak. Mitigated by repository-layer enforcement + RLS +
  tests. Shared blast radius for a bad migration.

### Option B: Schema-per-tenant (Postgres schemas) — *Rejected for now*
Each tenant gets its own schema; `search_path` selects it.
- **Pros:** stronger isolation; per-tenant migration possible.
- **Cons:** migrations run N times (fan-out + partial-failure states);
  `search_path` juggling per request; cross-tenant reporting needs UNION over
  schemas; connection management gets fiddly. Over-engineered for our stage.

### Option C: Database-per-tenant — *Rejected for now (reserve for whales)*
- **Pros:** strongest isolation; supports data-residency requirements.
- **Cons:** N databases, N migration pipelines, N backup/restore drills, N
  connection pools. Operationally heavy; only justified by a regulated or
  data-residency-bound tenant. The Option A `tenant_id` model can promote such
  a tenant to a dedicated DB later, so we lose nothing by deferring.

## Trade-off Analysis

The axis is **isolation strength vs. operational cost vs. migration blast
radius**. At our stage — one live brand (`hula`), actively courting B2B — the
binding constraint is *time-to-first-partner*, not physical isolation. Option A
unblocks B2B with a single additive migration and keeps one ops surface, while
RLS closes most of the isolation gap. Options B/C buy isolation we don't yet
need at an ops cost we can't yet absorb, and Option A doesn't preclude them
later for a specific tenant.

## Spike (ready to run once the model is approved)

Apply `tenant_id TEXT NOT NULL DEFAULT 'hula'` to the six core tables on a
throwaway branch and measure blast radius — **do not merge**. Measured today:

| Core table | Query sites needing a `tenant_id` predicate |
|---|---:|
| `prediction_markets` | ~38 |
| `prediction_orders` | ~26 |
| `prediction_positions` | ~22 |
| `punters` | ~13 |
| `prediction_payouts` | ~13 |
| `wallet_balances` / `wallet_ledger` / `wallet_reservations` | ~31 |
| **Total** | **~143 query sites** |

Index work: composite `(tenant_id, <existing key>)` on hot lookups. The
existing per-market advisory lock and idempotency keys should be namespaced by
tenant. The `prediction.WalletAdapter` interface gains a tenant dimension.
Because the column has a `DEFAULT 'hula'`, the spike should show **the schema
change applies to the seeded DB with zero data migration** — that is the
"additive" proof P3-01 asks for.

## Consequences

- Every repository method becomes tenant-scoped (via request context, not a
  per-call parameter sprawl). A forgotten predicate is a **cross-tenant data
  leak** — hence RLS as a non-optional backstop and a test that asserts a
  query without tenant scope returns nothing.
- Auth must mint and carry tenant in the session; the edge resolves it before
  any handler runs.
- Seed/demo data is tagged `'hula'`; tooling that creates tenants is new.
- This is a **sequenced epic**, not one PR: (1) `tenants` table + `tenant_id`
  columns (additive migration) → (2) request-scoped tenant context + auth
  claim → (3) repository-boundary scoping → (4) RLS backstop + leak test →
  (5) RBAC per-tenant → (6) per-tenant config table (feeds P3-02/P3-04).

## Action Items

- [ ] **Owner:** approve Option A (or direct B/C for a specific isolation need).
- [ ] On approval: run the spike branch; confirm additive; size each epic step.
- [ ] Sequence the epic after the current Phase-3 work stabilizes (the audit
      notes P3-01 should follow the mainline consolidation so tenancy lands on
      one branch, not two).
