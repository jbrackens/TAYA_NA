# Target B — Milestone 3 Kickoff

Date: 2026-03-19
Owner: Claude CLI
Scope: Post-M2 re-plan, M3 backlog refresh, and first slice selection.

---

## 1. Executive Summary

Milestone 2 is closed (live Playwright evidence from Wave M39). This document refreshes the M3 backlog from current code and recommends the first implementation slice.

**Key finding:** The best first M3 slice is **market status lifecycle alignment** — making the Go market status mutation truthfully support suspend/reopen transitions that the mounted (but currently read-only) market detail page needs. This is the smallest operator-visible semantic slice with the lowest accounting blast radius.

**Why not multi-leg settlement first:** Multi-leg settlement requires leg-level result semantics design, wallet integration changes, and API contract extension. It is a larger, higher-risk slice. The market status lifecycle is a prerequisite anyway — operators need to suspend markets before settling them.

---

## 2. Updated Milestone Truth

| Milestone | Status | Evidence |
|-----------|--------|---------|
| Milestone 1 | **COMPLETE** | 34/34 demo smoke on 2026-03-17 |
| Milestone 2 | **COMPLETE** | Live Playwright smoke on 2026-03-19 (M39) |
| Milestone 3 | **INCOMPLETE** | This document defines the work |
| Milestone 4 | **INTENTIONALLY INCOMPLETE** | Deferred until M3 closes |

### Applicable Gotchas

1. "Never call a mounted surface 'one-field away' without verifying BOTH request contract AND response consumption shape against the live frontend code."
2. "Always verify actual network request shapes via browser trace, not by reading code and guessing serialization output."

**Application to M3:** Before implementing any M3 slice, verify the actual Talon API call shape via code AND browser trace. Do not assume route patterns from docs.

---

## 3. M3 Backlog Table

| # | Item | Gap Type | Mounted? | Services | Size | Validation Cost | Good First Slice? |
|---|------|----------|----------|----------|------|-----------------|-------------------|
| 1 | ~~Market status lifecycle (suspend/reopen)~~ | **DONE** (M40) | YES | phoenix-market-engine + Talon | **Small** | Low | **DELIVERED** — state machine + market-specific suspend component + live Playwright evidence |
| 2 | ~~Market settle with state validation~~ | **DONE** (M43) | YES | phoenix-market-engine + Talon | **Medium** | Medium | **DELIVERED** — atomic single-winner settle, FOR UPDATE lock, state validation, single-select UI, live Playwright evidence |
| 3 | Multi-leg/parlay bet settlement | Semantics + accounting | Not directly mounted | phoenix-betting-engine, phoenix-wallet | Medium-Large | High | No — highest risk |
| 4 | Fixture detail: embed markets | Transport + UI exposure | YES (no drill-down) | phoenix-events, phoenix-market-engine | Medium | Medium | No — cross-service |
| 5 | Fixture lifecycle: freeze/unfreeze | Semantics + UI exposure | YES (wired) | phoenix-events | Small | Low | Maybe — but less operator value than #1 |
| 6 | Market categories admin | Transport | NO (gated) | phoenix-market-engine | Medium | Low | No — not mounted |
| 7 | Fixed exotics admin | Transport | NO (gated) | phoenix-market-engine | Medium | Low | No — not mounted |
| 8 | Market/fixture history drawers | Transport | NO (gated) | phoenix-audit | Small | Low | No — not mounted |
| 9 | Tournaments detail/edit | Transport | NO (gated) | phoenix-events | Small | Low | No — not mounted |
| 10 | Session-limit writes | Semantics | NO (UI commented out) | phoenix-compliance | Small | Low | No — not mounted |

### M3 Exit Rule Reminder

> "No exposed admin mutation remains in a state where transport exists but semantics are intentionally unsupported."

Items #6-#10 are not mounted, so they don't block the M3 exit gate. The M3 gate is about **exposed** mutations, not dormant code.

---

## 4. Candidate-Slice Comparison

### Candidate A: Market Status Lifecycle Alignment

**What:** Make Go's `PUT /admin/markets/{id}/status` support `suspended` ↔ `open` transitions with state validation, then ungated the mounted market detail lifecycle controls for suspend/reopen only (not settle/cancel yet).

**Why smallest:**
- Single service (`phoenix-market-engine`)
- No wallet/accounting changes
- No cross-service calls
- Status update handler already exists with Kafka + audit events
- Market detail page is already mounted and reachable
- Talon already has the suspend/reopen component code built (just commented out)

**Why first:**
- Operators need suspend/reopen before any settlement work
- Lowest blast radius of any M3 candidate
- Establishes the lifecycle state machine pattern for later settle/cancel work

**Risk:** Talon expects `POST /admin/trading/markets/:id/lifecycle/freeze` but Go uses `PUT /admin/markets/{id}/status`. Either Go adds a lifecycle action route, or Talon's market detail container is updated to call the Go route directly. The M2 users-list gotcha says: verify the actual Talon request shape before implementing.

### Candidate B: Multi-Leg Settlement

**What:** Remove the `len(bet.Legs) > 0` guard in phoenix-betting-engine and implement parlay settlement semantics.

**Why not first:**
- Requires leg-level result semantics design (all-or-nothing? per-leg?)
- Wallet integration changes needed for compound payout calculation
- Higher accounting risk
- API contract extension needed
- Not directly operator-visible in the mounted UI (no bet-settle button on Talon)

### Candidate C: Fixture Detail Embedding

**What:** Add cross-service call from phoenix-events to phoenix-market-engine to embed markets in fixture detail response.

**Why not first:**
- Cross-service HTTP dependency
- Requires new config injection, HTTP client, timeout handling
- Fixture detail drill-down is disabled in the list — lower operator visibility
- Does not close any M3 semantic gap (it's a transport/UI gap)

---

## 5. ~~Recommended First M3 Slice~~ — DELIVERED

~~Market Status Lifecycle — Suspend/Reopen~~ — **DONE** (M3-S1, Waves M40-M42)

Market Single-Winner Settle — **DONE** (M3-S2, Waves M43-M44)

~~**Next recommended slice:** Fixture Lifecycle — Freeze/Unfreeze~~ — **SUPERSEDED**: Fixture lifecycle deferred (page non-functional, see `TARGET_B_M3_S3_FIXTURE_LIFECYCLE_ASSESSMENT.md`). M3 exit gate blocker was multi-leg settle exposure — **CLOSED** via M45 multi-leg settle UI guard + backend rejection. See `TARGET_B_M3_S4_MULTILEG_SETTLE_GUARD_VALIDATION.md`.

---

## 6. Full Slice Spec

### Slice Header

- **Name:** M3-S1: Market Status Lifecycle — Suspend/Reopen
- **Classification:** blocks Target B only
- **Milestone:** 3
- **Owner services:** `phoenix-market-engine` (backend), Talon market detail (frontend)
- **User-visible surfaces affected:** Mounted market detail page (`/risk-management/markets/[id]`)

### Problem Statement

- **What is incomplete:** The market detail page is mounted and reachable (via markets list drill-down), but lifecycle action controls (suspend/reopen) are commented out because Go uses `PUT /admin/markets/{id}/status` while Talon's built components expect `POST /admin/trading/markets/:id/lifecycle/freeze|unfreeze`.
- **Why it matters for M3:** The M3 exit gate requires no exposed admin mutation to remain with transport but no semantics. The market status update route exists and works (`open`, `suspended`, `closed`, `voided` are allowed values), but the mounted page can't call it because of the route/method mismatch. Once aligned, operators can suspend/reopen markets from Talon.
- **Truthfulness gap:** The market status mutation has no state machine — you can suspend a closed market or reopen a voided one. Adding basic transition validation is part of making the semantics truthful.

### Existing Behavior

- **Go route:** `PUT /admin/markets/{marketID}/status` → accepts `{ status: "suspended", reason: "..." }`
- **Allowed values:** `open`, `suspended`, `closed`, `voided`
- **Side effects:** Kafka event `phoenix.market.status-changed` + audit log row
- **No state machine:** Any transition is allowed
- **Talon expects:** `POST /admin/trading/markets/:id/lifecycle/freeze` with `{}` body for suspend, `POST .../lifecycle/unfreeze` with `{}` body for reopen
- **Talon market detail:** Lifecycle components fully built but commented out at line 73 of `containers/markets/details/index.tsx`
- **Current test coverage:** `phoenix-market-engine` has service tests for status update and settlement

### Desired Behavior

**Backend (phoenix-market-engine):**
1. Add state machine validation: only allow transitions that make business sense
   - `open` → `suspended` (allowed)
   - `suspended` → `open` (allowed)
   - `open` → `closed` (allowed)
   - `suspended` → `closed` (allowed)
   - Any → `voided` (allowed)
   - `closed` → anything (blocked)
   - `voided` → anything (blocked)
   - `settled` → anything (blocked)
2. The existing `PUT /admin/markets/{id}/status` route handles this — no new routes needed
3. Return clear error messages for invalid transitions

**Frontend (Talon market detail):**
1. Update the market detail container to call `PUT /admin/markets/:id/status` with `{ status: "suspended" }` for suspend and `{ status: "open" }` for reopen
2. Ungated only the suspend/reopen controls (NOT settle/cancel yet — those are separate M3 slices)
3. Map Go status responses back through the existing `mapGoStatusToLifecycle` normalizer

### Execution Plan

**Backend:**
1. Add `isValidTransition(from, to string) bool` function in `phoenix-market-engine/internal/service/service.go`
2. Call it from `UpdateStatus` before the DB write
3. Return `ErrInvalidInput` with descriptive message for invalid transitions
4. Add unit tests for valid and invalid transitions

**Frontend (Talon):**
1. In `containers/markets/details/index.tsx`: ungated the `MarketLifecycleSuspend` component (suspend/reopen only)
2. Replace its `useApi` call from `POST admin/trading/markets/:id/lifecycle/freeze|unfreeze` to `PUT admin/markets/:id/status` with `{ status: "suspended" }` or `{ status: "open" }`
3. Verify the response normalizer handles the Go response shape

### Verification Plan

1. `go test -race ./...` in `phoenix-market-engine` — state machine tests green
2. `go test -race ./...` in `phoenix-gateway` — no regressions
3. Talon TypeScript check passes
4. Focused Talon market detail test (if one exists) or manual Playwright smoke
5. Live smoke: navigate to market detail → click suspend → verify market status changes → click reopen → verify

### Re-Plan Triggers

- The Talon suspend/reopen component makes additional API calls beyond the lifecycle action (e.g., fetches odds after suspend)
- The market status normalizer in `marketsDetailsSlice.ts` doesn't handle the Go response from the `PUT` route
- The Go status update response shape doesn't match what Talon's `useApi` success handler expects
- The suspend/reopen actually requires settle/cancel to also be unblocked (component dependency)

### Done Definition

- Go market status update enforces a truthful state machine
- Invalid transitions return clear errors
- Talon market detail page shows working suspend/reopen buttons
- Operators can suspend and reopen a market from the mounted page
- Unit tests cover valid transitions, invalid transitions, and edge cases
- No settle/cancel scope creep — those remain gated for a later slice

---

## 7. QA Gate for M3-S1

### Unit (MANDATORY)

| Check | Command | Pass Criteria | Failure |
|-------|---------|--------------|---------|
| market-engine tests | `cd phoenix-market-engine && go test -v -race ./...` | All tests green including new state machine tests | Any test failure |
| gateway regression | `cd phoenix-gateway && go test -v -race ./...` | All tests green | Any failure |

### Integration (MANDATORY)

| Check | Command | Pass Criteria | Failure |
|-------|---------|--------------|---------|
| Talon TS check | `tsc -p packages/office/tsconfig.json --noEmit --types jest,node` | 0 errors | TS errors in market detail |
| Talon Jest | `npx jest --config packages/office/jest.config.js` (key suites) | Relevant suites green | Test failures |

### End-to-End (MANDATORY)

| Check | Method | Pass Criteria | Failure |
|-------|--------|--------------|---------|
| Live Playwright smoke | Navigate to market detail → suspend → verify status → reopen → verify | Status toggles correctly, page updates | Status doesn't change or UI errors |
| Network trace | Verify actual request matches expected route/params | `PUT /admin/markets/{id}/status` with correct body | Wrong route or method |

### Performance (OPTIONAL)

| Check | Method | Pass Criteria | Failure |
|-------|--------|--------------|---------|
| Status update latency | `time curl PUT .../admin/markets/{id}/status` | < 200ms | > 500ms |

**Residual risk if skipped:** Low — single DB update with index lookup.

### Security (MANDATORY)

| Check | Method | Pass Criteria | Failure |
|-------|--------|--------------|---------|
| Role enforcement | Player JWT → `PUT /admin/markets/{id}/status` | 403 | 200 |
| State machine | Attempt `closed` → `open` | Error response | Silent success |

---

## 8. Re-Plan Triggers

1. The Talon `MarketLifecycleSuspend` component has dependencies on `MarketLifecycleSettle` or `MarketLifecycleCancel` that prevent ungating suspend alone
2. The Go `PUT` response shape is incompatible with Talon's `useApi` success callback pattern
3. The market detail page layout breaks when only suspend/reopen is ungated but settle/cancel remain hidden
4. Live Playwright trace reveals additional request patterns not accounted for

---

## 9. Mistakes/Gotchas Logged in This Pass

**No new gotchas.** The re-plan was clean. Both existing gotchas were reviewed and applied:
- Request/response contract verification required before implementation
- Browser trace required before assuming serialization output

~~These rules will be applied during M3-S1 implementation~~ — **APPLIED (M40-M42):** Talon component ungating verified via live Playwright browser trace. Suspend/reopen confirmed on BETTABLE↔NOT_BETTABLE transitions. Settled markets correctly hide button.
