# 99RTP Predict Redesign — Phase 5 QA Report

**Date:** 2026-07-12 · **Build under test:** branch `feat/predict-redesign-p10`, local dev (Next.js :3012) against the current-source Go gateway (:18080) + auth (:18081) + seeded Postgres. Screenshots referenced were captured live during the pass; evidence for every finding fixed is in `04-change-log.md`.

## 1. Automated gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| Unit/integration suite (`run-tests.sh`, node:test) | ✅ 23/23 files (was 22/23 at baseline — the pre-existing `rewards-active-bonus-render` failure was fixed in this pass) |
| `gate.sh` (TS, phantom imports, mocks, manifest, routes, **production build**) | ✅ 8/8 (baseline main: 7/8 + 1 warning) |
| Playwright smoke suite (9 specs × desktop + mobile projects) | ✅ 25/25 across post-fix runs. Two flaky reruns observed were environmental: the local auth-service **429 rate limiter** tripped by six back-to-back suite runs — retried clean after the window. Two stale smokes were re-encoded to current contracts (see §5) |
| Workspace `yarn install` (lockfile after dependency prune) | ✅ regenerated, committed |

## 2. Functional QA (manual, real backend)

| Flow | Result |
|---|---|
| Discovery → search → market → ticket | ✅ TopBar search (combobox, keyboard cursor) → market page; category pills, series/tags, sort tabs work |
| **Trade placement (logged in, demo user)** | ✅ Placed 1 YES @ 64¢ on `MLBB-FINAL-G1`: wallet debited 510,057 → 509,993 pts; market price impacted 62→64¢; Sell became available; position appears in portfolio (qty 1, avg 64 pts); truthful toast path exercised |
| Live price change before confirm | ✅ implemented (800ms guard + "Price moved X→Y¢" text); verified by code + the post-trade requote rendering; not reproducible on demand without a second trader — **manual live verification pending** |
| Portfolio | ✅ whole-point stats, weekly metric + rank sub-line, position row correct, empty states are system cards |
| Logged-out ticket | ✅ prices public, side/amount preserved into login URL, "Log in to trade" CTA, no doomed authed fetches |
| Auth | ✅ login (lockup restored), register (split screen, disclosure, reduced-motion-gated video); demo login via smoke setup |
| Watchlist | ✅ star toggle + watchlist filter (API-backed, verified by smoke + qa-regression locks) |
| Language switch | ✅ en ⇄ zh-Hans live-switched: nav, actions, sentiment strings, template-localized market titles; missing keys found+fixed (SEARCH_MARKETS, demo banner) |
| Errors/empty | ✅ discussion error → Retry (no contradictory states); anon discussion → sign-in state; chart loading/empty/error honest; 404 route smoke green |
| Demo banner | ✅ shows only under `NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS`, dismiss persists for session |
| KYC/RG/limits interruptions | ◻ not exercisable on this deploy (flags off; backend gates fail-closed). Footer entry points verified to render regardless |

## 3. Honesty verification (the brief's central requirement)

- Hero delta pill: fabricated `deterministicDelta` **gone**; with real history present the pill shows the true move (verified: **+2¢ (+3.2%)** after my own trade moved the market); without history it shows "—". ✅
- Top movers: ranked by real |Δ| with real sparklines (verified values: Norway −83.3% from real seeded series); labeled YES prices; flat/unknown rows show "—" and sort last; module renames honestly ("Most traded · by volume") when no movement exists. ✅
- Synthetic charts: only under the demo flag, always with a visible `SIMULATED` chip (verified on-screen before real history existed; chip disappears when real data loads). ✅
- Landing: four real API-backed markets; play-points disclosure in the hero; no fake markets/mockups/pulsing LIVE dots. ✅
- Volume: "12.9B pts"-scale numbers now format correctly; label no longer claims "24h". ✅
- Balances: whole Points everywhere; the 100× WalletBreakdown error is fixed. ✅

## 4. Visual/responsive QA

Breakpoints exercised live: **320, 375, 768 (smoke mobile project = 393px equivalent), 1244, 1440**.
- 320px: TopBar overflow fixed (wordmark yields to mark); market-head sides strip re-stacked (was overlapping the price pair); landing/hero/cards clean. ✅
- 375px: discovery, market, portfolio, auth clean; eyebrow/ticker collision fixed. ✅
- 1440px: desk layout, movers rail, ticket column verified. ✅
- Dark/light: product is light-only by design this pass (landing's legacy dark theme removed — no mixed-theme rupture remains).
- Locales: zh-Hans exercised live at 1440px; long-string tab overflow mitigated (MobileTabBar clamp). Native-speaker copy review remains open (see §6).
- Known tooling caveat: the browser-pane screenshot tool doesn't track scroll after viewport emulation; below-fold checks used a transform workaround — a fresh manual scroll-through on a real device is recommended before release sign-off.

## 5. Test locks re-encoded (all with dated comments)

1. `qa-regressions` complement-line lock → dashed+0.5 opacity (a11y improvement).
2. `qa-regressions` CategoryPills locks → file-stays-deleted assertion.
3. `qa-regressions` register points-only disclosure → line-break-safe copy (content unchanged).
4. `rewards.smoke` → whole-Points wire fields (`remainingPoints` etc.); retired `*PointsCents` names asserted absent (smoke had been stale since the 2026-07-09 points migration).
5. `market-detail.smoke` → Points-input contract (the "$100" quick chips it asserted were removed in P9.2, pre-P10; ISSUE-001's no-clamp guarantee re-encoded against the input).

## 6. Accessibility

- Fixed this pass (verified by code + rendered spot-checks): dialog semantics/focus trap (Modal), toast alerts + pause, combobox ARIA on input, radiogroup ticket controls + restored focus ring, OrderBook headers, chart legend + dash differentiation, text-token AA ramp, aria-labels with prices on card pills, TapDot naming, carousel timer removal (2.2.2), unlayered-reset fix (restores utility colors on links).
- Verified by earlier code audit as already-sound: global reduced-motion collapse, focus-visible ring, color+text pairing on YES/NO surfaces.
- **Open:** full screen-reader pass (VoiceOver/NVDA) and an axe-core sweep were not run in this session — recommended before release sign-off; keyboard walk of the ticket verified only structurally (radiogroup + arrow keys implemented).

## 7. Performance

- SSR now emits real content on every route (verified via curl: nav + footer + fair-play block in initial HTML; previously an empty `<div/>`).
- Fonts: 6 render-blocking Google families → 6 self-hosted woff2 (~340KB, 2 preloaded, `font-display: swap`).
- Bundle: 8 unused deps removed; ~600 lines dead CSS removed; images lazy+sized; 1.6MB register video no longer fetched under reduced motion.
- **Not measured this session:** Core Web Vitals on throttled mobile (LCP/INP/CLS targets). The structural blockers (blank SSR, font waterfall, unsized images) are removed, but a Lighthouse/CrUX measurement on the deployed demo is required to claim the numbers. Console: zero errors on exercised pages (the anon-401 and refresh-400 noise found during QA was fixed).

## 8. Known limitations & open items

1. **Deploy env:** demo deploy still sets `NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS=true` (now safe — labeled + bannered). If seeded history proves sufficient (it did locally), the flag can be dropped from `deploy-demo.yml` for a fully-real demo.
2. **Backend follow-ups filed:** public read access for market comments (anon discussion is sign-in-gated purely because the endpoint 401s); windowed 24h volume field; demo-seed volume recalibration (billions of points read as absurd even labeled).
3. **Deferred UI:** quick-amount chips on the ticket; WebSocket staleness chip ("Prices as of HH:MM"); share/OG image template carrying the brand signature; dark product theme (tokens structured to permit it).
4. **A/B before real-money launch:** ink ticket-commit CTA vs. filled control (judge condition #3, fallback pre-agreed).
5. Locale copy is literal translation pending native review; legal/compliance copy pending counsel review (see readiness statement).
6. `playwright.config.ts` gained env-guarded escape hatches (`PW_FULL_CHROMIUM`, `PW_EXECUTABLE_PATH`) for dev boxes with flaky browser CDN; CI behavior unchanged.
