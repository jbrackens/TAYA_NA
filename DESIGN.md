# Design System — TAYA NA Predict

> Robinhood for prediction markets. Warm-dark surfaces, soft-flat cards, big confident numbers, a dominant chart, mint as the action color. Markets are treated like stocks: the question is the sub-headline, the price IS the page, two pill buttons commit you to a side.

This document governs the **Predict player app** at `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/` (port 3000). The admin backoffice is still on the sportsbook system (see `DESIGN-SPORTSBOOK.md`).

The prior Liquid Glass spec (active 2026-04-24 → 2026-04-26) is retired. Its decisions remain in §11 for context. Glass tokens, rim highlights, chromatic fringes, and the multi-stop backdrop scene are all out. Implementation lands in phases (see §11 entry 2026-04-26).

---

## Product Context

- **What this is:** binary event-contract exchange. Users trade YES/NO on real-world outcomes (politics, crypto, sports, entertainment, tech, economics).
- **Who it's for:** retail Gen Z and millennial traders who already live in a brokerage app. Comfortable with charts, prices, percentage deltas; not crypto-bros.
- **Competitors studied (design reference):**
  - Polymarket (light, blue, dense) — owns the "corporate-clean" lane.
  - Kalshi (light, mint, editorial) — owns the "financial-editorial" lane.
  - Pariflow (dark fintech) — prior Predict direction.
  - **Robinhood (warm dark, big numbers, dominant chart) — direction adopted 2026-04-26.**
- **Project type:** real-time trading web app.
- **Positioning:** Predict should feel familiar to anyone who has bought a stock. Calm warm-dark surfaces, big confident prices, the chart owns the hero, mint pops on the action button.

---

## 1. Aesthetic Direction

**Stock-detail-page treatment for prediction markets.** The hero IS a market detail. Big YES price (88px), green delta below it, gradient-filled chart dominates the right two-thirds, "Buy YES" and "Buy NO" sit as pill buttons. The market question becomes a sub-headline, not the page header. Below the hero: a stat row (24h volume, open interest, traders, closes), then a Top Movers rail. Discovery surfaces (homepage, category pages) reuse the same component vocabulary.

**Mood descriptors:** familiar, trustworthy, modern app, calm, confident.

**Decoration level:** minimal. No glass, no blur, no chromatic fringes, no backdrop scene. Surfaces carry weight through subtle borders and density alone.

**Explicit rejection:**
- **No glass / glassmorphism.** The Liquid Glass material is retired. Genres reset.
- **No bubble-radius.** Rounded but not playful. Cards 16px, pills full, smaller elements 8-12px.
- **No 3-stop accent gradient.** The mint→teal→azure brand gradient is retired. Accent is a single color now.
- **No multi-color backdrop.** No `--bg-navy`, `--bg-teal`, `--bg-mint`, `--bg-azure` orchestra. One warm-dark surface.
- **No purple/violet anywhere.** Reads as AI slop or crypto-broker.
- **No 3-column icon grid with colored circles.** Reads as SaaS marketing-site cliché.
- **No left sidebar** for categories. Category pills along the top.
- **No display serifs.** Considered editorial direction (Cosmos / Substack), rejected because it reads "magazine" not "trading app."
- **No pixel/CRT fonts.** Considered Y2K direction, rejected because it fights financial legitimacy.

---

## 2. Typography

- **Display + body:** `Inter` (Google Fonts, weights 400/500/600/700/800). Robinhood uses a custom font (Capsule Sans) but Inter at weight 600 reads close enough; widely available, performant. Replaces Outfit.
- **Display sub-variant for hero numbers:** `Inter Tight` if available — slightly tighter spacing for the 88px hero price. Falls back to Inter at -0.04em letter-spacing.
- **Numeric / tabular:** `IBM Plex Mono` with `font-variant-numeric: tabular-nums`. Used for prices in cards and price tickers. Big hero price uses Inter Tight (not mono) because the 88px size carries its own weight; mono at that scale fights the chart.
- **Fallback stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.

Loaded in `app/layout.tsx` via Google Fonts `<link>`. Drop the Outfit and Plex Sans loads.

### Scale

| Role | Weight | Size | Notes |
|------|--------|------|-------|
| Hero price (the big number) | 600 | 88 | Inter Tight. Letter-spacing -0.04em. 56px ¢ subscript at 500 weight, color `--t3`. |
| Page title | 700 | 28 | `/discover` page header etc. -0.02em. |
| Hero market question | 600 | 28 | The market question, treated as sub-headline below the eyebrow. -0.02em. |
| Section heading | 700 | 22 | "Featured markets," "Top Movers," "All markets." -0.02em. |
| Card title | 600 | 16 | Card market question. Line-height 1.3. -0.01em. |
| Body | 400 | 14 | Prose copy. Color `--t2`. |
| Eyebrow | 500 | 12 | "POLITICS / SENATE-DEM-2026" eyebrow on cards. Color `--t3`. |
| Stat label | 400 | 12 | Stat-row metric labels ("24h volume"). Color `--t3`. |
| Stat value | 600 | 18 | Stat-row metric values ("$45.6K"). Color `--t1`, tabular-nums. |
| Card price (mono) | 600 | 26 | Big single-side price on a card. Color `--t1`, tabular-nums, -0.02em. |
| Delta pill (mono) | 600 | 12 | "+5.2%" badge inside soft-color pill. tabular-nums. |
| Time-period pill | 600 | 12 | "1D" "1W" etc. inside chart period selector. |

No letter-spacing on lowercase text. Curly quotes (`"`) and ellipsis (`…`) in copy.

---

## 3. Color

### Background and surfaces

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-deep` | `#0F1414` | The page backdrop. Warm dark with a faint green undertone. Replaces `#06101c`. |
| `--surface-1` | `#161D1D` | Card and panel background. |
| `--surface-2` | `#1A2222` | Hovered card background. |
| `--border-1` | `#1c2828` | Subtle border for cards, panels, separators. ~1px. |
| `--border-2` | `#243030` | Slightly stronger border for emphasized panels. |

### Text (unchanged)

`--t1: #ffffff` / `--t2: rgba(255,255,255,0.72)` / `--t3: rgba(255,255,255,0.44)` / `--t4: rgba(255,255,255,0.28)`.

The big hero price uses `--t1` (white). The ¢ subscript and the secondary "Today" label use `--t3` for hierarchy.

### Brand accent (mint, unchanged)

`--accent: #2be480` is the only mint in the system. Used for:
- Primary CTA pill ("Buy YES"). Filled mint, ink-dark text.
- Active category pill (background mint, ink-dark text).
- Eyebrow "LIVE" indicator + pulse dot.
- Active state on time-period pill (soft mint background, mint text).
- Up indicator on charts and delta pills.

Accent family kept: `--accent-soft: rgba(43,228,128,0.14)` for soft pill backgrounds, `--accent-glow-color` for the LIVE pulse.

**Retired:** `--accent-hi`, `--accent-lo`, `--accent-deep`, `--accent-gradient`. The 3-stop signature gradient is gone.

### Semantic (data layer)

`--yes` and `--no` are the trading-signal colors, used for:
- Sparkline strokes (mint when going up, coral when going down).
- Delta pill text (mint for up, coral for down).
- Inline change indicators.

| Token | Value | Usage |
|-------|-------|-------|
| `--yes` | `#71eeb8` | Seafoam. **Resolved 2026-04-26:** keep seafoam, do not unify with `--accent`. Two-greens discipline preserved. |
| `--no` | `#ff8b6b` | Coral, unchanged. |
| `--yes-soft` | `rgba(113,238,184,0.14)` | Up-delta pill background. |
| `--no-soft` | `rgba(255,139,107,0.14)` | Down-delta pill background. |

`--live: #ff6b6b` — the only red, used for the "LIVE" pulse dot only.

### Loyalty tier colors (unchanged)

| Tier | Color | Note |
|------|-------|------|
| 1 Newcomer | `#94a3b8` slate | |
| 2 Trader | `#cbd5e1` slate-light | |
| 3 Sharp | `#d4a857` warm-gold-muted | |
| 4 Whale | `#9ca7bf` platinum-muted | |
| 5 Legend | `#8b5cf6` violet | The only violet anywhere; reserved for Legend tier. |

### Rules — strict two-greens discipline

The system has exactly two greens, and they live in **different layers**:

| Layer | Color | Used for |
|-------|-------|----------|
| **Action / brand** | `--accent` mint `#2be480` | Primary CTAs (Buy YES button), active state on category pills, active state on time-period pills, LIVE indicator pulse. **Anything the user clicks or that says "Taya brand."** |
| **Market signal** | `--yes` seafoam `#71eeb8` | Up-direction indicators: chart strokes when price is up, sparkline strokes when up, delta pill `+X.X%` text and background, the +2¢ change indicator below the hero price, YES price displays. **Anything that says "this number went up."** |

Mint and seafoam are visually distinguishable: mint is brighter/more saturated; seafoam is softer/desaturated. The eye reads them as related but distinct.

- `--accent` never colors a YES price. Buy YES button has a mint background but its label text is `#061a10` ink-dark.
- `--yes` never colors a CTA button. Up-arrow indicators next to a hero price are seafoam, not mint.
- One coral. `--no` is the only coral. Used symmetrically with seafoam: NO prices, down-direction sparklines, down delta pills.
- No purple anywhere except the Legend tier badge.
- No amber anywhere. Amber was retired with the WhaleTicker (2026-04-24) and stays retired.

---

## 4. Surfaces (replaces "Material System")

Flat soft surfaces. No blur, no rim highlights, no chromatic edges, no backdrop refraction.

### The recipe

```css
.card {
  background: var(--surface-1);
  border: 1px solid var(--border-1);
  border-radius: 16px;
  padding: 22px;
  transition: background 120ms, transform 120ms;
}
.card:hover {
  background: var(--surface-2);
  transform: translateY(-2px);
}
```

That is the entire surface system. No tiers, no glass-thick / glass-thin / glass-inset hierarchy. One card style; emphasis comes from size and content, not material.

The hero is the same surface, sized larger and split across a 2.5fr/1fr grid with the Top Movers rail.

### Pills

Three pill types share the same shape (full radius) but vary in fill:

```css
/* Primary action — Buy YES */
.pill-primary {
  background: var(--accent);
  color: #061a10;
  font-weight: 600;
  padding: 16px 24px;
  border-radius: 999px;
  border: 0;
}

/* Soft action — Buy NO */
.pill-soft {
  background: var(--no-soft);
  color: var(--no);
  font-weight: 600;
  padding: 16px 24px;
  border-radius: 999px;
  border: 0;
}

/* Category / period pill — secondary controls */
.pill-tonal {
  background: rgba(255,255,255,0.05);
  color: var(--t2);
  padding: 9px 18px;
  border-radius: 999px;
  font-weight: 500;
}
.pill-tonal.is-active {
  background: var(--accent);
  color: #061a10;
  font-weight: 600;
}
```

### Delta pills (the "+5.2%" badges)

```css
.delta-up   { background: var(--accent-soft); color: var(--accent); padding: 4px 10px; border-radius: 999px; font: 600 12px / 1 var(--font-mono); }
.delta-down { background: var(--no-soft);     color: var(--no);     /* same shape */ }
```

### When NOT to use a card

- Inline data (stat row, ticker lists). No card chrome; just typography and spacing.
- Page-level headers and intro copy. Live on the page background directly.
- The big hero price + chart area inside the hero card; the hero is one card, the price/chart/buttons are content within it.

---

## 5. Layout

### Shell structure

- Top nav bar (`TopBar`) sticky at top, 60px tall, sits on `--bg-deep`.
- Page content under it, `max-width: 1280px`, horizontally centered, padded `0 24px` (16px on mobile).
- Pages stack their own sections vertically. No left sidebar.

### Homepage `/predict`

```
[Top nav]

[Category pills row]
  All · Politics · Crypto · Sports · Tech · Entertainment · Economics

[Hero card]
  Eyebrow (LIVE · category · ticker)
  Market question (sub-headline)
  Big YES price (88px)              | Top Movers rail (vertical)
  Delta + Today                     |   - Each row: category pill,
  [Chart, gradient-filled]          |     question (2-line clamp),
  [Time-period pills: 1H 1D 1W…]    |     mini sparkline,
  [Buy YES] [Buy NO]                |     big price, delta pill
  [Stats row: vol / OI / traders / closes]

[Featured markets section]
  Cards — sparkline + big single price + delta pill

[All markets section]
  Cards (paginated, "Load more")
```

### Filter behavior

Both filters on `/predict` live in the **same row** at the top of the All Markets section. Category pills on the left, closing-window pills on the right. They compose: pick **Politics** + **1D** to see political markets closing within 24h.

- **Category pills** (`All · Politics · Crypto · Sports · ...`) — primary filter. Scope only the All Markets section.
- **Closing-window pills** (`All · 1D · 1W · 1M`) — secondary filter. Scope only the All Markets section. Visually distinct from the category pills (segmented control with subtle container).
- **Both filters scope All Markets only.** Hero, Top Movers, and Featured grid stay visible at all filter states. Featured is curated cross-category by design and doesn't filter — picking "Politics" + "1D" still shows the Featured row above (general featured markets), then the All Markets grid filtered to political markets closing within 24h.
- **Time-period pills** (1H/1D/1W/1M/3M/ALL) live INSIDE the hero chart only. They scope the chart's price history. Different control, different job from the closing-window pills.

Self-correction history:
- P4 (2026-04-26): closing-window pills removed; category pills moved to top-of-page above hero. Both wrong.
- This commit (2026-04-26): closing-window pills restored. Category pills moved into the All Markets header row alongside the date pills. The filter row is the section header — there's no separate "All markets" title above the grid. This consolidation makes filter scoping self-evident: filters live where the filtering happens.

### Grid

- Featured markets: `repeat(auto-fill, minmax(280px, 1fr))`, gap 16px.
- All markets: same.
- Hero/Top Movers split: `2.5fr 1fr` (or `1fr 380px`) on desktop, single column ≤960px.

### Radius

Less bubbly than Liquid Glass:

| Token | Old (Liquid Glass) | New (Robinhood) | Used for |
|-------|----|------|------|
| `--r-sm` | 10px | 8px | Inline elements, small inputs. |
| `--r-md` | 16px | 12px | Compact pills, inputs. |
| `--r-lg` | 22px | 16px | Cards, hero. |
| `--r-xl` | 28px | 20px | Modals, large surfaces. |
| `--r-pill` | 999px | 999px | Buttons, category pills, delta pills. |

Inner elements always use a smaller radius than their parent (inner = outer − gap, minimum 4px).

---

## 6. Motion

Minimal-functional. No spring physics, no overshoot, no glass-wet feel.

- **Easing:** `ease-out` for entering, `ease-in` for exiting, `ease-in-out` for moving.
- **Duration:** 120ms for hover and tap, 180-220ms for transitions, 800ms for the LIVE pulse animation.
- **Properties:** only `transform`, `opacity`, `background-color`, `border-color`. Never `width`, `height`, `top`, `left`.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` collapses all animations to instant.

The two motion patterns that ship:
1. **Card hover lift:** `translateY(-2px)` + `--surface-2` background, 120ms.
2. **LIVE pulse:** `box-shadow` ring expanding from `rgba(43,228,128,0.18)` to transparent over 2s, infinite.

Charts get an entrance fade on mount (200ms opacity 0 → 1). The line is drawn via SVG path; no animated stroke-dashoffset reveal.

---

## 7. Components

### Roster (post-redesign)

- **DiscoveryHero** — hero card with eyebrow, market question, big price, delta, gradient-filled chart, time-period pills, Buy YES / Buy NO, stat row.
- **TopMoversRail** (replaces TrendingSidebar) — vertical list of trending markets. Each row: category pill, question (2-line), mini sparkline, big price (right-aligned), delta pill below.
- **MarketCard** — soft-flat card. Head: category pill + days-left. Title: 16px / 600. Sparkline (36px tall, full-width, stroke matches direction). Price row: BOTH YES + NO prices (22px mono, seafoam YES, coral NO) on the left, delta pill on the right. Footer: volume.
- **AllMarketsSection** — paginated grid. Section header is a single row of pills: category pills (`All / Politics / Crypto / ...`) on the left, closing-window pill segmented control (`All / 1D / 1W / 1M`) on the right. No title — the layout is self-evident. Owns its own filter state. "Load more" pill at bottom.
- **MarketFilterBar** — retired 2026-04-26. The category pill row it used to render now lives inline inside AllMarketsSection.
- **TopBar** — top navigation, unchanged structurally; warm-dark background instead of glass.
- **MarketHead, OrderBook, RecentTrades, TradeTicket** — market detail page components, restyled for warm-dark surfaces but functionally unchanged.

### Components retired in this redesign

- **Backdrop scene + BackdropScene SVG.** No more multi-color backdrop. Single `--bg-deep`.
- **Glass utility classes** (`.glass`, `.glass-thick`, `.glass-thin`, `.glass-rim`, `.glass-fringe`). Retire after P2-P6 sweep.
- **Liquid-glass spring physics keyframes.** Replaced with simple ease-out transitions.
- **CategoryPills** — folded into MarketFilterBar's category row.

### Component rules

- **Hero owns the page.** The hero card is the single most important element on `/predict` and `/market/[ticker]`. Other surfaces are supporting.
- **Sparklines everywhere.** Trending rail, market cards, hero chart. Mint stroke when up, coral when down. No fill on small ones (rail / card); gradient fill on the hero chart.
- **Delta pills are the indicator pattern.** Anywhere a price is shown, a delta pill says where it's been recently. `+X.X%` for up, `-X.X%` for down, mint background for up, coral for down.
- **Big numbers carry hierarchy.** A 26px card price + 12px delta pill is the same pattern at three scales (card, rail, hero — 26 / 30 / 88).

---

## 8. Accessibility

### Contrast

- Body text on `--bg-deep`: `--t1` is 18:1, `--t2` is 13:1, `--t3` is 8:1. All exceed WCAG AAA.
- Mint `#2be480` on dark `#0F1414`: 9.1:1, exceeds AA Large + AAA.
- Mint on white (button label): 4.0:1 — borderline. Use `#061a10` ink-dark text on the mint button instead, which gives 18:1.
- Coral `#ff8b6b` on dark: 6.3:1, AA.

### Reduced transparency

`prefers-reduced-transparency: reduce` is now mostly a no-op since the system is opaque by default. Soft pill backgrounds (`var(--accent-soft)`, `var(--no-soft)`) become solid mint/coral at low alpha.

### Reduced motion

`prefers-reduced-motion: reduce` disables: card hover lift, LIVE pulse, chart entrance fade. Static states remain.

### Keyboard navigation

- All interactive elements have visible `:focus-visible` rings (2px mint outline at 2px offset).
- Tab order follows visual order: nav → category pills → hero buy buttons → time-period pills → stat row → featured cards → all markets.
- The chart is non-interactive at keyboard level (visual only). Time-period pills are buttons in tab order.

---

## 9. Performance budget

- LCP < 2.0s.
- CLS < 0.1.
- Hero chart SVG inline; no JS chart library.
- Sparkline SVGs inline; no JS chart library on cards.
- Fonts: `font-display: swap`. Preconnect to Google Fonts CDN. Critical font (Inter regular + 600) preloaded.
- No backdrop-filter anywhere (Liquid Glass blur dropped).
- No box-shadow on cards (uses border instead).

---

## 10. What's out of scope

- Light mode. Dark only for now.
- Internationalization. English only for now.
- Custom font (Capsule-style) — using Inter as approximation. May commission a custom display face later.
- 3D / depth effects. The Robinhood look is flat-soft, not skeuomorphic.
- Variable / animated gradients. Backgrounds are static.
- Dense table view (Bloomberg / dexscreener style). Considered for D direction; rejected for first pass. Could be added later as `/predict?view=dense`.

---

## 11. Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-17 | Dropped left sidebar | None of Kalshi / Polymarket / Pariflow use one; horizontal top nav is the category convention. |
| 2026-04-17 | Outfit over IBM Plex Sans | Outfit is what Pariflow uses; scales cleaner at display sizes. (Superseded 2026-04-26.) |
| 2026-04-17 | Orbitron removed | Sci-fi/gaming signal. Fintech doesn't use decorative display fonts. |
| 2026-04-17 | ~~Cyan #22d3ee accent~~ | Superseded 2026-04-23. Kept in log for context. |
| 2026-04-17 | IBM Plex Mono for prices/volumes | Adds precision/trader-desk feel for numeric data. |
| 2026-04-17 | Sparklines per market card | Deterministic placeholder until backend exposes historical prices. |
| 2026-04-23 | ~~Reversed cyan → neon phoenix green `#39ff14`~~ | Superseded 2026-04-24. Kept in log for context. |
| 2026-04-23 | Restored TN speech-bubble logo | Retired 2026-04-24 in favor of gradient BrandMark. Kept in log. |
| 2026-04-23 | ~~Two-greens discipline~~ | Superseded 2026-04-24. YES semantic color moved to blue. Kept in log. |
| 2026-04-24 | **~~Pivoted to Liquid Glass on cool-palette scene~~** | Superseded 2026-04-26. Liquid Glass executed cleanly but read as "another dark fintech with iOS 26 aesthetics" — the genre was exhausted. Adopted Robinhood-inspired direction. Liquid Glass spec preserved in git history pre-2026-04-26. |
| 2026-04-24 | **Accent: phoenix lime → mint emerald `#2be480`** | Mint reads as "trading tool" rather than "crypto casino." Stays under Robinhood spec. |
| 2026-04-24 | ~~3-stop signature gradient mint → teal → azure~~ | Retired 2026-04-26 with Liquid Glass. Robinhood spec uses solo mint. |
| 2026-04-24 | ~~YES blue / NO peach~~ | Superseded 2026-04-25. Kept in log. |
| 2026-04-24 | ~~Backdrop teal/navy/mint orchestra~~ | Retired 2026-04-26. Single warm-dark `#0F1414` instead. |
| 2026-04-24 | **Retired WhaleTicker / amber palette** | Pariflow-era broadcast feature. Stays retired. |
| 2026-04-24 | ~~Radii bumped to 10/16/22/28~~ | Superseded 2026-04-26. Robinhood spec runs less bubbly: 8/12/16/20. |
| 2026-04-24 | ~~Spring physics on interactive transitions~~ | Retired 2026-04-26 with Liquid Glass. Robinhood motion is minimal-functional. |
| 2026-04-24 | ~~Mandatory `prefers-reduced-transparency` fallback~~ | Mostly moot under Robinhood spec — system is opaque by default. |
| 2026-04-25 | **Phase 1–5 of Liquid Glass shipped** | 19 commits between `5fb8ef4e` and `66cb92c5`. Direction superseded 2026-04-26 before final QA. |
| 2026-04-25 | **TopBar nav links conditionally rendered, not display-none** | Smoke test fix; structural decision unchanged by 2026-04-26 redesign. |
| 2026-04-25 | **YES/NO palette: seafoam green + coral** (third iteration) | Reconsidered 2026-04-26: Robinhood uses ONE green (mint) for both brand and up-direction. P2 will decide whether to unify YES with the brand mint or keep seafoam as a deliberately-softer market signal. Coral NO stays. |
| 2026-04-26 | **Pivoted from Liquid Glass to Robinhood-inspired** | Compared against Polymarket (corporate-clean), Kalshi (editorial-financial), Pariflow (dark-fintech), and the live Liquid Glass implementation. Liquid Glass execution was strong but visually generic — every dark fintech dashboard from 2023-2025 uses the same recipe. Robinhood-inspired direction (warm-dark, big numbers, dominant chart, soft-flat cards, mint as the action color, category pills as primary filter) claims the "stock-detail-page treatment for prediction markets" lane. Friendly enough for first-time traders, polished enough for Gen Z users who already live in a brokerage app. Decision validated by mock at `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/public/taya-direction-mocks.html` direction B. |
| 2026-04-26 | **Migration phasing** | Six phases land independently, one commit per phase. P1: this DESIGN.md rewrite (specs only). P2: tokens + DiscoveryHero + TopMoversRail. P3: MarketCard + AllMarketsSection cards. P4: MarketFilterBar reskin. P5: market detail page. P6: category + portfolio polish. Each phase ships behind no flags; the team accepts a partial-styled state between phases for a few hours. |
| 2026-04-26 | **Self-correction: restored NO price on cards + closing-window pills on /predict** | P3 dropped the NO price on MarketCard, showing only the leading side ("Robinhood single-price treatment"). P4 dropped the closing-window filter ("homepage stays focused on category browsing"). Both decisions made the homepage worse, surfaced by user testing the same day they shipped. Why P3 was wrong: prediction markets aren't stocks — both sides are tradeable instruments with prices that move independently. Forcing the user to mentally compute "if YES is 71¢, NO is 29¢" violates "don't make me think" (Krug). Polymarket and Kalshi both show both prices for this reason. Why P4 was wrong: closing-window scoping is a real use case on the homepage, not just a /discover concern. Politics markets in their final 24h have different risk/reward than 6-month-out markets. Fix: cards now show YES seafoam + NO coral side-by-side; AllMarketsSection has its own internal All/1D/1W/1M pill control in the section header. Composes with category pills (e.g., Politics + 1D = political markets closing within 24h). |
| 2026-04-26 | **Filter consolidation: combined-filter row + Featured always shows** | Right after the previous self-correction, a second iteration: the standalone "All markets" heading was redundant, and the category pills (then sitting above the hero) read as page-level navigation rather than what they are: scope for the All Markets section. Move: drop the "All markets" heading, drop the standalone MarketFilterBar above the hero, render category pills + closing-window pills in the same row inside AllMarketsSection's header. Featured grid now shows at all filter states (was hidden when filter was active — confusing, since pills are now BELOW Featured). Filter row reads as the section header it actually is. MarketFilterBar.tsx deleted; AllMarketsSection owns both pieces of filter state. |
| 2026-04-27 | **P5 shipped: market detail page collapsed hero + full-width trade ticket** | Restyled MarketHead, MarketChart, OrderBook, RecentTrades, TradeTicket from glass to warm-dark surfaces. Two structural changes per design review: (1) MarketHead + MarketChart collapse into one continuous card via a `.md-hero` wrapper that uses CSS specificity (`.md-hero .mh`, `.md-hero .mc-card`) to drop the children's individual card chrome — no component prop changes. (2) TradeTicket moves from sticky right sidebar to a centered full-width block below the chart (max-width 720px). Order book and recent trades now sit in their own row below the ticket. Single-column vertical flow. Chart line color is now direction-aware (seafoam up / coral down) computed from previousPriceCents; the SVG glow filter and double-stroke are dropped. Stats row 18px/600. |
| 2026-04-27 | **P6 shipped: TopBar + portfolio + category restyled, primary surfaces complete** | TopBar drops backdrop-filter blur, drops `--accent-gradient` (mint pill is solid `--accent`), Inter replaces Outfit on the balance label, search results dropdown uses `--surface-1` instead of glass. Active nav link is mint-filled (was a soft white inset highlight). Portfolio's stat strip + tab bar + table all swap from glass to warm-dark surfaces; stat value color glows are dropped. Category page (`/category/[slug]`) page-title weight matches the design system (700 not 800), empty state uses `--surface-1` instead of dashed-glass. Primary player surfaces (predict, discover, market detail, category, portfolio, top nav) are now Robinhood-treated. Out of scope for this migration: cashier (sportsbook era), auth pages, leaderboards, rewards, account, profile — they retain the glass treatment until separately touched. The legacy `--glass-*`, `--rim-*`, `--chroma-*`, `--bg-{navy,teal,mint,azure}`, `--accent-{hi,lo,deep,gradient}`, `--yes-{glow,border,hi,lo}`, `--no-{glow,border,hi,lo}` tokens stay in `globals.css` for those secondary surfaces. The `.glass` utility class stays. Outfit font load stays in `layout.tsx` for the same reason. Each will be retired the next time the secondary surface that uses them is restyled. |
