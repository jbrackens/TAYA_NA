# Phoenix Go Rebuild — Implementation Plan

Last updated: 2026-04-02
Reviewed by: gstack /plan-eng-review

## Mission

Complete the Go sportsbook rebuild to investor-demo readiness. All 17 Go services are implemented (M1-M2 complete). This plan closes M3, fixes the remaining false controls, and delivers a rehearsed investor demo.

## Phasing

### Phase A — Demo-Unblocked (Critical Path)

These three items must land in order. Nothing else matters until the demo runs end-to-end.

#### A1. Fix Talon Build (Unblocks everything)

**Problem:** `next build` fails with `ERR_OSSL_EVP_UNSUPPORTED` — Node 20/OpenSSL 3.5 incompatibility with Next.js 11's webpack 4 MD4 hashing.

**Approach:** Upgrade Next.js 11.1.3 → 13+ with React 17 → 18.

**Scope:**
- `packages/office` (Next.js 11.1.3, React 17.0.2) — primary Talon backoffice
- `packages/app` (Next.js 11.1.3, React 17.0.2) — secondary Talon app
- Lerna monorepo root coordination

**Key migration steps:**
1. Update `next` and `react`/`react-dom` in both packages
2. Replace `next/image` legacy imports → new `next/image` (or `next/legacy/image` for compat)
3. Replace `<a>` wrapping `<Link>` → bare `<Link>` (Next.js 13 auto-wraps)
4. Audit `_app.tsx` / `_document.tsx` for breaking changes
5. Remove any `NODE_OPTIONS=--openssl-legacy-provider` workarounds
6. Verify `next build` succeeds for both packages
7. Smoke test all mounted Talon surfaces against Go backend

**Fallback:** If upgrade takes >2 hours, apply `NODE_OPTIONS=--openssl-legacy-provider` to unblock demo validation, then continue upgrade in parallel branch.

**Estimated effort:** human 2-3 days / CC ~45 min

#### A2. M3 Playwright Live Validation

**Problem:** M3 (semantic parity for admin mutations) is code-complete but never validated in a real browser against the Go backend.

**Depends on:** A1 (Talon must build)

**Scope:** Write and run Playwright tests for:
- Market suspend / reopen
- Market settle (single-leg)
- Bet cancel / refund
- Multi-leg settle guard (two-layer: frontend blocks + backend rejects)

**Estimated effort:** human 1 day / CC ~20 min

#### A3. Demo Rehearsal

**Problem:** No end-to-end golden path has been rehearsed with all services running.

**Depends on:** A2

**Scope:**
1. Start full docker-compose (all 17 Go services + infra)
2. Run player frontend registration → deposit → bet placement → settlement flow
3. Run Talon backoffice user lookup → cashier review → market management flow
4. Record evidence screenshots for each step
5. Document any gaps found during rehearsal

**Estimated effort:** human 4 hours / CC ~30 min

---

### Phase B — Demo-Polished (Quality & Completeness)

These items improve demo quality and close known gaps. They can land in any order after Phase A.

#### B1. Cashier State-Aware Gating (CRITICAL false control)

**Problem:** 7 payment actions (approve, decline, settle, refund, reverse, chargeback, retry) render unconditionally in `cashier-review.tsx` regardless of transaction status. An investor clicking the wrong button would see it "work" when it shouldn't.

**Approach:** Two-layer defense (frontend + backend), matching the multi-leg settle guard pattern.

**Frontend fix** (`talon-backoffice/packages/office/containers/provider-ops/cashier-review.tsx`):
- Add status-to-allowed-actions mapping
- Gate each button's `disabled` prop on `!allowedActions.includes(action)`
- Show tooltip explaining why disabled

**Backend fix** (`phoenix-wallet/internal/repository/repository.go`, function `applyAdminPaymentAction()`):
- Add status validation before executing settle/refund/reverse/chargeback/retry
- Return 409 Conflict with clear error message for invalid transitions
- Mirror the validation matrix from `isAdminReviewableProviderStatus()`

**Test coverage (12 tests):**
- 7 frontend tests: one per action verifying disabled state for wrong status
- 3 backend tests: valid transition, invalid transition (409), edge case (already settled)
- 2 integration tests: frontend calls backend with invalid status, verify error displayed

**Status transition matrix:**

| Action | Valid From Statuses |
|--------|-------------------|
| approve | PENDING_APPROVAL, PENDING_REVIEW |
| decline | PENDING_APPROVAL, PENDING_REVIEW |
| settle | APPROVED, PENDING_SETTLEMENT |
| refund | SETTLED, COMPLETED |
| reverse | SETTLED, COMPLETED |
| chargeback | SETTLED, COMPLETED, CHARGEBACK_REVIEW |
| retry | FAILED, RETRYING, ACTION_REQUIRED |

**Estimated effort:** human 2 days / CC ~30 min

#### B2. Fixture Detail Path Restoration

**Problem:** Fixture detail page 404s because frontend calls `admin/trading/fixtures/:id` but gateway routes to `admin/fixtures`.

**Fix (3 changes):**
1. **Gateway route alias** (`phoenix-gateway/internal/repository/route_repository.go`): Add 1 line mapping `/admin/trading/fixtures` → phoenix-events
2. **Response normalizer** (phoenix-events): Ensure response shape includes `markets`, `score`, `scoreHistory`, `status` fields the frontend expects
3. **Frontend verification**: Confirm fixture detail page loads after route fix

**Estimated effort:** human 2 hours / CC ~10 min

#### B3. Documentation Cleanup

**Problem:** ~9 docs still reference phoenix-prediction as active.

**Approach:** Annotate in-place with `[ARCHIVED — prediction market shelved for v2]` tags. Don't rewrite docs, just mark stale sections.

**Files to annotate:**
- `IMPLEMENTATION_STATUS.md` — phoenix-prediction entries
- `INVESTOR_DEMO_READINESS_BOARD.md` — any prediction references
- `SERVICE_CONTRACTS.md` — prediction API contracts
- `KAFKA_TOPIC_REGISTRY.md` — prediction topics
- Any other docs surfaced during review

**Estimated effort:** human 1 hour / CC ~10 min

#### B4. Wave 4/5 Completion

**Scope:**
- **Wave 4 (Realtime):** End-to-end WebSocket validation — connect player frontend, subscribe to market updates, verify push arrives when market state changes via Talon
- **Wave 5 (Demo Simulation):** Full player + Talon rehearsal with payment/verification provider simulators, golden rehearsal pack with evidence artifacts

**Estimated effort:** human 3 days / CC ~1 hour

---

## NOT In Scope

These are explicitly deferred and should not be worked on:

| Item | Why Deferred |
|------|-------------|
| Prediction market / PredictTerminal | Shelved for v2 — all materials archived |
| M4 production hardening | Post-demo work (scale testing, monitoring, alerting) |
| Kubernetes deployment | Demo runs on docker-compose; K8s is production infra |
| CI/CD pipeline | No automated pipeline needed for investor demo |
| Folder rename to PredictTerminal | Decision paused by user |
| Full Talon route-by-route migration | Only fixture detail path is blocking; rest is Wave 2 follow-up |
| Performance optimizations (bet leg N+1, health check caching, missing indexes) | Noted in review; land in M4 |

## What Already Exists (Don't Rebuild)

| Asset | Location | Status |
|-------|----------|--------|
| 17 Go microservices | `services/codex-prep/` | All implemented, tests green |
| Docker Compose (demo) | `services/codex-prep/docker-compose.demo.yml` | Working |
| Docker Compose (infra) | `services/codex-prep/docker-compose.yml` | PostgreSQL, Kafka, Redis |
| Player frontend | `apps/.../phoenix-frontend-brand-viegg/` | Migrated to Go API, tests green |
| Talon backoffice | `apps/.../talon-backoffice/` | Partially migrated, build blocked |
| Multi-leg settle guard | phoenix-betting-engine + Talon frontend | Two-layer defense validated |
| 34/34 demo smoke checks | Various | All Go routes exist |
| Jest test suites | Talon + Player packages | 22/24 Talon, all Player green |
| Go test suites | gateway, market-engine, betting-engine | All green with -race |
| Payment/verification simulators | `services/codex-prep/` | Exist with live artifacts |
| Kafka topic registry | 21 topics defined | Documented in KAFKA_TOPIC_REGISTRY.md |
| Service contracts | REST + Kafka APIs | Documented in SERVICE_CONTRACTS.md |

## Known Performance Issues (Defer to M4)

| Severity | Component | Issue |
|----------|-----------|-------|
| HIGH | phoenix-betting-engine | N+1 INSERT for bet legs (O(n) round-trips per parlay) |
| MEDIUM | phoenix-gateway | Health checks hit all downstream services (cascading failure risk) |
| MEDIUM | phoenix-wallet | Missing index on payment_transaction_events(transaction_id) |
| MEDIUM | phoenix-betting-engine | Missing composite index on bets(user_id, status) |
| LOW | phoenix-betting-engine | Extra reservation query on every bet load |
| LOW | phoenix-wallet | Missing index on wallet_transactions(user_id, created_at) |

All transaction isolation is properly implemented (FOR UPDATE row locks everywhere).

## Failure Modes

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Next.js 13 upgrade breaks Talon pages | MEDIUM | HIGH | Fallback to --openssl-legacy-provider; test every mounted surface |
| React 18 concurrent mode breaks existing components | LOW | MEDIUM | Use `createRoot` but avoid Suspense/concurrent features initially |
| Playwright tests reveal Go backend bugs | MEDIUM | MEDIUM | Fix-forward; most paths tested via Jest already |
| Docker Compose won't start all 17 services | LOW | HIGH | Services tested individually; compose.demo.yml is proven |
| Demo rehearsal reveals missing data/seeding | HIGH | LOW | Write seed scripts during rehearsal |
| WebSocket E2E fails (Wave 4) | MEDIUM | LOW | Not critical for demo golden path |

## Test Coverage Summary

**Currently tested (green):**
- Go: phoenix-gateway (4 packages), phoenix-market-engine, phoenix-betting-engine — all with `-race`
- Jest/Talon: 22/24 suites pass (131/132 tests), TSC clean
- Jest/Player: transaction-history, win/loss, session-timer, deposit-threshold — all green

**Tests to add in this plan:**
- 12 cashier state-gating tests (7 frontend + 3 backend + 2 integration)
- M3 Playwright tests (4 admin mutation flows)
- Wave 4 WebSocket E2E tests

**Coverage gaps (known, deferred):**
- 25 untested paths identified in test review (see Section 3 of eng review)
- 9 E2E scenarios needed for full coverage
- Bet leg batch INSERT not tested for correctness after refactor (M4)

## Estimated Total Effort

| Phase | Human Team | CC + gstack |
|-------|-----------|-------------|
| Phase A (Demo-Unblocked) | 4-5 days | ~1.5 hours |
| Phase B (Demo-Polished) | 5-6 days | ~2 hours |
| **Total** | **~2 weeks** | **~3.5 hours** |

## Recommended Execution Order

```
A1 (Talon build fix)
  → A2 (M3 Playwright validation)
    → A3 (Demo rehearsal)
      → B1 (Cashier gating) ─┐
      → B2 (Fixture path)  ──┤── parallel
      → B3 (Doc cleanup)   ──┘
        → B4 (Wave 4/5 completion)
          → DEMO READY
```

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | COMPLETE | 6 performance issues (none blocking), 12-test cashier coverage plan, Next.js 13+ upgrade with fallback strategy, critical path identified (A1→A2→A3) |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |

**VERDICT:** Eng review complete. Plan is bounded, sequenced, and has fallbacks. Run `/autoplan` for full review pipeline, or proceed to implementation.
