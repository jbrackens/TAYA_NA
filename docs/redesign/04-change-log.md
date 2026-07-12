# 99RTP Predict Redesign — Phase 4 Change Log

**Branch:** `feat/predict-redesign-p10` (2 commits: `e639be4c` main pass, `c8102ee5` QA pass) · **Scope:** player app only (`apps/taptrade-platform/frontend/packages/app`) · backend, office app, API contracts untouched (one `next.config.js` and one `yarn.lock` change noted below).

## Honesty layer (brief: "audit and correct any simulated or deterministic price movement…")

| Change | Files |
|---|---|
| `deterministicDelta` (ticker-hash fake "Today" delta) **deleted**; hero delta computed from the same real `/prices` series as the chart; loading/absent → neutral "—" | `utils/spark.ts`, `DiscoveryHero.tsx` |
| Top movers rebuilt on real 1-day series (bounded batch of 8, 60s cache); ranked by real \|Δ\|; sparklines drawn from real series; labeled YES prices (fixes side-ambiguity H5); honest fallback header "Most traded · by volume" when no movement | `utils/useHeroPriceHistory.ts` (new hooks), `TrendingSidebar.tsx` |
| Synthetic walks render **only** behind `NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS` and always wear a visible `SIMULATED` chip (`resolveChartSeries` exposes `synthetic: true`) | `market-chart-state.ts`, `MarketChart.tsx`, `DiscoveryHero.tsx` |
| Landing page rewritten: light system, four **real** markets from the public discovery API (skeleton → real cards; section omitted on error — no fake fallback), "Play points only — no deposits, no cash value" hero disclosure, Philippines-era copy and hardcoded `EXAMPLE_MARKETS`/`TradeTicketPreview`/ambient video deleted | `app/page.tsx`, `AppShell.tsx`, `page-home.json` ×6 locales |
| Sentiment strings re-worded from population claims ("99% say No") to price framing ("Market prices No at 99%") in 6 locales | `prediction.json` ×6 |
| "24h volume" label corrected to "Volume" (field is lifetime cumulative) | `prediction.json` ×6, `DiscoveryHero.tsx` |
| Whole-Points display everywhere (`formatWholePoints` shared formatter); **fixes WalletBreakdown ÷100 bug that under-displayed balances 100×**; compact formatter gains B tier | `market-display.ts`, `CurrentBalance.tsx`, `WalletBreakdown.tsx`, `TopBar.tsx`, `TradeTicket.tsx`, `portfolio/page.tsx` |
| Portfolio "Weekly point result" card shows the metric; leaderboard rank moved to a labeled sub-line | `portfolio/page.tsx` |
| Carousel auto-advance removed (user-controlled prev/next + keyboard only) | `FeaturedCarousel.tsx` |
| Discussion load-failure is a dedicated state (error + Retry replaces composer/zero-state — previously three states rendered at once) | `MarketDiscussion.tsx` |
| Demo deploys show a dismissible "Demo environment — seeded data" banner | `DemoDataBanner.tsx` (new), `AppShell.tsx` |
| Sub-half-cent moves render as flat "—", never "+0.0%" in signal colors | `utils/spark.ts`, `TrendingSidebar.tsx` |
| Trust-copy "6c" → "6¢"; meta description de-localized from Philippines copy | locales, `layout.tsx` |

## Brand system (P10 "Signal Ink")

| Change | Files |
|---|---|
| **Drawn vector wordmark**: outlines derived from Bricolage Grotesque (OFL), split-crossbar intervention on both t's + mint landing period; used in TopBar, auth, footer; static SVGs exported; regeneration script committed | `BrandWordmark.tsx` (new), `public/brand/wordmark*.svg`, `mark.svg`, `scripts/redesign/wordmark.py` |
| Type system: 7 font families → self-hosted **Bricolage Grotesque (display) + Inter (UI) + IBM Plex Mono (data)**; Google Fonts render-blocking link removed; preloads added; Clash/Outfit/Space Grotesk/Inter Tight/Schibsted retired | `globals.css`, `layout.tsx`, `public/fonts/` |
| Ink action layer (`--action*` tokens): primary CTAs are ink; mint survives only as the tap-dot (`--brand-dot`); category-pill/nav actives are ink; violet avatar gradient retired (violet = Legend tier only) | `globals.css`, `TopBar.tsx`, `TradeTicket.tsx`, `DiscoveryHero.tsx`, `MarketDiscussion.tsx`, market/live pages |
| Trade-confirm **tap-land** micro-interaction (400ms one-shot dot; reduced-motion collapses) | `globals.css`, `TradeTicket.tsx` |
| Text ramp re-scaled to AA at token level (`--t3` 5.0:1, `--t4` 4.5:1, decorative `--t-ghost`) | `globals.css` |
| Dead CSS deleted (~600 lines: `.ps-*` sportsbook shell, Liquid Glass material system, legacy s0–s3/b1–b3/bg-navy…/accent-gradient tokens); the two remaining glass call sites replaced with system cards | `globals.css`, market + live pages, `TierPill.tsx` |
| **Root cause fix:** `a`/`button` element resets moved into `@layer base` — unlayered they beat every Tailwind text-color utility on anchors (source of ink-on-ink CTAs and historic `!text-*` workarounds) | `globals.css` |

## Disclosure & safety

| Change | Files |
|---|---|
| Ticket gains **Max loss** and **Fees** rows (preview API already carried `maxLossPoints`/`feePoints`; fee falls back to `feeRateBps`, renders explicit "0 pts") + resolution one-liner ("Resolves by manual review · Jul 21") | `TradeTicket.tsx` |
| **Live price-move guard**: quote moves ≥1¢ under the cursor → CTA pauses 800ms + text notice "Price moved 62¢ → 64¢" | `TradeTicket.tsx` |
| **Settlement timeline** module on market detail (Trading · Closes · Resolves · Points settle) | `market/[ticker]/page.tsx` |
| Footer **"Fair play & controls"** block on every deploy: notification settings, play limits, self-exclusion, support, account closure (flag-off deploys route to `/about#fair-play` explanation — entry points never disappear) | `PredictFooter.tsx`, `footer.json` ×6, `about/page.tsx` |
| Register/login brand-consistent lockups; register disclosure strengthened; about page gains no-regulator statement | auth pages |

## Accessibility

Modal: dialog role/aria-modal/labelledby + focus trap + restore + labeled close + retheme off dead dark palette · Toasts: `role="alert"` for errors, hover/focus pause, ≥44px close target, viewport moved below the top bar · TopBar search: combobox ARIA moved onto the input (activedescendant now announced) · user menu: disclosure semantics (half-implemented `role="menu"` removed) · ticket control groups: `role="radiogroup"`/`radio` + arrow keys + **restored focus ring** on side tabs · OrderBook: proper table headers + captions · MarketChart: dashed complement line + inline legend (not hue-only) · MarketCard: aria-labels include price + lazy/sized images · TapDot default accessible name · MobileTabBar label clamp (long-locale overflow) + 11px labels · carousel WCAG 2.2.2 satisfied by removing the timer.

## Performance

i18n EN boot namespaces bundled at build → **SSR renders real content** (was a blank `<div/>` behind 11 fetches); `jsdom`/`isomorphic-dompurify` externalized (`next.config.js serverExternalPackages`) to fix static prerender; fonts: 1 render-blocking cross-origin stylesheet + ~24 weights → 6 self-hosted woff2 (~340KB total, 2 preloaded); 8 unused dependencies removed (recharts, formik, yup, jsonwebtoken, react-gtm-module, react-infinite-scroller, react-use-websocket, react-code-input) + lockfile regenerated; register-page 1.6MB ambient video no longer downloads under reduced-motion; dead components deleted (BannerCarousel, Tabs, CategoryPills, CountdownTimer); `de` locale tree removed.

## Deliberately unchanged

Trade-ticket order/preview/toast logic and API contracts; routing; Redux/React-Query architecture; WebSocket layer; office app (inherits token values only); backend (two follow-ups filed: windowed-volume field, seed volume recalibration).

## Known trade-offs

- Non-English users see one English-first paint before their locale loads (previously: blank paint for everyone).
- `qa-regressions` source locks re-encoded where they froze pre-P10 design (complement-line mute, CategoryPills, register copy) — each with a dated comment.
- Quick-amount chips (+100/+500) and a WebSocket staleness chip were specced but deferred; listed in the QA report as open items.
