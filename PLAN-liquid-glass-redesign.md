# Plan — Liquid Glass redesign of the Predict player app

**Scope:** Convert the Predict player app at `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/` from the current dark-broadcast (phoenix lime) aesthetic to Liquid Glass (mint emerald) per the updated `DESIGN.md` (2026-04-24 revision). Backoffice stays on the sportsbook system and is explicitly out of scope.

**Source artifacts:**
- Design spec: [`DESIGN.md`](./DESIGN.md) — revised 2026-04-24.
- Desktop mockup: `~/.gstack/projects/jbrackens-TAYA_NA/designs/liquid-glass-desktop-mint-20260424-200756/market-detail-mockup.html`.
- Mobile mockup: `~/.gstack/projects/jbrackens-TAYA_NA/designs/liquid-glass-20260424-195105/trade-ticket-mockup.html`.
- Palette reference: Thndr casino theme (https://www.thndr.io/games → Casino tab).
- Prior design ref: skeuomorphism mockup at `~/.gstack/projects/jbrackens-TAYA_NA/designs/skeuomorphism-20260424-193928/trade-ticket-mockup.html` (rejected direction, kept for contrast).

**Status:** REVIEWED (2026-04-24, `/plan-eng-review`). Decisions below are locked in.

---

## Review outcomes (2026-04-24)

A `/plan-eng-review` found 6 material issues in the original plan. A codex outside-voice review added 5 more. All have been addressed below. Summary of decisions:

- **D1:** Phase 1 safety pass expanded to preserve semantics of `--accent-glow` (keep as full box-shadow declaration with new mint color), alias `--s0..--s3` to visually-close `--bg-*` values, keep `--gain`/`--whale`/`--whale-soft` as deprecation aliases until Phase 4.
- **D2:** Fix `AppShell.tsx:40` and `globals.css:44` opaque backgrounds in Phase 1. Without this, `BackdropScene` is occluded and Phase 2 ships broken.
- **D3:** Full hardcoded-hex sweep of all 50 files with hex literals (208 occurrences of `#39ff14`, `#34d399`, `#f87171`, `#fbbf24`) in Phase 1. Token swap alone leaves neon green visible in component `<style>` blocks.
- **D4:** New Phase 0.5 — add Playwright smoke-test harness as a new dev dependency. Resolves plan's prior "no new npm deps" contradiction — accept one new dev dep (Playwright) as the price of catching visual regressions.
- **D5:** Keep 3-layer backdrop split (CSS `body::before` + React `BackdropScene`). Faster first paint, simpler mental model.
- **D6:** Phase 3 is NOT a single-page pilot. It's a "shell + market detail" change because `PredictHeader` / `WhaleTicker` are mounted in `AppShell`, not just market detail. Renaming the header in Phase 3 affects every non-auth route. Plan relabeled.
- **D7:** Phase 4 time estimate revised from ~4 hrs → ~8-12 hrs across multiple sessions. Route inventory expanded. Previous estimate was fantasy.
- **D8:** Mid-Phase-3 perf gate added — Chrome DevTools Performance + Lighthouse mobile on the pilot page before Phase 4 begins. If glass fails on Pixel-6a-class devices, the material system gets downgraded before the problem infects every page.
- **D9:** DESIGN.md token-naming bug: doc says `--t-1..--t-4`, code uses `--t1..--t4`. DESIGN.md gets fixed (code is the authority).
- **D10:** Phase 1 verification command changed from fake `npm run type-check` to real `npx tsc --noEmit`. Add a `typecheck` script to `package.json` in Phase 0.5 while we're adding Playwright anyway.
- **D11:** Whale components (WhaleTicker, WhaleActivityCard, TopMoversCard, FeaturedHero) deletion is product-scope, not pure-visual. Confirmed acceptable pre-PMF because (a) session-scope user owns the product call, (b) those components can be re-added as glass variants later if needed. Flagged in the plan under "NOT in scope."

---

## Phases

Each phase is one PR. Each is independently mergeable and revertable. Estimated CC times are best-case (single engineer, no surprises, no review cycles).

### Phase 0 — DESIGN.md update (DONE)

**Status:** DONE as of this commit.

DESIGN.md revised to describe the new Liquid Glass system + Thndr mint palette + cool backdrop + spring physics + accessibility + performance budget. Decisions Log updated with the 2026-04-24 pivot entries (keeping the prior decisions in context, not erasing them).

No code changes in this phase. Everything downstream reads from `DESIGN.md`.

**Deliverable:** `DESIGN.md` revised.
**Effort:** ~45 min CC (already spent).
**Risk:** None — doc only.

---

### Phase 0.5 — Smoke-test harness + verification scripts (NEW, per review D4 + D10)

**Goal:** Add a Playwright smoke-test harness and a real typecheck script so subsequent phases have a catch-net for regressions and a valid verification command.

**Files touched:**
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/package.json` — add `"typecheck": "tsc --noEmit"` and `"test:smoke": "playwright test"` scripts, add `@playwright/test` as a devDependency.
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/playwright.config.ts` — new config file pointing at the dev server running on port 3000. Viewport presets: desktop 1440×900, mobile 375×812. Parallelism: 1 (dev server is stateful).
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/tests/smoke/` — new directory.
  - `_shared.ts` — helper: log in as `demo@phoenix.local` once, persist auth state to `tests/.auth/demo.json`, reuse across tests.
  - `predict.smoke.spec.ts` — load `/predict`, assert: page title, no React error boundary, no console.error, non-empty content, at least one MarketCard renders.
  - `market-detail.smoke.spec.ts` — load `/market/[seeded-ticker]`, same assertions + trade ticket + chart visible.
  - `portfolio.smoke.spec.ts`, `rewards.smoke.spec.ts`, `leaderboards.smoke.spec.ts`, `account.smoke.spec.ts`, `auth-login.smoke.spec.ts` — one file per route, same shape.

**Test fixture strategy** (resolves codex flakiness concern):
- Tests use a dedicated test user auth state captured once, reused across runs.
- Tests assume the local dev stack (docker compose + dev server) is up and seeded. CI runs `docker compose up -d` + `go run ./cmd/seed` + `npm run dev` before the smoke suite.
- Tests do NOT place orders or mutate wallet state. Read-only assertions only. If a future smoke test needs mutations, it seeds its own per-test data and tears down after.
- The seeded market used in `market-detail.smoke.spec.ts` is looked up by ticker via `/api/v1/markets` first — if not found, the test is skipped with a clear reason, not hard-failed.

**Acceptance:**
- `npx playwright install chromium` (one-time).
- `docker compose up -d && npm run dev` in one terminal.
- `npm run test:smoke` in another — all 7 smoke tests pass.
- `npm run typecheck` — clean.
- CI pipeline (future): runs typecheck + smoke in a GitHub Action after every PR push.

**Effort:** ~1.5 hrs CC.
**Risk:** Low. Playwright is boring-tech (Layer 1 per gstack ethos). Dev dep only, no prod bundle impact.

---

### Phase 1 — Token + material layer (EXPANDED, per review D1 + D2 + D3 + D10)

**Goal:** Update `app/globals.css` with the new color tokens, glass utility classes, new radii scale, unblock the backdrop (AppShell/body transparent), and sweep hardcoded hex literals from component `<style>` blocks so the token swap actually lands visually. After this phase the app looks different everywhere — new mint accent + new backdrop gradient + unified palette — and no components are broken.

**Files touched (broader than original plan — see review D1/D2/D3):**
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/globals.css` — tokens, glass utility, media queries, body transparent.
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/AppShell.tsx` — remove `background: var(--s0)` from the 100vh wrapper (D2).
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/layout.tsx` — mount `<BackdropScene />` at body root (brought FORWARD from Phase 2 so Phase 1 doesn't ship with a pure black page).
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/BackdropScene.tsx` — NEW (also brought forward from Phase 2).
- **~50 component files** with hardcoded hex literals — hex sweep per D3. Concrete file list captured in `~/.gstack/projects/jbrackens-TAYA_NA/hex-sweep-inventory-YYYYMMDD.md` at the start of Phase 1.

**Note on scope merge (review D5 + D2):** Phase 1 and Phase 2 are merged into a single phase because (a) AppShell/body need to be transparent in Phase 1 anyway, and (b) shipping a transparent AppShell without a backdrop = pure black app. The BackdropScene component and the gradient must go in at the same time. The phase numbering stays (Phase 2 is now an empty "no-op placeholder" for plan continuity) but the work is consolidated.

**Concrete changes to `globals.css`:**

1. **Replace the surface palette** (`--s0..--s3`) with safe aliases to visually-close `--bg-*` tokens (per D1):
   ```css
   --s0: var(--bg-teal);    /* was #111827, --bg-teal #0c2638 is visually nearest */
   --s1: var(--bg-navy);    /* was #1f2937, --bg-navy #0c2a4a is nearest */
   --s2: var(--bg-deep);    /* was #0f1623, --bg-deep #06101c is nearest */
   --s3: var(--bg-deep);    /* was #0b111c, --bg-deep is nearest */
   ```
   (NOT aliased to `--bg-deep` for all — that makes the app too dark. Match visual weight.)
2. **Replace the accent tokens** with the mint palette. Keep `--accent-glow` as a **complete box-shadow declaration** so `box-shadow: var(--accent-glow)` continues to work on all 17 call sites (D1):
   ```css
   --accent:            #2be480;
   --accent-hi:         #00ffaa;
   --accent-lo:         #1fa65e;
   --accent-deep:       #0094ff;
   --accent-soft:       rgba(43, 228, 128, 0.14);
   --accent-glow-color: rgba(43, 228, 128, 0.45);                    /* NEW: color only */
   --accent-glow:       0 0 28px var(--accent-glow-color);           /* PRESERVED: shadow decl */
   --accent-gradient:   linear-gradient(100deg, #2be480 0%, #00ffaa 50%, #0094ff 100%);
   ```
3. **Add the glass token set** (`--glass-thick`, `--glass-regular`, `--glass-thin`, `--glass-inset`, `--rim-top`, `--rim-bottom`, `--rim-side`, `--chroma-1`, `--chroma-2`) per DESIGN.md §3.
4. **Replace the semantic palette**:
   - `--yes` goes from green `#34d399` → blue `#7fc8ff`. Add `--yes-hi`, `--yes-lo`, `--yes-glow`.
   - `--no` goes from red `#f87171` → peach `#ff9b6b`. Add `--no-hi`, `--no-lo`, `--no-glow`.
   - Keep `--gain`/`--whale`/`--whale-soft` as deprecation aliases pointing at sensible values (D1 — NOT deleted in Phase 1):
     ```css
     --gain:       var(--accent);                        /* deprecated — use --accent */
     --whale:      #fbbf24;                              /* deprecated — amber retained until Phase 4 deletes callers */
     --whale-soft: rgba(251, 191, 36, 0.14);             /* deprecated */
     ```
   - `--live` changes `#ef4444` → `#ff6b6b` (softer, distinguishable from `--no` peach).
5. **Update the radii scale** from 6/12/20 → 10/16/22/28 + `--r-pill: 999px`.
6. **Add the `.glass` utility class + tier variants** (`.glass-thick`, `.glass-med`, `.glass-thin`) per DESIGN.md §4 recipe. Include the `::before` specular sheen.
7. **Add `.glass-inset`** for recessed inputs.
8. **Add the `@media (prefers-reduced-transparency: reduce)` block** that falls back glass to solid fills.
9. **Add the `@media (prefers-reduced-motion: reduce)` block** disabling CTA shimmer, slider shimmer, LIVE-pulse, spring overshoot.
10. **Set `body { background: transparent }`** (D2) so the backdrop shows through.
11. **Add the `body::before` radial-gradient stack** per DESIGN.md §5 Layer 1.
12. **Preserve** the tier colors (`--tier-1..--tier-5`) — loyalty was shipped against those.
13. **Preserve** existing sportsbook `ps-*` / `discovery-*` / `sport-pill` classes.

**AppShell.tsx fix (D2):**

Remove `background: "var(--s0)"` from the 100vh wrapper `<div>`. Replace with `background: "transparent"` or just remove the background property entirely. The wrapper stays (it provides min-height and other semantic structure) but becomes transparent so the fixed `body::before` shows through.

**Hardcoded hex sweep (D3):**

Before touching component files, generate an inventory:

```bash
cd apps/Phoenix-Predict-Combined/talon-backoffice/packages/app
grep -rn --include='*.tsx' --include='*.ts' --include='*.css' -E '#39ff14|#34d399|#f87171|#fbbf24' app/ components/ lib/ \
  > ~/.gstack/projects/jbrackens-TAYA_NA/hex-sweep-inventory-$(date +%Y%m%d).md
```

Then systematically:
- `#39ff14` → `var(--accent)` (was phoenix lime, now mint)
- `#34d399` → `var(--yes)` (was yes-green, now yes-blue — visual shift intentional)
- `#f87171` → `var(--no)` (was red, now peach)
- `#fbbf24` → `var(--whale)` (unchanged aliased value for now; Phase 4 deletes callers)

For values derived from these (transparent/soft variants like `rgba(57, 255, 20, 0.14)`), replace with `var(--accent-soft)` or similar.

50 files, ~208 occurrences. Expect ~2 hrs CC of methodical find/replace + verification.

**Deprecation hit list (for Phase 4 cleanup):**

After Phase 4 lands, the following are unused and can be deleted:

- `--s0..--s3` deprecation aliases (added in Phase 1, removed in Phase 4).
- `--gain`, `--whale`, `--whale-soft` — retired; Phase 4 deletes the WhaleTicker/WhaleActivityCard/TopMoversCard/FeaturedHero callers.
- `public/logo-tn.svg` — replaced by `BrandMark` component; delete if no Phase 4 page references it.

**Verification:**

- `npm run typecheck` clean (the script added in Phase 0.5).
- `npm run test:smoke` — all 7 page smoke tests pass.
- `npx playwright test --grep @visual` (if visual tests added later) — not required in Phase 1.
- Manual QA: visit `/predict`, `/market/[any]`, `/portfolio`, `/rewards`, `/leaderboards`, `/account`, `/auth/login`. Pages render with new mint accent + cool backdrop. No broken layouts. CTA glows still work (D1 fix). No visible phoenix-lime hex leftover (D3 fix).
- Legacy sportsbook pages-router pages unaffected (they use `ps-*` classes, which were preserved).

**Effort:** ~5-6 hrs CC (revised from ~2 hrs). Breakdown:
- Token + glass utility + backdrop integration: ~2 hrs
- AppShell transparency fix: ~15 min
- BackdropScene component (moved forward from Phase 2): ~45 min
- Hardcoded hex sweep (50 files, ~208 hits): ~2 hrs
- Smoke test suite validation: ~30 min
- Buffer / verification: ~30 min

**Risk:** Medium (was: low). More files touched, but each change is mechanical and the smoke harness from Phase 0.5 catches regressions.

---

### Phase 2 — (CONSOLIDATED INTO PHASE 1, per review D2 + D5)

**Status:** Consolidated into Phase 1. Original Phase 2 work (BackdropScene component + `body::before` gradient) has been pulled forward into Phase 1 because (a) Phase 1 must make AppShell/body transparent to unblock the backdrop, and (b) shipping transparent AppShell without a backdrop = pure-black app. The two must ship together.

This numbering preserved so downstream phase references still make sense. Work owned by Phase 1.

---

### Phase 3 — Shell + market-detail pilot (RELABELED, per review D6)

**Goal:** Convert the global shell (TopBar / PredictHeader rename — globally coupled via AppShell) PLUS the market-detail page pilot to Liquid Glass per DESIGN.md §4 + §8. This is the most complex page-level change, and because the shell ships in the same PR, **this phase has a global blast radius** despite being called a "pilot." Naming corrected per review D6.

**Honest scoping note:** The original plan called Phase 3 a "single-page pilot." It isn't. `PredictHeader` and `WhaleTicker` are rendered by `AppShell` on every non-auth route. Renaming `PredictHeader → TopBar` and deleting `WhaleTicker` immediately affects every page. Phase 3 IS the shell redesign + the market-detail pilot happening atomically. Subsequent phases (4+) have a smaller shell impact because the shell is already done.

**Files touched:**
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/market/[ticker]/page.tsx`
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/TradeTicket.tsx` — redesigned.
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/MarketCard.tsx` — redesigned (used for related-markets sidebar on detail page).
- New: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/MarketHead.tsx` — the question + meta pills + countdown strip.
- New: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/MarketChart.tsx` — SVG line chart with glow + current-price marker.
- New: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/OrderBook.tsx` — solid-fill table inside glass card with depth-bar `::after` gradients.
- New: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/RecentTrades.tsx` — tape of side-badged rows.
- New: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/BrandMark.tsx` — 28px gradient-filled brand square.
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/PredictHeader.tsx` → renamed to `TopBar.tsx`. Becomes `.glass.glass-med` with `BrandMark` + nav links + search + balance + avatar. The sticky 110px header with category strip collapses to a 64px glass strip; the category strip moves INTO `/predict` page body (as a horizontal `.glass.glass-thin` chip strip under the page title).
- Delete: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/WhaleTicker.tsx` (retired per DESIGN.md §8).
- Delete: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/WhaleActivityCard.tsx`.
- Delete: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/TopMoversCard.tsx`.
- Delete: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/FeaturedHero.tsx`.

**Layout mapping (desktop):**

```
TopBar (64px sticky, .glass.glass-med)
└── BrandMark + nav + search + balance pill + avatar

MarketHead (22-26px padding, .glass default)
└── LIVE pill + category pill + volume pill + traders pill + closes-in countdown
└── Market question (28px bold)
└── Resolution blurb (14px, --t-2)

2-col grid (minmax(0,1fr) 360px, gap 24px):

  LEFT column:
    MarketChart (.glass default, 320px SVG inside)
    ├── Price display (48px mono, YES color) + delta pill
    ├── Time switcher (1H 6H 1D 1W ALL, recessed pill segmented control)
    ├── SVG chart with glow on line + current price marker
    └── Stats row (implied prob, 24h range, 24h volume, open interest)

    2-col data row (gap 24px):
      OrderBook (.glass default) — solid inner fill table, depth bars
      RecentTrades (.glass default) — solid inner fill tape

  RIGHT rail (sticky top: 88px):
    TradeTicket (.glass default)
    ├── Title + mode switcher (Market / Limit)
    ├── YES/NO side selector (glass buttons with liquid-tint on select)
    ├── Amount block (.glass-inset display + chips + slider)
    ├── Summary rows (avg fill, slippage, shares, payout)
    └── Review CTA (mint→teal gradient, shimmer animation)

Bottom strip (2-col grid same as above):
  LEFT: Market details + resolution rules
  RIGHT: Related markets (list of glass rows)
```

**Layout mapping (mobile, <1100px):**

Same content, single-column stack. TradeTicket loses sticky, becomes the last section. Time switcher still fits inline. OrderBook + RecentTrades stack 1-col.

**Interactive spec:**

- YES/NO selector uses the liquid-fill tint on select (radial-gradient `::after` pseudo-element per DESIGN.md §4).
- Amount chips are glass pills. `MAX` chip styles identical to the dollar chips (not a special state).
- Amount slider has a glass knob on a recessed track. Shimmer animation on fill.
- Review CTA uses the 2-stop mint→teal gradient + shimmer + spring press.

**Data wiring (unchanged — design-only change):**

All API calls, data fetching, WebSocket subscriptions, price updates, settlement hooks stay on the existing wiring. The only changes are CSS + component structure. Don't touch `app/lib/api/` or `app/lib/websocket/predict-ws.ts`.

**Acceptance:**

- Navigate to `/market/btc-100k-apr26` (or any seeded market). Page matches the mockup at `~/.gstack/projects/jbrackens-TAYA_NA/designs/liquid-glass-desktop-mint-20260424-200756/market-detail-mockup.html` 1:1 except with real data.
- TradeTicket still places orders via the existing `PredictionApiClient.placeOrder` flow. WebSocket price updates still tick in.
- Resize to 375px (iPhone SE). Layout collapses to 1-column. Trade ticket becomes the last section. All tap targets ≥36px.
- Keyboard-navigate the page. Every interactive element has a `:focus-visible` mint ring.
- `prefers-reduced-transparency` turns all glass into solid `--bg-teal` cards. Still readable, loses refraction. No content broken.
- `prefers-reduced-motion` disables CTA shimmer, slider shimmer, LIVE pulse, spring overshoot. Replaces with instant transitions.
- Lighthouse perf on desktop Chrome ≥90. Mobile Lighthouse ≥80 (glass is expensive — 80 is acceptable on the pilot; Phase 5 tightens).

**Effort:** ~3-4 hrs CC (revised — shell work adds complexity over the original "pilot" framing).
**Risk:** Medium-High. Biggest visual change + global shell change in one phase. Trading UI is where typography/spacing mistakes hurt most.

**Screenshot checkpoint:** before/after at 1440px and 375px. Archive both in `~/.gstack/projects/jbrackens-TAYA_NA/designs/rollout/phase-3/`.

**Mid-Phase-3 perf gate (NEW per review D8):** After pilot merges + before Phase 4 starts:
- Open `/market/[ticker]` in Chrome DevTools with CPU 4× throttle + network Fast 3G (Pixel 6a simulation).
- Record 5s of scroll.
- Assert: no single frame >50ms, long-tasks <5% of recorded time.
- Run Lighthouse mobile on the pilot page — must score ≥80 perf, ≥95 a11y.
- **If the material system fails this gate**, downgrade glass before Phase 4 rolls it out everywhere. Specific downgrades in order of preference: drop `saturate(180%)` → drop blur radius 30px→18px → drop `::before` specular sheen → fallback to solid fill for worst offenders. Document which surfaces got downgraded in DESIGN.md §10.
- This gate is BLOCKING. Phase 4 doesn't start until the pilot page is both correct and fast on mid-range hardware.

---

### Phase 4 — Roll out to remaining pages

**Goal:** Convert the remaining pages using Phase 3 as the template. Each page is one PR.

**Pages, in suggested priority order (revised route inventory per review D7):**

1. **`/predict` — discovery landing.** `MarketCard` refreshed per DESIGN.md §8, arranged in `repeat(auto-fill, minmax(300px, 1fr))` grid. Category pills strip as horizontal `.glass.glass-thin` row. Hero slot for a featured market. Remove FeaturedHero component usage. ~45 min.
2. **`/portfolio` — positions + summary strip.** `SummaryStrip` stat cards wrapped in `.glass`. `RankChip` becomes a glass pill with the mint gradient on the medal icon. `HistoryTable` uses solid-fill rows inside a glass card. TierPill stays in its preserved tier colors. ~45 min.
3. **`/rewards` — loyalty ledger + tier ladder.** Tier ladder as 6 glass cards. Ledger table solid-fill inside a glass card. ~45 min.
4. **`/leaderboards` — sidebar + detail.** Sidebar as vertical glass tabs with Category Champions dropdown. On mobile, horizontal scroll preserved from C.3 fix. ~45 min.
5. **`/category/[slug]`** — same pattern as `/predict`, scoped to one category. ~20 min.
6. **`/account` + subroutes** — `/account` main page, plus `/account/security`, `/account/transactions`, `/account/notifications`, `/account/rg-history`, `/account/self-exclude`. Each a glass card stack. ~60 min total.
7. **`/auth/login`** — centered `.glass.glass-thick` card, BrandMark top, inputs `.glass-inset`, mint→teal CTA. ~30 min.
8. **`/auth/register`, `/auth/forgot-password`, `/auth/verify-email`, `/auth/reset-password`** — auth flow siblings, same shell as login. ~30 min total.
9. **Content pages** — `/about`, `/contact-us`, `/privacy`, `/privacy-policy`, `/terms`, `/terms-and-conditions`, `/responsible-gaming`. Glass card wrapping prose content. ~45 min total.
10. **Error surfaces** — `/not-found`, `/error`, and the per-route `error.tsx` files (`/cashier/error.tsx`, `/profile/error.tsx`, `/account/error.tsx`). Minimal glass treatment. ~20 min.

**Pages explicitly out of scope (stay sportsbook-styled until they're retired or get their own refresh):**

- `/cashier` and `/cashier/cheque` — legacy cashier flow, wallet team owns it.
- `/profile` — legacy profile editor, intended to be replaced by `/account`.
- Sportsbook pages under `pages/` router (not `app/`) — unaffected, use `ps-*` classes.

**Acceptance (per-page):**

- Page renders the new design; no regressions in functional behavior.
- Mobile layout verified at 375px via Playwright smoke test.
- Keyboard nav works end-to-end.
- `prefers-reduced-transparency` + `prefers-reduced-motion` media queries both function.
- No TypeScript errors (`npm run typecheck`), no new console warnings.
- Smoke test for that specific page passes.

**Effort:** ~6-10 hrs CC total (revised from ~4 hrs per review D7). Realistic breakdown above sums to ~6 hrs under ideal conditions; plan on ~10 hrs when you factor in mobile QA, auth states, empty states, loading states, and the inevitable "this component needs more work than I thought" discoveries. Spread across 2-4 sessions, not one.

**Risk:** Medium per page, low in aggregate with smoke tests as the catch-net. Each page is independently revertable.

**Cleanup after Phase 4:**

- Delete the `--s0..--s3` deprecation aliases in `globals.css`.
- Remove retired components: `WhaleTicker`, `WhaleActivityCard`, `TopMoversCard`, `FeaturedHero`. Grep confirms no remaining imports.
- Remove `--gain`, `--whale`, `--whale-soft` tokens.
- Remove `public/logo-tn.svg` if no Phase 4 page still references it.

**Acceptance (per-page):**

- Page renders the new design; no regressions in functional behavior.
- Mobile layout verified at 375px.
- Keyboard nav works end-to-end.
- `prefers-reduced-transparency` + `prefers-reduced-motion` media queries both function.
- No TypeScript errors, no new console warnings.

**Effort:** ~4 hrs CC total (varies per page — landing + portfolio are 45-60 min each, smaller content pages are 10-15 min each).

**Risk:** Medium per page, low in aggregate. Each page is independently revertable. Issues caught on one page can be fixed before the next.

**Cleanup after Phase 4:**

- Delete the `--s0..--s3` deprecation aliases in `globals.css`.
- Remove the retired components: `WhaleTicker`, `WhaleActivityCard`, `TopMoversCard`, `FeaturedHero`. Grep confirms no remaining imports.
- Remove the old `--gain`, `--whale`, `--whale-soft` tokens.
- Remove `public/logo-tn.svg` if no Phase 4 page still references it. Replaced by `BrandMark` component.

---

### Phase 5 — Accessibility + performance audit

**Goal:** Production-harden the redesign. Catch the subtle perf and a11y issues before real user traffic.

**Tasks:**

1. **Chrome DevTools Performance pass:**
   - Open `/market/[ticker]` in Chrome. Throttle network to "Fast 3G", CPU to "4× slowdown" (mid-range Android simulation).
   - Record a 5-second page scroll.
   - Assert: no single frame >50ms (violates 60fps). Long-tasks <5% of recorded time.
   - Identify the worst glass-stacking culprits. Likely candidates: TopBar (sticky glass layered on top of scrolling glass cards) and any page with >8 glass surfaces in the viewport.
   - Fix each culprit. Options: drop blur radius (30px → 18px), simplify backdrop (remove saturate), or switch to solid fill for that specific surface.

2. **Lighthouse audit** on `/predict`, `/market/[ticker]`, `/portfolio`:
   - Accessibility score ≥95.
   - Best Practices ≥90.
   - SEO ≥90 (doesn't really matter for an auth-gated app but low-hanging fruit).
   - Perf: desktop ≥90, mobile ≥80.

3. **`prefers-reduced-transparency` manual QA:**
   - Enable the OS-level preference (macOS: System Settings → Accessibility → Display → Reduce transparency).
   - Reload the app. Verify every page has solid `--bg-teal` card fills, no `backdrop-filter`, no chromatic fringe, no specular sheen.
   - Content still legible, no broken layouts, no black-on-black text surprises.

4. **`prefers-reduced-motion` manual QA:**
   - Enable OS-level preference.
   - Reload. Verify CTA shimmer, slider shimmer, LIVE pulse, spring overshoot are all disabled.
   - Transitions become instant, not missing. Users with vestibular disorders should still feel button presses register.

5. **WCAG AA contrast audit:**
   - Use axe DevTools extension on all Phase 4 pages.
   - Zero critical or serious issues.
   - Specifically verify text on translucent surfaces — the backdrop has lobes of different brightness, so the worst case is `--t-2` body text over the `--bg-navy` lobe (top-left quadrant of viewport).

6. **Firefox fallback check:**
   - Firefox ≥103 supports `backdrop-filter`. Verify in current Firefox (v130+).
   - Firefox < v103: glass degrades to solid `--glass-regular` over the solid `--bg-teal` backdrop. Still readable. Accept.

7. **Safari sanity check:**
   - Verify `-webkit-backdrop-filter` is rendering (belt-and-suspenders with `backdrop-filter`).
   - Glass looks identical to Chrome on an M-series Mac.

8. **Device matrix (smoke test only, not exhaustive):**
   - iPhone 13 Safari — effortless.
   - Pixel 6a Chrome — accept occasional frame drop on scroll.
   - 3-year-old Windows laptop (Intel i5, integrated GPU) — should be acceptable on desktop viewport.

**Deliverables:**

- `docs/liquid-glass-perf-audit-2026-XX-XX.md` with measurements, flame-graph screenshots, and a log of perf fixes applied.
- Any specific glass surface that gets downgraded (blur reduced, saturate removed, or forced solid) is documented in DESIGN.md §10.

**Effort:** ~1.5 hrs CC.
**Risk:** Medium. Catching perf issues late is painful. If Phase 3 pilot was done carefully the audit finds 2-3 minor fixes, not a rewrite.

---

## Cross-phase concerns

### Testing

- **TypeScript:** `npm run typecheck` (added in Phase 0.5) runs clean after every phase. Aliased to `tsc --noEmit`.
- **Type manifest:** update `FEATURE_MANIFEST.json` when components are deleted.
- **Go tests:** unaffected. Backend doesn't know about frontend design.
- **Frontend smoke tests:** Playwright suite added in Phase 0.5 (per review D4). Runs against local dev stack. One smoke test per major route, asserts page loads + no console errors + key elements render. NOT pixel-diff visual regression — that's a future TODO.
- **Manual QA:** each phase has a browser-based acceptance checklist above. Smoke tests catch structural regressions; manual QA catches visual polish issues.

### Feature manifest

Each deleted component needs a status flip in `FEATURE_MANIFEST.json`:

- `WhaleTicker.tsx` → `status: REMOVED`, reason: "Pariflow-era component, retired in Liquid Glass redesign 2026-04-XX."
- `WhaleActivityCard.tsx`, `TopMoversCard.tsx`, `FeaturedHero.tsx` → same pattern.

Each new component gets added to the manifest with `status: REAL` at its creation phase.

### Git strategy

- Each phase is one PR.
- Phase branches named: `redesign/phase-1-tokens`, `redesign/phase-2-backdrop`, `redesign/phase-3-market-detail`, `redesign/phase-4a-discovery`, `redesign/phase-4b-portfolio`, etc.
- Squash-merge into `main`.
- Tag `liquid-glass-v1` after Phase 5 lands.

### Rollback

Each phase is designed to be independently revertable:

- Phase 1 revert: `git revert` the globals.css changes. Components still reference `--accent`, so you're back to (whatever-the-previous-value-was). Actually Phase 1 is the one revert that's safe because everything reads from tokens.
- Phase 2 revert: remove `<BackdropScene />` mount + body::before. Pages go back to the default dark backdrop. Ugly but functional.
- Phase 3 revert: revert the commit. Market detail page goes back to prior version.
- Phase 4 reverts are per-page. Each page's PR is standalone.
- Phase 5 has nothing to revert — it's audit + small fixes. Any specific fix PR can be reverted independently.

If a mid-phase rollback is needed, the feature-flag option (considered and rejected in the shape-approval step) can still be bolted on: wrap each new component with a `process.env.NEXT_PUBLIC_LIQUID_GLASS` check. Not doing this by default because the alternative to mint is the current phoenix-lime app, which is still shippable.

### Dependencies

One new **dev** dependency added in Phase 0.5: `@playwright/test`. Ships only in `devDependencies` — zero production bundle impact. Liquid Glass itself is CSS-only. Backdrop scene SVG is inline. No runtime bundle changes.

(Original plan claimed "no new deps." That was aspirational and broke the Phase 0.5 test harness. Plan corrected per review D4 + codex finding.)

### Bundle size impact

- `globals.css` adds ~4KB gzipped (glass recipe + media queries + new tokens).
- `BackdropScene.tsx` adds ~2KB gzipped (one React component + inline SVG).
- Deleted components (Whale*, FeaturedHero, TopMoversCard) remove ~8KB gzipped collectively.
- Net: -2KB gzipped after Phase 4 cleanup. Win.

### Performance budget tracking

The DESIGN.md §10 budget is the authoritative rulebook. Phase 5 audit measures against it. If Phase 5 finds we're over budget, the fix is either (a) specific glass surfaces get downgraded (recorded in DESIGN.md), or (b) the budget is revised to match what's shipping (also recorded).

---

## Open questions

These are flagged to revisit, not blockers for starting Phase 0.5 / Phase 1.

- **Mobile TopBar collapse behavior (elevated to hard requirement per codex D — must decide before Phase 3 starts).** Desktop TopBar has 5 nav links + search + balance + avatar. At 375px what happens? Hamburger menu, icon-only nav, horizontal scroll, or bottom-tab-bar on mobile? This is a design decision, not an implementation detail. **Must resolve via `/office-hours` or design sketch before Phase 3 ships.**
- **TierPill color treatment.** TierPill renders with `--tier-*` colors (slate/gold/platinum/violet). These sit outside the mint/teal/blue family intentionally. Open: does the tier color become the glass fill color, or stay as a border accent on a neutral glass pill? Phase 4 step 2 (portfolio page) decides.
- **Chart color when YES is blue.** Current chart renders the YES line in blue. Does a "downward YES movement" flip to peach (NO) or stay blue with a red delta pill? Recommended: line stays blue (YES is the subject); direction indicated by delta pill. Document in DESIGN.md §8 once Phase 3 ships.
- **Login/auth on the backdrop.** The backdrop is global — auth pages sit in front. Right move or should auth use a solid color to feel "different"? Current plan: keep the backdrop. Revisit at Phase 4 step 7 if it feels off.
- **Accessibility of text on translucent surfaces (codex: "text-shadow doesn't fix WCAG").** The mockups use text-shadow to boost perceived contrast, but text-shadow does NOT make a failing AA combo pass axe-core. Phase 5 audit must use axe DevTools and fix any real failures — add a solid backing pill under text where needed, not just shadow.
- **Visual regression (codex: smoke tests miss glass/spacing drift).** Phase 0.5 adds Playwright smoke, not pixel-diff. Visual drift regressions will ship. Post-launch, add a `@visual` test tag + screenshot baselines as a follow-up. Captured as a TODO below.
- **Strategic risk (codex's high-altitude challenge).** "Apple-style Liquid Glass" might not be ownable differentiation. For a trading app, readability/trust/speed matter more than material novelty. Product owner has committed to the redesign for this cycle; revisit post-Phase-5 with actual user feedback. Not a blocker for execution.
- **Whale/TopMovers/FeaturedHero deletion = product scope.** Those components are social-proof surfaces for discovery. Deleting them is not a pure visual change — it's a product decision. Confirmed OK for pre-PMF posture (no metrics to protect, can be re-added as glass variants later). Flagged so this deletion isn't silently undone if the plan gets handed off.

## Future TODOs (post-launch)

To be added to `TODOS.md` after Phase 5 lands:

- Visual regression via screenshot diffs (Playwright `toHaveScreenshot()` or Percy/Chromatic) — catches what smoke tests miss.
- Light mode support (if user demand appears).
- Performance tiering by device class — detect mid-range Android on first paint, serve a `.glass-fallback` variant with reduced blur.
- Re-introduce Whale-activity surface as a glass variant if discovery metrics show need.
- Accessibility audit follow-up — axe automation in CI, not just Phase 5 manual run.

## Assignment (for the first-phase engineer)

Before writing any code for Phase 1, open both mockups in browser tabs and sit with them for 10 minutes:

- Desktop: `~/.gstack/projects/jbrackens-TAYA_NA/designs/liquid-glass-desktop-mint-20260424-200756/market-detail-mockup.html`
- Mobile: `~/.gstack/projects/jbrackens-TAYA_NA/designs/liquid-glass-20260424-195105/trade-ticket-mockup.html`

Inspect the CSS in DevTools. Identify the `.glass`, `.glass-med`, `.glass-thin` usage in the mockup and map it to what becomes `globals.css` utility classes. The mockup's class names aren't identical to the final class names — the mockup was a sketch, this plan is the contract.

Then start Phase 1 token layer. That's it.
