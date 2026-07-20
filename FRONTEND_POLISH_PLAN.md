# Frontend Polish Plan — from AI-slop to enterprise D2C

**Date:** 2026-07-18 (revised same day after a 3-lens adversarial review — 25 findings incorporated)
**Status:** Tooling installed and MCPs connected (§1 DONE, uncommitted — landing it is P0 step 0); phases P0–P5 awaiting execution
**Prereqs:** [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md) (baselines), [DESIGN.md](DESIGN.md) (token system — read before any UI change)

The goal: eliminate the AI-slop signatures documented in the July 2026 audit — per-file pasted Tailwind class recipes (~40 files carry `*_CLASS` constants), no lint wall, hand-rolled commodity components, no visual regression net — and land the feel layer that separates a real D2C trading product from a demo. All tooling is open source; nothing here adds a paid service.

**Context note (2026-07-18):** main now includes the connected-trading-workspace redesign (261ae000, b13460c1). All file/breakpoint references below were verified against that code, not the pre-redesign tree.

---

## 1. What is installed and connected (done 2026-07-18)

### Runtime libraries (in `@taptrade-ui/app`, tree-shaken no-ops until their phase lands)

| Package | Version | Purpose | Used in phase |
|---|---|---|---|
| `@base-ui-components/react` | **1.0.0-rc.0 exact-pinned** (no caret) | Headless primitives under `components/ui/` | P1 |
| `sonner` | 2.0.7 | Toasts (replaces hand-rolled ToastProvider) | P3 |
| `@number-flow/react` | 0.6.1 | Animated numbers (balances, prices, totals) | P3 |
| `vaul` | 1.1.2 | Mobile bottom-sheet drawer (trade ticket) | P3 |
| `lightweight-charts` | 5.2.0 | Canvas market chart (market route only, dynamic import) | P4 |

**Rule:** any of these still unimported at the end of P4 gets removed — same discipline that removed 8 unused deps in the audit. §3a cuts EXECUTED 2026-07-19 (John + Codex both concurring): `embla-carousel-react` and `cmdk` removed.

### Dev tooling

- **Biome 2.5.4** at the workspace root (`yarn lint:biome` / `yarn lint:biome:fix`), config in `apps/taptrade-platform/frontend/biome.json`: linter only (Prettier keeps formatting), git-aware, recommended rules + a11y.
- **Playwright visual regression** needs zero new packages — `expect(page).toHaveScreenshot()` is built into the `@playwright/test` already in the repo.

### Baseline lint debt (Biome, 2026-07-18)

`packages/app/app`: **111 errors / 95 warnings / 15 infos.** `packages/office/app`: **50 errors / 58 warnings** (burn-down deferred — which is why CI gating must be app-scoped, see P0). Top app rules:

| Count | Rule | Class |
|---|---|---|
| 20 | `style/useImportType` | autofixable |
| 19 | `correctness/useExhaustiveDependencies` | hand-review — behavioral changes; needs journey-suite cover, not just screenshots |
| 14 | `style/noNonNullAssertion` | hand-review |
| 12 | `suspicious/noTemplateCurlyInString` | mostly i18n `{{var}}` false positives → suppress with comment |
| 6+6+6 | `useTemplate` / `noUnusedVariables` / `useLiteralKeys` | autofix + quick fixes |
| 5 | `suspicious/useIterableCallbackReturn` | hand-review |
| 4 | `performance/noImgElement` | real perf findings |
| 3 | `suspicious/noDocumentCookie` | review, don't rewrite (auth cookie handling) |
| 1 | `correctness/useHookAtTopLevel` | **potential real bug — triage first** |

### MCP servers (registered via `claude mcp add`, local scope, both the sandbox root and `frontend/` project dirs)

| Server | Command | Health | What it adds |
|---|---|---|---|
| `chrome-devtools` | `npx -y chrome-devtools-mcp@latest` (v1.6.0) | ✓ Connected | Performance traces, Web Vitals attribution, device emulation — the only browser MCP with tracing |
| `playwright` | `npx -y @playwright/mcp@latest` (v0.0.78) | ✓ Connected | Accessibility-tree browser driving; cross-engine when WebKit/Firefox binaries become downloadable |
| `shadcn` | `npx -y shadcn@latest mcp` (CLI 4.13.1) | ✓ Connected | Component-registry reference implementations for `ui/` primitives. **Caveat:** most chart snippets it surfaces target lightweight-charts v4; we use v5 (`chart.addSeries(AreaSeries, …)`, not `addAreaSeries`) |

Also in play: **Figma MCP** (already connected via claude.ai connectors) for when design components exist, and the gstack **/design-review** and **/design-shotgun** skills for the render-and-judge loop.

> New MCP servers bind at session start — drivable from the **next** Claude Code session onward. The built-in browser pane covers interactive driving meanwhile.

---

## 2. Definition of done (measurable)

1. **Zero Biome errors in `packages/app`**, enforced by an **app-scoped** gate: `npx @biomejs/biome check packages/app` run from the frontend root (NOT the root `lint:biome` script, which also covers office's 50 outstanding errors). Plus a lint-staged entry so debt can't re-accumulate between gate runs.
2. **One primitives layer:** `git grep -lE "[A-Z_]+_CLASS\b" packages/app/app` → empty, modulo an explicit allowlist committed in the plan's tracking issue (constants that survive must be individually justified). The narrow "button recipes only" version of this check passes vacuously — the wide grep is the real bar (~40 files today).
3. **Visual regression green:** committed baselines for the seven surfaces (14 screenshots — the suite's "15 passed" includes the auth-setup step). HARs are a LOCAL record-first cache (gitignored — they carry session cookies): a fresh checkout must run once with `VISUAL_RECORD=1` before replay runs are deterministic. Surfaces: hero `/`, discover `/predict`, market page, trade ticket (authed market), store, portfolio, login — × two viewports (1280×800, 375×812), **each in its route's native theme** — market/discover/predict render dark via `.predict-terminal` (route-scoped in `AppShell.tsx`; there is no user/OS theme toggle, so a light/dark axis does not exist to photograph). Diff ratio ≤ 1% under the determinism spec in P0.
4. **Feel layer live:** animated balance/price numbers, mobile bottom-sheet trade ticket, sonner toasts, professional canvas market chart (+ palette/carousel only if they survive the §3a cut review).
5. **Perf budget held:** per-route first-load JS within **+25 KB gzip** of the audit baseline (market route: documented +45 KB for lightweight-charts, dynamic-imported); no INP or **CLS** regression on traces (canvas is not an LCP candidate, so LCP is not the chart's gate — CLS from late chart mount is).
6. **A11y intact or better:** Biome a11y rules clean; toast `role="alert"/"status"` semantics preserved; keyboard pass on trade + checkout flows.

---

## 3. Phases

Sequencing honors two standing rules: **John judges rendered screens, wholesale — every migrated surface gets its own rendered-screen checkpoint before the next surface starts**, and **visual and functional changes stay on separate branches** (P1 is explicitly a mixed component-migration branch and is labeled as such — swapping to headless primitives changes DOM, focus, and event behavior; calling it "visual-only" would be dishonest). `main` is production: **no phase, P0 included, lands without an explicit `commit/push/deploy` from John.**

### P0 — Guardrails — size S/M

Branch: `chore/lint-wall` (functional-only).

**Step 0 — land §1 first.** The dependency/tooling changes (2× `package.json`, `yarn.lock`, `biome.json`, this doc) are currently uncommitted on the production checkout, which blocks `agent-preflight.sh` for any other deploy. They land as their own reviewed commit — zero pixel change, gates green — on John's explicit `commit/push/deploy`, before anything else.

**Step 1 — visual net BEFORE any code mutation.** Capture baselines against unmodified main, then start the burn-down; the exit criterion "pixel-identical" is meaningless if baselines postdate the edits.

New file `tests/visual/surfaces.visual.spec.ts` + config changes in `playwright.config.ts`:

- **New projects** `visual-desktop` / `visual-mobile` with **explicit `testDir`/`testMatch`** (`**/*.visual.spec.ts`) — the existing config matches only `**/*.smoke.spec.ts`, so without this the suite silently runs zero tests and lies green. Verify the net catches by making a deliberate 1-pixel change and watching it fail before trusting any green run.
- **No `dependencies: ['setup']`, no `storageState`** on the anonymous projects. Trade ticket and portfolio require auth → a separate authed variant using the existing setup project, with masks.
- **Determinism spec** (each item maps to a verified flake source):
  - `page.clock` freezes `Date.now()` before navigation (kills "Closes in …" countdowns and relative timestamps).
  - Emulate `prefers-reduced-motion` (kills the FeaturedCarousel 7s `setInterval` auto-advance via its existing gate and the register-page ambient video, which is *not* flag-gated).
  - `NEXT_PUBLIC_HERO_AMBIENT_VIDEO` unset and `NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS` off for the visual run (synthetic walks are nondeterministic; honest empty states are the deterministic baseline).
  - Mask live regions on **anonymous shots too**: chart canvases, price/movement chips, recent trades (anonymous pages are full of seeded live data — "anonymous = static" is false).
  - `document.fonts.ready` awaited; the four Google-CDN fonts (layout.tsx) are a known flake source — if font flake appears, self-host them (that also removes the last runtime CDN dependency, a P0-adjacent win).
  - One fixed target topology: `next start` against the local seeded stack (the WS is CSP-blocked under local `next start`, which is *more* deterministic — documented in `tests/smoke/_shared.ts`).
- **Platform ownership:** baselines are **darwin-owned** (this Mac, where deploy preflight runs). The visual projects are excluded from the ubuntu GitHub workflows — Playwright snapshots are platform-suffixed, and linux font rendering guarantees a red gate against darwin baselines. If CI coverage is wanted later, a separate job generates its own linux baselines inside the `mcr.microsoft.com/playwright` image with `snapshotPathTemplate`; that is not part of P0.

**Step 2 — Biome burn-down** in `packages/app`:
- `biome check --write` for the mechanical classes (`useImportType`, `useTemplate`, `useOptionalChain`, `useLiteralKeys`, `useConst`).
- Hand-fix the correctness class: `useHookAtTopLevel` (triage as potential live bug first), all 19 `useExhaustiveDependencies`, 5 `useIterableCallbackReturn`, unused vars/imports. **These change runtime behavior** (effect re-runs, WS resubscription) — screenshots structurally cannot catch that, so:
- Suppress-with-reason where deliberate (i18n `{{var}}` strings, auth cookie writes).

**Step 3 — wire the wall so it holds:**
- `gate.sh` gate 9 = `(cd "$FRONTEND_ROOT" && npx @biomejs/biome check packages/app)` — app-scoped. The root `yarn lint:biome` script covers office too (50 errors, deferred burn-down) and gate.sh runs from `packages/app`, where yarn 1 has no root-script fallback — wiring the root script would make gate 9 permanently red and/or unrunnable. Update the hardcoded `/8` in gate.sh's summary lines to `/9`.
- lint-staged entry for `*.{ts,tsx}` running `biome check --no-errors-on-unmatched` (before prettier) — without it, new debt lands freely between manual gate runs.
- Same app-scoped check into the ubuntu test workflow (lint is platform-safe; screenshots are not).

**Exit:** all 9 gates green; visual suite passes against the pre-mutation baselines; **full J1–J7 journey suite green** (the behavioral cover for the hook-dep fixes — pixel-identity alone is insufficient evidence). Then John's `commit/push/deploy`. *(No design checkpoint — this phase must not change a pixel — but it is not review-exempt.)*

### P1 — Primitives layer, lead surface only — size M

Branch: `feat/ui-primitives` — **a component-migration branch (visual + behavioral), presented to John as such.**

1. Create `app/components/ui/`: `Button`, `Card`, `Input`, `Dialog`, `Sheet` (vaul), `Tabs`, `Tooltip`, `DropdownMenu` on Base UI, styled **exclusively** with the DESIGN.md tokens. Variants via a ~20-line local `variants()` helper — no cva dependency.
2. **Portal/theme plumbing (blocking, before any component ships):** Base UI, vaul, and sonner portal into `document.body` — **outside** the `.predict-terminal` wrapper that carries the dark-theme token values on `/market/*`, `/predict` (route-scoped in `AppShell.tsx:69`; `:root` holds light values). Unhandled, every dialog/tooltip/sheet renders light-themed on the dark market page — the exact screens John judges. Fix: portal `container` pointed inside the themed wrapper (Base UI `Portal container`, vaul `container`, sonner Toaster mounted inside AppShell's route-classed div), or re-scope the terminal tokens via a route-set `data-theme` attribute on `<html>`. Decide once, in P1, before the first Dialog.
3. **Layering contract (defined once, here):** Base UI's documented `isolation: isolate` root wrapper; explicit overlay z-band between TopBar (`z-[100]`) and toasts (`z-[9999]`): dialogs/sheets at z-[200–300]. Base UI popups ship unstyled with no z-index — without this they paint under the sticky TopBar/MobileTabBar.
4. **Scroll-lock ownership rule:** one lock system per route, converted in the same PR that converts the surface. The hand-rolled locks (PredictionWorkspace mobile sheet, ToastProvider overlay) are deleted when their surface migrates — never left coexisting with Base UI/vaul locks on the same route.
5. Use the shadcn MCP registry as *reference implementations* (it ships Base UI variants) — copied in and restyled to our tokens, never consumed as a kit.
6. Migrate **one lead surface: the market page** (`app/market/[ticker]`) — trade ticket buttons/inputs, discussion form, dialogs.
7. **Functional gate BEFORE the design checkpoint:** J2 trade journey green on desktop-chromium + mobile-chromium, keyboard pass on the full trade flow (this is the money path — a rendered screen cannot show broken focus order or a dead submit).
8. Render the screens (both viewports, native themes) and **stop for John's judgment.** Present the §3a cut list at the same checkpoint.

**Exit:** J2 + keyboard pass green, then John approves the rendered market page. No propagation before both.

### §3a — Cut candidates (John decides at the P1 checkpoint)

- **Embla carousel swap — recommend CUT.** (Rationale corrected per the 2026-07-19 Codex re-review: the LIVE `/predict` carousel is `PredictionWorkspace`'s `FeaturedSignal` — which renders one active slide but prefetches up to 4 featured + 4 row histories via the pooled fetcher; the crossfade `FeaturedCarousel.tsx` this section originally cited is the legacy component.) The cut still stands: both implementations already exist and work, an Embla swap would add a dependency to replace working accessible code, and no user-visible gain has been identified. Remove the package.
- **cmdk palette — defer or cut.** Desktop power-user affordance on a mobile-first consumer product; creates a new results surface that must obey the movement-claims-from-real-series rule (results show name/category only, or wire real series). If deferred, remove the package under the §1 rule; it can return in a later cycle.

### P2 — Propagation — size M/L

Surface-per-PR, **hard checkpoint per surface — not batches:** after each surface migrates (discover/hero → store → portfolio → auth → activity), John gets full rendered screenshots (both viewports, native theme) exactly like P1, with visual-diff images as supplementary evidence only. The next surface does not start until the previous one has his yes — this is precisely the spread-before-review pattern that killed P10, at the granularity that prevents it. Delete each file's `*_CLASS` recipes (all of them, per DoD #2's wide grep — not just button constants) as they're absorbed. Re-baseline per-surface in dedicated commits.

**Exit:** DoD #2 grep clean repo-wide; journeys J1–J7 green.

**P2 EXECUTED (2026-07-20, branch `feat/ui-propagation`, commits P2.1–P2.5).**
Keystone: `Button primary` foreground moved from hardcoded `text-white` to the
theme-scoped `--ticket-cta-text` token (ink `#061a10` light / white terminal) —
pixel-neutral for existing dark-context call sites, and every light-surface CTA
recipe (`#061a10`/`#04140a` ink-on-accent) then landed on the primitive without
a color flip. Input primitive gained the auth screens' `focus-visible` ring +
an `aria-invalid` error border (rest-state invisible; deterministic vs
call-site border overrides).

Wide-grep exit state: **zero** Card-shell recipes (`r-rh-lg + border-1 +
surface-1`) and **zero** accent-CTA recipes remain outside `components/ui`.
The remaining `*_CLASS` constants (~560 across the app) are the documented
allowlist, by category:
- **Segmented controls / tab identities** — sort+time pills, category underline
  tabs, subnav (AllMarketsSection), leaderboards/portfolio tablists.
- **Search identities** — TopBar pill search (default + terminal twins, ARIA
  1.2 combobox wiring), balance chip; AllMarketsSection search migrated to
  `Input`, TopBar pills deliberately kept.
- **Brand chrome** — SocialAuthButtons (per-provider hover borders),
  BrandMark/wordmark recipes, register-page split-screen panels.
- **Card-shaped Links** — portfolio RankChip (Card cannot render a Next Link;
  shell classes inline, byte-identical to Card `none` + tile layout).
- **Typography/layout scaffolding** — label/row/value stacks, table recipes,
  grid/wrap/spacing constants: not primitive material.
Baselines re-captured: discover ×2, login ×2. Small recipe deltas on other
surfaces sit under the accepted `maxDiffPixelRatio: 0.01` net by design;
rendered-screen evidence for every surface is in the P2 checkpoint artifact.

### P3 — Feel layer — one small PR each, after P1

**Review artifact for every P3 item is motion: a short screen recording/GIF or a live browser-pane demo** — these are animation/interaction changes; static screenshots would have John approving blind.

| Item | Detail | Guardrails |
|---|---|---|
| sonner | Keep the existing `useToast()` call-site API as a thin adapter; preserve `role="alert"`/`"status"` + 76px top offset; Toaster mounted inside the themed wrapper (P1 §2), z per the P1 layering contract; hand-rolled ToastProvider deleted in the same PR | Toast a11y test green |
| NumberFlow | TopBar balance chip, TradeTicket cost/payout/balance, store totals, portfolio value | `prefers-reduced-motion` respected (built-in); integer PTS formatting unchanged; **dark-pattern check: subtle/short duration, linear-ish easing, no celebratory motion on payouts or purchase totals — this is a points-bought-with-USD product and count-up stimulation on money values is exactly what the no-dark-patterns rule exists for. John sees it in motion before merge.** |
| vaul sheet | TradeTicket as bottom sheet on the **existing** mobile band — the hand-rolled sheet triggers at `max-width: 1179px` (`PredictionWorkspace.tsx` matchMedia) and the market-page rail collapses at `max-[1023px]` with a fixed jump-to-trade CTA; vaul hangs off those thresholds and the CTA becomes the sheet trigger (the previously written "720px" matched nothing and would have created an orphaned 721–1023px band). Hand-rolled sheet + its body scroll-lock deleted in the same PR | J2 green at 375px **and** a tablet width (768×1024, the band where behavior could silently vanish); **full cost/total disclosure visible above the confirm CTA at 375px — the sheet must never push price below the fold behind the pay button** |

### P4 — Market chart — size M

Branch: `feat/market-chart` (visual-only). `lightweight-charts` **v5** (`chart.addSeries(AreaSeries, …)` — v4 snippets from registries/tutorials don't compile) area chart with token-driven gradient, crosshair, time scale, resolution switching. Client-only via `next/dynamic` `ssr: false` (legal here: the market page is already `"use client"`). **Fixed-height chart container reserved before mount** — the chart is the page's main content and a late mount without reserved height is a guaranteed CLS hit. React 19 strict mode double-mounts effects in dev: `chart.remove()` cleanup required or dev gets duplicate charts/disposed-object errors. **Keep** `spark.ts` for sparklines. **Preserve untouched:** the 2026-07-12 integrity rules — movement claims only from real `/prices` series, `SIMULATED_DATA` chip on flag-gated synthetic fills, honest empty/loading states.

**Exit:** real-series rendering verified against the same `/prices` responses the old chart used; chrome-devtools trace shows no **INP or CLS** regression on the market route (LCP is not the chart's metric — canvas can't be an LCP candidate); rendered screens + trace to John.

### P5 — Certification

- chrome-devtools MCP traces (desktop + mobile emulation) on `/`, `/predict`, market page, `/store` — before/after vs the audit baseline; Lighthouse re-run.
- Bundle report diff (per-route first-load JS) attached to the final PR.
- **Storybook decision point:** adopt only if the primitives count keeps growing — the visual suite is the workbench until then. (Deliberately not installed today.)
- The documented Lighthouse ≥90 ceiling still requires incremental RSC adoption — separate initiative, out of scope here.

---

## 4. How each tool gets driven (next sessions)

- **chrome-devtools MCP** — `performance_start_trace` against `http://localhost:3000` and `https://demo.99rtp.io` for phase gates (P3/P4/P5); console + network inspection during QA. Chromium-only, matching our Chrome-channel test reality.
- **playwright MCP** — exploratory a11y-tree QA ("tab through the trade ticket and list focus order"). The committed Playwright suite remains CI's source of truth; the MCP is for interactive investigation.
- **shadcn MCP** — registry lookups during P1/P2 for Base UI reference implementations (v5-chart caveat in §1).
- **Figma MCP** — dormant until design components exist; then `get_design_context` + Code Connect map Figma components onto `components/ui/*`.
- **/design-review skill** — after P1, each P2 surface, and P4; **/design-shotgun** if John wants competing hero variants.

## 5. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Base UI is 1.0.0-**rc** | Exact-pinned (caret removed 2026-07-18); usage depth (8 primitives) API-stable across RCs; fallback is `radix-ui` at equivalent depth — swap cost contained inside `components/ui/` |
| Portalled overlays escape the route-scoped dark theme | P1 step 2 is blocking; the P1 checkpoint screens fail visibly if skipped |
| Three coexisting scroll-lock systems (Base UI / vaul / hand-rolled) | One-lock-per-route rule (P1 step 4); hand-rolled locks deleted in the same PR their surface migrates |
| Visual-baseline flake | Determinism spec in P0 step 1 (clock freeze, reduced-motion, masks, fonts, pinned topology); darwin-owned baselines, excluded from ubuntu CI |
| Visual-baseline churn during P2 reads as noise | Re-baseline per-surface in dedicated commits; diffs are supplementary — rendered screens are the review artifact |
| Bundle creep from 7 new libs | Budget in §2; every polish PR includes the `next build` first-load diff; chart is route-scoped + dynamic; cut candidates removed if cut |
| WebKit/Firefox binaries still CDN-blocked | Suites run Chrome-channel only (as today); cross-engine projects activate when `npx playwright install webkit firefox` succeeds |
| Subagent spend limits (hit during the audit) | Phases sized for inline execution; no phase depends on agent fan-out |
| Hook-dep fixes (P0) are silent behavior changes | J1–J7 required in P0's exit, not just pixel-identity |

## 6. Execution order and checkpoints

```
P0 land tooling commit → lint wall + visual net   → gates + J1–J7 green      [no design checkpoint; still John's commit/push/deploy]
P1 primitives on market page                      → J2 + keyboard gate, then RENDERED SCREENS → JOHN [hard checkpoint + §3a cut decision]
P2 propagate, one surface at a time               → rendered screens PER SURFACE → JOHN, each   [hard checkpoint each]
P3 feel layer (3–5 small PRs)                     → motion recordings + journey runs → JOHN     [review each, in motion]
P4 lightweight-charts                             → RENDERED SCREENS + INP/CLS trace → JOHN     [hard checkpoint]
P5 certification                                  → before/after report → JOHN                  [final review]
```

Every merge to `main` is a production deploy — **each phase, P0 included, waits for an explicit `commit/push/deploy`.**
