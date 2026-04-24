# Session primer — Liquid Glass redesign, ready to start Phase 1

**Paste this whole file into a fresh Claude Code session.**

One-line mission: execute Phase 1 of `PLAN-liquid-glass-redesign.md`. Token + material CSS layer + AppShell transparency fix + hardcoded hex sweep + the `BackdropScene` component. Phase 2 work is consolidated into Phase 1 (see plan D5).

---

## Where to start reading

1. `DESIGN.md` at repo root — source of truth for colors, material system, backdrop, motion, a11y. Revised 2026-04-24 to Liquid Glass + Thndr mint palette.
2. `PLAN-liquid-glass-redesign.md` at repo root — 5-phase plan, 15 decisions logged (D1-D15). Read the "Review outcomes" section first, then Phase 1.
3. This primer.

Do NOT re-read old primers (`PRIMER-design-apply.md`, `PRIMER-loyalty-shipped.md`) — they describe the prior dark-broadcast / neon-phoenix-green direction that was superseded 2026-04-24.

---

## Environment

- Repo: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/`, branch `main`, GitHub `https://github.com/jbrackens/TAYA_NA`
- Customer surface: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/` (Next.js 16 App Router on port 3000)
- Gateway: Go on port 18080, Auth on 18081, Postgres 5434, Redis 6380. All docker-composed in `apps/Phoenix-Predict-Combined/`.
- Use `yarn`, not `npm install`. The project is a yarn workspace.
- Dev credentials (auto-seeded by the auth service): `demo@phoenix.local` / `demo123`. Also: `alice@predict.dev` / `predict123` (has 2 settled positions + 5175 loyalty points as of primer write time).
- Don't start the Next.js server via `preview_start` — it's already configured in `.claude/launch.json`. Just reuse whatever's running, or run `yarn dev` from the app package if nothing listens on 3000.

---

## What's already done (as of 2026-04-24)

Completed and pushed to `origin/main`:

1. **DESIGN.md rewrite** — 340+ lines. Liquid Glass material system (§4), cool-palette backdrop (§5), accessibility (§9), performance budget (§10), decisions log appended with D1-D15. Commit `5fb8ef4e`.
2. **Plan reviewed by `/plan-eng-review`** — 11 issues surfaced, all addressed. Phase 1 expanded (was 2 hrs → 5-6 hrs). Codex outside voice found 5 additional blockers including AppShell opaque bg and hardcoded hex problem. Commit `10dbcc73`.
3. **Plan reviewed by `/plan-design-review`** — 4 more decisions locked (D12-D15: bottom tab bar, chart stays YES-blue, TierPill uses tier color as fill, auth pages keep global backdrop). Info architecture table + state matrix + user journey storyboards + AI-slop prevention + real a11y specs added. Commit `e9f96027`.
4. **Phase 0.5 — Playwright smoke harness** — 7 per-page smoke tests + auth setup, desktop + mobile projects. `yarn typecheck` + `yarn test:smoke` both pass cleanly. Commit `66373fce`.

Recent commits on `origin/main`:
```
66373fce test(smoke): add Playwright smoke harness
e9f96027 docs(design): /plan-design-review adds state matrix + journey + mobile nav + a11y
10dbcc73 docs(design): bake /plan-eng-review findings into redesign plan
5fb8ef4e docs(design): pivot to Liquid Glass aesthetic + mint emerald palette
```

---

## Mockups (your visual reference)

Open all three in browser tabs before touching code:

- **Desktop market detail, FINAL palette:** `~/.gstack/projects/jbrackens-TAYA_NA/designs/liquid-glass-desktop-mint-20260424-200756/market-detail-mockup.html` ← **this is the source of truth for visuals**
- **Mobile trade ticket:** `~/.gstack/projects/jbrackens-TAYA_NA/designs/liquid-glass-20260424-195105/trade-ticket-mockup.html` (uses old `#39ff14` lime — mentally swap to `#2be480` mint per DESIGN.md §3)
- **Skeuomorphism exploration, REJECTED:** `~/.gstack/projects/jbrackens-TAYA_NA/designs/skeuomorphism-20260424-193928/trade-ticket-mockup.html` (kept for contrast only, do not implement)

Open them: `open ~/.gstack/projects/jbrackens-TAYA_NA/designs/liquid-glass-desktop-mint-20260424-200756/market-detail-mockup.html`

---

## Phase 1 — what to do

Read `PLAN-liquid-glass-redesign.md` → `### Phase 1 — Token + material layer (EXPANDED, per review D1 + D2 + D3 + D10)`. That section has the full checklist with line-by-line concrete changes. TL;DR:

**Files you will touch:**

- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/globals.css` — swap tokens, add `.glass` utility + tiers, add `body::before` backdrop gradient, add `@media (prefers-reduced-transparency)` + `@media (prefers-reduced-motion)` blocks.
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/AppShell.tsx` — line 40, change `background: 'var(--s0)'` to `background: 'transparent'`. Without this, the backdrop is invisible.
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/layout.tsx` — mount `<BackdropScene />` as the first child of `<body>`.
- NEW `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/BackdropScene.tsx` — the SVG chart-lines + grid overlay. Plan has shape; DESIGN.md §5 has full spec.
- **~50 component files with hardcoded hex literals** — grep-replace `#39ff14` → `var(--accent)`, `#34d399` → `var(--yes)`, `#f87171` → `var(--no)`, `#fbbf24` → `var(--whale)` (retained as alias). Generate inventory first: `grep -rn --include='*.tsx' --include='*.ts' -E '#39ff14|#34d399|#f87171|#fbbf24' app/ components/ lib/ > hex-sweep-inventory-$(date +%Y%m%d).md`. 208 occurrences across 50 files — the plan allocates ~2 hrs for this sweep.

**Critical preserve-this rules (don't break):**

1. `--accent-glow` stays a COMPLETE box-shadow declaration. 17 call sites do `box-shadow: var(--accent-glow)`. Do NOT change it to a color-only value. Recipe:
   ```css
   --accent-glow-color: rgba(43, 228, 128, 0.45);
   --accent-glow: 0 0 28px var(--accent-glow-color);
   ```
2. `--s0..--s3` stay as deprecation aliases pointing at VISUALLY-CLOSE `--bg-*` values. Plan D1 has the exact mapping.
3. `--gain`, `--whale`, `--whale-soft` stay as deprecation aliases — 5 components still reference them until Phase 4 deletes the callers.
4. Tier colors `--tier-1..--tier-5` are untouched. Loyalty was shipped against those.
5. Legacy sportsbook `ps-*` / `discovery-*` / `sport-pill` classes are untouched.

**New tokens to add** (see DESIGN.md §3):

- Backdrop palette: `--bg-deep`, `--bg-navy`, `--bg-teal`, `--bg-mint`, `--bg-azure`
- Glass palette: `--glass-thick`, `--glass-regular`, `--glass-thin`, `--glass-inset`
- Rim: `--rim-top`, `--rim-bottom`, `--rim-side`, `--chroma-1`, `--chroma-2`
- New accent: `--accent: #2be480`, `--accent-hi: #00ffaa`, `--accent-lo: #1fa65e`, `--accent-deep: #0094ff`, `--accent-gradient`
- YES/NO: `--yes: #7fc8ff` (was green — this is a semantic change), `--yes-hi`, `--yes-lo`, `--yes-glow`, same set for `--no` (`#ff9b6b`)
- `--live: #ff6b6b` (slightly softer than prior `#ef4444`)
- Radii: `--r-sm: 10px`, `--r-md: 16px`, `--r-lg: 22px`, `--r-xl: 28px`, `--r-pill: 999px`

**`.glass` utility recipe** (DESIGN.md §4 has full CSS):

4 layers: translucent fill + `backdrop-filter: blur(30px) saturate(180%)` + rim highlights (inset box-shadows) + `::before` specular sheen. Tiers (`.glass-thick`, `.glass-med`, `.glass-thin`) vary by blur radius.

---

## How to verify Phase 1

Run these in order (dev server + docker stack must be up):

```bash
cd apps/Phoenix-Predict-Combined/talon-backoffice/packages/app

# 1. Typecheck: my Phase 0.5 scripts give 0 errors in tests/; Phase 1 shouldn't change that.
yarn typecheck

# 2. Smoke tests: all 17 must still pass (15 page tests + 2 setup).
yarn test:smoke

# 3. Manual visual verification per plan's "Verification" section:
#    Open /predict, /market/[any], /portfolio in the browser.
#    CTA glows still work. No phoenix-lime visible. Cool-teal backdrop shows.
#    Category pills mint. TierPill unaffected (keeps tier colors).
```

If tests fail:
- `playwright-report/` has the HTML report (open in browser)
- `test-results/` has per-test screenshots + traces
- `yarn test:smoke:ui` opens the Playwright UI runner for interactive debug

**Pre-commit hook**: the repo's husky pre-commit runs `yarn test` (Jest). Jest ignores `tests/` (added in Phase 0.5), so Playwright specs don't interfere. Legacy sportsbook Jest tests are broken but marked `--passWithNoTests`.

---

## Gotchas that already bit us

- **Pre-existing TypeScript baseline is ~400 errors**, mostly in `components/`, `services/`, `lib/slices/` from the sportsbook era. `scripts/typecheck-scoped.sh` filters to only errors in `tests/`. Don't try to fix the legacy baseline — out of scope.
- **`yarn typecheck` runs `./scripts/typecheck-scoped.sh`.** If you want the full 400-error firehose, run `yarn typecheck:full`.
- **Auth service rate-limits rapid logins.** Smoke tests solve this via `tests/smoke/auth.setup.ts` that logs in ONCE and persists storage state to `tests/.auth/demo.json`. Don't re-add per-test logins.
- **Next.js dev server's `next:hmr` sometimes lingers a stale error overlay** that doesn't reset after a successful compile. Hit `Cmd+R` on the preview tab after CSS changes to be sure.
- **The Claude Preview server pre-flight check treats docker ports (5434, 6380, 18080, 18081) as conflicts.** `.claude/launch.json` was stripped of those entries on purpose. If you try to `preview_start` Postgres/Redis/Gateway/Auth, it'll fail — use `docker compose up -d` from the repo root instead.

---

## After Phase 1 lands

- Commit + push. Message prefix `feat(design):` or similar. Use a HEREDOC for the body.
- Run `/ship` or manually push — not `/plan-eng-review` (already done).
- Phase 2 is consolidated into Phase 1 (plan D5). Skip it.
- Next is Phase 3: shell + market-detail pilot. Add `MobileTabBar.tsx` (D12), redesign TopBar (rename from PredictHeader), convert `/market/[ticker]` to Liquid Glass. Budget: 3-4 hrs CC.
- Before starting Phase 4, run the mid-Phase-3 perf gate (Chrome DevTools + Lighthouse mobile on Pixel 6a simulation). Plan has the acceptance criteria.

---

## Pick up in under a minute

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict
cat PLAN-liquid-glass-redesign.md | head -200      # context + phase 0.5 + phase 1
cat DESIGN.md | head -250                          # aesthetic + material + color

# Verify stack is up:
docker ps --format '{{.Names}}' | grep predict     # expect 4 containers
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000   # expect 200

# Verify current state:
cd apps/Phoenix-Predict-Combined/talon-backoffice/packages/app
yarn typecheck                                      # 0 new errors
yarn test:smoke                                     # 17 pass in ~30s

# Open the mockups:
open ~/.gstack/projects/jbrackens-TAYA_NA/designs/liquid-glass-desktop-mint-20260424-200756/market-detail-mockup.html

# Start Phase 1:
grep -n "Phase 1 — Token" PLAN-liquid-glass-redesign.md
# Follow the section line by line.
```

Don't forget to commit incrementally — Phase 1 is 5-6 hrs of work and a single monolithic commit is harder to revert. Suggested splits: (a) globals.css token layer, (b) AppShell + BackdropScene + body::before, (c) hex sweep in batches. Or combine if you prefer.

Last thing: the original eng review's 3-persona founder-homework assignment from the fee-model design doc is separate work for a different session. Ignore it during Phase 1.
