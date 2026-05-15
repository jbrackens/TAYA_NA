# PRIMER — Evening 2026-05-15

Successor to [PRIMER-2026-05-15-investor-demo-ready.md](PRIMER-2026-05-15-investor-demo-ready.md). Picks up where that one left off and reports what happened during a second 2026-05-15 session: demo polish, brand swap, and a focused /design-review on the header.

## Where you are right now

- **Branch:** `feat/binary-exchange-engine` (pushed to `origin/jbrackens/TAYA_NA`, head `a374b564`).
- **Working tree:** clean.
- **Last commit:** `a374b564 docs(todos): log 3 deferred header findings from /design-review`.
- **Demo state:** the four investor-walkthrough gaps the morning primer flagged are fixed (see "What got shipped" below). Header has been audited and polished.
- **Dev stack:** unchanged from morning primer — player on `:3010` (Claude Preview), gateway on `:18080`, auth on `:18081`, postgres on `:5434`, redis on `:6380`. `make wipe-demo && make demo-data` from `apps/Phoenix-Predict-Combined/go-platform/services/gateway/` resets the demo books and now also un-sticks any markets stuck in `settled`/`closed` from prior runs.

## What got shipped this session (10 commits)

| Commit | What |
|---|---|
| `432356de` | `fix(player): refresh wallet pill after trade` — header BAL pill now invalidates the cashier slice after a successful order; verified $4869.88 → $4845.05 in-tab. |
| `9780d988` | `fix(player): settled-market hero + ticket no longer mixed signals` — MarketHead shows a `SETTLED · YES wins` badge instead of a fake countdown; TradeTicket renders an outcome explainer instead of a pre-filled $25 → 38 shares projection. |
| `acb254af` | `feat(seed): expand Phase 5 to 10 settlements + make wipe idempotent` — Phase 5 grew 3 → 10 markets (mix of outcomes for u-1 = ~50% accuracy), and `cleanup.go` now reverts demo-settled markets back to `open` and purges `wallet_ledger` `prediction_payout:*` idempotency keys so re-runs work. |
| `1b07b108` | `feat(player): swap brand mark + wordmark to PNG assets` — BrandMark renders `/brand/mark.png`; TopBar wordmark is `/brand/wordmark.png`. Also: header inner capped at 1280px to align with main content, nav text bumped 13 → 15px. |
| `f66f76ee` | `chore(gateway): gitignore local go build outputs` — `seed`, `gateway`, `migrate`, `bin/` ignored in the gateway dir. |
| `0eeaee29` | `style(design): FINDING-H01 — Markets nav active state honors trailing slash` — isActive now accepts `/predict/` (the actual Next.js pathname under trailingSlash), not just `/predict`. |
| `99f86e59` | `style(design): FINDING-H03 — cap brand-asset height to 32px on mobile` — old text-wordmark `font-size: 24px` mobile rule is dead code post-PNG-swap; replaced with `.tb-brand img { max-height: 32px }` so the brand doesn't crowd 375px viewports. |
| `58d26f17` | `style(design): FINDING-H02 — BAL pill text uses --yes-text for AA contrast` — BAL value color went from `--accent` (1.47:1, fails WCAG AA) to `--yes-text` (5.89:1, passes). |
| `dacea827` | `style(design): FINDING-H04 — avatar 44x44 touch target` — header avatar grew from 36×36 to 44×44 with font-size 15px, meets WCAG/Apple/Material touch minimum. |
| `a374b564` | `docs(todos): log 3 deferred header findings from /design-review` — H05 mark/wordmark balance, H06 mobile BAL abbreviation, H07 no hamburger nav. All in TODOS.md "Open" section. |

## Demo gaps closed since the morning primer

| Morning primer issue | Now |
|---|---|
| Header BAL doesn't refresh after a trade | Fixed (`432356de`) |
| Settled market shows misleading countdown + pre-filled trade ticket | Fixed (`9780d988`) |
| u-1 History tab empty | Fixed via Phase 5 expansion + Phase 4 already populating positions in 7 of the 10 settled markets (`acb254af`); History shows 6 entries with mixed P&L |
| All 4 leaderboards empty ("nobody has qualified") | Fixed; Weekly P&L populates 5 traders (u-1 #1), Accuracy 4 traders, Sharpness 4 traders, Politics Champions 3 traders |

## Header design audit summary

Full report: `~/.gstack/projects/jbrackens-TAYA_NA/designs/design-audit-20260515/header-audit.md`.

- Header score: B− → A−
- 4 fixes landed (H01-H04), 3 deferred to TODOS.md (H05-H07)
- The original 1440px alignment complaint that prompted the audit is verifiably fixed: header inner and main both at `x=80, w=1280`

## Open TODOs (carried forward from this session)

1. **Header mark/wordmark optical balance (POLISH)** — mark reads as ornament, wordmark dominates. Two paths: real designed lockup, or bump mark + shrink wordmark. Not blocking demo.
2. **Mobile BAL abbreviation "$5.2K" (POLISH)** — loses precision; revisit if usability testing flags it.
3. **No mobile hamburger nav (MEDIUM)** — Portfolio/Leaderboards/Rewards unreachable on phones. Blocks any real mobile pilot, doesn't block the desktop investor walk-through.

## Carried over from morning primer, not yet acted on

- **MAX-stake button overestimate** on order_book markets with deep wallet
- **`notional_cap_cents` not persisted** (in-memory only — data-cleanliness fix)
- **Cap-clamp regression test gap** in `Service.placeExchangeOrder`
- **Refresh lock is per-ApiClient-instance** — multi-tab races still possible
- **Predict fee model** — 100 bps shipped as default, week-6 review gate
- **Backoffice antd 4 → 5 migration** — plan ready, awaiting "go"

## Key files touched this session

```
apps/Phoenix-Predict-Combined/
  talon-backoffice/packages/app/
    app/
      components/
        BrandMark.tsx                            (PNG instead of inline SVG)
        prediction/
          TopBar.tsx                              (4 design fixes + alignment + brand swap)
          MarketHead.tsx                          (SETTLED badge + countdown gate)
          TradeTicket.tsx                         (renderSettledTicket helper)
      market/[ticker]/page.tsx                    (wallet refetch after trade)
    public/brand/                                 (new — mark.png, mark.svg, wordmark.png, logo.png)
  go-platform/services/gateway/
    .gitignore                                    (new — local build outputs)
    cmd/seed/
      cleanup.go                                  (purge wallet_ledger + revert markets)
      demo_phase5_settle.go                       (3 → 10 settlements)
TODOS.md                                          (3 new deferred items)
```

## What to do first in the fresh window

If the next session is **demo dress rehearsal:** re-seed (`make wipe-demo && make demo-data`), then click-test the investor path: login → /predict → /market/SENATE-DEM-2026 (settled, see the new badge) → /market/SENATE-GOP-2026 (place a $25 trade, watch BAL refresh) → /portfolio (50% accuracy, 6 history entries) → /leaderboards (populated boards). 5-7 min round trip.

If the next session is **post-demo PR work:** the branch is 10 commits ahead of origin/feat/binary-exchange-engine but not yet on main. Invoke `/ship` to run gates + open a PR when ready.

If the next session is **further header polish:** TODOS.md has H05 (lockup) and H07 (hamburger) ready to pick up.

## Demo creds + dev refresh commands

```bash
# Re-seed (5 min before demo)
cd apps/Phoenix-Predict-Combined/go-platform/services/gateway
export GATEWAY_DB_DSN="postgres://predict:localdev@localhost:5434/predict?sslmode=disable"
export WALLET_DB_DSN="$GATEWAY_DB_DSN" WALLET_STORE_MODE=db
make wipe-demo && make demo-data

# Demo login
# demo@phoenix.local / demo123  →  user u-1, $5,073 wallet after this session
```
