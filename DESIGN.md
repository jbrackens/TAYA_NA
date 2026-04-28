# Design System — TAYA NA Predict

> Robinhood for prediction markets, **light theme**. Warm-light surfaces on a faint chart-paper grid, soft-flat cards, big confident numbers, a dominant chart, mint as the action color. Markets are treated like stocks: the question is the sub-headline, the price IS the page, two pill buttons commit you to a side.

This document governs the **Predict player app** at `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/` (port 3000). The admin backoffice is still on the sportsbook system (see `DESIGN-SPORTSBOOK.md`).

The prior Liquid Glass spec (active 2026-04-24 → 2026-04-26) is retired. The warm-dark Robinhood spec (active 2026-04-26 → 2026-04-27) is retired. Their decisions remain in §11 for context. Glass tokens, rim highlights, chromatic fringes, multi-stop backdrop scene, and the dark surface system are all out. Implementation lands in phases (see §11 entry 2026-04-27 P8).

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

**Mood descriptors:** familiar, trustworthy, modern app, calm, confident. Light theme keeps the same Robinhood-stock-detail-page mood; only the surface flips from dark to light.

**Decoration level:** minimal-with-grid. No glass, no blur, no chromatic fringes, no backdrop scene. Page background carries a faint chart-paper grid (3.5% opacity, 32px squares) — the only decoration. Cards stay flat on top of it; weight comes from hairline borders, density, and the bar visualization.

**Explicit rejection:**
- **No glass / glassmorphism.** The Liquid Glass material is retired. Genres reset.
- **No bubble-radius.** Rounded but not playful. Cards 14px, pills full, smaller elements 6–10px.
- **No 3-stop accent gradient.** The mint→teal→azure brand gradient is retired. Accent is a single color now.
- **No multi-color backdrop.** One warm-light surface (cream `#F7F3ED`) with a faint chart-paper grid. No `--bg-navy`, `--bg-teal`, `--bg-mint`, `--bg-azure` orchestra.
- **No corporate pure-white.** Polymarket and Kalshi go pure white; we go warm cream. Distinguishable in the category lane.
- **No editorial-magazine vibe.** Considered diagonal hatch (Robin Markets) and serif headers (Cosmos / Substack); both read "newsletter" not "trading app." Rejected. Background pattern is chart-paper grid (stock-trading vocabulary), title font is sans (Inter Tight).
- **No purple/violet anywhere.** Reads as AI slop or crypto-broker.
- **No 3-column icon grid with colored circles.** Reads as SaaS marketing-site cliché.
- **No left sidebar** for categories. Category pills along the top.
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

### Background and surfaces (light)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-deep` | `#F7F3ED` | The page backdrop. Warm cream — distinguishably warmer than pure white. Replaces the warm-dark `#0F1414`. |
| `--bg-pattern` | chart-paper grid (32px, `rgba(26,26,26,0.035)`) | Faint stock-paper grid layered on `--bg-deep`. Page-level only — cards, panels, and modals do not carry the pattern. |
| `--surface-1` | `#FFFFFF` | Card and panel background. Pure white sits cleanly on the cream backdrop without competing. |
| `--surface-2` | `#FCFAF5` | Hovered card / inner subsurface background. Slightly cream-tinted to match the page. |
| `--border-1` | `#E5DFD2` | Hairline beige border for cards, panels, separators. ~1px. |
| `--border-2` | `#D9D2BF` | Slightly stronger beige for emphasized or hovered borders. |

### Text (warm-dark on cream)

`--t1: #1A1A1A` / `--t2: #4A4A4A` / `--t3: #8B8378` / `--t4: #B5AE9F`.

Warm gray hierarchy — the muted tones (`--t3`, `--t4`) carry a warm beige cast (`#8B…`, `#B5…`) rather than cool slate, so they pair with the cream backdrop. The big hero price uses `--t1`. The ¢ subscript and "Today" labels use `--t3` for hierarchy.

### Brand accent (mint, unchanged)

`--accent: #2be480` is the only mint in the system. Used for:
- Primary CTA pill ("Buy YES"). Filled mint, ink-dark text.
- Active category pill (background mint, ink-dark text).
- Eyebrow "LIVE" indicator + pulse dot.
- Active state on time-period pill (soft mint background, mint text).
- Up indicator on charts and delta pills.

Accent family kept: `--accent-soft: rgba(43,228,128,0.14)` for soft pill backgrounds, `--accent-glow-color` for the LIVE pulse.

**Retired:** `--accent-hi`, `--accent-lo`, `--accent-deep`, `--accent-gradient`. The 3-stop signature gradient is gone.

### Semantic (data layer — kept seafoam + coral)

`--yes` and `--no` are the trading-signal colors. **Resolved 2026-04-27 (P8):** the entire semantic palette stays unchanged through the light pivot — the same seafoam YES + coral NO hues we tuned in the dark theme work on the cream surface (verified in P8 mockup). The only change is two new tokens for the probability bar fill:

| Token | Value | Usage |
|-------|-------|-------|
| `--yes` | `#71eeb8` | Seafoam — used for: line-chart strokes when up, "YES" labels in card pills, up-delta indicators, the YES-side probability-bar segment when needing the saturated tone. |
| `--yes-text` | `#1A6849` | Dark seafoam for text-on-light contexts (small "YES" pill labels). 6.7:1 on white `--surface-1`, 6.1:1 on cream `--bg-deep`, 6.5:1 on hover-surface `--surface-2` — AA pass on all three. |
| `--yes-soft` | `rgba(113,238,184,0.18)` | Up-delta pill background. |
| `--yes-bar` | `#8FE5C4` | Calmer seafoam for the YES segment of the probability bar — desaturated so the bar feels like a calm split, not a brand. |
| `--no` | `#ff8b6b` | Coral, unchanged. Used for: line-chart strokes when down, "NO" labels in card pills, down indicators. |
| `--no-text` | `#A8472D` | Dark coral for text-on-light contexts. 5.8:1 on white `--surface-1`, 5.3:1 on cream `--bg-deep`, 5.6:1 on hover-surface `--surface-2` — AA pass on all three. |
| `--no-soft` | `rgba(255,139,107,0.16)` | Down-delta pill background. |
| `--no-bar` | `#F4A990` | Calmer coral for the NO segment of the probability bar. |

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

Flat soft surfaces on a cream page with a chart-paper grid. No blur, no rim highlights, no chromatic edges, no backdrop refraction.

### Page background

```css
body {
  background: var(--bg-deep); /* #F7F3ED cream */
  background-image:
    linear-gradient(to right, rgba(26,26,26,0.035) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(26,26,26,0.035) 1px, transparent 1px);
  background-size: 32px 32px;
}
```

The grid is the only decoration in the system. **Stock-trading vocabulary, not editorial.** Considered alternatives logged 2026-04-27: diagonal hatch (Robin Markets — too editorial), ticker-tape horizontal lines (more "stock-ticker" than "stock-chart"), dotted grid (too retail-y). Graph paper won.

### Card recipe

```css
.card {
  background: var(--surface-1);          /* white */
  border: 1px solid var(--border-1);     /* hairline beige */
  border-radius: 14px;
  padding: 20px;
  transition: transform 140ms, box-shadow 140ms, border-color 140ms;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(60, 50, 30, 0.08);   /* warm soft shadow */
  border-color: var(--border-2);
}
```

That is the entire surface system. No tiers, no glass-thick / glass-thin / glass-inset hierarchy. One card style; emphasis comes from size and content, not material. The warm soft shadow on hover is intentional — on light surfaces a flat hover state reads as broken.

The hero is the same surface, sized larger and split across a 2.5fr/1fr grid with the trade ticket.

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

- **DiscoveryHero** — hero card with eyebrow, market question, big price, delta, gradient-filled chart (sage line, soft seafoam fill below), time-period pills, Buy YES / Buy NO, stat row.
- **TopMoversRail** (replaces TrendingSidebar) — vertical list of trending markets. Each row: category pill, question (2-line), mini sparkline, big price (right-aligned), delta pill below.
- **MarketCard** (rewritten 2026-04-27 for P8) — see "MarketCard composition" below. Replaces the dark-theme P3 card (sparkline + dual mono prices + delta pill).
- **AllMarketsSection** — paginated grid. Section header is a single row of pills: category pills (`All / Politics / Crypto / ...`) on the left, closing-window pill segmented control (`All / 1D / 1W / 1M`) on the right. No title — the layout is self-evident. Owns its own filter state. "Load more" pill at bottom.
- **MarketFilterBar** — retired 2026-04-26. The category pill row it used to render now lives inline inside AllMarketsSection.
- **TopBar** — top navigation, unchanged structurally; opaque cream background `--bg-deep` with a 1px hairline `--border-1` bottom edge for sticky-state distinction. No backdrop-filter — consistent with §9's "no backdrop-filter anywhere" rule and the P6 retirement of TopBar blur (see §11 `2026-04-27 P6 shipped`).
- **MarketHead, OrderBook, RecentTrades, TradeTicket** — market detail page components, restyled for the new light surfaces.

### MarketCard composition (P8)

```
┌─────────────────────────────────────────────────────┐
│ [POLITICS]                              [⊙ image]   │ ← eyebrow + corner image
│ Will Trump acquire Greenland before 2027?           │ ← title 2-line clamped
├─────────────────────────────────────────────────────┤
│ ▢ Volume                              $25K          │ ← 3 stat rows with line icons
│ ▢ Closes                       Dec 31, 2026         │
│ ▢ Open interest                  37.94 NO           │
├─────────────────────────────────────────────────────┤
│ ▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 7%   93%  │ ← probability bar split,
│                                                     │   sage YES + coral NO,
│                                                     │   widths = prices, % overlaid
├─────────────────────────────────────────────────────┤
│ [ YES   7¢ ]            [ NO   93¢ ]                │ ← clear pills with prices
└─────────────────────────────────────────────────────┘
```

**Rules:**
- **Card image is required.** Every card carries a circular image in the top-right corner, ~44×44px (≤15% of card area at 300px-wide grid). Imported markets use the `imagePath` populated by the discovery sync. Native (gateway-authored) markets use a deterministic placeholder — colored monogram disc, hue derived from category, label = first ~2 chars of the ticker. Never render a card with an empty corner.
- **Probability bar replaces the sparkline.** Two solid horizontal segments inside a 28px-tall, 6px-radius track: sage `--yes-bar` for YES (left), coral `--no-bar` for NO (right). Segment widths are proportional to prices (which equal probabilities for binary contracts). The leading-side **percentage** is overlaid right-aligned in dark text on the larger segment; the trailing-side percentage is overlaid left-aligned in dark text on the smaller segment. Smooths to widths on price update with a 200ms transition.
- **Min segment width on extremes.** When a side's probability is ≤5% (or, equivalently, a price ≤5¢), the corresponding bar segment renders at a min-width of 12px instead of its proportional width — anything narrower disappears visually and can't carry overlaid text. The dominant segment shrinks to absorb the difference (its width = 100% − 12px), keeping the track full-width. The percentage that would have been overlaid on the small segment is moved **outside** the bar — rendered just above the small segment in `--t2`, 12px IBM Plex Mono. Mirrored for the opposite extreme (NO ≤5%).
- **Clear pills carry the price.** Two side-by-side pills below the bar: light gray fill `--surface-2`, hairline beige border, 999px radius. Left pill: `YES` label in `--yes-text` + price in `¢` mono `--yes-text`. Right pill: `NO` label in `--no-text` + price in `¢` mono `--no-text`. The pill IS the click affordance for fast-trade flows on `/predict`.
- **Stat rows replace the volume footer.** Three rows max: Volume / Closes / Open interest. Line-icon (14px) on the left, label in `--t3`, value in `--t1` IBM Plex Mono on the right. The "Open interest" row uses the Robin convention of showing the leading side as an inline pill ("37.94 NO" or "84.47 YES") — gives a quick read of which side has more conviction.

**Bar % vs pill ¢ — why both numbers?** In a binary market, YES price (¢) equals YES probability (%) by definition. They are mathematically the same number. The bar shows the **split visually** (the eye reads "this market is mostly NO" from the bar widths alone); the pills show the **execution price** (the user clicks one to trade). Different jobs, same number.

### Legacy token disposition (carries forward from P6)

The dark-theme tokens still living in `globals.css` — `--glass-*`, `--rim-*`, `--chroma-*`, `--bg-{navy,teal,mint,azure}`, `--accent-{hi,lo,deep,gradient}`, `--yes-{glow,border,hi,lo}`, `--no-{glow,border,hi,lo}` — are **not** deleted wholesale in P8. The retirement policy is per-surface, inherited from the P6 entry in §11: a token retires when the last surface consuming it migrates to the light system. The implementation agent for P8 should:

1. Migrate `--bg-deep`, `--surface-*`, `--border-*`, `--t*` tokens to their P8 values (the warm-light values listed in §3 §4 above).
2. Migrate the MarketCard component to the new composition.
3. Leave the legacy dark tokens in `globals.css` untouched. PR #2 (`p7-cleanup-tokens`) already retires the 10 already-unreferenced glass-era tokens; remaining tokens get retired on future cleanup PRs as each consuming surface migrates.

This avoids a wave of cascading breakage on secondary surfaces that haven't been restyled yet (cashier was migrated in P7 / PR #1 alongside auth, leaderboards, rewards, account, profile — those have already moved off the dark token system; the office back-office and any non-app legacy CSS still consume them).

### Components retired in this redesign

- **Backdrop scene + BackdropScene SVG.** No more multi-color backdrop. Single `--bg-deep`.
- **Glass utility classes** (`.glass`, `.glass-thick`, `.glass-thin`, `.glass-rim`, `.glass-fringe`). Retire after P2-P6 sweep.
- **Liquid-glass spring physics keyframes.** Replaced with simple ease-out transitions.
- **CategoryPills** — folded into MarketFilterBar's category row.

### Component rules

- **Hero owns the page.** The hero card is the single most important element on `/predict` and `/market/[ticker]`. Other surfaces are supporting.
- **Probability bars on cards, sparklines in the trending rail and hero chart.** P8 swap: cards visualize the YES/NO split (more useful for the buy decision); the sparkline pattern stays for the trending rail and hero chart where price-history-over-time is the right read.
- **Delta pills are kept on the rail and hero.** Anywhere a single price is shown without a bar, a delta pill says where it's been recently. Sage `+X.X%` for up, coral `-X.X%` for down. On cards the delta is folded into the bar+pills (no separate delta pill on the card).
- **Big numbers carry hierarchy.** Hero hero 72–88px, rail 30px, card pills 14–16px (price + side-label). Same Inter Tight + IBM Plex Mono recipe at every scale.

---

## 8. Accessibility

### Contrast (light theme)

Ratios computed with the WCAG 2.x relative-luminance formula. Cream `--bg-deep` = `#F7F3ED` (Y ≈ 0.899); white `--surface-1` = `#FFFFFF` (Y = 1.000); hover surface `--surface-2` = `#FCFAF5` (Y ≈ 0.956). AA = 4.5:1 normal text / 3.0:1 large; AA non-text UI = 3.0:1 (WCAG 2.5.8). Numbers below were recomputed 2026-04-27 after a review pass caught the original spec overstating ratios by ~1.3–2.0× — the token values were darkened until both white and cream cleared AA.

- `--t1` `#1A1A1A` body text: 16.6:1 on cream, 17.5:1 on white. AAA on both.
- `--t2` `#4A4A4A` secondary text: 8.4:1 on cream, 8.9:1 on white. AAA on both.
- `--t3` `#8B8378` metadata text: 3.4:1 on cream, 3.6:1 on white. **Passes AA Large only** — use only for ≥18px or ≥14px-bold metadata text, never for body.
- Mint `--accent` `#2be480` text on cream: 1.6:1 — fails. **Never use mint as text.** Mint is only for fills (button bg, active pill bg, LIVE pulse). Button label text on mint stays `#04140a` ink-dark (≈ 16:1).
- Seafoam `--yes` `#71eeb8` text on white: 1.9:1 — fails. **Use `--yes-text` `#1A6849`** for all seafoam-colored text on light surfaces — 6.7:1 on white, 6.1:1 on cream, 6.5:1 on `--surface-2`. AA pass on all three. The `--yes` hue is reserved for fills (chart strokes, bar segments, soft pill backgrounds).
- Coral `--no` `#ff8b6b` text on white: 2.8:1 — fails AA for body. **Use `--no-text` `#A8472D`** for coral-colored text on light — 5.8:1 on white, 5.3:1 on cream, 5.6:1 on `--surface-2`. AA pass on all three. `--no` for fills only.
- Probability-bar overlay text: `7%` in `#1A4830` on `--yes-bar` `#8FE5C4` ≈ 7.0:1; `93%` in `#5C2516` on `--no-bar` `#F4A990` ≈ 6.3:1. Both AA. These two overlay colors are component-local constants and intentionally not promoted to tokens — they only ever appear inside the probability bar.

### Reduced transparency

`prefers-reduced-transparency: reduce` is now mostly a no-op since the system is opaque by default. Soft pill backgrounds (`var(--accent-soft)`, `var(--no-soft)`) become solid mint/coral at low alpha.

### Reduced motion

`prefers-reduced-motion: reduce` disables: card hover lift, LIVE pulse, chart entrance fade. Static states remain.

### Keyboard navigation

- All interactive elements have visible `:focus-visible` rings: 2px outline `#0E7A53` at 2px offset (a darker mint that clears 4.8:1 on cream and 6.0:1 on white, satisfying WCAG 2.5.8 non-text contrast). The brand mint `--accent` `#2be480` is **not** used for the focus ring on light surfaces because it only reaches 1.6:1 on cream and fails 3:1.
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

- **Dark mode.** Was the only mode through 2026-04-27. P8 pivot inverts: light is the only mode now. Dark mode could return as a user preference later but is not in scope for the P8 implementation. (Carried-forward retiree from the original §10: "Light mode. Dark only for now" — flipped 2026-04-27.)
- Internationalization. English only for now.
- Custom font (Capsule-style) — using Inter as approximation. May commission a custom display face later.
- 3D / depth effects. The Robinhood look is flat-soft, not skeuomorphic.
- Variable / animated gradients. Backgrounds are static (cream + chart-paper grid only).
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
| 2026-04-28 | **P7 shipped: all secondary surfaces migrated to Robinhood warm-dark** | Migrated 14 surfaces: `/account` hub, `/account/transactions`, `/account/security`, `/account/notifications`, `/account/rg-history`, `/account/self-exclude`, `/auth/login`, `/auth/register`, globals.css auth shell (`.auth-card`, `.auth-input`, `.auth-submit`, `.auth-link`) + `/auth/verify-email`, `/leaderboards`, `/rewards`, `/cashier` (submit-hover fix) + `/cashier/cheque`, `/privacy`, `/profile`. Every page now uses `--surface-1/2`, `--border-1/2`, `--r-rh-*` tokens; glass backgrounds, `backdrop-filter`, rim box-shadows, chromatic fringes, and gradient buttons are gone from all secondary surfaces. The `.glass` utility class and its tokens (`--glass-*`, `--rim-*`, `--chroma-*`) are retained in `globals.css` because `ContentPage.tsx`, `discover/page.tsx`, and `market/[ticker]/page.tsx` still use `.glass` — these are in-scope for a future P8 sweep when those components are revisited. The `--accent-glow-color`, `--accent-lo`, `--accent-gradient`, `--accent-glow` tokens are retained because P1-P6 components still use them (error pages, `MobileTabBar`, `BrandMark`, `LandingPage`, `portfolio`). TypeScript check passes clean (no new errors). |
| 2026-04-27 | **Self-correction: P5 reverted from single-column to 2-col layout on /market/[ticker]** | The morning's P5 ship collapsed the page to a single vertical column with TradeTicket centered at `max-width: 720px` between the chart and orderbook. Live design review the same afternoon found three problems: (1) at >=1280px the ticket left **41% of horizontal space empty** (496px of dead-space wings) because the chart above and orderbook below filled the full 1216px content width — the centered island broke the layout rhythm; (2) the collapsed hero was 680px tall on a 720px viewport, pushing the trade button below the fold and violating Robinhood's "action above the fold" rule; (3) OrderBook and RecentTrades at 596px each looked hollow for the density of content they hold (3-level synth book, ~10 trades). Fix: restored the 2-col grid the file's own header diagram described — left column carries hero + orderbook/trades + details, right column carries TradeTicket (sticky `top: 84px`) + Related. Below 1100px collapses to single column via `display: contents` + grid `order` so the ticket sits in position 2 directly under the hero. Measured deltas at 1280×800: page height 2000px → 1513px (−24%), hero 680px → 628px, dead space 496px → 0, OrderBook+RecentTrades 596px → ~404px each. CSS-only change in `app/market/[ticker]/page.tsx`; no component prop changes. Lesson: the morning's "simplification" optimized for source clarity at the cost of visual composition — single-column is right for narrow viewports, but on wide viewports a centered slab between full-width siblings reads as a layout error. The file diagram was right; the implementation overshot. |
| 2026-04-28 | **Legacy package-root carcass bulk-deleted** | All sportsbook-era `components/`, `containers/` (not present), `hooks/`, `lib/`, `services/` at the package root removed, plus root-level files `core-theme.ts`, `pxp-theme/`, `i18n.js`, `next-i18next.config.js`, `index.ts`, `store.ts`, `store.config.ts`, `styled.d.ts`, `translations-bundle.js`, and the `translations/` locale tree. The App Router under `app/` is now the entire shippable surface. Verified via 168-file import-graph audit — zero escapes. Legacy webpack aliases (`i18n`, `next/config$`) removed from `next.config.js`; dead `"i18n"` path removed from `tsconfig.json`. Tsc baseline: 1 error (baseUrl deprecation) → 1 error (unchanged — no new errors introduced). 341 files deleted, 32,350 lines removed. |
| 2026-04-28 | **P8 implementation shipped: warm-light surfaces + new MarketCard composition** | Token swap in globals.css (`--bg-deep`, `--surface-1/2`, `--border-1/2`, `--t1..4`) to the P8 light values. Added `--yes-text` (#1A6849), `--no-text` (#A8472D), `--yes-bar` (#8FE5C4), `--no-bar` (#F4A990), `--focus-ring` (#0E7A53) per the 2026-04-28 amendment — all clearing AA on white + cream. Body now renders the chart-paper grid via `--bg-pattern`. Removed the dark-theme `body::before` radial-gradient backdrop scene. MarketCard rewritten: corner image (mono fallback for native markets via `getMarketImageProps` in `utils/marketImage.ts` — category→hue map, ticker→2-char monogram), 3 stat rows (Volume / Closes / Open interest with leading-side label), probability bar with overlaid % and the min-segment-width rule for ≤5% extremes (12px min + label moved above bar), two clear YES/NO pills with `--yes-text`/`--no-text` text. TopBar: opaque cream + hairline border (no backdrop-filter, per the §9 rule). Chart strokes in `MarketChart.tsx` and the discovery hero (`predict/page.tsx`) now use `--yes-text`/`--no-text` for AA on light. TrendingSidebar sparkline and delta pills updated similarly. `:focus-visible` rule added to globals.css using `--focus-ring`. Bulk swap of `color: var(--yes/no);` → `color: var(--yes-text/no-text);` across components (RecentTrades, OrderBook, TradeTicket, MarketChart, etc., ~19 sites) so all colored TEXT clears AA. Legacy `--glass-*` / `--rim-*` / `--bg-{navy,teal,mint,azure}` / `--accent-{hi,lo,deep,gradient}` / `--yes-{glow,border,hi,lo}` / `--no-{glow,border,hi,lo}` tokens RETAINED per the per-surface retirement policy from P6 — secondary surfaces (auth shell, legacy carcass) still consume them. Verified visually in browser: `/predict`, `/market/[ticker]`, `/portfolio`, `/auth/login` all render correctly on cream + chart paper. Scoped typecheck 0 errors; unit suite 128/128. |
| 2026-04-28 | **Office package migrated to P8 (cream + chart paper grid)** | Back-office still rendered against the sportsbook-era IBM Plex Sans + #0b0e1c navy / dark glass look while the player app shipped P8 on the same day. Migration phased into four PRs (#25 foundation, #26 App Router sweep, #27 Pages-Router cleanup, plus this docs entry): (1) `styles/p8-tokens.css` declares the same `:root` tokens as the player app — `--bg-deep`, `--bg-pattern`, `--surface-1/2`, `--border-1/2`, `--t1..4`, `--yes-text`, `--no-text`, `--yes-bar`, `--no-bar`, `--focus-ring`, `--accent[*]`, `--r-rh-*`. Inter + IBM Plex Mono come in via Google Fonts. (2) `styles/p8-antd.css` overrides AntD 4.16 (which has no runtime `theme.token` API) at the high-traffic component classes — layout, card, button, input/select/picker, table (rows + hover + selected), pagination, menu, modal/drawer, form labels, tags (success/error/warn/processing), dropdown, tabs, statistic, typography, message, divider, switch/checkbox/radio. (3) Bulk hex → token sweep across 40 App Router files (16 widgets, 17 dashboard pages, 6 shared primitives, dashboard layout) via a deterministic regex map. Map: `#0f1225/#111631 → --surface-1`, `#0b0e1c → --bg-deep`, `#1a1f3a → --border-1`, `#161a35 → --surface-2`, `#1a2040 → --accent-soft`, `#ffffff/#fff/#f8fafc/#e2e8f0 → --t1`, `#D3D3D3/#a0a0a0 → --t2`, `#94a3b8/#64748b → --t3`, `#4ade80 → --accent`, `#22c55e → --accent-lo`, `#4a7eff → --focus-ring`, `#fbbf24 → --warn`, `#f87171/#ef4444/#ff6b6b → --no-text`, `#101114 → #003827`, `'IBM Plex Sans' → 'Inter'`. Each replacement keeps a hex fallback inside the `var()` call so SSR first paint has a sensible color before `p8-tokens.css` mounts. (4) App Router `/auth/login` and `app/layout.tsx` aligned (Suspense boundary on `useSearchParams` + `force-dynamic` to unblock `next build` under Next.js 16). Pages-Router container inline colors (`containers/prediction-markets` YES column, `containers/users/details/financial-summary` Statistic colors) aligned to `--yes-text`/`--no-text`. Result: dashboard / audit-logs / trading / users / risk-management / prediction-admin / settlements all render against one cream palette end-to-end. `next build --webpack` clean (29s). Verified visually at runtime on port 3001. Out of scope: per-page styled-components on dashboard widgets that already inherit the AntD overrides (no targeted polish needed unless a future surface requires it), the dormant `theme.menu.color` branches in `components/layout/header/index.styles.ts` (inert; cleanup is a follow-up no-op). |
| 2026-04-27 | **P8 spec: pivot from warm-dark to warm-light, restructure MarketCard** | Same Robinhood "stock-detail-page" mood — only the surface inverts: warm-dark `#0F1414` → warm-cream `#F7F3ED`, with a faint chart-paper grid (32px / 3.5%) the only decoration. Rejected alternatives: pure-white (Polymarket / Kalshi corporate-clean lane), diagonal hatch (Robin Markets — read editorial), serif title (read magazine). Trading palette unchanged — `--accent` mint, `--yes` seafoam, `--no` coral all kept; two new fill tokens `--yes-bar` / `--no-bar` added for the probability bar (slightly desaturated so the bar reads calm); two new text tokens `--yes-text` / `--no-text` added for AA contrast on white. MarketCard rewritten: corner circular image (≤15% of card area, every card carries one — `imagePath` from discovery sync for imports, deterministic monogram disc for native markets), three stat rows (Volume / Closes / Open interest with leading-side-pill), horizontal probability bar (sage YES + coral NO segments, widths = prices, % overlaid on segments), two clear pills below carrying YES ¢ / NO ¢ as the click-to-trade affordance. Replaces the dark-theme P3 card (deterministic-sparkline + dual-mono-prices + delta-pill). Bar % and pill ¢ are mathematically the same number for binary markets — bar shows the visual split, pills show the execution price; different jobs. Implementation deferred until PRs #1–#5 land (P7 secondary-surface migration + token cleanup + dead-code removal — those clean up the dark-theme token system and benefit a clean light-pivot branch). Once those merge, "P8" lands as one or more migration PRs that swap `--bg-deep`, `--surface-*`, `--border-*`, `--t*` tokens, retire dark-theme component CSS, and ship the new MarketCard composition. The §10 "Light mode. Dark only for now" exclusion is flipped — light is the only mode now. Preview at `~/.gstack/projects/jbrackens-TAYA_NA/designs/p8-light-pivot-20260427/preview.html`. |
