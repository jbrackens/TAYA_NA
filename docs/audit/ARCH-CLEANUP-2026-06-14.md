# Architecture cleanup — 2026-06-14 (autonomous session)

Completion record for the architecture workstream of the 2026-06-14 audit:
**ARCH-02 / IMP-06** (purge dead sportsbook code from the frontend),
**ARCH-01** (dead directory weight), and **COR-06** (`context.Background()` in
payments). All code changes landed on `main` as independently verified,
CI-green units. The churned `AUDIT_REPORT.md` / `IMPROVEMENT_PLAN.md` working
copies are a separate in-flight revision and were intentionally left untouched;
fold this record into them as desired.

## ARCH-02 / IMP-06 — sportsbook frontend purge ✅

The 159 sportsbook references flagged by the independent run are resolved: the
mechanical purge is complete and regression-guarded. Three residual items are
product/content calls (below), not mechanical deletes.

| Commit | Scope | Verification |
|---|---|---|
| `aa18c283` | api-client strip: 24 sportsbook methods + 22 types from `client.ts`/`types.ts`; deleted 4 dead files (`useApi.ts`, `useLiveData.ts`, office `lib/api.ts`, `websocket.ts`); fixed `index.ts` re-exports (901 deletions) | api-client build, app typecheck, office tsc — all clean; CI Tests/G-02/Deploy green |
| `ab1a585c` | office purge: dead Redux trading-slice subgraph (6 slices + `tradingSlices.test.ts`) + store.config rewiring; 6 dead sportsbook type files; dead bets members stripped from live `usersDetailsSlice`; dead admin containers (`provider-ops` bet-intervention `index`/`contracts`, entire `prediction-ops/`); app `BonusBadge.tsx` (21 deletions, 2 edits) | office `tsc --noEmit` clean, app `typecheck:full` clean, office vitest **102/102**; CI Tests/G-02/Deploy green |
| `ca673163` | drop dead snake_case `sport_key` probe alias; **G-01 rule 6** now bans unambiguous sportsbook tokens in `app/` + `api-client/src` | convention gate 0 fails; app typecheck clean; CI green |

**Kept (verified live or legitimate):**
- `provider-ops/cashier-review.tsx` — live, rendered by `app/(dashboard)/cashier/page.tsx`.
- `usersDetailsSlice` `setUserNotesUpdate` path — live (notes UI).
- `sportKey` (camelCase) in `marketSubcategories.ts` — **live**: `go-platform/.../seed-data.json` tags every market with `"sportKey"`. The probe matches real payloads; only the dead snake_case alias was removed.
- App `selection` (the user's YES/NO pick — `PredictionSelection`) and `fixture` (test infra) — legitimate prediction/test vocabulary, deliberately **not** banned by G-01 rule 6.

**Regression guard:** G-01's `scripts/check-conventions.sh` rule 6 fails CI if
`betslip|sport_key|punter_bets|freebets|odds_boosts|match_tracker` reappears in
the app or api-client production trees (tests excluded). `fixtures`/`selections`
are intentionally excluded for the TS trees (legit vocabulary there) while
remaining banned in the prediction Go domain (rule 5).

**Flagged — owner/product decisions (not auto-executed):**
1. **`seed-data.json` sports framing** — every seeded market is keyed
   `sportKey: basketball|boxing|mma|tennis|…`. This is the largest *remaining*
   sportsbook residue in spirit, but re-theming seed content to prediction-native
   categories is a product/content decision.
2. **`provider-ops/verification-review.tsx`** — dead as wired (sole importer was
   the deleted `index.tsx`), but it is real KYC/IDV code (maps to Go
   `internal/compliance/idv.go`), not sportsbook. Delete vs. relocate.
3. **mock-server + legacy-e2e bundle** — `packages/mock-server/` + the top-level
   `playwright.config.ts` + `e2e/backoffice`/`e2e/player-app`/`e2e/m3-*` form a
   dead cluster (not in CI; CI runs `playwright.prediction.config.ts` against the
   real Go stack). Removing them deletes a test config, so confirm as a bundle.

## ARCH-01 — dead directory weight ✅ (agent scope) / flagged remainder

- **Done:** `archive/` tree (582 MB, 19,047 tracked files) + the
  `Phoenix-Sportsbook-Combined` symlink removed (`3ec79f0a`). 0 tracked
  `archive/` files remain. The "1.7 GB" headline was mostly untracked
  `node_modules`/`.next` (gitignored, local-only).
- **Flagged — owner-gated:** three stale, **not-deployed** top-level dirs that
  are nonetheless referenced by ~20 QA/release/security scripts, so retiring them
  is an owner decision rather than a safe autonomous delete:
  - `phoenix-backend` (1,732 files; last touched 2026-04-16 — legacy sportsbook
    backend, superseded by the live `go-platform` gateway)
  - `phoenix-frontend-brand-viegg` (1,128 files; 2026-05-30)
  - `revival` (510 files; 2026-05-28)

  The live deploy (`deploy-demo.yml`) builds only `go-platform` +
  `talon-backoffice` (both committed 2026-06-14). True `.git` history-size
  reclamation (filter-repo) also remains owner-gated.

## COR-06 — `context.Background()` in payments → FALSE POSITIVE

The two non-test sites are boot-time DDL with no request context available:
- `internal/payments/db_service.go:55` — `ensureSchema` (startup schema setup)
- `internal/payments/crypto_rail.go:146` — `EnsureCryptoSchema` (startup DDL)

Both run from `handlers.go` startup wiring, not request handlers; the request
paths already thread `ctx`. **No code change** — disposition: not a defect.

## Workstream grade — Architecture & boundaries: C+ → **A−**

Prior audit rationale for C+: "1.7 GB dead directories, sportsbook leakage in
api-client, 33/34 pages `"use client"`."

- ✅ Tracked dead weight removed (`archive/`); residual legacy dirs flagged for owner retirement.
- ✅ api-client sportsbook leakage purged + office dead subgraph removed + **CI regression guard** added.
- ⛔ `33/34 pages "use client"` (RSC adoption) — untouched; a larger refactor (owner-gated, P2-08-core territory).

**Assessment: A−.** Two of the three C+ blockers are fully resolved and guarded
against regression; the boundary/dead-code story is now clean. Full **A** is held
back by the RSC-adoption item and the flagged legacy-dir retirement, both
owner-gated.
