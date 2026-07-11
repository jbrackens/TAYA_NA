# 99RTP Predict Redesign — Phase 3: Experience Spec (P10 "Signal Ink")

**Date:** 2026-07-12 · Depends on: `01-research-report.md` (evidence), `02-brand-strategy.md` (direction). Implementation tracked in `04-change-log.md`.

Scope discipline: this pass redesigns the **player app**. Backend contracts, routing, Redux/React-Query architecture, ticket order logic, i18n keys (except honesty rewordings) are preserved. The office app inherits shared tokens only.

---

## 1. Information architecture

```
/                      Landing (light system, real markets, honest claims)     [reworked]
/predict               Discovery: market hero (no auto-advance) + desk modules  [reworked]
/discover              Browse hub: series, tags, closing-window explorer        [restyled]
/category/[slug]       Category browse                                          [restyled]
/market/[ticker]       Market detail + ticket (disclosure completed)            [upgraded]
/portfolio             Positions/orders/history + calibration stats             [fixed+restyled]
/leaderboards          Accuracy-first boards                                    [copy/emphasis pass]
/activity              Public trade tape                                        [restyled]
/account/*             Settings, notifications, security, transactions, RG      [nav honesty pass]
/auth/*                Login/register/reset (brand-consistent, lockup restored)  [restyled]
Footer (all pages)     About/Terms/Privacy/Contact + Safety & controls block    [upgraded]
```

Navigation rules:
- Top bar (desktop): wordmark → Home/Markets/Discover [+Portfolio/Activity when authed] → persistent search → language → balance chip → account. Mobile: bottom tab bar (SSR-rendered, CSS-switched), persistent search via Markets header.
- **Safety discoverability invariant:** links to Notification preferences, Play limits*, Self-exclusion*, Support, and the points disclosure appear in the footer "Fair play & controls" block and account menu on every deploy. (*Flag-gated pages keep jurisdiction gating; when a flag is off, the footer link points to the points-disclosure/About section explaining what the deploy offers — the *entry point* never disappears.)
- Breadcrumbs on market detail retained.

## 2. User segments served (from Phase 1 §3, not age-based)

| Segment | Load-bearing design responses |
|---|---|
| First-session curious (no PM familiarity) | Landing explains mechanism in one screen; hero market teaches the ¢=% grammar; trust copy at ticket; no jargon-only labels |
| Retail-app-fluent, PM-new | Dual ¢/% everywhere; dollar-first→points-first amount entry with quick chips; "how settlement works" one tap away |
| Experienced PM trader | Limit orders, order book depth disclosure, resting-order states, tickers, fee line, spread visibility on thin books |
| Low financial literacy / overconfident | Max-loss row in ticket; plain-language resolution; accuracy (calibration) framing in portfolio; no leverage vocabulary |
| Accessibility needs | Full keyboard paths on trade + auth; SR-correct combobox/dialog/radiogroup; AA tokens; reduced-motion everywhere; labels never color-only |
| Returning/settled-market user | Settled ticket body (kept), attestation display, history tab, resolution notifications (default on, non-promotional) |

## 3. Honesty layer (design requirements — every item from Phase 1 §1.2 + code audit)

1. `deterministicDelta` deleted. Hero delta = real series delta from the same fetched `/prices` series as the chart; while loading/absent → neutral "—" with no color; label states the real window ("Today" only when series covers today, else "since <date>except").
2. Hero/movers/cards never render a synthetic walk. `heroChartPath` synthetic fallback allowed **only** when `DEMO_SYNTHETIC_CHARTS` and then wears a visible `Simulated` chip. MarketChart same chip when flag-rendered.
3. Top movers rebuilt on real data: fetch 1D series for the trending set (bounded N=8, parallel, cached); rank by |real Δ|; sparkline drawn from the same real series; rows without history show price only, no invented movement. Module renamed "Movers · today" only when real; falls back to "Most traded" (volume) with honest label.
4. "24h volume" label → "Vol" (total) everywhere until a windowed field exists (backend follow-up filed).
5. Sentiment strings re-worded to price framing in EN + 6 locales ("Market prices YES at 72¢").
6. Landing: `EXAMPLE_MARKETS` replaced by 4 real markets from public discovery API (graceful skeleton/error → no fake fallback); "Live markets" eyebrow only above real data; mockup phone captioned "Illustrative preview"; no pulsing LIVE dots on static content; PHILIPPINES/Filipino copy replaced by jurisdiction-neutral positioning (owner decides go-to-market geography copy separately).
7. Whole-points display everywhere (`Math.round`, shared formatter, B/M/K compact units); WalletBreakdown vs CurrentBalance unit divergence reconciled against the API contract (verify actual payload units first, then standardize on one formatter).
8. Portfolio "Weekly point result" card: value = weekly net points; rank moves to a labeled "Leaderboard rank" line; accuracy card kept and promoted.
9. Discussion: error state replaces (never co-renders with) composer + zero-state; composer disabled with honest reason while errored.
10. Demo deployments: `NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS=true` additionally renders a dismissible "Demo environment — seeded markets & activity" banner above the shell so seeded volume/leaderboards are disclosed. Real deploys unaffected.
11. Trust copy typo "6c" → "6¢" (locale files).
12. Dead `CountdownTimer.tsx` deleted (no urgency widget to resurrect).

## 4. Surfaces & states

Legend: each surface specifies **loading / empty / error / disabled / stale / live / success** treatments. Global primitives: `TapDot` (loading), system card (white, hairline, shadow-card), honest-state text in `--t2`, retry buttons where a refetch exists.

### 4.1 App shell
- SSR-visible nav (CSS breakpoint switching, no matchMedia null-render). Toast viewport moves below the top bar (no overlap), `role="alert"` for errors, hover/focus pauses timer, ≥44px close target.
- Offline/API-down: `BackendStatusBanner` kept, restyled to system card; WS staleness marker on live prices (see 4.4).

### 4.2 Landing `/`
- Joins the light system: bone-white page, ink hero type (display face), real market cards row, "How it works" 3-step (question → price=probability → settlement), honest points disclosure, single CTA pair (Browse markets / Create account). Ambient video removed from base layer (poster image only, reduced-motion-safe, lazy); dark-theme rupture eliminated.
- States: markets row skeleton → real cards; API error → copy block without fake cards.

### 4.3 Discovery `/predict`
- **Hero = single live market** (highest real 24h movement, else curated top volume), full DiscoveryHero anatomy, manual prev/next through top-4 only (no timer). Real delta per §3.1.
- **Desk modules** under hero: `Closing today` (real close windows), `Movers` (real, §3.3), `New questions` (real recency). Each module = header + 3-6 rows/cards + honest empty state ("No markets close today").
- All-markets grid kept (filters, watchlist, pagination) with de-duplicated card anatomy (§4.7).

### 4.4 Market detail `/market/[ticker]`
- Header: breadcrumb · title · status chip (LIVE pulse only when WS-live; **stale chip** "Prices as of HH:MM" when WS disconnected) · resolution-source one-liner ("Resolves by FIFA official results · Jul 20").
- Chart: real series; honest loading skeleton/error-retry/flat states (kept); YES/NO line legend + dash differentiation for the complement line (a11y); `Simulated` chip when demo-flag path renders.
- Rules block kept ("Market details & resolution"), plus **Settlement timeline** module (Kalshi-inspired, original execution): Opens → Closes (timestamp, no ticking) → Resolves (source) → Points settle (SLA copy).
- Order book/depth + recent trades: kept in collapsed disclosure (P9.2 decision), restyled; bids table gets proper headers.
- Discussion per §3.9; related markets keep real volume w/ compact format.
- Blank-scroll defect fixed (spacer audit).

### 4.5 Trade ticket (logic untouched, disclosure completed)
Rows: Amount (points, quick chips +100/+500/+1k) · Price (live; updates marked) · Est. cost · **Max loss = Est. cost (explicit label)** · **Fees (explicit, "0 pts" until fee schedule exists)** · Points if correct · resolution one-liner · CTA (ink) · trust copy (kept, ¢ fixed).
- **Live price change before confirm:** when the quoted price moves >1¢ between preview and CTA press, CTA disables for 800ms and the Price row flashes the delta with text ("Price moved 63→65¢") — user re-confirms deliberately. (No modal; keeps single-step placement but makes movement legible.)
- Side tabs → `role="radiogroup"`; focus ring restored; keyboard arrows.
- States: auth-loading (kept) / logged-out (kept, side+amount preserved) / insufficient (kept) / no-liquidity (kept) / AMM quote-only (kept) / settled body (kept) / halted ("Trading paused — resolution pending" + why) / submitting (TapDot in CTA) / success (truthful toasts kept + **tap-dot confirm micro-interaction**: dot lands on the CTA, contact ring, 400ms, reduced-motion collapses to instant state change).

### 4.6 Portfolio
- Stat cards fixed per §3.8: Invested · Net result (whole pts) · Open positions · **Accuracy (calibration-first, kept prominent)** · Weekly net (value) + rank line.
- Positions table: entry vs current, unrealized Δ with labels, per-position "if YES/if NO settles" columns; empty state = system card with copy + CTA (no gray slab).
- Orders: resting/partial/cancelled chips with reasons (data exists in API). History: settled outcomes + attestation source.

### 4.7 Market card (dedup pass)
- Anatomy: image/monogram · category eyebrow · question (2-line clamp) · **one probability statement** (price framing, replaces "% say" sentiment line) · YES/NO price links (kept, aria-labels include price+title) · footer Vol (compact) + Closes.
- Watchlist star kept; `aria-pressed` kept; images lazy+sized.

### 4.8 Auth
- Login joins register's split-screen system (lockup restored via BrandMark, poster panel, no 1.6MB video under reduced-motion — matchMedia-gated like landing); consistent field/focus/error styling; SSO buttons per existing flag logic.

### 4.9 Account & safety
- Footer "Fair play & controls": Notification preferences · Play limits* · Self-exclusion* · Points disclosure · Support · Account closure (via settings). (*per §1 invariant)
- Notifications page: categories = Resolutions (default on) · Position fills (on) · Product news (OFF default, explicit opt-in) — no promotional default, per NCL evidence.

### 4.10 Shared error/edge states
- Offline: banner + cached prices marked stale; trade CTA disabled with reason.
- 404/error routes: system-card treatment, way back home.
- Paused/halted market: status chip + ticket explanation (no dead controls).
- Low-liquidity: spread >6¢ or empty book → ticket note "Thin market — your order may not fill" (real check from preview/quote response, no fabrication).
- Settled + disputed: settled body kept; disputed shows "Resolution under review" copy (API exposes status; UI copy only — dispute flow itself is backend-gated).

## 5. Design tokens (P10 deltas — full values in `globals.css` §:root)

- **Type:** `--font-display: "Bricolage Grotesque"` (self-hosted 300-800 variable or 4 static weights) · `--font-ui: Inter` (next/font, 400/500/600/700) · `--font-mono: "IBM Plex Mono"` (400/600). Legacy Outfit/Space Grotesk/Inter Tight/Schibsted/Clash loads removed. `.type-display` remapped; wordmark no longer font-rendered.
- **Ink scale:** `--t1 #0D1114 · --t2 #3F474E · --t3 #5C6670 (≥4.5:1 on surface-2) · --t4 #737D87 (≥4.5:1 on white; decorative-only below 14px prohibited)` — ratios documented in DESIGN.md §8.
- **Action:** `--action: var(--t1)` ink CTAs (hover deepens, focus ring kept `#0e7a53`); `--accent` mint demoted to `--brand-dot #10C8A0` (dot/period/live-pulse only). Category pills active = ink on soft-ink, not mint.
- **Semantics unchanged:** seafoam/coral family kept (AA-verified) — they are data voice, not brand voice. Two-greens ambiguity resolved by deleting mint-as-action.
- **Radius/shadow/motion:** kept (14px cards, shadow recipe, 120/180/300ms), plus `--dur-confirm: 400ms`.

## 6. Logo & wordmark (deliverables)

- `BrandMark.tsx` (kept, geometry audited) + **new `BrandWordmark.tsx`**: custom vector paths, lowercase `taptrade` + split-T crossbar intervention + mint period; name-portable (component reads `brand.name` for aria-label; the drawn asset is per-brand, swap point documented).
- Static assets: `public/brand/wordmark.svg`, `wordmark-dark.svg`, `mark.svg`; favicon tile unchanged.
- Motion: crossbar halves converge + dot lands (900ms, `prefers-reduced-motion` → static), used on auth panel and loading only — never in nav.

## 7. Accessibility work list (from audit; all in Phase 4 scope)

Modal dialog semantics+trap+restore+label; TradeTicket focus ring + radiogroup; toast alert/pause/targets; TopBar combobox attrs onto input; OrderBook table headers+caption; user-menu → disclosure semantics; MarketChart legend+dash; TapDot default label; MarketCard aria-label prices; MobileTabBar label clamp + SSR render; carousel timer removal (2.2.2 moot); register video matchMedia gate; token ramp AA; delete BannerCarousel/Tabs/CategoryPills (+test update); focus-visible audit on all new components.

## 8. Performance work list

next/font migration (2 families + mono, subset, preload); i18n `en` bundled at build, lazy other locales, trimmed boot namespaces; image lazy/decoding/dimensions; remove 7 unused deps (recharts, formik, yup, jsonwebtoken, react-gtm-module, react-infinite-scroller, react-use-websocket, react-code-input); delete ~700 lines dead CSS + glass tokens; landing video → poster; budget: LCP ≤2.5s on mid-tier mobile, CLS ≤0.1 (SSR nav + reserved heights), INP ≤200ms (no new rAF loops).

## 9. Out of scope (documented, not forgotten)

Office app visuals; backend windowed-volume field; seed volume recalibration (filed); dark theme for product surfaces (roadmap — tokens structured to permit it); dispute-resolution flow UI beyond status copy; real-money cashier surfaces (owner-gated ADR-0003/0004); native apps.
