# ADR-0001: Eliminate backoffice type-unsafety (retire `ignoreBuildErrors`)

**Status:** Proposed
**Date:** 2026-05-22
**Deciders:** Eng lead, John (CEO)

> Source: production-readiness audit (2026-05-22). One of four remediation ADRs (see [README](./README.md)).

## Context

The office build only "passes" because `frontend/packages/office/next.config` (~line 109–112) sets `typescript: { ignoreBuildErrors: true }`. A full `tsc --noEmit` reports **247 errors** — implicit `any`, null-narrowing (`searchParams' is possibly 'null'`), unused imports, and AntD overload mismatches — concentrated in money-adjacent admin pages (`audit-logs`, `auth/login`, and by extension settlement/wallet/users views).

The player app (`packages/app`) uses the same toolchain with **0 errors and no suppression**, so the debt is office-specific and the bar is reachable. CI (`.github/workflows/verify-frontends.yml`) does **not** currently gate office types. This also violates the project's own rule (`CLAUDE.md`: "`ignoreBuildErrors: true` must be removed").

## Decision

Adopt an **error-count ratchet now** (freeze the baseline, block new errors, burn down by priority), then flip `ignoreBuildErrors: false` and enforce in CI once the count reaches zero.

## Options Considered

### Option A: Big-bang — fix all 247, then flip the flag
| Dimension | Assessment |
|-----------|------------|
| Complexity | High (one large PR) |
| Cost | ~1 focused dev-week, high review burden |
| Scalability | N/A |
| Team familiarity | High |

**Pros:** clean end state in one step.
**Cons:** large risky diff touching many pages at once; stalls feature work; merge conflicts.

### Option B: Ratchet / baseline burn-down *(Recommended)*
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low–Med |
| Cost | Incremental over ~2 sprints |
| Scalability | Good (pattern reusable) |
| Team familiarity | High |

**Pros:** immediately stops regressions; low-risk incremental PRs; prioritize money-adjacent pages first.
**Cons:** small tracking-script overhead; debt lingers briefly.

### Option C: Leave as-is, rely on runtime QA — **Rejected**
Unacceptable for admin UI that triggers settlement and wallet mutations.

## Trade-off Analysis

Option B gives the safety of A without the big-bang risk. The only thing A buys is reaching zero ~1 sprint sooner, at materially higher regression risk in money-adjacent screens.

## Consequences

- **Easier:** catch null/`any` bugs in settlement/wallet admin flows before they ship.
- **Harder:** minor short-term dev friction (must type new code).
- **Revisit:** enabling `strict` / `noImplicitAny` repo-wide afterward.

## Action Items

1. [ ] Add `tsc --noEmit` for office to `verify-frontends.yml` as a **non-blocking baseline counter** first.
2. [ ] Commit a baseline (247) + a CI check that **fails on any increase**.
3. [ ] Codemod the trivial classes (unused imports, easy implicit-`any`) — likely clears a large fraction.
4. [ ] Fix **money-adjacent pages first**: `prediction-admin/settlements`, `prediction-admin/markets`, wallet/users, `audit-logs`.
5. [ ] When count = 0, set `ignoreBuildErrors: false` and make the CI check **blocking**.
6. [ ] Follow-up: evaluate `strict` incremental adoption.
