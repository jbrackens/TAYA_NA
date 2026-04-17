# Design System — TAYA NA Predict

> Dark broadcast / fintech-editorial. One accent color, one display font, one mono font. Every pixel earns its place.

This document governs the **Predict player app** at `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/` (port 3000). The admin backoffice is still on the sportsbook system (see `DESIGN-SPORTSBOOK.md`) until it needs a refresh.

The sportsbook `ps-*` / `discovery-*` / `sport-pill` classes still live in `globals.css` for historical reference but the player app renders on the Predict tokens below.

---

## Product Context

- **What this is:** binary event-contract exchange — users trade YES/NO on real-world outcomes (politics, crypto, sports, entertainment, tech, economics)
- **Who it's for:** retail traders and prediction enthusiasts, crypto-adjacent audience
- **Competitors studied:** Polymarket (light, blue, dense), Kalshi (light, mint, editorial), Pariflow (dark, cyan, broadcast)
- **Project type:** real-time trading web app
- **Positioning:** closer to Pariflow (dark, broadcast energy, whale ticker) than Kalshi/Polymarket (light, fintech-calm). Users should feel a pulse, not a spreadsheet.

---

## 1. Aesthetic Direction

**Dark broadcast**. Think 24/7 sports betting telecast crossed with a trading terminal. Live data ticker at the top of every page; editorial polish on featured markets; dense but readable grid below. Cyan accent carries broadcast-live energy without leaning gaming.

**Mood descriptors:** alert, confident, monied, current, *information flowing past you*.

**Decoration level:** intentional — atmospheric gradients on the hero, amber-tinted whale card, cyan glow on interactive states. Never decorative; always informational.

**Explicit rejection:**
- **No Orbitron / Exo / sci-fi fonts** — signals gaming/crypto-bro
- **No neon green as primary accent** — sportsbook DNA, not Predict
- **No left sidebar** for categories — every reference uses horizontal top nav
- **No bubble-radius** (20px+ on small elements) — reads as AI slop
- **No purple/violet gradients** — AI slop anti-pattern
- **No 3-column icon grid with colored circles** — marketing-site cliché

---

## 2. Typography

- **Display + body:** `Outfit` (Google Fonts, weights 300–900) — geometric sans, broadcast-friendly, modern without being trendy
- **Prices, volumes, tabular numbers:** `IBM Plex Mono` with `font-variant-numeric: tabular-nums`
- **Fallback stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

Loaded in `app/layout.tsx` via Google Fonts `<link>`. Don't add more weights on ad-hoc.

### Scale

| Role | Weight | Size | Notes |
|------|--------|------|-------|
| Display | 800 | 32 | Hero titles only. Letter-spacing -0.02em. |
| Section heading | 800 | 22 | `Featured markets`, `Trending`, etc. Letter-spacing -0.02em. |
| Card title | 600 | 15 | MarketCard title. Line-height 1.35. |
| Body | 400 | 14 | Long-form copy. Color `--t2`. |
| Eyebrow | 700 | 11 | Uppercase, letter-spacing 0.08em. Color `--t3`. |
| Data (mono) | 700 | 18 | Yes/No prices on cards. Tabular-nums. |
| Small data (mono) | 600 | 11–12 | Ticker deltas, footer volumes. Tabular-nums. |

Use the `.mono` utility class for anything monetary or numeric — it applies IBM Plex Mono + tabular-nums in one go.

---

## 3. Color

Every color is a CSS custom property defined in `app/globals.css` under `:root`. Use the variable; do not hardcode hex values in components.

### Surfaces

| Token | Hex | Usage |
|-------|-----|-------|
| `--s0` | `#111827` | Page background (matches Pariflow gray-900) |
| `--s1` | `#1f2937` | Cards, chrome backgrounds |
| `--s2` | `#0f1623` | Input fields, card insets (deeper than cards) |
| `--s3` | `#0b111c` | Ticker band (deepest) |

### Borders

| Token | Hex | Usage |
|-------|-----|-------|
| `--b1` | `#1f2a3d` | Default card / chrome border |
| `--b2` | `#374151` | Stronger border (hover states) |
| `--b3` | `#4b5563` | Strongest (outline emphasis) |

### Text

| Token | Value | Usage |
|-------|-------|-------|
| `--t1` | `#ffffff` | Primary headlines, titles, card numbers |
| `--t2` | `rgba(255,255,255,0.72)` | Body copy, secondary info |
| `--t3` | `rgba(255,255,255,0.45)` | Muted labels, timestamps, meta |
| `--t4` | `rgba(255,255,255,0.28)` | Disabled, divider dots |

### Accent (cyan — broadcast-live)

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent` | `#22d3ee` | Primary CTA background, active nav, brand accent in logo |
| `--accent-hi` | `#67e8f9` | Hover state for accent surfaces |
| `--accent-soft` | `rgba(34,211,238,0.14)` | Active-state tinted backgrounds (cat chips, avatar) |
| `--accent-glow` | `0 0 28px rgba(34,211,238,0.35)` | Box-shadow on accent buttons + focused search |

### Semantic

| Token | Hex | Usage |
|-------|-----|-------|
| `--yes` | `#34d399` | YES prices, upward price movement |
| `--no` | `#f87171` | NO prices, downward price movement |
| `--live` | `#ef4444` | LIVE indicator dots (ticker, hero pill) |
| `--whale` | `#fbbf24` | Whale activity, amber — reserved for large-trade signals |
| `--whale-soft` | `rgba(251,191,36,0.14)` | Whale card background tint |

### Rules

- Cyan `--accent` appears **once per view** at high saturation (usually the hero CTA). Everything else uses soft tints.
- Amber `--whale` is **reserved** for whale/large-trade meaning. Don't use it for anything else — users should be able to spot whale activity in peripheral vision.
- Red `--no` and `--live` are different: `--no` is for price direction, `--live` is for real-time indicators. They're visually similar — context and the pulse animation disambiguate.

---

## 4. Layout

### Shell structure

```
[WhaleTicker]      ← slim (~36px), auto-scroll, s3 background
[PredictHeader]    ← sticky (~110px — top row + cat strip), s0 w/ backdrop-blur
[main content]     ← max-width 1440px, 24px horizontal padding
```

**No left sidebar.** All three references (Kalshi, Polymarket, Pariflow) use horizontal top-nav. Categories live in the header's cat strip.

### Grid

- **Hero:** 2fr / 1fr split (hero market + side column). Collapses to 1fr below 1024px.
- **Market grid:** `repeat(auto-fill, minmax(300px, 1fr))`, gap 14px.
- **Max page width:** 1440px (matches sportsbook).

### Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--r-sm` | `6px` | Buttons, chips, small pills, odd tiles inside cards |
| `--r-md` | `12px` | Cards, side panels, most surfaces |
| `--r-lg` | `20px` | Hero, modals, anything "wide and expensive" |

No element exceeds 20px radius. Bubble-radius reads as AI slop.

---

## 5. Motion

**Approach:** intentional. Motion signals liveness; it's not decorative.

| Element | Motion |
|---------|--------|
| Whale ticker | `translateX -50%` over 60s linear infinite. `animation-play-state: paused` on hover. |
| Live dots | Opacity pulse 0.35→1→0.35 over 1.6s ease-in-out infinite. |
| Card hover | `translateY(-2px)` + border → `--accent`, 150ms ease. |
| Search focus | Border → `--accent` + `box-shadow: --accent-glow`, 150ms. |
| Price change (future) | Number-roll 250ms ease-out when WebSocket delivers new price. Not yet implemented. |
| Category chip | Active-state background fade 150ms. |

**Rules:**
- All transitions ≤ 250ms unless explicitly driven by user input (modal open, etc.)
- No bounce easings (`cubic-bezier(...back)`) — reads as toy-like
- No scroll-driven animations — every reference site avoids them
- Respect `prefers-reduced-motion` — disable ticker scroll and live-dot pulse

---

## 6. Components

Components live under `app/components/prediction/`. Each is self-contained (uses `<style>` tags scoped by class prefix) so they can be composed without CSS ordering surprises.

| Component | Purpose | Key classes |
|-----------|---------|-------------|
| `WhaleTicker` | Top auto-scrolling band of large trades | `.predict-ticker`, `.predict-ticker-inner` |
| `PredictHeader` | Sticky chrome: logo, search, auth, cat strip | `.ph`, `.ph-row`, `.ph-cat`, `.ph-wallet`, `.ph-btn-accent` |
| `FeaturedHero` | Hero market + side column wrapper | `.hero-grid`, `.hero`, `.hero-title` |
| `WhaleActivityCard` | Amber-tinted recent large trades list | `.wac`, `.wac-row`, `.wac-addr` |
| `TopMoversCard` | Biggest price movers list | `.tmc`, `.tmc-row`, `.tmc-delta` |
| `MarketCard` | Grid card with sparkline + Yes/No split | `.mkt`, `.mkt-side`, `.mkt-delta` |

### Component rules

1. **Use design tokens.** Never hardcode hex values — always `var(--token)`.
2. **One concern per component.** MarketCard doesn't know about routing — it just takes props and renders. The page composes.
3. **Inline styles via `<style>` blocks are OK** for component-scoped CSS. Keep class prefixes unique (`.mkt`, `.ph`, `.wac`) so nothing cascades into another component.
4. **No `any` types.** Props get interfaces; use `unknown` for caught errors.
5. **No React default import** — Next 16 App Router uses the automatic JSX runtime.

---

## 7. What's out of scope

Tracked as follow-ups, not part of this design system:

- **Market detail page** redesign (hero imagery, chart library selection, order book UI) — needs its own design round once we pick a chart lib
- **Portfolio page** — currently functional but uses old structure
- **Auth pages** — still use sportsbook shell (`.ps-auth-layout` gradient)
- **Backoffice redesign** — backoffice keeps sportsbook look until it gets its own refresh
- **Light mode** — all three Pariflow-style references skip this; we can add later if needed
- **Mobile layout** (<768px) — hero-grid collapses to 1fr, but cat strip overflow + header density need a pass

---

## 8. Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-17 | Dropped left sidebar | None of Kalshi / Polymarket / Pariflow use one; horizontal top nav is the category convention. |
| 2026-04-17 | Outfit over IBM Plex Sans | Outfit is what Pariflow uses; Plex Sans is sportsbook DNA. Outfit scales cleaner at display sizes. |
| 2026-04-17 | Orbitron removed | Sci-fi/gaming signal. Fintech/broadcast doesn't use decorative display fonts. |
| 2026-04-17 | Cyan #22d3ee accent (not mint, not blue, not green) | Distinguishable from Kalshi's mint and Polymarket's blue while staying in the fintech family. Broadcast-live energy. |
| 2026-04-17 | Amber #fbbf24 reserved for whale meaning | Second semantic layer — users spot whale activity in peripheral vision. |
| 2026-04-17 | Added WhaleTicker + WhaleActivityCard | Broadcast-energy feature. Pariflow has a whale feed; we lead with it to signal "this is where the money is moving." |
| 2026-04-17 | IBM Plex Mono for prices/volumes | Departure from Pariflow (uses Outfit everywhere). Adds precision/trader-desk feel for numeric data. |
| 2026-04-17 | Sparklines per market card | Deterministic placeholder sparkline until backend exposes historical prices — cards feel alive even in v1. |
