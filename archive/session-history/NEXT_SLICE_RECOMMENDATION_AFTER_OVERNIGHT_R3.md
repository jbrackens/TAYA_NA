# Next Slice Recommendation After Overnight R3

**Date:** 2026-03-20

---

## M3 Closure Status

**SPORTSBOOK M3: CODE-COMPLETE / LIVE-VALIDATION-PENDING**

Live Playwright validation has not been completed. Talon backoffice `next build` fails with `ERR_OSSL_EVP_UNSUPPORTED` (Node v22.22.0 / OpenSSL 3.5.4 incompatible with Next.js bundled webpack's MD4 hashing), preventing browser-based admin surface validation. All code, tests, and security checks pass — provider-ops Jest tests pass (2 suites, 29 tests) when run with the office jest config. Multi-leg settle guard validated at both frontend and backend layers with test coverage. Formal closure requires resolving the Talon build runtime issue (`NODE_OPTIONS=--openssl-legacy-provider` or upgrade Next.js to 12.2+) and re-running live provider-ops smoke.

---

## Current M3 Truth

| Slice | Status | Evidence |
|-------|--------|----------|
| M3-S1: Market Suspend/Reopen | CLOSED | M40-M42, state machine + FOR UPDATE lock + Playwright |
| M3-S2: Market Single-Winner Settle | CLOSED | M43-M44, reason field + handler tests + Playwright |
| M3-S3: Fixture Lifecycle | DEFERRED | Page non-functional (route 404), not M3-blocking |
| M3-S4: Multi-Leg Settle Guard | CLOSED | M45, two-layer guard (frontend + backend), validated R3 |

## M3 Exit Gate Assessment

> "No exposed admin mutation remains in a state where transport exists but semantics are intentionally unsupported."

**Status: GATE MET for sportsbook betting/market surfaces.**

All mounted operator-facing mutation surfaces have been validated:
- Market suspend/reopen: truthful, state-machine enforced
- Market settle: truthful, single-winner only, decoupled from bet payouts
- Bet lifecycle (cancel/refund/settle): truthful, multi-leg settle rejected at both UI and backend
- Fixture lifecycle: NOT mounted (page 404), not blocking

**Remaining exposed false controls (non-blocking for M3):**
- Cashier review: 7 actions shown unconditionally — CRITICAL but in payment domain, not sportsbook M3 scope
- Prediction-ops: UI correctly gates but backend lacks state validation — MEDIUM, prediction domain

---

## Recommended Next Slices (Priority Order)

### 1. Cashier Review State-Aware Gating (CRITICAL)
- Surface: cashier-review.tsx
- Problem: All 7 payment actions (approve, decline, settle, refund, reverse, chargeback, retry) shown unconditionally
- Fix: Add transaction status to button enable/disable logic
- Scope: Frontend-only (phoenix-wallet backend may already validate at repository level)
- Estimated size: MEDIUM (need to map valid state transitions for each action)

### 2. Fixture Detail Path Restoration (MEDIUM)
- Root cause: frontend calls `admin/trading/fixtures/:id`, gateway has `admin/fixtures` only
- Phase 1: Fix useApi path → `admin/fixtures/:id` + response normalizer (SMALL)
- Phase 2: Markets loading via separate API call (MEDIUM)
- Phase 3: Re-enable lifecycle controls (freeze/unfreeze) once data loads
- Not M3-blocking but improves operator workflow

### 3. Prediction-Ops Backend State Validation (LOW)
- Add state transition matrix to `ExecuteLifecycle()` in phoenix-prediction
- Currently relies on UI-only gating
- Lower priority because UI is truthful

### 4. Multi-Leg Settlement Implementation (DEFERRED)
- Full leg-level result semantics design
- Wallet integration changes
- HIGH risk, not needed for M3 closure
- Only pursue after all earlier slices are exhausted

---

## M3 Closability

**M3 is CODE-COMPLETE / LIVE-VALIDATION-PENDING for sportsbook scope** based on code-level validation:
- All mounted admin mutations are backed by truthful backend handlers
- Multi-leg settle guard validated with two-layer protection (frontend + backend)
- Frontend tests added: 5 contract + 3 component, passing (2 suites, 29 tests green when run with office jest config)
- No exposed false controls on sportsbook surfaces
- Remaining false controls are in cashier (payment) and prediction domains

**BLOCKER for formal closure:** Talon backoffice `next build` fails with `ERR_OSSL_EVP_UNSUPPORTED` (Node v22.22.0 / OpenSSL 3.5.4 vs webpack MD4 hashing). This prevents all live browser validation of admin surfaces.

**Next actions (exact):**
1. Fix Talon build: `NODE_OPTIONS=--openssl-legacy-provider` before `next build`, or upgrade Next.js to 12.2+
2. Re-run live provider-ops/admin smoke via Playwright
3. Formally close M3 only after live validation passes

**Note:** Provider-ops Jest tests already pass (2 suites, 29 tests) — no Babel/TS config changes needed. The `i18n` alias is correctly configured in both `next.config.js` and `tsconfig.json`.
