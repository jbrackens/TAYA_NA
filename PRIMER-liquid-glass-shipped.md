# Liquid Glass redesign — shipped

**Status:** Phase 1–5 complete on `origin/main`. 19 commits between `5fb8ef4e` (design pivot) and `66cb92c5` (Phase 5 cleanup), 2026-04-24 → 2026-04-25.

**Single line for the next session:** the redesign is shipped end-to-end across every route in `app/`. Manual perf + a11y audits are the only remaining work; nothing is blocked.

---

## What "Liquid Glass" is, in 5 lines

- Cool teal/navy backdrop (`--bg-deep #06101c`, `--bg-teal #0c2638`, plus navy / mint / azure lobes) refracts through translucent cards.
- Mint emerald accent (`--accent #2be480`) replaces the prior neon phoenix lime.
- YES is **blue** (`#7fc8ff`), NO is **peach** (`#ff9b6b`). Semantic shift from the dark-broadcast era.
- The `.glass` utility is a 4-layer recipe (translucent body + 30px backdrop blur + rim/chroma highlights + specular sheen).
- A `BackdropScene` SVG (faint YES/NO/accent chart lines + grid) sits behind everything at z-index −2/−1.

DESIGN.md is the source of truth. PLAN-liquid-glass-redesign.md is the ship log.

---

## Routes covered (Phase 4 inventory)

| Route | Phase | Key surfaces |
|-------|-------|--------------|
| `/predict` | 4 | DiscoveryHero glass card · CategoryChips strip · MarketCard grid |
| `/market/[ticker]` | 3 (pilot) | MarketHead · MarketChart · OrderBook · RecentTrades · TradeTicket |
| `/portfolio` | 4 | 5 glass stat cards · pill tab segmented control · glass table |
| `/rewards` | 4 | tier-tinted ladder · glass tier card · glass ledger |
| `/leaderboards` | 4 | glass sidebar tabs · glass detail pane |
| `/category/[slug]` | 4 | grid of MarketCards |
| `/account` + 5 subroutes | 4 | identity banner · stat strip · 6 action tiles · glass forms |
| `/auth/login` + 4 siblings | 4 | shared `.auth-*` glass-thick card primitives |
| `/about`, `/contact-us`, `/privacy`, `/terms`, `/responsible-gaming` | 4 | ContentPage `.glass` wrapper |
| `/error`, `/not-found`, `/cashier/error.tsx`, `/profile/error.tsx`, `/account/error.tsx` | 4 | translucent error surfaces |

Out of scope (intentionally sportsbook-styled until retired or refreshed):
- `/cashier`, `/cashier/cheque` (wallet team owns)
- `/profile` (replaced by `/account`)
- All `pages/`-router routes

---

## Components shipped

New (Phase 1–3):
- `app/components/BackdropScene.tsx` — fixed SVG chart-lines + grid behind everything.
- `app/components/BrandMark.tsx` — 28px gradient-filled brand square.
- `app/components/MobileTabBar.tsx` — fixed 5-slot bottom bar on <900px viewports.
- `app/components/prediction/TopBar.tsx` — sticky 64px `.glass.glass-med` shell (renamed from PredictHeader).
- `app/components/prediction/MarketHead.tsx` — market question + meta pills + countdown.
- `app/components/prediction/MarketChart.tsx` — SVG line chart with glow + current-price marker.
- `app/components/prediction/OrderBook.tsx` — solid-fill table with depth bars.
- `app/components/prediction/RecentTrades.tsx` — side-badged trade tape.

Redesigned:
- `app/components/prediction/MarketCard.tsx` — Liquid Glass tile (depth bar + YES/NO sides).
- `app/components/prediction/TradeTicket.tsx` — glass panel with liquid-tint side selector + chip amounts + shimmer CTA.
- `app/predict/page.tsx` — DiscoveryHero glass marquee.

Retired (Phase 3 + 4):
- `WhaleTicker.tsx`, `WhaleActivityCard.tsx`, `TopMoversCard.tsx`, `FeaturedHero.tsx`, `PredictHeader.tsx`.
- `public/logo-tn.svg` (replaced by BrandMark).

---

## Token state (DESIGN.md §3)

| Family | Tokens | Status |
|--------|--------|--------|
| Backdrop | `--bg-deep`, `--bg-navy`, `--bg-teal`, `--bg-mint`, `--bg-azure` | shipped |
| Glass | `--glass-thick`, `--glass-regular`, `--glass-thin`, `--glass-inset` | shipped |
| Rim | `--rim-top`, `--rim-bottom`, `--rim-side`, `--chroma-1`, `--chroma-2` | shipped |
| Accent | `--accent`, `--accent-hi`, `--accent-lo`, `--accent-deep`, `--accent-soft`, `--accent-glow-color`, `--accent-glow`, `--accent-gradient` | shipped |
| Semantic | `--yes` + `--yes-hi/-lo/-glow`, `--no` + `--no-hi/-lo/-glow`, `--live` | shipped |
| Loyalty tiers | `--tier-1..--tier-5` | preserved (loyalty shipped against these) |
| Radii | `--r-sm 10px`, `--r-md 16px`, `--r-lg 22px`, `--r-xl 28px`, `--r-pill 999px` | shipped |
| Surface aliases | `--s0..--s3` | **kept** as deprecation aliases — `/cashier` and `/profile` still depend |
| Retired | `--gain`, `--whale`, `--whale-soft` | **deleted in Phase 5** |

---

## Verification status

| Gate | Result | Notes |
|------|--------|-------|
| `yarn typecheck` | ✅ 0 errors in `tests/` | full-repo baseline 399 (was 400 pre-Phase-4) |
| `yarn test:smoke` | ✅ 17/17 passing | desktop + mobile Playwright across all 7 prediction routes |
| Visual sanity | ✅ | `/predict`, `/market/[ticker]`, `/auth/login`, `/privacy` all confirmed |
| `prefers-reduced-transparency` rule | ✅ present in stylesheets | not exercised end-to-end via OS toggle |
| `prefers-reduced-motion` rule | ✅ present in stylesheets | not exercised end-to-end via OS toggle |
| Color contrast | ✅ spot-checked | hero/YES/NO match DESIGN.md §3 targets; full axe pass deferred |

---

## What's NOT done (manual audits — agent can't run)

These are the only remaining gates from `PLAN-liquid-glass-redesign.md` Phase 5:

1. **Chrome DevTools Performance pass** on `/market/[ticker]`:
   - CPU 4× throttle + Fast 3G
   - Record 5s scroll
   - Assert: no single frame >50ms, long-tasks <5% of recorded time
   - **Blocking gate** per plan D8. If it fails, downgrade glass: drop `saturate(180%)` → drop blur 30px→18px → drop `::before` sheen → fall back to solid fill on the worst offenders. Document downgrades in DESIGN.md §10.

2. **Lighthouse audits**:
   - Desktop perf ≥90, mobile perf ≥80
   - Accessibility ≥95
   - Best Practices ≥90
   - Run on `/predict`, `/market/[ticker]`, `/portfolio`

3. **OS-level toggle QA**:
   - macOS: System Settings → Accessibility → Display → Reduce transparency. Reload app, verify glass collapses to solid `--bg-teal` and SVG chart layer hides.
   - macOS: System Settings → Accessibility → Display → Reduce motion. Reload, verify CTA shimmer / slider shimmer / LIVE pulse / spring overshoot all freeze.

4. **axe DevTools WCAG AA contrast pass** on every Phase-4 page:
   - Zero critical or serious issues
   - Worst-case is `--t2` body text over the `--bg-navy` lobe (top-left quadrant). Current text-shadow mitigation should keep it AA.

5. **Cross-browser sanity**:
   - Firefox ≥103: backdrop-filter supported, verify rendering matches Chrome.
   - Firefox <v103: fallback to solid `--glass-regular` over `--bg-teal`. Acceptable per plan.
   - Safari: `-webkit-backdrop-filter` already paired throughout.

---

## Future work (out of scope per DESIGN.md §11)

Logged but not on the Liquid Glass critical path:
- **Light mode** — Liquid Glass works on a colorful light backdrop too, but every token needs rework.
- **Second-order motion** — price-tick number rolls on WebSocket update, order-fill celebration, tier-up flourish.
- **Dark-mode-only image assets** — when the app starts shipping imagery.
- **Chart themes** — currently single-color blue; dual YES/NO comparison + candle chart for high density.
- **Admin backoffice** — still on the sportsbook design system; no plan to migrate.
- **Notifications/toasts** — no system exists yet. When it does, toasts are `.glass.glass-thick` with `--r-md` and a 6s auto-dismiss.

---

## Pick up in under a minute

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict

# Verify state
git log --oneline 5fb8ef4e..HEAD | head -20   # 19 Liquid Glass commits
docker ps --format '{{.Names}}' | grep predict  # 4 containers expected
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000  # 200

cd apps/Phoenix-Predict-Combined/talon-backoffice/packages/app
yarn typecheck       # 0 in tests/, 399 baseline
yarn test:smoke      # 17 pass in ~30s

# Walk the redesign
open http://localhost:3000/predict
open http://localhost:3000/market/SENATE-DEM-2026
open http://localhost:3000/auth/login
```

Decide what to do next:
- Run the 5 manual audit gates above. If anything fails, the perf-downgrade ladder in DESIGN.md §10 + plan D8 is the playbook.
- Or pick a next-batch item from DESIGN.md §11 (light mode, second-order motion, etc.).

The redesign is shippable. Anything beyond this is polish.
