# 99RTP Predict Redesign — Phase 1 Research Report

**Date:** 2026-07-12 · **Author:** Claude (principal researcher/designer/engineer session) · **Product:** the prediction-market player app served at `https://demo.99rtp.io` (repo surface: `apps/taptrade-platform/frontend/packages/app`, current display brand "TapTrade")

Evidence labels used throughout: **[E]** direct evidence (observed on the live product, in the codebase, or in a cited source) · **[I]** inference from evidence · **[A]** assumption needing owner/legal confirmation.

---

## 1. Current-product UX audit (live demo + codebase, audited 2026-07-12)

### 1.1 What the product is today

- **[E]** Binary YES/NO event contracts priced 0–99¢, `yes + no = 100`; categories → series → events → markets; order-book execution with a synthetic market maker; Points unit model (**1 Point = 1¢ of play value**, non-redeemable — footer states "Non-redeemable point prediction markets").
- **[E]** Surfaces: dark marketing landing (`/`), discovery (`/predict`), discover hub (`/discover`), category pages, market detail + trade ticket (`/market/[ticker]`), portfolio, leaderboards, account/profile (KYC/limits/RG behind default-off feature flags), auth (login/register/reset), static/legal pages, floating chat (Rocket.Chat iframe, flag-gated).
- **[E]** Design system "P9" (DESIGN.md, owner-revised 2026-07-06/07): gallery-white light theme, Inter body + Clash Display display + IBM Plex Mono numerals + Schibsted Grotesk wordmark, mint accent `#2be480`, split-T brand mark, "tap dot" motion signature.
- **[E]** Real API + WebSocket wiring throughout the player app (no mock classes in production paths; gate.sh enforces). Trade ticket reports truthful fill/rest/cancel outcomes from gateway responses.

### 1.2 Findings — honesty and data integrity (highest severity)

| # | Finding | Evidence | Severity |
|---|---------|----------|----------|
| H1 | **Synthetic charts render with no on-screen label** when `NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS=true` (the demo deploy sets it). `market-chart-state.ts` substitutes a seeded random walk for loading/error/flat states; users see plausible price history that never happened. | [E] `MarketChart.tsx:147`, `market-chart-state.ts:84-92`; rendered chart on demo market `IMP-3A9130E3` shows continuous dual-line history while the API has sparse history | Critical |
| H2 | **Implausible seeded volume presented as real** — World Cup markets show "Volume 4690.5M pts" … "15857.1M pts" (≈ 4.7–15.9 **billion** Points). No "demo data" label anywhere on discovery, cards, hero stat row, or related-markets rail. | [E] demo.99rtp.io/predict rendered cards + `/api/v1/discovery` payloads | Critical |
| H3 | **Hero carousel auto-advances every 7s** (pauses on hover/focus, honors reduced-motion) — an auto-rotating merchandising surface pushing users toward a trade, explicitly disallowed by the brief. | [E] `FeaturedCarousel.tsx:39,117-124`; observed 1 of 4 → 3 of 4 advancing unattended on demo | High |
| H4 | **Broken delta math on the hero**: "+5¢ (+0.0%)" (Egypt), "-4¢ (-40.0%)" (Norway). Percent and cent deltas disagree or degenerate; deltas derive from the synthetic walk when the flag is on — fabricated movement styled as market signal. | [E] rendered hero 2026-07-12 | High |
| H5 | **Side-ambiguous prices in Top movers**: hero shows Norway YES 6¢ while Top movers lists Norway "94¢ · -4.1%" (NO side) with no side label — same market, two numbers, no explanation. | [E] rendered /predict 2026-07-12 | High |
| H6 | **Portfolio shows fractional Points** ("+50.57 pts", "Balance 0.00 pts") violating the 2026-07-07 whole-Points unit model ("1 Point = 1 cent… never fractional in display"); known 100× display-bug family from the worklog persists here. | [E] localhost portfolio, logged in as demo@taptrade.local | High |
| H7 | **"Weekly point result" stat card displays a leaderboard rank** ("#1") with sub-caption "+50.57 pts point result" — label/value mismatch that misstates what the number is. | [E] localhost portfolio | Medium |
| H8 | **Discussion error + composer contradiction**: market page shows "Discussion could not load.", "0 comments", "No comments yet." simultaneously, with an enabled-looking Post area — three states rendered at once. | [E] demo market page | Medium |
| H9 | **Legacy meta copy**: `layout.tsx` description says "…the moments Filipinos are watching"; landing hero says "PHILIPPINES" — contradicts the current outside-US/crypto-native positioning and the TapTrade rebrand; single static `<title>` for all routes. | [E] `layout.tsx:17`, landing render | Medium |
| H10 | **Trust copy typo**: ticket note renders "6c means a 6% implied probability" — "c" instead of "¢", inconsistent with everywhere else. | [E] demo + localhost ticket | Low |

### 1.3 Findings — IA, hierarchy, and flows

- **[E] Landing/product theme rupture.** `/` is a dark, photographic, Philippines-era marketing hero; every product surface is P9 gallery-white. First session experiences a hard dark→light flash with two different brand voices. DESIGN.md itself mandates "no marketing hero above the market hero."
- **[E] Discovery = carousel + trending sidebar + one giant paginated "All markets" grid.** No editorial curation beyond volume ranking [E: `predict/page.tsx:56-58` ranks by `volumePoints`]; with seeded volume dominating, the same World Cup long-shots monopolize hero, trending, and grid (observed: 12 consecutive near-identical "Will X win the 2026 FIFA World Cup?" 1¢ cards) — a wall of duplicate questions with no diversity control. [I] Discovery fails its job for a first-time visitor: nothing answers "what is this, what's interesting today."
- **[E] Category pills + series + tags** exist and work; watchlist tab exists on the grid (star toggles, `aria-pressed`). Search lives in the TopBar with keyboard handling; mobile gets bottom tabs (Markets/Discover) and search is reachable but not persistent on mobile.
- **[E] Market cards are competent** (question → sentiment line → YES/NO pill links → volume/closes footer; real `<article>`/`<Link>` semantics) but the sentiment line ("Strong Doubt • 99% say No") duplicates the price pills' information and manufactures a consensus voice; volume is the only liquidity signal and it's corrupted (H2); no movement indicator, no resolution-source hint.
- **[E] Market detail page**: breadcrumbs, LIVE badge + countdown, dual YES/NO price header, chart with 1H–ALL ranges, "Market details & resolution" rules block (real resolution copy with primary source + early-resolution clause), discussion, related markets, sticky trade ticket. **Missing:** order book/liquidity depth display for order-book markets (component exists but not surfaced on the page shell we audited), explicit fee line, explicit max-loss framing, resolution-status timeline (closed → resolving → settled), share affordance beyond a bare "Share market" label.
- **[E] Trade ticket is the strongest surface**: market/limit modes, buy/sell, side tabs with single sliding indicator, quantity math from Points amount, preview-backed pricing (`totalCostWithFeesPoints` exists in the API), truthful outcome toasts (full/partial/resting/cancelled with reasons), compliance-denial banners with KYC deep-link, settled-market replacement body, auth-aware CTA preserving side+amount through login. **Gaps:** no explicit "Max loss" row; fees are silently folded into "Est. cost" (never itemized, even as "Fees 0"); no resolution-source one-liner at the money moment; submit is instant with no undo affordance for large amounts.
- **[E] Portfolio**: stat cards, positions/orders/history tabs; empty state is a full-width flat gray slab (reads broken); H6/H7 stat bugs above.
- **[E] Safety and account controls**: RG (self-exclusion, cool-off, history), limits, and KYC pages exist but are **feature-flagged off on the demo deploy**; demo footer shows only About/ToS/Privacy/Contact. Notification preferences page exists (`/account/notifications`). [I] Against the brief's "safety at least as discoverable as trade actions," the shipped demo exposes zero safety surface.
- **[E] Auth**: register got a 2026-07-08 split-screen treatment with social buttons (flag-gated); login is a plain centered card with a **text-only "TapTrade" heading that drops the brand lockup/mark** — auth chrome is brand-inconsistent. Local-only demo-credentials helper box correctly gated to dev.
- **[E] Errors/empty/offline**: route-level `error.tsx`/`loading.tsx` exist for account; `BackendStatusBanner` handles API-down; TapDot loading states standardized. Market-page over-scroll shows a viewport-tall blank region between discussion and footer at 1280×720 (layout spacer defect) [E: observed].
- **[E] Toast stack overlaps the TopBar controls** (welcome-back toast covered language + balance chips at 1280px) [E: localhost].

### 1.4 Findings — accessibility & performance (code-level; verified selectively)

- **[E] Six font families load from Google Fonts** (Inter, Inter Tight, Outfit, IBM Plex Mono, Space Grotesk, Schibsted Grotesk) **plus** self-hosted Clash Display (4 woff2) — DESIGN.md itself flags Outfit/Space Grotesk as "legacy loads pending removal." Render-blocking `<link>` stylesheet, no `preconnect`, no `font-display` control from the link API beyond `display=swap`.
- **[E] Reduced motion**: global `prefers-reduced-motion` collapse in `globals.css:1337` + carousel/TapDot opt-outs — good baseline.
- **[E] GTM injected in production** with no consent surface [A: acceptable for a demo; a real launch in most target jurisdictions needs a consent layer — legal owner to confirm].
- **[I] Contrast risk**: `--t3 #8B8378` on `--surface-1 #FFFFFF` ≈ 3.4:1 — passes only for large text; it is used for 12px eyebrows/labels in multiple components (needs a token-level fix, not spot fixes).
- Full WCAG/axe/perf verification deferred to Phase 5 QA (this section seeds the checklist).

### 1.5 What already matches the brief (preserve, don't churn)

- Truthful order-outcome UX; auth-aware trading states; compliance-denial surfacing; settled-market ticket body [E].
- Real data plumbing end-to-end; no fabricated testimonials, badges, or compliance marks anywhere [E].
- No confetti/streaks/win celebrations/loot mechanics; no deposit dark patterns (there are no deposits — points are non-redeemable) [E].
- Honest empty/loading/error chart states **when the demo flag is off** [E: `features.ts:96-103`].
- i18n across 7 locales; structured logger; typed API client; RBAC'd backoffice [E].

---

## 2. Competitor scorecard

Full per-competitor audits with source URLs, dates, and evidence labels live in [`research-data/`](research-data/) (one JSON per competitor, produced by the 2026-07-12 research sweep; live sites fetched where possible, secondary sources used and disclosed where blocked). Condensed scorecard:

| | **Kalshi** | **Polymarket** | **DraftKings Predictions** | **OG.com** | **Stake.com** |
|---|---|---|---|---|---|
| Positioning | CFTC-regulated exchange; trust as offense ("TRUST" is top-nav) | Crypto-native liquidity leader; probability-first news lens | Sportsbook idiom wrapped around CFTC contracts | Crypto.com's prediction brand; betting-slip framing | Crypto casino; engagement economy |
| Visual language | Near-black + one mint-green system, custom everything | White, dense, corporate-clean, % is the hero | DK green sportsbook DNA | Brand-orange multiplier culture | Dark casino, counters everywhere |
| Typography | Custom 4-face system (Kalshi Sans/Condensed/XCond + dot-matrix data face) | Workhorse sans, tabular numerals | Sportsbook standard | Generic | Generic |
| Market cards | Thumbnail + category + title + LIVE state + outcome rows w/ % pills + $vol footer | % hero number, dual %/¢ encoding end-to-end | Odds rows (moneyline idiom), Yes/No only when no idiom exists | Multiplier-led cards + countdown urgency | Live player/wager counters per card |
| Trade ticket | Dollar-first, odds + max payout + settle date; **fees behind an ⓘ + PDF** | Clean, but **no spread/slippage or fee line** in default ticket | Dollar-first + quick chips; **flat fees invisible in odds UI** | 1.51x payout headline (anchors winnings) | Bet-slip with celebratory framing |
| Trust/resolution | Named sources per market, "Timeline and payout" module, policy center | Rules with primary source + changelog on market page; UMA dispute affordance | Regulated wrapper, thin microstructure | Rules on page (good) but payout SLA complaints | Settlement scope on cards; VIP machinery negates |
| Social | Ideas feed, request-a-market | **Position badges on comments ("233.9K No") + Holders filter** | None meaningful | Win-ticker FOMO crawl | Public wager feed, races/raffles |
| Safety | Responsible-trading tools page, but growth engine is sports urgency | **Zero responsible-use tooling** | DK RG stack (regulated) | Bonus ladders | VIP loss-ladder, rakeback — the full anti-pattern catalogue |
| To learn | Trust-as-navigation; resolution provenance everywhere; exchange artifacts (tickers, fee schedule) as credibility | Dual %/¢ grammar; rules-with-changelog; position-weighted discussion | Dollar-first entry; quick chips; native mental models | Settlement-timeline module | Recent-trades tape as honest liquidity heartbeat |
| To avoid | Fee opacity; KYC-before-value; auto-popping signup modal | Fee/spread opacity; no safety tooling; moderation gaps | Fee-in-odds invisibility; stripped microstructure | Multiplier headline; win-ticker; countdown cards; volume bonus ladders | Everything engagement-economy: races, VIP ladders, rakeback, loss-as-status |

**Category-level takeaways [I]:** (1) Nobody in the set shows fees plainly on the default ticket — inline effective-fee display is an open trust move. (2) "Genuinely designed light theme" is unclaimed among crypto-native players (Polymarket is white but corporate-dense; Kalshi went dark). (3) Resolution provenance is becoming table stakes (Kalshi/Polymarket/OG all print rules on the market page) — our product already does this; keep and sharpen. (4) The engagement-economy patterns (races, streaks, multiplier anchoring, win-tickers) are precisely what regulators are now litigating — the brief's prohibitions match the current enforcement frontier.

---

## 3. Trends & audience research (condensed; full findings in `research-data/`)

**Audience (evidence-led, not age-stereotyped).** Young adult traders are mobile-first and socially discovered (48% of Gen Z investors learn investing from social media — FINRA/CFA 2024; 43% of 18–29s get news on TikTok — Pew 2025), but increasingly disciplined (eToro 2025, n=11,000) and *aware* that most participants lose (≈2.9 unprofitable Kalshi accounts per profitable one). The dangerous segment property is the **knowledge–confidence gap** (FINRA 2026: social-media-informed investors scored 42% on knowledge quizzes while 63% self-rated high). Copy-trading and social-comparison features **causally increase risk-taking** (Management Science 2020; Sci Reports 2023). Segmentation for design: by experience with order mechanics, financial literacy (calibration), prediction-market familiarity, risk posture, accessibility needs, lifecycle stage — delivered in the Phase 3 spec §2.

**Dark patterns to prevent (with evidence of harm).** Newall 2025 taxonomy + UKGC bans (losses-disguised-as-wins, autoplay, reverse withdrawals; Jan 2025 illusion-of-false-wins ban) + Robinhood's confetti removal and $7.5M MA settlement + Chapkovski et al. (gamification raises volume ~5%, worst for low-literacy users) + NCL 2025 (93% of sportsbook push notifications promotional). Countermeasures adopted as design requirements: no celebration effects, no streaks, no anchored large default stakes, no urgency countdowns on discovery surfaces, no loss-timed re-engagement, notifications default to market-events-only, safety controls as discoverable as trade actions. UKGC's post-implementation finding — **reduced intensity with no loss of enjoyment** — is the commercial case that safety-first design does not kill the product.

**Regulatory perimeter for THIS deploy (non-US, crypto-native, play-points).** Federal/US landscape is in flux (CFTC NPRM Jun 2026; circuit split heading to SCOTUS) but irrelevant to what the demo may *claim*: the product must never display "regulated/licensed/safe/CFTC" language, should affirmatively state it is not registered with any regulator, must geo-fence honestly when real-money features arrive, and may truthfully state the current mechanism: **non-redeemable play-points, no deposits, no withdrawals, no cash value** (Manifold precedent). Age gating: 18+ self-attestation is the play-points norm. All legal copy flagged for owner/counsel review before any real-money launch (ADR-0003/0004 remain owner-gated).

**Visual/brand trends.** See Phase 2 doc §1 — the 8 positioning constraints derive from this track (AI-template blocklist, Fontshare fatigue, one-accent discipline, motion-capable wordmarks, light-theme lane, trade-confirm micro-interaction gap).

---

## 4. Insight-to-decision table

| Research finding | Product implication | Design decision | Source |
|---|---|---|---|
| Fabricated deltas/sparklines/charts on discovery surfaces, unflagged (H1–H5) | Product lies about movement on its highest-traffic page | Compute deltas from the real `/prices` series; kill `deterministicDelta`; synthetic rendering only behind the demo flag **with a visible "Simulated" label**; honest flat/loading/error states | Code audit 2026-07-12 |
| Volume label says "24h", field is lifetime | Inflates apparent recency/liquidity | Relabel "Vol" (total); real windowed volume is a backend follow-up | Code audit |
| "99% say No" phrasing implies population counts | Misstates price as vox populi | Reword sentiment strings to price framing in all 7 locales | Code audit |
| Landing page hardcodes 4 fake markets under "Live markets" | Fabricated product data on first touch | Landing fetches real markets from public discovery API; illustrative surfaces get visible captions | Code audit |
| No competitor shows fees inline on the default ticket | Open trust differentiator | Ticket gains explicit Fees row (even "0 pts") + Max loss row | Kalshi/Polymarket/DK audits |
| Resolution provenance = table stakes; Kalshi's "Timeline and payout" is best-in-class | Users need "when/how does this settle" at the money moment | Market page keeps rules block; ticket gains one-line resolution source; settled states show attestation | Kalshi/OG audits |
| Copy-trading/social-proof causally increases risk-taking | Social must be evidence, not FOMO | Discussion + position-transparency (Polymarket-style badges) allowed; no copy buttons, no win-tickers, no streaks | Mgmt Science 2020; Sci Rep 2023 |
| 93% of sportsbook pushes are promotional; loss-timed VIP contact is litigation frontier | Notification abuse is the category's worst pattern | Notification prefs: market-resolution + position events only by default; no promotional default; controls in footer | NCL 2025; MA Gaming Commission |
| Auto-advancing carousels violate WCAG 2.2.2 + rush users | Hero must not merchandise | Remove auto-advance; user-controlled prev/next only | A11y audit; brief |
| Knowledge–confidence gap (42% actual vs 63% self-rated) | First-time users overestimate understanding | Plain-language trust copy at money moment (kept); "how settlement works" one-tap from ticket; no jargon-only labels | FINRA 2026 |
| Accuracy % already tracked per user | Calibration > profit as reputation | Portfolio/leaderboards emphasize accuracy (calibration-first), never staked volume | Audience research; Stake avoid-list |
| Inter/Clash/Satoshi are documented template tells; light theme is unclaimed lane; one-accent discipline wins | Brand must be ownable without cosplaying a casino or terminal | Direction B "Signal Ink" (Phase 2 doc): Bricolage Grotesque + Inter + Plex Mono; ink CTAs; one brand mint as the dot; custom vector wordmark | Visual-trends research |
| Blank SSR shell (i18n) + 7 font families + client-only nav | LCP/SEO/low-end-mobile harm | Bundle `en` resources at build; next/font self-hosting; 2 families + mono; SSR-visible nav | A11y/perf audit |
| Modal/focus/toast/combobox/table ARIA defects (13 items) | WCAG 2.2 AA failures on auth + trade paths | Fix list in Phase 3 spec §7 / Phase 4 change log | A11y/perf audit |
| `--t4` 2.27:1, `--t3` 4.3:1 on surface-2 | Money microcopy near-invisible to low-vision users | Token-level re-scale of text ramp; document ratios | A11y/perf audit |
| Demo seed volumes read as billions of pts | Demo box discredits the product to investors | Format compact (B/M/K); "Demo environment" banner flag for seeded deploys; seed recalibration filed as backend follow-up | Live audit |

**Assumptions log [A]:** (1) Play-points remain non-redeemable for this deploy — all risk copy written for points, not money; owner/counsel must re-review before any cashier launch. (2) 18+ self-attestation stays the age gate for play-points. (3) The office/backoffice app is out of visual scope this pass. (4) English is the copy source of truth; locale rewordings are literal translations pending native review.
