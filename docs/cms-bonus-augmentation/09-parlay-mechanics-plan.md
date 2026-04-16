# 09 — Parlay Mechanics Plan

**Date:** 2026-04-16

---

## Existing Parlay Infrastructure

| What Exists | Location | Status |
|---|---|---|
| Parlay mode toggle | `BetslipProvider.tsx` | Frontend — working |
| `placeParlay()` API call | `betting-client.ts` | Frontend — sends items[] array |
| Bet struct with `Legs []BetLeg` | `bets/service.go:181-212` | Backend — stores multi-leg |
| Fixed exotics (exacta/trifecta) | `bets/fixed_exotics.go` | Backend — working |
| Combined odds calculation | `bets/service.go` | Backend — multiplication |
| Freebet on parlay | `freebets/service.go:146-230` | Backend — MinOdds check on combined odds |
| Settlement resolvers per sport | `canonical/v1/settlement.go` | Backend — market-level grading |
| Void/push outcome types | `settlement.go:79-81` | Backend — enum values exist |

---

## What's Missing (Build These)

### 1. Parlay Qualification Rules

New file: `services/gateway/internal/bets/parlay_rules.go`

```
ParlayQualificationRules:
  MinLegs          int      // e.g., 2 (minimum legs for a valid parlay)
  MaxLegs          int      // e.g., 20 (platform maximum)
  MinOddsPerLeg    float64  // e.g., 1.10 (no ultra-low odds legs)
  MinCombinedOdds  float64  // e.g., 1.50 (combined odds floor)
  MaxSameFixture   int      // e.g., 1 (prevent same-game parlay unless explicitly allowed)
  ExcludedSports   []string // sports where parlay legs are not allowed
  ExcludedMarkets  []string // market types excluded from parlays

Validation flow:
  1. Check leg count: MinLegs <= len(legs) <= MaxLegs
  2. Check per-leg odds: each leg.odds >= MinOddsPerLeg
  3. Check combined odds: product(leg.odds) >= MinCombinedOdds
  4. Check fixture uniqueness: count legs per fixture <= MaxSameFixture
  5. Check sport/market exclusions
  6. Return: valid or list of validation errors
```

For **bonus-specific parlay rules** (campaign-level), the campaign's wagering `rule_config` can override:

```json
{
  "parlay_min_legs": 3,
  "parlay_min_odds_per_leg": 1.30,
  "parlay_min_combined_odds": 3.00,
  "parlay_wagering_multiplier": 1.5
}
```

### 2. Wagering Contribution Rules for Parlays

```
Singles:
  contribution = stake × 1.0
  (if odds >= min_qualifying_odds, else 0)

Parlays:
  contribution = stake × parlay_multiplier (e.g., 1.5)
  (if all legs meet min_qualifying_odds AND leg_count >= parlay_min_legs)

Why parlays get a multiplier:
  Parlays are harder to win, so operators typically reward them
  with higher wagering contribution to incentivize multi-leg betting.

Example:
  Bonus: $100 deposit match, 10x wagering = $1000 required
  Single $10 bet at 2.00 odds → contributes $10 (1.0x)
  Parlay $10 bet (3 legs) at 5.40 odds → contributes $15 (1.5x)
```

### 3. Parlay Settlement: Reduced-Leg Handling

New file: `services/gateway/internal/bets/parlay_settlement.go`

```
When a leg in a parlay is voided:
  1. Remove the voided leg from odds calculation
  2. Recalculate combined odds from remaining legs
  3. If remaining legs < MinLegs: void entire parlay (refund stake)
  4. If remaining legs >= MinLegs: settle as reduced-leg parlay

Reduced-leg calculation:
  original_combined_odds = leg1.odds × leg2.odds × leg3.odds × leg4.odds
  voided_leg_odds = leg3.odds (the voided one)
  reduced_combined_odds = original_combined_odds / voided_leg_odds
  reduced_payout = stake × reduced_combined_odds

Push leg in parlay:
  Push = odds become 1.0 (neutral)
  Same as void except leg counts as "settled" not "removed"
  reduced_odds = original_odds / push_leg_odds (effectively × 1.0)

Dead heat in parlay:
  dead_heat_factor applied to that leg's odds
  leg_adjusted_odds = leg.odds × dead_heat_factor
  recalculate combined odds with adjusted leg
```

### 4. Settlement Edge Cases

```
Case: All legs won
  → Payout = stake × combined_odds
  → Standard win settlement

Case: One leg lost
  → Entire parlay lost
  → Lose settlement (captured from reservation)

Case: One leg voided, rest won
  → Reduced-leg parlay
  → Payout = stake × (combined_odds / voided_leg_odds)

Case: One leg push, rest won
  → Push leg odds = 1.0
  → Payout = stake × (combined_odds / push_leg_odds)

Case: Multiple legs voided, remaining < MinLegs
  → Entire parlay voided
  → Full stake refund

Case: All legs voided
  → Full refund

Case: Mix of void + push + won + lost
  → Remove void legs (reduce odds)
  → Push legs = 1.0 (keep in calculation)
  → If ANY remaining non-void/non-push leg lost → parlay lost
  → If ALL remaining non-void/non-push legs won → payout at reduced odds
```

### 5. Partial Cashout and Bonus Qualification

```
Cashout on a bonus-eligible parlay:

Scenario: Player has a $10 parlay with 3 legs, 2 settled (won), 1 pending.
          Player requests cashout on the pending leg.

Rules:
  1. Cashout amount goes to REAL balance (never bonus)
  2. Wagering contribution: only the original stake counts, not the cashout value
  3. If freebet was used: cashout = cashout_value - original_stake (winnings only)
  4. The cashout DOES count as a completed bet for wagering contribution purposes
  5. Contribution calculated at time of cashout using final settled odds

Why this matters:
  Without this rule, players could use cashout to convert bonus funds to real
  money without meeting wagering requirements (bonus abuse vector).
```

### 6. Free-Bet-on-Parlay Flows

```
Existing: FreebetService.ApplyToBet() at freebets/service.go:146-230

Flow:
  1. Player selects freebet in betslip
  2. Freebet MinOddsDecimal checked against combined parlay odds
  3. Freebet amount covers the stake (no real money deducted)
  4. On win: WINNINGS ONLY returned (stake not returned)
     → payout = (combined_odds - 1) × freebet_amount
  5. On lose: nothing lost (freebet consumed)
  6. Freebet status → Consumed

Stake-return vs winnings-only semantics:
  Standard free bet: winnings only (stake NOT returned)
  This is configurable per freebet via a flag (future):
    stake_return: false → payout = (odds - 1) × stake  (DEFAULT)
    stake_return: true  → payout = odds × stake         (promotional)

Wagering contribution for freebet parlays:
  The freebet amount counts as stake for wagering contribution
  (player is wagering the freebet value, even though they didn't fund it)
```

### 7. Odds Boost + Parlay Interaction

```
Existing: OddsBoost at oddsboosts/service.go

Parlay interaction:
  Option A: Boost applies to ONE leg only
    → boosted_leg_odds = original_odds × (1 + boost_percentage/100)
    → combined_odds = boosted_leg × other_leg_1 × other_leg_2 × ...

  Option B: Boost applies to combined odds (parlay boost)
    → combined_odds = product(all_leg_odds) × (1 + boost_percentage/100)

  Recommendation: Option A for leg-level boosts, Option B for "Parlay Boost" promotions
  Both tracked via OddsBoost entity with applied_to field ("leg" or "parlay")

Bonus qualification with boosted odds:
  Use ORIGINAL odds for wagering qualification check (pre-boost)
  Use BOOSTED odds for payout calculation
  This prevents players from using boosts to artificially meet min-odds requirements
```

### 8. Fraud/Abuse Edge Cases

```
Correlated legs:
  Problem: Player bets on Team A to win AND Team A to score first goal
           These are correlated events (not independent)
  Detection: Same fixture_id across multiple legs
  Mitigation: MaxSameFixture = 1 (default) prevents this
              For same-game parlays (SGP): separate product with explicit correlation modeling

Low-odds stacking:
  Problem: Player adds many 1.01-odds legs to inflate combined odds past bonus threshold
  Detection: Per-leg minimum odds (MinOddsPerLeg = 1.10)
  Mitigation: Already handled by parlay qualification rules

Bonus farming via rapid parlays:
  Problem: Player places many small parlays to churn through wagering requirement
  Detection: Velocity check — too many bets in short window
  Mitigation: Rate limit on bet placement (existing) + minimum bet interval per bonus

Hedging across providers:
  Problem: Player places opposing bets at different sportsbooks
  Detection: Not detectable within TAYA_NA alone
  Mitigation: Industry standard — accept the risk, cap bonus sizes

Arbitrage with correlated void:
  Problem: Player bets on events likely to be voided/cancelled
  Detection: Monitor void rate per player
  Mitigation: Voided legs don't count toward wagering contribution
```

---

## Edge-Case Matrix

| Scenario | Legs | Outcome | Payout | Wagering Contribution | Freebet Behavior |
|---|---|---|---|---|---|
| All legs won | 3W | Win | stake × combined_odds | stake × parlay_multiplier | (odds-1) × freebet_amount |
| One leg lost | 2W + 1L | Lose | 0 | stake × parlay_multiplier | 0 (freebet consumed) |
| One leg void, rest won | 2W + 1V | Reduced win | stake × (combined / void_odds) | stake × parlay_multiplier | (reduced_odds-1) × freebet_amount |
| One leg push, rest won | 2W + 1P | Reduced win | stake × (combined / push_odds) | stake × parlay_multiplier | (reduced_odds-1) × freebet_amount |
| Two legs void, one won (< min legs) | 1W + 2V | Void parlay | full refund | 0 | freebet restored |
| All legs void | 3V | Void | full refund | 0 | freebet restored |
| Mix: 1W + 1L + 1V | — | Lose | 0 (one leg lost) | stake × parlay_multiplier | 0 (freebet consumed) |
| Mix: 1W + 1P + 1L | — | Lose | 0 (one leg lost) | stake × parlay_multiplier | 0 (freebet consumed) |
| Dead heat on one leg | 2W + 1DH | Win (reduced) | stake × adjusted_odds | stake × parlay_multiplier | (adjusted_odds-1) × freebet_amount |
| Cashout before all settled | 2W + 1 pending | Cashout | cashout_amount | stake × 1.0 (not parlay mult) | cashout - freebet_amount (if positive) |
| Bonus-funded parlay win | 3W (bonus stake) | Win | stake × combined_odds (to REAL) | stake × parlay_multiplier | N/A |
| Below min-odds threshold | 3 legs, one < 1.10 | Rejected | N/A | N/A | N/A |

---

## Where Each Rule Lives

| Rule | Package | Rationale |
|---|---|---|
| Min/max legs, per-leg min odds | `bets/parlay_rules.go` | Bet validation, not bonus logic |
| Fixture uniqueness (same-game check) | `bets/parlay_rules.go` | Bet integrity |
| Reduced-leg settlement | `bets/parlay_settlement.go` | Settlement domain |
| Void/push leg handling | `bets/parlay_settlement.go` | Settlement domain |
| Dead heat factor | `canonical/v1/settlement.go` (EXISTS) | Already implemented |
| Wagering contribution calculation | `wallet/wagering.go` | Wallet owns contribution tracking |
| Parlay multiplier for wagering | `bonus/campaign_rules.go` | Campaign defines the multiplier |
| Min combined odds for bonus | `bonus/campaign_rules.go` | Campaign eligibility |
| Freebet stake-return vs winnings-only | `freebets/service.go` (EXTEND) | Freebet domain |
| Odds boost application | `oddsboosts/service.go` (EXTEND) | Odds boost domain |
| Original vs boosted odds for qualification | `bonus/campaign_rules.go` | Campaign rules |
| Cashout wagering contribution | `wallet/wagering.go` | Wallet tracks contribution |
| Fraud velocity checks | `compliance/` (EXTEND) | Compliance domain |

---

## File Path References

1. `services/gateway/internal/bets/service.go:181-212` — Bet struct with Legs []BetLeg
2. `services/gateway/internal/bets/fixed_exotics.go` — existing multi-leg pattern
3. `services/gateway/internal/bets/cashout.go:150-273` — AcceptCashout()
4. `services/gateway/internal/freebets/service.go:146-230` — ApplyToBet() with MinOdds
5. `services/gateway/internal/freebets/service.go:190-195` — MinOddsDecimal validation
6. `services/gateway/internal/oddsboosts/service.go` — OddsBoost validation
7. `modules/platform/canonical/v1/settlement.go:14-37` — SettlementResolution struct
8. `modules/platform/canonical/v1/settlement.go:79-81` — Void/Push/Win outcome enum
9. `modules/platform/canonical/v1/types.go:242-266` — Freebet struct
10. `modules/platform/canonical/v1/types.go:277-295` — OddsBoost struct
11. `talon-backoffice/packages/app/app/components/BetslipProvider.tsx` — parlay mode toggle
12. `talon-backoffice/packages/app/app/lib/api/betting-client.ts` — placeParlay() API call
13. `services/codex-prep/phoenix-betting-engine/internal/service/service.go:418-460` — PlaceParlay() reference
