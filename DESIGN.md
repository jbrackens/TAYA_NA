# Design System — TAYA NA Predict

> Liquid Glass on a cool-palette scene. Mint emerald accent, seafoam-green YES, coral NO. Translucent panes float in front of an always-on refractive backdrop. Every edge catches light.

This document governs the **Predict player app** at `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/` (port 3000). The admin backoffice is still on the sportsbook system (see `DESIGN-SPORTSBOOK.md`) until it needs a refresh.

The sportsbook `ps-*` / `discovery-*` / `sport-pill` classes still live in `globals.css` for historical reference but the player app renders on the Predict tokens below.

---

## Product Context

- **What this is:** binary event-contract exchange — users trade YES/NO on real-world outcomes (politics, crypto, sports, entertainment, tech, economics).
- **Who it's for:** retail traders and prediction enthusiasts, crypto-adjacent but financial-legitimate audience.
- **Competitors studied (design reference):**
  - Polymarket (light, blue, dense) — what to differentiate from.
  - Kalshi (light, mint, editorial) — closest spiritually on palette.
  - Pariflow (dark broadcast, whale-ticker energy) — prior Predict direction, superseded.
  - Thndr (black, mint→teal→azure gradient, casino-fintech) — primary palette reference as of 2026-04-24.
  - Apple (iOS 26 / visionOS Liquid Glass) — material-system reference.
- **Project type:** real-time trading web app.
- **Positioning:** Predict should feel *fluid, refined, financial-legitimate*. Glass panes floating in a cool-navy scene. Mint accent is the one piece of chroma that gets to glow. Users should feel like they're operating a trading instrument, not a meme-coin casino.

---

## 1. Aesthetic Direction

**Liquid Glass on a cool-palette scene.** Every app surface is translucent, refracting a dim colorful backdrop underneath. The backdrop is never visible directly — only *through* something. Chrome reads as curved panes with rim highlights and subtle chromatic fringe. The accent mint appears once per viewport at full saturation (CTA + brand mark), and as a low-alpha tint on active states.

**Mood descriptors:** fluid, refractive, financial-legitimate, current, *everything is made of the same material*.

**Decoration level:** intentional but disciplined. The glass material is rich; the content layered on top stays clean. No decorative blobs, no gradient overlays beyond the system's own recipe, no texture that isn't serving refraction.

**Explicit rejection:**
- **No Orbitron / Exo / sci-fi fonts** — signals gaming/crypto-bro.
- **No cyan or neon-lime as primary accent** — prior direction, superseded 2026-04-24 (see §12). Cyan and lime both code as "crypto casino"; mint codes as "financial tool."
- **No purple/violet backdrop** — was the placeholder in the 2026-04-24 mockup and fought the mint palette. Cool-teal/navy family only.
- **No left sidebar** for categories — every reference uses horizontal top nav.
- **No bubble-radius** on interactive elements (>28px on buttons/cards) — reads as marketing-site slop. Glass reads glassier at slightly rounder corners than flat UI (see §6), but we cap at 28px.
- **No flat/Material-Design flat shadows.** The glass system IS the elevation vocabulary. Solid drop-shadows only appear on the one CTA.
- **No 3-column icon grid with colored circles** — marketing-site cliché.
- **No brand mint on price cells.** `--accent` never colors a YES price (`--yes`) or NO price (`--no`). `--yes` never carries a CTA shadow. See §3 Rules.
- **No `backdrop-filter` on data tables.** Text readability over refracted background fails WCAG. Tables use solid surfaces inside glass cards. See §9.

---

## 2. Typography

- **Display + body:** `Outfit` (Google Fonts, weights 300–900) — geometric sans, modern, carries on translucent surfaces cleanly.
- **Prices, volumes, tabular numbers:** `IBM Plex Mono` with `font-variant-numeric: tabular-nums` — trader-desk precision. Required for any numeric column.
- **Fallback stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.

Loaded in `app/layout.tsx` via Google Fonts `<link>`. Don't add more weights ad-hoc.

### Scale

| Role | Weight | Size | Notes |
|------|--------|------|-------|
| Hero display | 800 | 48 | Current prices. Letter-spacing -0.02em. |
| Page title | 700 | 28 | Market question, portfolio header. Letter-spacing -0.01em. |
| Section heading | 700 | 18 | Card titles, card strip headers. |
| Data heading | 700 | 11 | Uppercase data-section labels (`ORDER BOOK`, `RECENT TRADES`). Letter-spacing 0.14em. |
| Body | 400 | 14 | Prose copy. Color `--t2`. |
| Eyebrow | 700 | 10 | Uppercase tiny labels (`YES`, `NO`, `AMOUNT`). Letter-spacing 0.16em. |
| Data (mono) | 600 | 28–32 | Prices on cards + trade ticket side buttons. Tabular-nums. |
| Small data (mono) | 500 | 11–13 | Volumes, deltas, tape rows. Tabular-nums. |

Use the `.mono` utility class for anything monetary or numeric.

### Text on translucent surfaces

Text over `backdrop-filter` backgrounds requires a **faint text-shadow** to hold contrast when the backdrop scrolls behind it:

```css
text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);   /* body text on glass */
text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);    /* headings + prices */
```

Prices that also glow (`--yes`, `--no`, `--accent` on select) use colored shadows instead — see §3.

---

## 3. Color

Every color is a CSS custom property defined in `app/globals.css` under `:root`. Use the variable; do not hardcode hex values in components.

### Backdrop palette

The backdrop scene lives behind ALL glass. Never visible directly. See §5 Backdrop Scene.

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-deep` | `#06101c` | Deep navy base. The "blackest" color in the system — not pure black. |
| `--bg-navy` | `#0c2a4a` | Navy-blue radial lobe (top-left of viewport, YES-ambient side). |
| `--bg-teal` | `#0c2638` | Dark teal core — dominant ambient tone. |
| `--bg-mint` | `#0d2a22` | Barely-there mint tint at the bottom (brand bleed). |
| `--bg-azure` | `#0e3858` | Azure highlight, used sparingly in the scene. |

### Surface palette (for glass)

Glass is never opaque fill. Surface tokens define the translucent "body" of each pane.

| Token | Value | Usage |
|-------|-------|-------|
| `--glass-thick` | `rgba(255, 255, 255, 0.08)` | Thick glass (primary cards, modal surfaces). |
| `--glass-regular` | `rgba(255, 255, 255, 0.05)` | Regular glass (most UI surfaces). |
| `--glass-thin` | `rgba(255, 255, 255, 0.03)` | Thin glass (subtle pills, nav chrome). |
| `--glass-inset` | `rgba(0, 0, 0, 0.18)` | Recessed inner surface (amount display, inputs, slider track). |

### Rim highlights (glass edges)

| Token | Value | Usage |
|-------|-------|-------|
| `--rim-top` | `rgba(255, 255, 255, 0.22)` | Top-edge highlight (catches light from the top). |
| `--rim-bottom` | `rgba(255, 255, 255, 0.06)` | Bottom-edge highlight (darker — in shadow). |
| `--rim-side` | `rgba(255, 255, 255, 0.04)` | Left/right side edges. |
| `--chroma-1` | `rgba(255, 120, 200, 0.05)` | Left-edge chromatic fringe (faint magenta). |
| `--chroma-2` | `rgba(100, 180, 255, 0.05)` | Right-edge chromatic fringe (faint cyan). |

### Text

| Token | Value | Usage |
|-------|-------|-------|
| `--t1` | `#ffffff` | Primary headlines, prices, titles. |
| `--t2` | `rgba(255, 255, 255, 0.72)` | Body copy, secondary info. |
| `--t3` | `rgba(255, 255, 255, 0.44)` | Muted labels, meta, timestamps. |
| `--t4` | `rgba(255, 255, 255, 0.28)` | Disabled, divider dots, faint axis labels. |

*(Text token naming matches the code convention `--t1..--t4`, no hyphen before the digit. Earlier revision of this doc used `--t-1..--t-4` which didn't match the actual `globals.css` — fixed 2026-04-24 after `/plan-eng-review`.)*

### Brand accent (mint emerald)

Thndr-inspired mint. The mint `#2be480` replaces the prior neon-lime `#39ff14` (superseded 2026-04-24). Mint reads as fintech; lime reads as crypto casino.

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent` | `#2be480` | Mint emerald — primary accent. CTA, active states, brand mark, payout number, LIVE pulse ring. |
| `--accent-hi` | `#00ffaa` | Teal-mint highlight. Used as the mid-stop of the signature gradient. CTA hover tint. |
| `--accent-lo` | `#1fa65e` | Deeper mint for borders + pressed states. |
| `--accent-deep` | `#0094ff` | Azure. The third stop of the signature gradient. Used sparingly — brand mark only, no standalone surfaces. |
| `--accent-glow` | `rgba(43, 228, 128, 0.45)` | Default glow (box-shadow + text-shadow color). |
| `--accent-gradient` | `linear-gradient(100deg, #2be480 0%, #00ffaa 50%, #0094ff 100%)` | Signature gradient. Used on the brand mark (§6) and as a CTA treatment (2-stop variant, drops `--accent-deep`). |

### Semantic (data layer)

YES is **seafoam green** and NO is **coral**. The pair retains the green-up / warm-down trading idiom for instant binary read, but at calmer saturation than the prior neon `#39ff14` + fire-engine `#ff2d2d` palette. Seafoam sits cleanly next to the brand mint without collision (different saturation), coral sits naturally on the cool backdrop, and the chart's full-bleed YES fill no longer dominates the viewport.

| Token | Hex | Usage |
|-------|-----|-------|
| `--yes` | `#71eeb8` | YES prices, YES side chips, upward price deltas, order-book bid side. |
| `--yes-hi` | `#a3f5ce` | Hover / selected-state highlight for YES. |
| `--yes-lo` | `#3eb489` | Deeper teal-green for borders + pressed states. |
| `--yes-soft` | `rgba(113, 238, 184, 0.14)` | Low-alpha YES fill for glass chips, depth bars, badges. |
| `--yes-border` | `rgba(113, 238, 184, 0.35)` | YES border tint on selected/filled states. |
| `--yes-glow` | `rgba(113, 238, 184, 0.5)` | YES price text-shadow when selected + liquid-tint color. |
| `--no` | `#ff8b6b` | NO prices, NO side chips, downward price movement, order-book ask side. |
| `--no-hi` | `#ffae94` | Hover / selected-state highlight for NO. |
| `--no-lo` | `#cc5a3d` | Deeper rust for borders + pressed states. |
| `--no-soft` | `rgba(255, 139, 107, 0.14)` | Low-alpha NO fill for glass chips, depth bars, badges. |
| `--no-border` | `rgba(255, 139, 107, 0.35)` | NO border tint on selected/error states. |
| `--no-glow` | `rgba(255, 139, 107, 0.5)` | NO price text-shadow when selected + liquid-tint color. |
| `--live` | `#ff6b6b` | LIVE indicator dot (ticker, hero pill). Reserved for time/real-time pulse, not side selection. Distinguishable from `--no` coral by being slightly redder and pulsing. |

**Gain / loss:** Use `--accent` (mint) for positive P&L and upward percent-change pills unless the value is specifically a YES-side market signal. Use `--no` (coral) for negative P&L. No separate `--gain` token needed — the accent remains the portfolio-success color.

### Loyalty tier colors (preserved from prior system)

Unchanged. Tier colors avoid the accent palette deliberately so tiers feel like earned status symbols, not brand surfaces.

| Token | Hex | Tier |
|-------|-----|------|
| `--tier-1` | `#94a3b8` | Newcomer — slate |
| `--tier-2` | `#cbd5e1` | Trader — slate-light |
| `--tier-3` | `#d4a857` | Sharp — warm-gold-muted |
| `--tier-4` | `#9ca7bf` | Whale — platinum-muted |
| `--tier-5` | `#8b5cf6` | Legend — violet |

### Rules (mint discipline)

- **`--accent` is the mint channel.** It glows, calls for action, and carries brand identity: CTA, brand mark, active nav, category pill, LIVE dot, payout-if-YES text. **Appears once per viewport** at full saturation plus low-alpha tints on active states.
- **`--yes` is the YES data channel.** Seafoam green. Informs, never carries the CTA shadow. Its glow is reserved for selected side buttons, charts, and market-data emphasis. Cooler/calmer than the brand mint so the two greens don't collide.
- **`--no` is the NO data channel.** Coral. Mirror of YES, same rules. Warmer than `--live` red.
- **Never use `--accent` on a price cell.** Never use `--yes`/`--no` on a CTA. If a surface needs brand + data channels together (e.g., a LIVE YES pill), `--accent` owns the pulse dot + pulse color, `--yes` owns the price text.
- **Gradient is reserved.** The `--accent-gradient` (mint → teal → azure) appears **only on the brand mark**. CTAs use a 2-stop mint → teal variant. Don't apply the gradient to other surfaces — it cheapens the brand moment.
- **Warm-color discipline:** `--no` (coral) owns side selection and negative market signal. `--live` (slightly redder, pulses) is reserved for tiny real-time pulse indicators only; don't use it as a price or CTA color.
- **No whale amber.** The prior `--whale` / `--whale-soft` ambers are retired along with WhaleTicker (see §8 Components retired).

---

## 4. Material System

Every surface in the app is built from the same 4-layer glass recipe. Reuse via the `.glass` utility class in `globals.css`.

### The recipe

```css
.glass {
  position: relative;

  /* Layer 1: translucent body with inner luminance gradient (glass brighter at top) */
  background:
    linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.025) 100%),
    var(--glass-regular);

  /* Layer 2: backdrop blur + saturation (refracts whatever's behind it) */
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);

  /* Layer 3: rim highlights (curved-glass edges) + chromatic fringe */
  border: 1px solid rgba(255, 255, 255, 0.13);
  box-shadow:
    inset 0 1px 0 var(--rim-top),
    inset 0 -1px 0 var(--rim-bottom),
    inset 1px 0 2px var(--chroma-1),
    inset -1px 0 2px var(--chroma-2),
    /* ambient floating shadow */
    0 2px 6px rgba(0,0,0,0.18),
    0 8px 24px rgba(0,0,0,0.28),
    0 16px 48px rgba(0,0,0,0.2);
}

/* Layer 4: specular sheen on top 50% (the "wet glass" highlight) */
.glass::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 50%;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%);
  pointer-events: none;
  mix-blend-mode: overlay;
}
```

### Glass tiers

Thickness is a function of blur radius — more blur reads as thicker glass. Use the right tier for the semantic role of the surface:

| Tier | Blur | Use for |
|------|------|---------|
| Thick (`.glass.glass-thick`) | `blur(40px) saturate(180%)` | Modal surfaces, phone-frame outer shells, full-screen overlays. |
| Regular (`.glass`) | `blur(30px) saturate(180%)` | Default. Cards, panels, trade ticket, market head. |
| Medium (`.glass.glass-med`) | `blur(18px) saturate(160%)` | Nav bar (top sticky strip), secondary cards. |
| Thin (`.glass.glass-thin`) | `blur(10px) saturate(140%)` | Pills, chips, inline badges, meta labels. |
| Inset (`.glass-inset`) | `blur(10px)`, dark fill `--glass-inset` | Inputs, amount display, order book headers — reads as recessed INTO the glass above it. |

### Interactive state recipes

- **Hover:** `transform: translateY(-1px)` — glass lifts slightly. Shadow intensifies by ~20%.
- **Press:** `transform: scale(0.97)` with a spring easing (see §7). Not a sink — a squish. Glass is wet, not mechanical.
- **Selected (YES/NO buttons):** Liquid tint `::after` pseudo-element fades in from the bottom using the side's `--yes-glow` or `--no-glow`. Base glass stays glass; the liquid is what's inside it.
- **Focus-visible:** 2px outer ring in `--accent` + 12px `--accent-glow` shadow. Keyboard-nav first.

### When NOT to use glass

- **Data tables (order book, trade tape, ledger)** — text over refracted background fails WCAG AA against some backdrop positions. Tables render with solid `rgba(0,0,0,0.25)` inside the glass card. The card is glass; the table rows are solid.
- **Long-form prose** — resolution rules, Terms, FAQs. Solid `--bg-deep` surface inside a glass frame.
- **Charts** — the chart itself is SVG, not glass. The card AROUND the chart is glass.

---

## 5. Backdrop Scene

Liquid Glass is invisible without something to refract. The app ships an always-on `<BackdropScene />` component (see §8) that renders behind everything at `z-index: -3` through `-1`. Never shown directly — always *through* something.

### Three layers

**Layer 1 (deepest, `z-index: -3`):** full-viewport radial gradient stack. Lives in `body::before`:

```css
body::before {
  content: '';
  position: fixed;
  inset: -5%;
  z-index: -3;
  background:
    radial-gradient(ellipse 35% 40% at 18% 22%, var(--bg-navy) 0%, transparent 55%),
    radial-gradient(ellipse 28% 28% at 82% 48%, var(--bg-azure) 0%, transparent 55%),
    radial-gradient(ellipse 45% 30% at 50% 92%, var(--bg-mint) 0%, transparent 55%),
    radial-gradient(ellipse 80% 60% at 50% 35%, var(--bg-teal) 0%, var(--bg-deep) 80%),
    var(--bg-deep);
}
```

**Layer 2 (`z-index: -2`):** live-chart SVG. Faint wavy lines across the whole viewport in seafoam YES, coral NO, and mint-accent — visual hint at market data without being literal. Lives in the `BackdropScene` component.

**Layer 3 (`z-index: -1`):** subtle grid pattern at ~7% opacity. Two stacked `linear-gradient` backgrounds in orthogonal directions. Trading-desk grounding without dominating.

### Rules

- The scene is **non-interactive** (`pointer-events: none`) and **fixed** (`position: fixed`) — doesn't scroll with content. Glass appears to move across a stable scene.
- Scene colors are the `--bg-*` palette only. Never `--accent` directly in the scene — mint is accent, not ambient.
- Prefers-reduced-motion respects the backdrop stationarity (no scroll parallax anyway; the scene never animates).
- Prefers-reduced-transparency turns the scene into a solid `--bg-deep` fill — glass loses its refraction and becomes plain dark cards (see §9).

---

## 6. Layout

### Shell structure

```
[TopBar]          ← sticky ~64px, .glass.glass-med, brand mark + nav + search + balance + avatar
[BackdropScene]   ← fixed, z-index -3 to -1, see §5
[main content]    ← max-width 1280px, 32px horizontal padding
```

**No left sidebar.** Horizontal top nav on every page.

**Brand mark.** `app/components/BrandMark.tsx` renders a 28px square with the signature gradient (§3 `--accent-gradient`), a specular top-left highlight, and a mint glow. The "P" letterform sits in 900-weight on top. This is the one place the 3-stop gradient appears.

### Grid

- **Max content width:** 1280px (desktop). Pages >1280px add breathing room, not more content.
- **Market grid (discovery):** `repeat(auto-fill, minmax(300px, 1fr))`, gap 16px.
- **Market detail page:** 2-column grid on desktop (`minmax(0, 1fr) 360px`) — chart + data on left, sticky trade ticket on right. Collapses to 1-column below 1100px.
- **Page padding:** 28px 32px on desktop, 20px 16px on mobile.

### Radius

Glass reads glassier at slightly rounder corners. Radii bumped from the prior flat-UI scale (6/12/20) to glass-friendly values:

| Token | Value | Usage |
|-------|-------|-------|
| `--r-sm` | `10px` | Buttons, chips, small pills, inset displays. |
| `--r-md` | `16px` | Default cards, panels, trade-ticket sections. |
| `--r-lg` | `22px` | Hero, large modals, primary cards. |
| `--r-xl` | `28px` | Full-screen modal shells, phone frame. |
| `--r-pill` | `999px` | Meta pills, balance pill, nav-link active-state pills. |

No element exceeds 28px on interactive surfaces. Bubble-radius (>28px on small elements) is rejected — see §1.

---

## 7. Motion

**Approach:** spring physics. Motion signals that the material is fluid, not mechanical.

| Element | Motion |
|---------|--------|
| Button / chip press | `transform: scale(0.97)` then return, `cubic-bezier(0.34, 1.56, 0.64, 1)` 150ms. |
| Button / chip hover | `transform: translateY(-1px)` + shadow intensify, 150ms ease. |
| Side-button select (YES/NO) | Liquid-tint `::after` opacity fade 280ms ease + border-color transition 200ms. |
| CTA shimmer | Traveling highlight across the button, 3.2s ease-in-out infinite. |
| Slider knob shimmer | Fill shimmer loop, 2.4s ease-in-out infinite. |
| LIVE dot pulse | Opacity 0.4 → 1 → 0.4 with `transform: scale(0.92)`, 1.6s ease-in-out infinite. |
| Card hover | `translateY(-2px)` + border tint shift, 180ms ease. |
| Modal open | Opacity + scale(0.96 → 1) + backdrop blur fade-in, 240ms spring. |

**Rules:**

- Default easing for user interactions: `cubic-bezier(0.34, 1.56, 0.64, 1)` (spring overshoot). Reserved for press/release moments.
- Default easing for non-interactive transitions: `ease` or `ease-out`, 150-250ms.
- No scroll-driven animations — the scene is stationary.
- **Respect `prefers-reduced-motion`** — disable CTA shimmer, slider shimmer, LIVE-dot pulse, modal spring. Replace with instant cross-fades.

---

## 8. Components

Components live under `app/components/` (shared primitives) and `app/components/prediction/` (prediction-specific).

### Current roster (post-redesign)

| Component | Purpose | Uses |
|-----------|---------|------|
| `BackdropScene` *(new)* | Always-on cool-palette scene + SVG chart hint + grid. Renders at `app/layout.tsx` root. | `<body>` |
| `BrandMark` *(new)* | 28px gradient-filled brand square with "P" letterform. | `TopBar` |
| `TopBar` *(renamed from PredictHeader)* | Sticky `.glass.glass-med` nav strip: BrandMark + nav links + search + balance pill + avatar. | `app/layout.tsx` |
| `MarketCard` *(redesigned)* | Glass card with YES/NO split, sparkline, meta pills. | `/predict`, `/category/[slug]` |
| `TradeTicket` *(redesigned)* | Sticky-right glass panel with YES/NO selector, amount block, summary, Review CTA. | `/market/[ticker]` |
| `MarketChart` *(new)* | SVG line chart with glow + current-price marker. Renders inside a glass `.chart-card`. | `/market/[ticker]` |
| `OrderBook` *(new)* | Solid-fill table inside a glass card. Depth bars as `::after` gradients. | `/market/[ticker]` |
| `RecentTrades` *(new)* | Solid-fill tape inside a glass card. Side badges as tiny glass pills. | `/market/[ticker]` |
| `CategoryPills` | Horizontal glass-pill strip for category filtering. | Header + `/predict` |
| `TierPill` | Loyalty tier pill (slate/gold/platinum/violet per tier). Unchanged. | `TopBar` |
| `RankChip` | Best-rank-on-a-board glass chip. | `/portfolio` |
| `PredictFooter` | Minimal footer, `.glass.glass-thin`. | `app/layout.tsx` |

### Components retired in this redesign

These were part of the dark-broadcast / Pariflow-inspired direction and do not port to Liquid Glass. Delete in Phase 4 of the implementation plan:

- `WhaleTicker` — top auto-scrolling whale band. Whale amber palette retired. If we want a movement indicator later, it ships as a glass pill somewhere, not a full-width ticker.
- `WhaleActivityCard` — amber whale-trade list.
- `TopMoversCard` — dark-broadcast variant. A mover list in the Liquid Glass system is a slim glass card with no special color treatment.
- `FeaturedHero` — Pariflow-taller-hero with green bloom. Replaced with a standard glass hero card.
- `BettingHeatmap` — unused, belongs to the sportsbook era.

### Component rules

1. **Use design tokens.** Never hardcode hex values — always `var(--token)`.
2. **Reuse the `.glass` class.** Don't re-implement the 4-layer recipe in every component.
3. **One concern per component.** Pages compose; components render.
4. **No `any` types.** Props get interfaces; use `unknown` for caught errors.
5. **No `console.*`** — use `app/lib/logger.ts`.
6. **No `@phoenix-ui/design-system` imports in `app/`** — webpack hang. Inline components or Tailwind.

---

## 9. Accessibility

### Contrast

Text on translucent surfaces has variable background depending on the backdrop position. Minimum targets:

- **Primary text (`--t1`, `#ffffff`):** always passes WCAG AA against every backdrop lobe.
- **Secondary text (`--t2`, 72% white):** passes AA on `--bg-deep`, `--bg-teal`. Marginal on `--bg-navy` — mitigated by text-shadow (`0 1px 3px rgba(0,0,0,0.35)`) which boosts perceived contrast.
- **Meta text (`--t3`, 44% white):** passes AA only for non-essential copy (captions, timestamps, axis labels). Never used for actionable text.

### Reduced transparency

Respect `prefers-reduced-transparency`. The entire Liquid Glass system is a progressive enhancement — it can be replaced with solid fills at no content cost.

```css
@media (prefers-reduced-transparency: reduce) {
  .glass,
  .glass-thick,
  .glass-med,
  .glass-thin {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    background: rgba(255, 255, 255, 0.06);
    background-color: var(--bg-teal);
  }
  body::before,
  .backdrop-scene {
    background: var(--bg-deep);
  }
  .backdrop-scene svg { display: none; }
}
```

### Reduced motion

See §7. Respect `prefers-reduced-motion: reduce`. Disable shimmer loops, LIVE dot pulse, spring overshoot. Replace with instant transitions.

### Keyboard navigation

Every interactive element has a `:focus-visible` state: 2px outer ring in `--accent` + 12px `--accent-glow` shadow. Focus ring wins over the hover treatment. Glass panels do not trap focus. Modals trap focus (standard pattern).

---

## 10. Performance budget

`backdrop-filter` is the most expensive property in this system. On mid-range Android (Pixel 6a class, ~3-year-old Android flagships) every glass surface costs ~4-8ms of paint time on scroll.

### Per-viewport budget

- **Max 8 active glass surfaces in the viewport at any scroll position.** Count nested glass (a `.glass-thin` pill inside a `.glass` card = 2 surfaces).
- **Prefer scroll-clipped glass** — if a glass element is mostly outside the viewport, browsers can skip repaint. Don't use `overflow: visible` on glass containers.
- **Never stack glass on glass on glass.** 2 levels deep is fine (outer card + inner inset). 3+ tanks paint budget.
- **Charts render on top of glass, not inside refracted backdrop.** The SVG chart in `MarketChart` sits inside a glass card but its own background is solid (or transparent to the card fill).

### Targets

| Device class | Target (60fps = 16.6ms frame) |
|-------------|-------------------------------|
| Apple Silicon Mac, iPhone 13+ | Effortless — no concern. |
| iPhone SE 2020, Pixel 6a | Should hit 60fps on idle, accept occasional frame drop on scroll. |
| Mid-range Android <$300 | 30fps acceptable. Glass fallback acceptable via `prefers-reduced-transparency` if device is detected as low-tier. |
| Desktop Chrome/Edge on Windows 8+ yr old | 60fps on static, may jank on scroll. Accept. |
| Firefox < v103 | `backdrop-filter` not supported — glass falls back to solid fill. Still readable, loses refraction. |

### Measurement

Before Phase 5 audit ships: open `/market/[ticker]` in Chrome DevTools → Performance → record a 5-second scroll → assert `<5%` long-tasks in the main thread. Cap any glass surface at 2MB layer memory (visible via Layers panel).

---

## 11. What's out of scope

Tracked as follow-ups, not part of this design system version:

- **Light mode** — Liquid Glass works on a colorful light backdrop too, but every token needs rework. Defer until there's user demand.
- **Second-order motion** — price-change number-roll on WebSocket tick, order-fill celebration, tier-up flourish. Captured in a future motion spec.
- **Dark-mode-only image assets** — we don't ship imagery yet. If/when we do, assets need backdrop-aware treatment.
- **Chart themes** — chart is currently single-color (seafoam green for YES). Dual YES/NO chart for comparison views, historical-range chart on detail page, candle chart for high-density data are future work.
- **Admin backoffice** — still uses the sportsbook design system. No plan to migrate until backoffice gets its own refresh.
- **Notifications / toasts** — no system exists yet. When it does, toasts are `.glass.glass-thick` with `--r-md` and a 6s auto-dismiss.
- **Mobile performance optimization** — Phase 5 of the implementation plan covers baseline audit. Tiered device optimizations are future work.

---

## 12. Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-17 | Dropped left sidebar | None of Kalshi / Polymarket / Pariflow use one; horizontal top nav is the category convention. |
| 2026-04-17 | Outfit over IBM Plex Sans | Outfit is what Pariflow uses; scales cleaner at display sizes. |
| 2026-04-17 | Orbitron removed | Sci-fi/gaming signal. Fintech doesn't use decorative display fonts. |
| 2026-04-17 | ~~Cyan #22d3ee accent~~ | Superseded 2026-04-23. Kept in log for context. |
| 2026-04-17 | IBM Plex Mono for prices/volumes | Adds precision/trader-desk feel for numeric data. |
| 2026-04-17 | Sparklines per market card | Deterministic placeholder until backend exposes historical prices. |
| 2026-04-23 | ~~Reversed cyan → neon phoenix green `#39ff14`~~ | Superseded 2026-04-24. Kept in log for context. |
| 2026-04-23 | Restored TN speech-bubble logo | Retired 2026-04-24 in favor of gradient BrandMark. Kept in log. |
| 2026-04-23 | ~~Two-greens discipline~~ | Superseded 2026-04-24. YES semantic color moved to blue. Kept in log. |
| 2026-04-24 | **Pivoted to Liquid Glass on cool-palette scene** | Dark broadcast was strong but interchangeable with other fintech-dark products. Liquid Glass (Apple iOS 26 / visionOS vocabulary) is a current, unambiguous visual language that Polymarket and Kalshi haven't adopted. Differentiates on material, not just color. See `~/.gstack/projects/jbrackens-TAYA_NA/designs/liquid-glass-desktop-mint-20260424-200756/`. |
| 2026-04-24 | **Accent: phoenix lime #39ff14 → mint emerald #2be480** | Thndr (thndr.io/games, Casino tab) uses mint as casino-fintech accent. Phoenix lime read as crypto-casino; mint reads as trading-tool. Cleaner signal. Paired with a 3-stop signature gradient mint → teal → azure (`#2be480 → #00ffaa → #0094ff`). |
| 2026-04-24 | ~~YES moved to blue `#7fc8ff`, NO stays peach `#ff9b6b`~~ | Superseded 2026-04-25 after design consultation. Kept in log for context. |
| 2026-04-24 | **Backdrop shifted from purple/violet → teal/navy family** | Initial Liquid Glass mockup used violet backdrop (Apple visionOS wallpaper reference). Fought the mint accent visually. Cool-teal/navy/mint-hint backdrop is cohesive with the accent palette and preserves refraction. |
| 2026-04-24 | **Retired WhaleTicker / WhaleActivityCard / amber palette** | Pariflow-era broadcast feature. Doesn't port to Liquid Glass — the whole point of the new material is chrome that floats, not chrome that scrolls. Amber `#fbbf24` retired. Large-trade surfacing (if/when needed) becomes a glass pill. |
| 2026-04-24 | **Radii bumped 6/12/20 → 10/16/22/28 (+ pill)** | Glass reads glassier at slightly rounder corners. Bubble-radius rejection still applies — 28px is the cap. |
| 2026-04-24 | **Spring physics on interactive state transitions** | `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoot. Glass feels wet/alive rather than mechanical. Replaces the prior flat 150ms ease on button press. |
| 2026-04-24 | **Mandatory `prefers-reduced-transparency` fallback** | Liquid Glass is progressive enhancement. Solid fallback ships alongside. Phase 5 of the implementation plan. |
| 2026-04-25 | **Phase 1–5 shipped** | 19 commits between `5fb8ef4e` and `66cb92c5` ported every `app/` route to Liquid Glass. Verification: `yarn typecheck` 399 baseline (was 400 pre-Phase-4), `yarn test:smoke` 17/17, `prefers-reduced-*` rules confirmed in stylesheets. Manual audits remaining: Chrome DevTools perf gate, Lighthouse, axe contrast pass, OS-level reduced-* toggles. See `PRIMER-liquid-glass-shipped.md`. |
| 2026-04-25 | **Retired tokens `--gain`, `--whale`, `--whale-soft`** | All non-legacy callers removed. The four sportsbook callers (`/profile`, `/account/self-exclude` shield, `WinLossStatistics` dead component, `theme.ts` warning constant) use the literal `#fbbf24` amber instead — amber was the intent at those call sites, not a brand-token reference. `--s0..--s3` aliases kept because `/cashier` and `/profile` are still sportsbook-styled and depend on them. |
| 2026-04-25 | **TopBar nav links conditionally rendered, not display-none** | Smoke test `getByText(/^rewards$/i).first()` was matching the hidden nav link on mobile and failing visibility. Switched to client-side `matchMedia('(min-width: 900px)')` + conditional render so the nav links don't enter the DOM on mobile. MobileTabBar takes over below 900px. |
| 2026-04-25 | **YES/NO palette: seafoam green + coral** (third iteration — supersedes neon + fire-engine) | Live A/B test against the cool teal backdrop showed the prior neon `#39ff14` + fire-engine `#ff2d2d` pair had three problems: (1) two-greens collision with the mint brand accent (mint and neon both ~110-150° green hues — hard to tell apart at a glance); (2) eye fatigue at chart scale (full-bleed neon chart dominated the viewport); (3) AI-slop / casino-app association. Tested seafoam `#71eeb8` and lime `#9eff5a` as alternatives. Picked seafoam YES + coral NO (`#ff8b6b`) because the cool/warm complementary pair sits naturally on the cool backdrop, separates clearly from mint via saturation difference, and reads as a serious prediction-markets product rather than a binary-options gambling site. Trader idiom (green = up) preserved; the trade-off is slightly less visual differentiation between YES/NO than the high-saturation pair — acceptable given the side-button liquid-tint and selected-state shadows still encode the side change clearly. |
| 2026-04-25 | **YES/NO moved to neon green `#39ff14` / fire-engine red `#ff2d2d`** | Design consultation found the blue/peach pairing too soft for the core binary action. The new pair gives immediate trading semantics while Liquid Glass keeps the surface refined. Brand mint stays on CTA/identity; YES green is confined to market-data surfaces. |
