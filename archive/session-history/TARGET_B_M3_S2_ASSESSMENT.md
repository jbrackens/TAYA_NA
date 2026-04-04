# Target B — M3-S2 Assessment: Mounted Market Settlement

Date: 2026-03-19
Owner: Claude CLI
Scope: Truth-check whether mounted market-settle can be implemented as a narrow M3 slice.

---

## 1. Executive Summary

**Decision: Proceed with M3-S2 as a narrow mounted market-settle slice.**

Market settlement in `phoenix-market-engine` is a **semantically real market-level action**, not transport-only. It determines the winning outcome, marks the market and outcomes as settled, emits audit + Kafka events, and returns a settlement batch ID. It does NOT trigger downstream bet payouts — that is a separate operator action via `phoenix-settlement`. This decoupling is by design.

Ungating the Talon settle control would give operators a truthful market-level action: "declare which outcome won this market." Bets remain pending until separately settled. This is a well-understood sportsbook workflow where market result determination precedes bet settlement.

The main implementation work is **route and field alignment** between Talon's `POST /admin/trading/markets/:id/lifecycle/settle` and Go's `POST /admin/markets/{id}/settle`, plus mapping `winningSelectionId` to `winning_outcome_id`.

---

## 2. Current Settlement Truth

### What Go `POST /admin/markets/{marketID}/settle` Does

1. Validates `winning_outcome_id` is provided
2. Opens a DB transaction:
   - Marks winning outcome `result = "win"`, all others `result = "lose"`
   - Sets all outcome statuses to `"settled"`
   - Sets market status to `"settled"`
3. Publishes `phoenix.market.settled` event to Kafka (consumed by `phoenix-realtime` for WebSocket broadcast)
4. Records `market.settled` audit log entry
5. Returns HTTP 202 with `{ market_id, status, winning_outcome_id, settlement_batch_id }`

### What It Does NOT Do

- Does NOT settle bets (bets remain `pending`)
- Does NOT trigger wallet payouts
- Does NOT call `phoenix-settlement` or `phoenix-betting-engine`
- Does NOT enforce "bets exist" preconditions

### Is This Truthful?

**Yes.** Market-level settlement is a distinct business action in sportsbook operations:
- It answers "which outcome won?"
- It enables the market to be closed to further wagering
- It is a prerequisite for bet settlement (which happens separately)
- The operator understands that settling a market is not the same as paying out bets

---

## 3. Mounted Talon Settle Surface Analysis

### Current Talon Component State

| Aspect | Status |
|--------|--------|
| Component exists | YES — `components/markets/lifecycle/settle/index.tsx` |
| Modal exists | YES — `MarketLifecycleSettleModal` with winning selection picker + reason field |
| Tests exist | YES — `settle/__tests__/lifecycle-settle.test.tsx` |
| Imported in market detail | NO — settle is still gated (line 105 comment) |
| Visibility logic | `canSettle`: lifecycle === `BETTABLE`; `canReSettle`: lifecycle === `SETTLED` or `RESETTLED` |

### Talon Request Shape

```
POST /admin/trading/markets/{id}/lifecycle/settle
Content-Type: application/json

{
  "winningSelectionId": "outcome-uuid",
  "winningSelectionIds": ["outcome-uuid"],
  "reason": "operator explanation"
}
```

### Go Request Shape

```
POST /admin/markets/{marketID}/settle
Content-Type: application/json

{
  "winning_outcome_id": "outcome-uuid"
}
```

### Alignment Gaps

| Gap | Type | Fix |
|-----|------|-----|
| URL: `admin/trading/markets/:id/lifecycle/settle` vs `admin/markets/:id/settle` | Route | Market-specific settle component with correct URL |
| Field: `winningSelectionId` vs `winning_outcome_id` | Name | Map in market-specific component or accept both in Go handler |
| Field: `winningSelectionIds` (array) vs `winning_outcome_id` (singular) | Shape | **RESOLVED (M43):** Frontend uses single-select outcome picker mapping `winningSelectionId` → `winning_outcome_id`; no array reduction needed |
| Field: `reason` present in Talon, not in Go `SettleMarketRequest` | Missing | Add `reason` to Go request struct (optional, for audit enrichment) |

---

## 4. Downstream Accounting/Audit Impact

### Market Settle → Bet Settle Coupling

**Completely decoupled by design:**

| Event | Producer | Consumer | Effect |
|-------|----------|----------|--------|
| `phoenix.market.settled` | market-engine | phoenix-realtime | WebSocket broadcast only |
| (manual operator call) | operator → settlement service | phoenix-settlement | Batch bet settlement + wallet payouts |
| `phoenix.bet.settled` | phoenix-settlement | wallet, analytics, retention | Actual payouts |

No service consumes `phoenix.market.settled` to trigger automatic bet settlement. The operator must separately call `phoenix-settlement` to settle bets.

### Accounting Impact of Market Settle Alone

**None.** No wallet balances change. No bets change status. The only changes are:
- Market status → `settled`
- Outcome results → `win`/`lose`
- Audit log entry created
- Kafka notification event published

### Risk Assessment

**Low.** Market settle is a state determination, not a financial mutation. The worst case of a premature settle is that a market is marked with the wrong winner. Note: resettle is not currently implemented — recovery from a wrong winner would require direct DB correction or a future resettle feature.

---

## 5. Decision: Proceed

**Proceed with M3-S2 as a narrow mounted market-settle slice.**

Justification:
1. Market settlement is semantically real (determines winner, marks outcomes)
2. It has no downstream accounting side effects (bets/wallet unaffected)
3. It is decoupled from bet settlement by design
4. The Talon component is already built and tested
5. The alignment work is small (route + field mapping)
6. It follows the M3-S1 pattern (market-specific component, avoid touching shared lifecycle code)
7. An operator settling a market is a truthful action — they're declaring the result, not triggering payouts

---

## 6. Recommended Next Slice: M3-S2 Market Settle

### Slice Header

- **Name:** M3-S2: Market Settle — Winning Outcome Determination
- **Classification:** blocks Target B only
- **Milestone:** 3
- **Owner services:** `phoenix-market-engine` (backend minor), Talon market detail (frontend)
- **User-visible surfaces:** Mounted market detail page (`/risk-management/markets/[id]`)

### Problem Statement

- **What is incomplete:** The market detail page has a fully built settle modal + component, but it's gated because the route pattern (`admin/trading/markets/:id/lifecycle/settle`) doesn't match Go's `POST /admin/markets/{id}/settle`, and the field names differ.
- **Why it matters:** Operators cannot determine market winners from Talon. They must use direct API calls.
- **Truthfulness:** This action IS truthful — it determines the winner without triggering payouts.

### Existing Behavior

- **Go route:** `POST /admin/markets/{marketID}/settle` — accepts `{ winning_outcome_id }`, returns 202
- **Go auth:** operator, admin only (not trader)
- **Side effects:** Kafka `phoenix.market.settled` + audit log
- **Talon:** Component exists but is not imported into the market detail container

### Desired Behavior

- **Frontend:** Market-specific settle component using `POST admin/markets/:id/settle` with `{ winning_outcome_id: selectedOutcomeId, reason: "..." }`
- **Backend (minor):** Add optional `reason` field to `SettleMarketRequest` so operator reason is captured in audit
- **Visibility:** Only for `BETTABLE` markets (matches `canSettle` logic), only for operator/admin roles
- **State machine:** Add `open` → `settled` and `suspended` → `settled` as valid transitions (market can be settled from either state)
- **Re-settle:** Defer to a later slice (requires additional design — changing the winning outcome after settlement)

### Execution Plan

**Backend:**
1. Add `Reason` field to `SettleMarketRequest` struct (optional, for audit enrichment)
2. Add `open` → `settled` and `suspended` → `settled` as valid transitions in `isValidTransition`
3. Use `FOR UPDATE` row lock in `SettleMarket` repository method (matching the pattern from M3-S1)
4. Include reason in audit log entry if provided

**Frontend:**
1. Create market-specific `MarketLifecycleSettle` component using `POST admin/markets/:id/settle`
2. Map `winningSelectionId` → `winning_outcome_id` in the request body
3. Reuse the existing `MarketLifecycleSettleModal` for the form UI
4. Import into market detail container, gated by `canMutateMarketStatus` (operator/admin only)
5. Only show for `BETTABLE` lifecycle state (not for already-settled or cancelled)

### Verification Plan

1. Backend: `go test -race ./...` in phoenix-market-engine — state machine + settle tests
2. Backend: gateway regression green
3. Frontend: TypeScript clean
4. Frontend: Jest suites green
5. Live: Playwright — settle an open market, verify status changes to SETTLED, verify button disappears
6. Network trace: verify `POST /admin/markets/{id}/settle` with correct body

### Re-Plan Triggers

- `SettleMarket` repo method already has an internal race window (no `FOR UPDATE`) — would need the same fix as M3-S1
- Talon modal has dependencies that prevent importing settle without also importing cancel or resettle
- The settle response shape from Go doesn't satisfy the Talon success handler expectations
- `canSettle` logic needs updating to work with Go lifecycle states instead of legacy lifecycle types

### Done Definition

- Operator can select a winning outcome and settle a market from Talon
- Settlement is atomic (locked read + transition validation + update)
- Audit log captures the winning outcome and operator reason
- Button only visible for bettable markets and operator/admin roles
- Settled markets show SETTLED status and no settle button
- Re-settle is explicitly NOT in scope (remains gated)

---

## 7. QA Gate

### Unit (MANDATORY)

| Check | Command | Pass | Failure |
|-------|---------|------|---------|
| market-engine | `cd phoenix-market-engine && go test -v -race ./...` | All tests green including settle + transition tests | Any test failure |
| gateway regression | `cd phoenix-gateway && go test -v -race ./...` | All green | Any failure |

### Integration (MANDATORY)

| Check | Command | Pass | Failure |
|-------|---------|------|---------|
| Talon TS | `tsc --noEmit --types jest,node` | 0 errors | TS errors |
| Talon Jest | `npx jest` (key suites) | Green | Failures |

### End-to-End (MANDATORY)

| Check | Method | Pass | Failure |
|-------|--------|------|---------|
| Playwright smoke | Login → market detail → settle modal → select winner → submit | Market status → SETTLED, button disappears | Status unchanged or error |
| Network trace | Verify `POST /admin/markets/{id}/settle` | Correct route, method, body | Wrong route |

### Performance (OPTIONAL)

| Check | Method | Pass | Failure |
|-------|--------|------|---------|
| Settle latency | `time curl POST .../settle` | < 500ms | > 2s |

Residual risk if skipped: Low — single tx with row lock.

### Security (MANDATORY)

| Check | Method | Pass | Failure |
|-------|--------|------|---------|
| Player rejected | Player JWT → settle | 403 | 200 |
| Trader hidden | Trader login → market detail | No settle button visible | Button visible |
| Double-settle blocked | Settle already-settled market | Error (terminal state) | Silent success |

---

## 8. Re-Plan Triggers

1. The Talon `MarketLifecycleSettleModal` has import dependencies that force importing cancel/resettle components too
2. The Go `SettleMarket` repo method has the same unlocked-read race that `UpdateStatus` had before M42
3. The Go settle endpoint returns 202 (async-style) but Talon expects 200 — response handling mismatch
4. The `winning_outcome_id` field doesn't match Talon's `winningSelectionId` and the mapping fails silently

---

## 9. Gotchas Logged in This Pass

**No new gotchas.** The existing gotchas were applied:
- Talon request shape verified from component code (route + field names identified)
- Field name mismatch (`winningSelectionId` vs `winning_outcome_id`) identified before implementation
- Route mismatch (`admin/trading/markets/:id/lifecycle/settle` vs `admin/markets/:id/settle`) identified before implementation

~~These will be addressed during M3-S2 implementation~~ — **DONE (M43-M44):** A market-specific `GoMarketSettle` component handles the mapping, following the M3-S1 pattern. Single-select outcome picker maps `winningSelectionId` → `winning_outcome_id`. Reason field added. Live Playwright evidence captured.
