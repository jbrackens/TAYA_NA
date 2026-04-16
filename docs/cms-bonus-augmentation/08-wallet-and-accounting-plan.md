# 08 — Wallet and Accounting Plan: Domain Extensions

**Date:** 2026-04-16

**Key principle:** This is an EXTENSION of existing wallet code, not a rebuild. The wallet already has `bonus_balance_cents`, `BalanceWithBreakdown()`, `CreditBonus()`, fund-type ledger tracking, reservations, reconciliation, and correction tasks.

---

## Existing Wallet Capabilities (No Changes Needed)

| Capability | Method/Struct | File:Line |
|---|---|---|
| Real + bonus balance columns | `wallet_balances` table | `service.go:1372-1377` |
| Balance breakdown query | `BalanceWithBreakdown()` | `service.go:288-310` |
| Credit bonus funds | `CreditBonus()` | `service.go:313-319` |
| Bonus ledger entries | `applyBonusMutationDB()` with `fund_type='bonus'` | `service.go:321-395` |
| Fund reservations | `Hold()`, `Capture()`, `Release()` | `service.go:455-646` |
| Stale reservation expiry | `ExpireStaleReservations()` | `service.go:650-666` |
| Idempotency (24h TTL) | `evictStaleIdempotencyKeys()` | `service.go:225-244` |
| Reconciliation summary | `ReconciliationSummary()` | `service.go:693-736` |
| Correction tasks | `ScanCorrectionTasks()`, `CreateManualCorrectionTask()`, `ResolveCorrectionTask()` | `service.go:738-855` |
| Transaction history | `Ledger()`, `ledgerFromDB()` | `service.go:668-691` |
| Metrics | `MetricsSnapshot()` | `service.go:398-424` |

---

## New Methods to Add

### `DebitBonus(request MutationRequest) (LedgerEntry, error)`

Symmetric to `CreditBonus()`. Deducts from `bonus_balance_cents`.

```
Behavior:
  1. Validate request (userID, amount > 0, idempotency key)
  2. BEGIN SERIALIZABLE TX
  3. Idempotency check (kind = "debit:bonus")
  4. SELECT bonus_balance_cents FOR UPDATE
  5. If bonus_balance_cents < amount → ErrInsufficientBonusFunds
  6. UPDATE bonus_balance_cents -= amount
  7. INSERT wallet_ledger with fund_type='bonus', entry_type='debit'
  8. COMMIT
```

Used by: bonus forfeiture, bonus expiry, bet placement (when drawdown uses bonus).

### `DrawdownDebit(request DrawdownRequest) (DrawdownResult, error)`

Debits from the correct balance based on drawdown order rules.

```go
type DrawdownRequest struct {
    UserID           string
    AmountCents      int64
    DrawdownOrder    string // "real_first" (default) or "bonus_first"
    IdempotencyKey   string
    Reason           string
    BonusID          int64  // optional: if set, tracks wagering contribution
}

type DrawdownResult struct {
    RealDebitCents  int64
    BonusDebitCents int64
    TotalDebitCents int64
    LedgerEntries   []LedgerEntry // one per balance type debited
}
```

```
Drawdown logic (real_first — default, recommended for regulatory compliance):
  1. BEGIN SERIALIZABLE TX
  2. SELECT balance_cents, bonus_balance_cents FOR UPDATE
  3. available_real = balance_cents
  4. available_bonus = bonus_balance_cents
  5. If available_real >= amount:
       debit entirely from real → one ledger entry (fund_type='real')
  6. Else if available_real + available_bonus >= amount:
       debit all real first → ledger entry (fund_type='real')
       remainder from bonus → ledger entry (fund_type='bonus')
  7. Else: ErrInsufficientFunds
  8. COMMIT
  9. Return DrawdownResult with split amounts
```

**Why real-first?** Regulatory best practice — real money should be used before restricted bonus funds. Bonus funds often have wagering requirements and withdrawal restrictions. Using real money first means the player's unrestricted funds are depleted before touching restricted bonus funds.

### `ConvertBonusToReal(userID string, bonusID int64, amountCents int64) (LedgerEntry, error)`

Called when wagering requirements are met. Moves funds from bonus to real balance.

```
Behavior:
  1. BEGIN SERIALIZABLE TX
  2. Verify bonus_balance_cents >= amount
  3. DebitBonus(amount) → ledger entry "bonus conversion debit"
  4. Credit(amount) → ledger entry "bonus conversion credit"
  5. COMMIT
  6. Return credit ledger entry
```

### `ForfeitBonus(userID string, bonusID int64, reason string) (LedgerEntry, error)`

Called on expiry or admin forfeiture. Zeroes the bonus-attributable amount.

```
Behavior:
  1. Look up player_bonus record to get remaining_amount_cents
  2. If remaining_amount_cents > bonus_balance_cents, cap at bonus_balance_cents
  3. DebitBonus(forfeit_amount) → ledger entry "bonus forfeited: {reason}"
  4. Update player_bonus status → forfeited/expired
```

### `RecordWageringContribution(contribution WageringContributionRecord) error`

Tracks bet settlements toward bonus wagering completion.

```go
type WageringContributionRecord struct {
    PlayerBonusID int64
    BetID         string
    BetType       string  // single, parlay
    StakeCents    int64
    OddsDecimal   float64
    LegCount      int
}
```

```
Behavior:
  1. Calculate contribution_cents based on rules:
     - If odds < min_qualifying_odds → contribution = 0
     - If parlay: contribution = stake × parlay_multiplier (e.g., 1.5x)
     - If single: contribution = stake × 1.0
  2. INSERT wagering_contributions (idempotent by player_bonus_id + bet_id)
  3. UPDATE player_bonuses SET wagering_completed_cents += contribution_cents
  4. If wagering_completed_cents >= wagering_required_cents:
       → ConvertBonusToReal(remaining bonus amount)
       → Update player_bonus status = 'completed'
```

---

## Impact Matrix

### Deposits

```
Current: wallet.Credit(deposit_amount) → real balance
Target:  wallet.Credit(deposit_amount) → real balance (NO CHANGE)
         THEN: bonus/service checks for active deposit-match campaigns
         IF eligible: wallet.CreditBonus(match_amount)
                      bonus/service creates PlayerBonus record
```

**No change to deposit flow.** Bonus grant is a separate step triggered by campaign rules.

### Withdrawals

```
Current: wallet.Debit(withdraw_amount) from balance_cents
Target:  wallet.Debit(withdraw_amount) from balance_cents (NO CHANGE)
         PLUS: withdrawal blocked if bonus_balance_cents > 0 and active bonuses
               have "no withdrawal during bonus" rule
         OR: withdrawal forfeits all active bonuses (configurable per campaign)
```

**Withdrawal restriction rule** (configurable per campaign in `campaign_rules.rule_config`):
- `"withdrawal_policy": "block"` — block withdrawal while bonus is active
- `"withdrawal_policy": "forfeit"` — allow withdrawal but forfeit all active bonuses
- `"withdrawal_policy": "allow"` — no restriction (rare, for loyalty bonuses)

### Bet Placement

```
Current: wallet.Debit(stake) from balance_cents
Target:  wallet.DrawdownDebit(stake, drawdown_order) → splits across real + bonus
         Bet record stores bonus_funded_cents for settlement handling
```

### Settlement (Win)

```
Current: wallet.Credit(winnings) to balance_cents
Target:  wallet.Credit(winnings) to balance_cents (always to real)
         THEN: wallet.RecordWageringContribution(settled bet details)
         IF wagering complete: wallet.ConvertBonusToReal()
```

**Winnings always go to real balance** — this is standard regulatory practice. The bonus contribution is tracked separately via wagering contributions.

### Settlement (Lose)

```
Current: Captured from reservation (already debited)
Target:  No change (already debited via DrawdownDebit during placement)
         THEN: wallet.RecordWageringContribution(settled bet details)
```

Losing bets still contribute to wagering (industry standard — the requirement is turnover, not profit).

### Cashout

```
Current: wallet.Credit(cashout_amount) to balance_cents
Target:  wallet.Credit(cashout_amount) to balance_cents (always to real)
         Wagering contribution: partial — only the original stake counts, not cashout amount
```

### Cancellation / Void

```
Current: wallet.Release(reservation) or wallet.Credit(refund)
Target:  Same, plus: if bet was bonus-funded, DrawdownResult is reversed:
         - Credit back real portion to balance_cents
         - Credit back bonus portion to bonus_balance_cents
         - Remove wagering contribution entry for this bet (if settled)
```

### Resettlement

```
Target:  Reverse original settlement (void the credit)
         Re-settle with new outcome
         Recalculate wagering contribution
         Re-check if bonus completion threshold crossed
```

---

## Ledger Entry Types After Extension

| fund_type | entry_type | Meaning |
|---|---|---|
| `real` | `credit` | Deposit, bet win, cashout, refund, bonus conversion credit |
| `real` | `debit` | Bet stake (real portion), withdrawal, reservation capture |
| `bonus` | `credit` | Bonus grant (deposit match, manual grant, campaign reward) |
| `bonus` | `debit` | Bet stake (bonus portion), forfeiture, expiry, bonus conversion debit |

---

## Migration Strategy

**No breaking changes.** All new methods use existing tables:

| Change | Type | Risk |
|---|---|---|
| New Go methods on `wallet.Service` | Code only | Zero — additive methods |
| `wallet_ledger.fund_type` already has `'bonus'` entries | Already exists | Zero |
| `wallet_balances.bonus_balance_cents` already exists | Already exists | Zero |
| New `player_bonuses` table | Migration 012 | Zero — new table |
| New `wagering_contributions` table | Migration 012 | Zero — new table |

Existing wallet code continues to work unchanged. `Credit()`, `Debit()`, `Balance()` all operate on `balance_cents` (real money) only. The new `CreditBonus()`, `DebitBonus()`, `DrawdownDebit()` methods are additive.

---

## Reconciliation Extension

Extend existing `collectCorrectionIssues()` to also detect:

1. **Bonus balance drift:** `bonus_balance_cents` doesn't match sum of bonus ledger entries
2. **Orphaned bonuses:** `player_bonuses` with status='active' but `bonus_balance_cents=0`
3. **Negative bonus balance:** `bonus_balance_cents < 0` (should never happen)
4. **Wagering overshoot:** `wagering_completed_cents > wagering_required_cents` (data integrity)

---

## File Path References

1. `services/gateway/internal/wallet/service.go:282-286` — BalanceBreakdown struct (EXISTS)
2. `services/gateway/internal/wallet/service.go:288-310` — BalanceWithBreakdown() (EXISTS)
3. `services/gateway/internal/wallet/service.go:313-319` — CreditBonus() (EXISTS)
4. `services/gateway/internal/wallet/service.go:321-395` — applyBonusMutationDB() (EXISTS, pattern for DebitBonus)
5. `services/gateway/internal/wallet/service.go:455-549` — Hold() reservation (EXISTS)
6. `services/gateway/internal/wallet/service.go:555-620` — Capture() (EXISTS)
7. `services/gateway/internal/wallet/service.go:625-646` — Release() (EXISTS)
8. `services/gateway/internal/wallet/service.go:650-666` — ExpireStaleReservations() (EXISTS, pattern for bonus expiry)
9. `services/gateway/internal/wallet/service.go:972-1050` — applyMutationTx() (real balance only — DrawdownDebit extends this)
10. `services/gateway/internal/wallet/service.go:1208-1260` — collectCorrectionIssuesMemory() (extend for bonus)
11. `services/gateway/internal/wallet/service.go:1372-1403` — ensureSchema() DB tables (no changes needed)
12. `services/gateway/internal/bets/cashout.go:150-273` — AcceptCashout() (must use real balance only for credits)
