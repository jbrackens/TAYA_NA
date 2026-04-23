# Plan — Un-orphan Loyalty + Leaderboards (Predict-native rebuild)

**Status:** design-complete, ready for eng review.
**Scope:** rebuild `/rewards` and `/leaderboards` as Predict-native features, wire ambient surfaces (header tier pill + portfolio rank chip + settled-trade points suffix), hook the existing in-memory Go stubs to real prediction-domain events. Replace sportsbook-era copy throughout.
**Out of scope for this plan:** implementation (that's a separate commit). See "NOT in scope" at the bottom for things explicitly deferred.

---

## Why

Two routes (`/rewards`, `/leaderboards`) currently exist in the player app but are unreachable via navigation — no header links, no footer links, no account-page links. The pages load sportsbook-era UI (tiers named Bronze/Silver/Gold/Vip, boards named "Weekly Profit Race" and "Qualified Referral Race") on the Predict visual shell. Their Go backend services are in-memory `sync.RWMutex` maps with fixture data, unconnected to the real settlement event stream. `CLAUDE.md` explicitly marks these as "sportsbook products that don't exist on Predict yet."

This plan replaces them with Predict-native versions: loyalty tied to volume × accuracy, leaderboards that reward skill (accuracy) alongside outcome (P&L), and ambient surfaces so every settled trade is a loyalty moment.

---

## 1. Information architecture

**Archetype:** ambient integration + dedicated detail pages.

| Surface | Where | What it shows |
|---|---|---|
| **Tier pill** | Header, left of the wallet pill | Tier name + points, e.g., `Sharp · 1,240 pts` (hidden below tier 1) |
| **Rank chip** | `/portfolio` summary strip, as a 5th stat card | User's best board rank, e.g., `Accuracy #14 · Top 5%` |
| **Points suffix** | `/portfolio` history table, trailing column on each settled-trade row | `+12 pts` in `--t3` muted |
| **Tier-up bloom** | Header tier pill, next page load after promotion | 400ms `--accent-glow` flash, respects `prefers-reduced-motion` |
| **`/rewards` page** | Dedicated route, linked from tier pill | Tier ladder strip + current tier card + ledger (last 20 entries) |
| **`/leaderboards` page** | Dedicated route, linked from rank chip | Sidebar of 4 boards with user's rank on each + board-detail pane |

**Cross-linking:**
- Tier pill in header → `/rewards`
- Rank chip in portfolio → `/leaderboards` (opens on user's best board)
- `/rewards` "Your highest rank" sub-chip → `/leaderboards`
- `/leaderboards` "Your tier" sub-chip → `/rewards`
- `+X pts` on trade row is read-only (no click) to avoid accidental navigation during portfolio review

**Navigation injection:**
- `PredictHeader.tsx` gets the tier pill in the top row (between search and wallet), only rendered when `tier >= 1`
- `PredictFooter.tsx` is unchanged — these are ambient/account features, not legal/info links
- No new top-level header-nav entries — ambient surfaces drive discovery

---

## 2. Semantic model

### Points formula

```
points_earned_per_settlement = round(trade_volume_cents × (1.0 + 0.5 × is_correct))
```

- A $10 trade that settles *correct*: `1000 × 1.5 = 1500 pts` raw → divide by 100 for display: `15 pts`
- A $10 trade that settles *incorrect*: `1000 × 1.0 = 1000 pts` raw → `10 pts`
- No points for open positions, voided markets, or self-cancellations
- No points for partial fills until the matched portion settles

Display rule: points are always shown divided by 100 (`points_earned / 100 | round`). Internal storage is raw integer cents-equivalent. Simplifies accrual math.

### Tiers

| Tier | Name | Points threshold | Benefits (cumulative) |
|---|---|---|---|
| 0 | *(hidden — no pill)* | < 1 | — |
| 1 | Newcomer | ≥ 1 | Tier pill visible in header + rank tracking |
| 2 | Trader | ≥ 500 | + Priority queue on new-market push notifications |
| 3 | Sharp | ≥ 2,500 | (Tier-3 pill color; no new functional unlock — intermediate progress tier) |
| 4 | Whale | ≥ 10,000 | + Name highlighted on Whale Ticker when they trade |
| 5 | Legend | ≥ 50,000 | + Legend pill color + reserved slot for future perks |

"Whale" tier name ties to the existing whale semantic in DESIGN.md (amber ticker band, large-trade signal) — trading whales become Whale-tier users, conceptual coherence.

**Fee-based tier benefits are explicitly out of scope for v1** (see NOT in scope). Industry precedent from Kalshi and Polymarket shows price-curve fees, not user-tier fees; introducing user-tier fees would be a novel pricing lever that should get its own product plan. The current Predict fee model (`volume × market.FeeRateBps`, default 0) is also a separate product decision.

**Deposit-limit benefits are out of scope for v1** (RG / compliance concern — wallet deposit caps are a regulated player-safety lever, not a cosmetic tier perk).

Thresholds are tunable. Initial values are placeholders; recommend A/B testing after launch.

### Leaderboards

Four boards ship in v1:

| Board | Metric | Window | Min qualification |
|---|---|---|---|
| **Accuracy** | % correct settled markets | Rolling 30 days | 10 settled markets in window |
| **Weekly P&L** | Realized P&L this week | Calendar week (resets Mon 00:00 UTC) | 1 settled market in window |
| **Category Champions** | Top trader per category (one board per Politics, Crypto, Sports, Entertainment, Tech, Economics) | Calendar week | 3 settled markets in the category, in window |
| **Sharpness** | Realized P&L ÷ total volume traded | Rolling 30 days | $500 volume + 5 settled markets |

Category Champions is a multi-board (one per domain category) but renders as one board with a category dropdown in the switcher.

### Leaderboard identity

Rows display `user.username` by default. Privacy opt-out lives in account settings (deferred — see unresolved). Users who haven't set a handle show as `u-<first-6-of-id>`.

---

## 3. Interaction states

| Surface | Loading | Empty / pre-qualified | Error | Success |
|---|---|---|---|---|
| Header tier pill | 20px skeleton, pulse | `tier == 0`: hide pill entirely. No fake "Newcomer" pill. | Silent fail → hide | `<TierName> · <N> pts` |
| Portfolio rank chip | Skeleton | `< 10 settled markets`: `Not ranked yet · 4/10` + mini progress bar | Muted `Rank unavailable` | `Accuracy #14 · Top 5%` (best board only) |
| Points suffix on trade row | (row already loading) | `earned == 0`: suffix hidden (not "+0 pts") | Suppress | `+12 pts` in `--t3` |
| `/rewards` page | Full-page skeleton | Pre-first-settle: hero card "No activity yet — settle your first trade to start earning" + CTA → `/predict`. Ledger section hidden. | Inline banner above tier card + "Try again" button | Tier-ladder strip + tier card + ledger list (last 20) |
| `/leaderboards` page | Board-list skeleton | Brand-new user: consolidated "Getting started" card only — `Settle 10 markets to unlock leaderboards. 3/10 done.` Single CTA to `/predict`. Board list hidden until qualified. | Per-board inline error (one fails, others still load) | Sidebar with 4 boards + user rank on each + board-detail pane |

**Per-board empty state** (once user has qualified in general but not for a specific board): `Not qualified for <board> — need <N more> <qualifier>` displayed inside that board's detail pane.

---

## 4. User journey

Three archetypes, three arcs.

### Brand-new user (0 settled markets)

| Step | User does | Feels | Design spec |
|---|---|---|---|
| Signup | Creates account | Neutral | No tier pill, no rank chip, clean UX |
| First trade placed | Places YES at $5 | Committed | Still no loyalty surfaces |
| First trade settles (win) | Opens `/portfolio`, sees `+8 pts` on the row | **Tracked** | Ledger gains entry, tier advances to Newcomer, pill appears in header on next nav |
| Markets 2–9 settle | Keeps trading, watches pill points climb | Building | Portfolio rank chip shows `Not ranked yet · 6/10` progress |
| 10th market settles | Rank chip switches to `Accuracy #N · Top X%` | **Arrived** | First leaderboard appearance, subtle bloom on rank chip next page load |

### Active mid-tier user

| Step | User does | Feels | Design spec |
|---|---|---|---|
| Opens `/predict` | Header tier pill shows current state | Tracked | Points reflect all accumulated activity |
| Opens `/portfolio` | Rank chip shows `Accuracy #14` (up from #15) | Rising | Chip tint is `--accent-soft`, text `--t1` |
| Clicks rank chip | `/leaderboards` opens on Accuracy board, row highlighted | Recognition | User row has `--accent-soft` bg + `#N You` prefix |
| Scans board | Sees handles of users above (`sharp_42`, `nate_silvr`, `crypto_whale`) | Challenge | Real handles, real identity — the board is meaningful |
| Tier-up | On next page nav, tier pill flashes 400ms `--accent-glow` | **Recognized** | Subtle, respects flow, no toast interrupt |

### Power user (top tier, top rank)

| Step | User does | Feels | Design spec |
|---|---|---|---|
| Opens `/predict` | Header shows `Legend · 54,200 pts`, Whale Ticker highlights their trades | Identity | Legend tier pill uses `--tier-5` (deep violet) |
| Opens `/leaderboards` | Sidebar shows `Accuracy #2 · P&L #1 · Crypto #1 · Sharpness #4` | Validated | Multi-board standing = concrete identity ("I'm the crypto whale") |
| Views Accuracy board | Sees one user above (`nate_silvr` at 84%) | Aspiration | Concrete rival, concrete metric to beat |

**Time-horizon check:**
- **5-second visceral** (first impression after the tier pill appears): _I'm being tracked. Something I did mattered._
- **5-minute behavioral** (first session after `/leaderboards` unlocks): _I can see how to climb — settle more, pick longer-odds markets, be right._
- **5-year reflective** (rank has become identity): _I'm a Sharp on Crypto. That's part of who I am on Predict._

---

## 5. AI slop protections

**Layout decisions that prevent generic SaaS drift:**

- **`/rewards` page** is a **broadcast row**, not a vertical stack:
  - Top: horizontal tier-ladder strip showing all 5 tiers with current highlighted (no tier circle illustration, no centered hero)
  - Grid: `2fr / 1fr` → tier card (left) + ledger list (right)
  - No decorative illustrations, no confetti, no "Congrats!" copy, no icon-in-colored-circle tier icons
  - Tier card shows: `<TierName>`, points balance, progress bar to next tier (`X / Y pts`), fee rate + benefits list
  - Ledger is a `<table>`, not cards: columns are `Date · Event · Change · Balance`
- **`/leaderboards` page** uses **sidebar board-switcher**, not stacked cards:
  - Desktop: left sidebar (4-board rank summary) + right board detail
  - No left-border-accent cards, no icon-in-circle board headers
  - Board detail is a `<table>` with `Rank · Trader · Metric · Settled`
  - User's row highlighted with `--accent-soft` bg, `#N You` prefix in rank column
- **Tier-up moment** is a 400ms pill bloom, not a modal or toast. No gamification vocabulary ("LEVEL UP!"), no sound effects, no animated icons

**Copy that gets written Predict-native, not sportsbook-era:**
- `"Settled bet accrual"` → `"Settled trade"`
- `"Referral bonus"` → (referrals out of scope; remove entirely)
- `"Weekly Stake Ladder"` → dropped (Volume Ladder rejected in Pass 1 as sportsbook-era)
- `"Qualified Referral Race"` → dropped (out of scope)
- `"Most qualified stake volume"` → dropped
- `"Bet analytics"` → `"Trading activity"`

---

## 6. Design system alignment

### Existing tokens (from `app/globals.css` + DESIGN.md §3)

- `--accent` (phoenix green, brand) — tier progress bar fill; `--accent-glow` for the 400ms tier-up bloom; `--accent-soft` for active-state tints (rank chip bg, "You" row highlight)
- `--yes` (data green) — **not used** for loyalty/leaderboard (wrong channel — that's YES price)
- `--gain` (P&L green) — used only for the Weekly P&L Race board metric column
- `--no` (red) — P&L negative
- `--whale` (amber) — **reserved**, not co-opted for tier colors (DESIGN.md discipline)
- `--t1`, `--t2`, `--t3` — text hierarchy (rank text, points suffix, etc.)
- `--s1`, `--s2` — card and inset surfaces

### New tokens (added to DESIGN.md §3 as part of this work)

| Token | Hex | Usage |
|---|---|---|
| `--tier-1` | `#94a3b8` | Newcomer — slate-400, neutral |
| `--tier-2` | `#cbd5e1` | Trader — slate-200, light |
| `--tier-3` | `#d4a857` | Sharp — warm-gold-muted (not glary metallic) |
| `--tier-4` | `#9ca7bf` | Whale — cool-platinum-muted |
| `--tier-5` | `#8b5cf6` | Legend — deep violet, highest rarity |

**Each must pass 4.5:1 contrast on `--s1` background.** Verified during implementation — if any fails, darken/lighten accordingly without losing identity.

**Decisions Log entry for DESIGN.md §8:**
> `2026-04-23 | Tier tokens added | Loyalty feature needs 5 tier colors that don't collide with --accent (brand), --yes (data), --gain (P&L), or --whale (large-trade reserved). Muted neutrals + one accent (violet for Legend) give each tier distinct identity without competing for the eye's attention. Top tier uses violet, not green — the three-greens rule stands.`

### Token usage audit per surface

| Element | Token |
|---|---|
| Tier pill bg | `--tier-N` at 0.14 alpha (soft tint) |
| Tier pill border | `--tier-N` at 0.3 alpha |
| Tier pill text | `--t1` (solid white) |
| Tier-up bloom | `--accent-glow` (brand, correct channel for "moment of attention") |
| Rank chip bg (portfolio) | `--accent-soft` (active-state, correct use) |
| Rank chip text | `--t1` |
| `+X pts` suffix | `--t3` muted |
| Leaderboard "You" row bg | `--accent-soft` |
| Leaderboard P&L column (P&L Race only) | `--gain` for positive, `--no` for negative |
| Progress bar fill | `linear-gradient(90deg, var(--accent), var(--accent-hi))` |

---

## 7. Responsive + accessibility

### Responsive

- **Header tier pill:** 36px height everywhere. Label shrinks `Sharp · 1,240 pts` → `Sharp · 1.2k` below 480px
- **Portfolio rank chip:** inherits existing 4-across → 2-across → 1-across stat-card grid breakpoints
- **Points suffix on trade row:** always visible, `white-space: nowrap`, never wraps
- **`/rewards` page:**
  - Desktop (≥1024px): 2fr/1fr grid
  - Tablet (768–1023px): 1fr stacked — tier card above ledger
  - Mobile (<768px): tier-ladder strip becomes `overflow-x: auto` with snap
- **`/leaderboards` page:**
  - Desktop (≥1024px): sidebar + detail pane
  - Mobile (<768px): **standing summary card** above active board. Card shows all 4 ranks compactly (`Accuracy #14 · P&L — · Crypto #3 · Sharpness #22`), tap a row to switch active board

### Accessibility

- Tier pill: `aria-label="Tier: Sharp, 1,240 points. 1,260 points to Whale"`
- Rank chip: `aria-label="Rank 14 on Accuracy, top 5 percent"`
- Leaderboard table: semantic `<table>` with `<caption>`, `<th scope="col">`, user row gets `aria-current="true"`
- Board-switcher sidebar: `role="tablist"` + `role="tab"` + arrow-key navigation
- Points suffix on trade row: `aria-label="Earned 12 points"` (screen readers don't read "+12 pts" intelligibly)
- Tap targets: tier pill visual 36px → Link wrapper padded to 44×44 hit area
- Focus: `:focus-visible` with 2px `var(--accent)` outline, `outline-offset: 2px`
- Motion: tier-up bloom honors `prefers-reduced-motion: reduce` (no animation, instant update)
- Contrast: every `--tier-N` must hit 4.5:1 on `--s1` — verify at implementation time

---

## 8. Backend wiring (eng-review-resolved)

The Go `loyalty` and `leaderboards` packages currently live in `/go-platform/services/gateway/internal/`, backed by `sync.RWMutex` maps and JSON file snapshots. This work converts both to PostgreSQL-backed services and hooks them into the prediction settlement event stream via a shared DB transaction (no outbox).

### New tables (migration 015)

```sql
-- loyalty_accounts: per-user current tier + points
CREATE TABLE loyalty_accounts (
  user_id         UUID PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
  points_balance  BIGINT NOT NULL DEFAULT 0,
  tier            SMALLINT NOT NULL DEFAULT 0,
  last_activity   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_loyalty_accounts_tier ON loyalty_accounts(tier, points_balance DESC);

-- loyalty_ledger: append-only accrual history with idempotency
CREATE TABLE loyalty_ledger (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth_users(id),
  event_type       TEXT NOT NULL,          -- 'accrual', 'promotion', 'adjustment'
  delta_points     BIGINT NOT NULL,
  balance_after    BIGINT NOT NULL,
  reason           TEXT NOT NULL,
  market_id        UUID REFERENCES prediction_markets(id),
  trade_id         UUID REFERENCES prediction_trades(id),
  idempotency_key  TEXT NOT NULL UNIQUE,   -- e.g. 'accrual:<settlementID>:<positionID>'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_loyalty_ledger_user ON loyalty_ledger(user_id, created_at DESC);

-- leaderboard_snapshots: precomputed rank per board
CREATE TABLE leaderboard_snapshots (
  board_id         TEXT NOT NULL,                         -- 'accuracy', 'pnl_weekly', 'category:crypto', 'sharpness'
  user_id          UUID NOT NULL REFERENCES auth_users(id),
  metric_value     NUMERIC(18,6) NOT NULL,                -- rank-defining metric (pct accurate, pnl cents, etc)
  rank             INT NOT NULL,
  window_start     TIMESTAMPTZ NOT NULL,
  window_end       TIMESTAMPTZ NOT NULL,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (board_id, user_id, window_start)
);
CREATE INDEX idx_lb_snap_board_rank ON leaderboard_snapshots(board_id, rank);
CREATE INDEX idx_lb_snap_user ON leaderboard_snapshots(user_id, computed_at DESC);
```

### Service graph (explicit — Codex flagged this as a gap)

`cmd/gateway/main.go` currently boots `prediction`, `loyalty`, and `leaderboards` as independent services with no cross-injection. This plan adds injection:

```
wallet.Service ─────→ prediction.ServiceConfig.WalletAdapter
loyalty.Service ────→ prediction.ServiceConfig.LoyaltyAdapter   (NEW)
leaderboards.Service ─→ (reads loyalty_ledger + prediction tables; no injection into prediction)
auth_users (query)  ─→ leaderboards JOIN for usernames (read-only, cross-table)
```

New: `internal/http/prediction_loyalty_adapter.go` bridges `loyalty.Service` to the `prediction.LoyaltyAdapter` interface, same pattern as `prediction_wallet_adapter.go`.

### Settlement dispatch — shared transaction (Codex-recommended, replaces outbox)

In `prediction/settlement.go`, the settlement flow calls into the repository which already owns the transaction context (see `sql_repository.go:639` for existing shared-txn pattern). Loyalty accrual runs in the *same* transaction as the wallet credit:

```go
tx, err := repo.BeginTx(ctx)
defer tx.Rollback()

// Existing: wallet credit
if err := walletAdapter.CreditTx(tx, userID, payoutCents, ...); err != nil {
    return err
}

// NEW: loyalty accrual (same transaction)
if err := loyaltyAdapter.AccrueTx(tx, LoyaltyAccrualInput{
    UserID:         userID,
    VolumeCents:    tradeVolume,
    IsCorrect:      payoutCents > 0,
    MarketID:       marketID,
    TradeID:        tradeID,
    IdempotencyKey: fmt.Sprintf("accrual:%s:%s", settlementID, positionID),
}); err != nil {
    return err
}

if err := tx.Commit(); err != nil {
    return err
}

// After commit: publish TierPromoted over WS if tier changed (fire-and-forget — WS loss OK)
if promoted {
    go wsHub.PublishTierPromoted(userID, fromTier, toTier)
}
```

**Why shared-transaction beats outbox here:** loyalty + wallet are same DB, same gateway, same service boundary. Outbox buys future decoupling (separate service, separate DB) that isn't on the roadmap. For the "immediate tier-up" UX this plan specifies, atomic commit + synchronous WS publish is strictly better — no drain-tick lag, no extra moving parts to operate.

**Failure semantics:** if loyalty accrual fails mid-transaction, wallet credit rolls back too. User's payout fails, they see an error, settlement retries. Idempotency key on `loyalty_ledger` makes retries safe (`INSERT ... ON CONFLICT (idempotency_key) DO NOTHING`).

### Tier-up WebSocket push (no outbox needed)

After the transaction commits, `loyalty.Service` synchronously publishes `TierPromoted{userID, fromTier, toTier}` via the existing `internal/ws/notifier.go` → `internal/ws/hub.go`. Frontend store subscribes; header `PredictHeader.tsx` re-renders tier pill with 400ms `--accent-glow` bloom.

Fallback: if WS is disconnected, the next page load's `GET /api/v1/loyalty/account` response has the updated tier — pill flash triggers from client-side tier-change detection.

### Leaderboard recompute

Worker in `leaderboards/recomputer.go`, pattern matches existing `MarketCloser` and `AutoSettler` (stdlib `time.Ticker` + `context.Done()` shutdown). Tick every 5 minutes. Queries (all 4 boards):

```sql
-- Accuracy board (rolling 30 days, min 10 settled markets)
INSERT INTO leaderboard_snapshots (board_id, user_id, metric_value, rank, window_start, window_end)
SELECT 'accuracy', user_id,
       100.0 * SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) / COUNT(*) AS accuracy_pct,
       RANK() OVER (ORDER BY 100.0 * SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) / COUNT(*) DESC),
       now() - interval '30 days', now()
FROM settled_positions
WHERE paid_at >= now() - interval '30 days'
GROUP BY user_id
HAVING COUNT(*) >= 10
ON CONFLICT (board_id, user_id, window_start) DO UPDATE SET
  metric_value = EXCLUDED.metric_value, rank = EXCLUDED.rank, computed_at = now();

-- Weekly P&L (calendar week, 1+ settled)
INSERT INTO leaderboard_snapshots (...)
SELECT 'pnl_weekly', user_id, SUM(pnl_cents), RANK() OVER (ORDER BY SUM(pnl_cents) DESC),
       date_trunc('week', now()), date_trunc('week', now()) + interval '1 week'
FROM settled_positions
WHERE paid_at >= date_trunc('week', now())
GROUP BY user_id
HAVING COUNT(*) >= 1;

-- Category Champions (one row per category × user, calendar week, 3+ in category)
-- Sharpness (pnl / volume, rolling 30 days, $500 volume + 5 markets)
-- (see /plan-eng-review test plan artifact for full SQL)
```

Required indexes (listed above + on source tables):
- `settled_positions(user_id, paid_at)` composite — verify exists on migration 014
- `trades(user_id, settled_at)` composite if P&L/Sharpness needs trade-granular aggregation

### Tier lookup (no Redis cache — scope dropped with fee benefits)

Tier is read from `loyalty_accounts.tier` at:
- `/rewards` page render — low frequency, direct DB read
- `/leaderboards` page render — low frequency
- Tier pill render on authenticated pages — one read per page load
- WS tier-up event — handled in settlement transaction

**Not a hot path anymore.** The Redis cache + `singleflight` pattern was planned for the fee path; with fees out of scope, direct DB reads are fine. If tier lookup ever becomes hot-path (e.g., if fee-tier benefits get added in a future iteration), add Redis caching then.

### Auth hardening (in scope — Codex flagged as a privacy bug)

Current state: `loyalty_handlers.go:57, 82` and `leaderboard_handlers.go:72, 222` accept `userId` from querystring with no session check. Plan closes this:

- `GET /api/v1/loyalty/?userId=X` — require session auth, 403 if `session.userId != X`
- `GET /api/v1/loyalty/ledger/?userId=X` — same rule
- `GET /api/v1/loyalty/standing?userId=X` (new endpoint, Finding 4) — same rule
- `GET /api/v1/leaderboards/` — public, no auth (board list + top 25 entries)
- `GET /api/v1/leaderboards/:id/entries?userId=X` — `userId` query param may only be `session.userId` (used only to include the session user's own rank in the payload if they're outside top 25)

Put this behind `httpx.Auth` middleware; add a helper `requireSelfOrPublic(w, r, userID)` that 403s on mismatch.

### Points suffix on portfolio history rows

The plan originally implied extending `PortfolioSummary` or `SettledPayout` types to carry points. Codex caught this: `/portfolio` uses shared prediction types, not loyalty-client types. Resolution: the frontend fetches loyalty ledger in parallel with portfolio history (two independent API calls), joins by `trade_id` client-side:

```ts
const [history, ledger] = await Promise.all([
  api.getSettledPositions(1, 20),
  loyaltyApi.getLedger(userId, 20),
]);
const pointsByTradeId = new Map(ledger.map(l => [l.tradeId, l.deltaPoints]));
// Render: pointsByTradeId.get(row.tradeId) ?? null
```

No shared-type changes. No new backend endpoints beyond what's already specified.

### Username on leaderboards (backend JOIN — Codex Finding 5)

`leaderboards/postgres.go` board-entries query JOINs `leaderboard_snapshots.user_id → auth_users.username` so rows always carry fresh usernames:

```sql
SELECT ls.rank, ls.user_id, COALESCE(au.username, 'u-' || substring(ls.user_id::text, 1, 6)) AS display_name,
       ls.metric_value
FROM leaderboard_snapshots ls
JOIN auth_users au ON au.id = ls.user_id
WHERE ls.board_id = $1 AND ls.window_start = $2
ORDER BY ls.rank
LIMIT 25;
```

If a user hasn't set a username, fall back to `u-<first-6-of-id>`. Privacy opt-out (TODOS.md) will add an `au.display_anonymous` predicate later.

### State migration — explicit admin command (Codex Tension 2)

No startup-time magic. Add `cmd/gateway/migrate-legacy-loyalty` subcommand:

```bash
go run ./cmd/gateway migrate-legacy-loyalty \
  --from /path/to/.data/loyalty-state.json \
  --from-lb /path/to/.data/leaderboard-state.json \
  --dry-run  # prints what would be inserted, no writes
```

Operator runs this once per environment, manually, after migration 015 applies. Validates JSON shape, writes to Postgres with `ON CONFLICT DO NOTHING` (re-runs are safe). Exits with a summary of rows inserted. No automatic behavior at gateway boot.

The existing demo-seed fallback in `loyalty/service.go:115-157` stays for local dev but is never reachable in production (the services now read from Postgres, not in-memory maps).

---

## NOT in scope

Intentionally deferred from this plan:

- **Fee-based tier benefits** — deferred after Codex eng review. Industry precedent (Kalshi, Polymarket) uses price-curve fees, not user-tier fees; introducing user-tier fees is a novel product mechanism. Separately, the current fee model (`volume × market.FeeRateBps`, default 0) is itself underspecified — Predict markets currently charge no fee. Both the fee model decision and the tier-discount decision belong in their own product plan.
- **Tiered wallet deposit-limit benefits** — wallet caps are an RG/compliance lever. Making them variable by loyalty tier requires compliance signoff. Out of v1 scope.
- **Outbox infrastructure for settlement side effects** — eng review chose shared-transaction dispatch; outbox pattern deferred until loyalty actually decouples into its own service/DB (not on roadmap).
- **Redis tier cache + singleflight** — eng review dropped this: fees aren't tier-driven anymore, so tier lookup is no longer hot-path. Can be added if future work introduces tier-driven hot-path reads.
- **Referral program** — no `Qualified Referral Race` board, no referral ledger events. Polymarket introduced a 2026 referral program; Predict can do the same in a separate plan. Adding a new board + new ledger event type when it ships won't require schema migration.
- **Tiered access / gated features** — Tier 5 (Legend) does not unlock exclusive markets in v1. Benefits stay reputational + notification priority + Whale Ticker recognition.
- **Season resets** — points and tiers accumulate indefinitely. No monthly/quarterly reset. Can be added later if the incentive curve flattens.
- **Leaderboard cash prizes** — sportsbook-era copy mentioned "Top 10 share a cash bonus." Predict v1 does not pay out leaderboard prizes. Rank is reputational.
- **Loyalty storefront / rewards catalog** — no spending of points on rewards. Points only drive tier progression.
- **Backoffice admin UI** — no admin tools for manually adjusting points or recalculating boards. Can be added in `/prediction-admin` later.
- **Privacy opt-out UI** — see TODOS.md. Users show `user.username` by default; handle change in account settings. Anonymous-mode toggle deferred.
- **Automatic startup state migration** — replaced with explicit operator command (Codex caught that startup-time migration could silently import demo-seed data into production).

---

## What already exists

Worth harvesting for structural reuse (don't rebuild):

- `go-platform/services/gateway/internal/loyalty/service.go` — accrual + ledger + tier math logic. Keep the math, replace the `sync.RWMutex` map with a PostgreSQL repository
- `go-platform/services/gateway/internal/leaderboards/service.go` — leaderboard definition model + rank calc helpers. Same pattern.
- `app/rewards/page.tsx` — React component skeleton. Keep the structure (account + ledger + tiers), replace the copy + styling per this plan.
- `app/leaderboards/page.tsx` + `app/leaderboards/[id]/page.tsx` — routes + data fetching wiring. Replace board selection UX (tabs → sidebar).
- `app/lib/api/loyalty-client.ts` + `app/lib/api/leaderboards-client.ts` — API clients. Keep; extend types for new fields (`tierFeeRate`, etc.).
- `public/logo-tn.svg` — already restored in the recent DESIGN apply, no change needed.
- DESIGN.md `--accent`, `--accent-soft`, `--accent-glow`, `--t1/2/3`, `--s1/2`, `--gain`, `--no` — all reused.

---

## Unresolved decisions (deferred, defaults chosen)

Each has a sensible default; revisit during implementation or post-launch.

| # | Decision | Default | Revisit when |
|---|---|---|---|
| 1 | Points accrual formula coefficients | `round(volume × (1 + 0.5 × correct))` | After 2 weeks of data — tune if one behavior dominates |
| 2 | Tier thresholds | 1 / 500 / 2,500 / 10,000 / 50,000 | After 2 weeks — target distribution roughly 40 / 30 / 20 / 8 / 2% of active users |
| 3 | Leaderboard windows | P&L weekly; Accuracy 30d; Category weekly; Sharpness 30d | If engagement on any board drops below 20% of MAU |
| 4 | Tier names | Newcomer / Trader / Sharp / Whale / Legend | Sticking with these — decided in Pass 7 |
| 5 | Privacy opt-out UI | Handle-change in account settings only | If users request anonymous mode |
| 6 | Category Champions — which 6 categories? | Politics, Crypto, Sports, Entertainment, Tech, Economics (matches the header cat strip) | If a new category ships |
| 7 | What happens to a user's rank when they cash out and stop trading? | Stays in the snapshot until window rolls off | If this creates confusion |
| 8 | Does the tier pill show on auth pages (/login, /register)? | No — only on authenticated routes (everything except `/auth/*`) | — |

---

## Approved mockups

None generated in this review — the feature is structural (IA + semantic model + layout composition) rather than a hero-page visual redesign. Mockups would be appropriate before `/design-shotgun` or during a polish pass, not at plan time. Eng review should not block on mockups; design review after implementation (via `/design-review`) will visually audit against this plan.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 1 | issues_found | 7 findings, 2 tensions + 5 plan gaps, all integrated |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 7 eng issues resolved, coverage diagram produced, test plan artifact written |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR | score: 2/10 → 9/10, 14 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**CODEX (outside voice):** 7 findings — 2 cross-model tensions reversed earlier Claude recommendations (outbox → shared transaction, startup migration → explicit admin command). 5 plan gaps integrated: auth hardening in scope, fee benefits dropped, username JOIN strategy, service-wiring graph explicit, portfolio standing endpoint parallelism.

**CROSS-MODEL:** Claude and Codex agreed on 3 of 5 plan gaps (auth, service wiring, portfolio contract layer). Disagreed on 2 (outbox, migration) — both resolved in Codex's favor after user review.

**UNRESOLVED:** 8 product/tuning decisions deferred with defaults (same as before; eng review didn't add any unresolved items).

**VERDICT:** DESIGN + ENG CLEARED — ready to implement. Recommended next: `/ship` after implementation.
