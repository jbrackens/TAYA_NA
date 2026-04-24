# Session primer — apply revised DESIGN.md to the Predict player app

**One-line mission:** DESIGN.md just got revised (commit HEAD). Make the code match the spec. Three targeted changes, one commit, browser-verified.

**Paste this whole file into a fresh Claude Code session, or have Claude read it first.**

---

## Environment

- **Project root:** `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/`
- **Workspace kind:** git repo on branch `main`, GitHub: `https://github.com/jbrackens/TAYA_NA`
- **Primary surface you'll touch:** `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/` (Next.js 16 App Router, React 19, Redux Toolkit v1). All paths below are relative to the app dir unless prefixed with `~/` or the repo root marker.
- **Running services** (most are docker-composed; Next dev servers via Claude Preview):
  - PostgreSQL on 5434, Redis on 6380, Go Gateway on 18080, Go Auth on 18081 — all `docker compose up` in `apps/Phoenix-Predict-Combined`
  - Player App (Next dev) on 3000 — `preview_start "Player App (Next.js)"` if not listening. `.claude/launch.json` has the config.
  - Back-Office on 3001 — not required for this task.
- **Login (Claude Preview browser):** `demo@phoenix.local` / `demo123`. Must be via the login form (not direct API) — AuthProvider hydrates from either the `csrf_token` cookie or localStorage; form submit wires both.
- **Don't try to `preview_start` PostgreSQL / Redis / Gateway / Auth.** They're managed by docker, not by Claude Preview. `.claude/launch.json` was stripped of those entries for this reason. See the `_notes.infra` field in the file if you're curious.

---

## What the prior session did

Last session ran `/gstack:design-consultation`. User's feedback: wanted neon phoenix green back as the brand accent (a reversal of the 2026-04-17 decision that picked cyan), wanted the old pre-cutover TN speech-bubble logo restored, and wanted customer surfaces pushed harder toward Pariflow's aesthetic.

Result landed in `HEAD`: **DESIGN.md + one line of CLAUDE.md revised**. See `git log -1 --stat` — it's the `design(predict): revise DESIGN.md — phoenix green accent, TN logo, two-greens discipline` commit.

**The spec is now ahead of the implementation.** Every component still references `#22d3ee` cyan via `var(--accent)`, and the header still renders the text-only "TAYA Predict" wordmark. That's your job to fix.

Read **`DESIGN.md` §3 (Color) and §4 (Layout)** before making changes. The two-greens rule in §3 is the most important new constraint — don't violate it.

---

## Scope — three changes, one commit

### 1. Swap `--accent-*` tokens in `app/globals.css`

The tokens currently read (approximately — line numbers may drift, search for `--accent`):

```css
--accent: #22d3ee;
--accent-hi: #67e8f9;
--accent-soft: rgba(34, 211, 238, 0.14);
--accent-glow: 0 0 28px rgba(34, 211, 238, 0.35);
```

Change to:

```css
--accent: #39ff14;
--accent-hi: #5cff4a;
--accent-soft: rgba(57, 255, 20, 0.14);
--accent-glow: 0 0 28px rgba(57, 255, 20, 0.45);  /* slightly stronger alpha — green blooms softer than cyan */
```

**Also add** a new token for the P&L / "gain" data channel. Place it in the semantic block near `--yes` and `--no`:

```css
--gain: #10b981;        /* Realized P&L positive, accuracy ≥50% — darker than --yes so totals don't out-shout live prices */
```

**Don't touch** `--yes`, `--no`, `--live`, `--whale`, `--whale-soft`, surface/border/text tokens, radius. They stay.

### 2. Replace the text wordmark in `app/components/prediction/PredictHeader.tsx`

Current markup (around line 253 — grep `ph-logo`):

```tsx
<Link href="/predict" className="ph-logo">
  TAYA <span>Predict</span>
</Link>
```

Plus the CSS rule `.ph-logo span { color: var(--accent); }` lower in the `<style>` block.

Change to a real logo:

```tsx
import Image from "next/image";
// ... in JSX:
<Link href="/predict" className="ph-logo" aria-label="TAYA NA Predict — home">
  <Image
    src="/logo-tn.svg"
    alt="TAYA NA Predict"
    width={110}
    height={36}
    priority
  />
</Link>
```

Size it ~36px tall to match the rest of the header chrome (the `.ph-row` padding is 14px and the header sits at ~110px total per DESIGN.md §4). Adjust `width` if the aspect ratio looks wrong — the source file is square-ish so width might need to be smaller than 110px once you see it rendered.

Remove the now-unused `.ph-logo span { color: var(--accent); }` rule from the `<style>` block (there's no `<span>` inside the logo anymore).

Keep the `.ph-logo` display/flex rules that center the child — they still apply to the `<Image>`.

**`/logo-tn.svg` exists** at `app/../public/logo-tn.svg` — confirmed, it's what the design consultation pointed at. If `next/image` complains about the SVG (some Next.js configs disable SVG optimization), either enable it in `next.config.js` via `images.dangerouslyAllowSVG: true` + `contentSecurityPolicy`, or fall back to a plain `<img>` tag. Try `<Image>` first.

### 3. Grep sweep for cyan hex literals that bypass the token system

Run these from the app dir (`apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/`):

```bash
grep -rn -E "22d3ee|67e8f9|0891b2" app/ --include="*.tsx" --include="*.ts" --include="*.css"
grep -rn -E "rgba\(34, *211, *238" app/ --include="*.tsx" --include="*.ts" --include="*.css"
```

Any match in component code should either:

- Become `var(--accent)` / `var(--accent-soft)` / `var(--accent-glow)` / `var(--accent-hi)`, OR
- Be kept as a literal if it's a genuinely neutral cyan (e.g., a chart crosshair or a non-brand decorative element) — document why in a comment.

Expected hits (from memory of the earlier work): `FeaturedHero.tsx` has a `#0891b2` in a gradient fallback, `MarketDetail` hero uses `rgba(34,211,238,0.18)` for the glow overlay, maybe a couple others. Use your judgment — if it looks like a brand-channel use (hero glow, CTA halo), token it. If it's structural (grid line, divider), keep it.

**Also check `components/prediction/TradeTicket.tsx`** for any hardcoded accent shadow on the primary CTA — the trade preview button used to get a `--accent-glow` shadow; make sure that path still cites the token.

---

## `--gain` follow-through

You added the `--gain` token in step 1. Now find where the old code used `--yes` for *P&L meaning* (not YES-price meaning) and switch those to `--gain`:

- `app/portfolio/page.tsx` — the Realized P&L stat card has `tone="yes"` when positive. Add/use a `pf-stat-gain` variant that pulls `var(--gain)`. The current `.pf-stat-yes` should stay scoped to YES-side meaning.
- `app/components/prediction/PortfolioStrip` (inside `app/account/page.tsx`) — same pattern, the Realized P&L tile uses `--yes` today. Switch to `--gain`.
- Any `class="pf-gain"` in `portfolio/page.tsx`'s history table already uses the concept — check whether it's a hardcoded color or a token lookup. If hardcoded, point it at `var(--gain)`.

The two-greens rule is sharp: **YES tiles stay `--yes`**, **P&L numbers go to `--gain`**, **CTAs and brand chrome go to `--accent`**. Three distinct greens, three distinct jobs.

---

## Verification — browser, not just typecheck

From the app dir or repo root:

```bash
# Make sure the dev server is up
preview_start "Player App (Next.js)"
# or if that fails because 3000 is in use: preview_list to find the running server
```

Log in via the form as `demo@phoenix.local` / `demo123`. Then verify:

1. **`/predict` (home):** header logo is the neon-green TN speech bubble (not text). "Sign up" button in the header corner is neon green. Hero "Trade now" CTA is neon green with a green glow. Featured MarketCard's active state on hover shows a green border (not cyan).
2. **`/market/SENATE-DEM-2026`:** YES price tile is the data-green `#34d399` (a softer green than the logo). TradeTicket "Preview order" button is neon phoenix green. The hero atmospheric glow in the top-right has a green cast (not cyan). Outcome ladder bars are still the data-green — they shouldn't match the CTA color.
3. **`/portfolio`:** Realized P&L stat card, when positive, is `--gain` `#10b981` (visibly darker than the YES tiles on the market detail page). The "Open portfolio" link in the account page strip is neon green.
4. **`/account`:** Avatar circle has a neon-green background tint. "Available balance" number is neon green mono.
5. **Console:** no new errors from the token swap. Stale HMR errors about `PredictSidebar.tsx` are known noise — ignore those.

If the two-greens rule is being violated on a surface (e.g., a YES price ended up the same vivid neon as the CTA next to it), fix that before committing. The whole point of the rule is that brand and data stay visually distinct.

**Screenshot the home and market detail** after the swap so you have evidence in the commit body.

---

## Known gotchas

- **Stale `.next` webpack cache** — it still holds references to the deleted `PredictSidebar.tsx` and occasionally flashes SWC parse errors for `MarketCard.tsx` that don't reproduce against the file on disk. Ignore. If it gets noisy, `rm -rf apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/.next` and restart the Player App.
- **Pre-commit hook** — `talon-backoffice/package.json` had husky v4 + lint-staged v10 with a redundant `git add` task that collided with the outer commit's lock. That was already fixed in commit `d1f43331`. Commits should go through cleanly. If they don't, `rm -f .git/index.lock` and retry once.
- **Don't redirect users through `/auth/login` via API login** — the AuthProvider's restore-session flow now reads `csrf_token` OR localStorage as a hint, so `fetch('/api/v1/auth/login', …)` without a form submit *does* hydrate UI state post-reload (commit `b69c60ce` fixed that). But if you trigger `AuthProvider.login()` client-side, it also checks cool-off status — if the gateway is momentarily down mid-login, the catch clears cookies. Log in via the form once; don't batch `logout → login → navigate` in the same evaluation.
- **`<Image>` with SVG** — if Next 16 errors out on unoptimized SVG, drop to a plain `<img src="/logo-tn.svg" alt="…" height={36} />` and move on. Don't spend time fighting the image optimizer for one logo.
- **Gateway is docker-managed.** If `/api/v1/*` starts 500ing, `lsof -i :18080` — if nothing listening, the docker container died; bring it back with `cd apps/Phoenix-Predict-Combined && docker compose up -d`.

---

## Commit message template

One commit, one logical change:

```
feat(design): apply phoenix-green accent + restore TN logo per DESIGN.md

Implements the spec revision from DESIGN.md HEAD.

Tokens (app/globals.css):
- --accent: #22d3ee → #39ff14
- --accent-hi: #67e8f9 → #5cff4a
- --accent-soft: rgba(34,211,238,0.14) → rgba(57,255,20,0.14)
- --accent-glow: rgba(34,211,238,0.35) → rgba(57,255,20,0.45) (denser alpha; green blooms softer)
- + --gain: #10b981 (new; realized P&L channel)

Header (app/components/prediction/PredictHeader.tsx):
- Replaced "TAYA Predict" text wordmark with <Image src="/logo-tn.svg">
- Removed now-unused .ph-logo span { color: var(--accent); } CSS rule

Component sweep:
- [list components touched — FeaturedHero gradient, MarketDetail hero glow, TradeTicket CTA shadow, etc.]
- [any remaining literal cyan kept with a one-line comment]

P&L channel migration:
- /portfolio Realized P&L + /account PortfolioStrip use --gain instead of --yes
- YES-side chips and price tiles stay on --yes (two-greens rule)

Verified in browser: /predict, /market/SENATE-DEM-2026, /portfolio, /account.
Screenshots attached.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Before you exit

- `git log -1 --stat` — confirm the commit covers everything you touched.
- If `/predict` still shows anything cyan, you missed a literal. Grep again.
- Update the decision log in `DESIGN.md` §8 only if you discovered something the revised spec didn't anticipate. Otherwise leave it — the spec is correct, the code just caught up.
