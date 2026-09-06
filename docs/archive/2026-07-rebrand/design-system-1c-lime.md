# Design System — TapTrade · 1C "Lime skin, terminal bones"

> **This document describes the ONE canonical system, locked 2026-08-06.**
> It supersedes every prior direction in this file's history: Liquid Glass,
> warm-dark Robinhood, P8 warm-cream, P9 gallery-white, P10 dark terminal,
> P11 commercial-polish, and the interim "Ink & lime" handoff framing. Those
> are **retired**; their full text lives in git history and their dispositions
> in §10. If another document contradicts this one, this one wins — and the
> contradiction is a bug to fix, not a fork to entertain.
>
> **Source of truth pair:**
> - **Values:** `apps/taptrade-platform/frontend/packages/app/app/globals.css`
>   `:root` — CSS custom properties are canonical for every color/radius/space
>   value. Figma mirrors code, not the other way around.
> - **Composition:** Figma file **"TapTrade Design"** (key
>   `aTjk5N7E3S3RVVlOXejfuV`, John's private project; invite-only). Pages:
>   `00 Baseline · 01 Direction · 02 System · 03 Screens · 04 Handoff`.
>   Figma variables carry `codeSyntax` emitting the exact CSS names below, so
>   `get_variable_defs` round-trips cleanly.
>
> **Scope:** governs the player app now; the back-office (`packages/office`)
> still runs the previous value set and migrates to these tokens as a
> follow-up sweep (token names are shared, so it is a value/composition
> sweep, not a rename).

## 0. Why 1C (decision record)

Chosen 2026-08-06 over 1A (ship-as-is Ink & lime) and 1B (resurrected P11
dark terminal), with side-by-side builds of the same live market on the
`01 Direction` Figma page, grounded in Aug-2026 research:

- Category leaders (Polymarket, Kalshi, Robinhood) all ship **light consumer
  surfaces**; dark lives in their pro tiers (Kalshi Pro, Robinhood Legend).
- "Technical Mono" — monospace near numbers, terminal cues, hairline density —
  is the current mainstream movement; Geist Mono (which we ship) is one of its
  leading faces.
- Robinhood's CTA accent is a near-match for TapTrade lime `#C6F24E`; Kalshi
  owns green, Polymarket owns blue. Ink+lime keeps us differentiated.

**1B is reserved, not deleted:** its recipe (charcoal `#131519`-family,
periwinkle-violet, Geist, no shadows) is the designated starting point for a
future paid **Pro mode** — a product decision, not a restyle.

## 1. Product Context (unchanged)

Binary event-contract exchange: users trade YES/NO on real-world outcomes.
Audience: retail Gen Z / millennial traders comfortable in brokerage apps.
Positioning: the discipline of a trading terminal wearing the warmth of the
TapTrade brand — familiar to anyone who has bought a stock, honest to anyone
who reads numbers for a living.

## 2. The Five Rules (the anti-slop contract)

1. **Lime speaks only for actions.** `--lime` appears on primary CTAs, active
   nav/tab states, and category micro-labels — ≤3 lime moments per screen.
   Lime is never a data color, never body text (`--lime-text` `#556F00` is the
   only lime-as-text, AA at 5.74:1 on white).
2. **Teal and mulberry speak only for market direction.** `--dir-yes` / `--dir-no`
   color prices, deltas, bars, settlement outcomes — never chrome, never
   brand, never decoration. Selection is the action voice (lime wash +
   lime-text stroke), even on a NO cell.
3. **Every numeral is mono.** Geist Mono with `tabular-nums` for prices,
   points, counts, timestamps, tickers. If it can be compared or summed, it
   is mono.
4. **Uppercase micro-labels, hairline borders.** Section labels are 9–11px
   uppercase tracked +0.08–0.12em. Separation comes from 1px `--hairline`
   and spacing — not shadows, not tints. (Legacy two-layer card shadows are
   retired; a shadow may survive only on true overlays: menus, sheets, toasts.)
5. **Honest data or no data.** No fabricated deltas, sparklines, activity, or
   balances. Missing 24h change renders "—" in `--ink-3` (a dash must never
   read as "up"). Empty chart ranges say so. Probability bars are sized by
   real prices.

## 3. Tokens

Canonical values live in `globals.css` — this table mirrors it for reading
convenience. Figma variable name → CSS name → value.

### Surfaces & ink

| Figma | CSS | Value | Role |
|---|---|---|---|
| `bg/page` | `--paper` | `#F7F7F3` | page backdrop |
| `bg/card` | `--card` | `#FFFFFF` | cards, cells, panels |
| `bg/raised` | `--raised` | `#F1F1EC` | inner wells, disabled fill |
| `bg/inset` | `--inset` | `#EDEDE6` | search/input inset fields |
| `border/hairline` | `--hairline` | `#E4E4DE` | default 1px border |
| `border/strong` | `--hairline-strong` | `#D4D4CC` | hover tier, outer frames |
| `text/primary` | `--ink` | `#111111` | primary text |
| `text/secondary` | `--ink-2` | `#4A4A46` | secondary text |
| `text/tertiary` | `--ink-3` | `#63635A` | metadata, micro-labels |

### Action (lime)

| Figma | CSS | Value | Role |
|---|---|---|---|
| `action/bg` | `--lime` | `#C6F24E` | CTA fill — fills only |
| `action/text-on` | `--ink-on-lime` | `#17200A` | text on lime (13.0:1) |
| `action/as-text` | `--lime-text` | `#556F00` | lime as text/stroke on light |
| `action/wash` | `--lime-wash` | `#F6FAE3` | selected-side background |
| `action/tint` | `--lime-tint` | `#EFF6D8` | active nav/tab background |

### Direction (market voice)

| Figma | CSS | Value | Role |
|---|---|---|---|
| `signal/yes` | `--dir-yes` | `#126D68` | YES/up text, strokes, bar |
| `signal/no` | `--dir-no` | `#9C3B65` | NO/down text, strokes, bar |
| `signal/yes-soft` | `--yes-soft` | `color-mix(in srgb, var(--dir-yes) 8%, transparent)` | soft YES pill bg |
| `signal/no-soft` | `--no-soft` | `color-mix(in srgb, var(--dir-no) 8%, transparent)` | soft NO pill bg |
| — | `--dir-yes-bar` / `--dir-no-bar` | `#A7D8D3` / `#E5B5C9` | probability-bar segments |

### Status families (from the states work — §4f of the handoff, kept)

- **Info** `--info-text #33556E` · `--info-dot #9FB8CC` · `--info-soft` —
  informational messages never borrow the accent.
- **Inert** `--inert-fill #F1F1EC` · `--inert-border #E4E4DE` ·
  `--inert-label #63635A` — disabled comes from the surface, **never
  opacity/filter** (opacity-disabled CTAs fail contrast; 5.35:1 as speced).
- **Pending** `--pending-fill #E8EECF` · `--pending-border #DFE6C2` ·
  `--pending-label #4A4A46` — in-flight: lime pulled toward paper.

### Radius & space

- Radius: `--radius-xs 4` · `--radius-sm 6` · `--radius-md 8` (default:
  cards, cells, CTAs, inputs) · `--radius-lg 12` (hero/outer cards) ·
  `--radius-pill 999` (reserved: pills that are truly round — LIVE dot
  housing, avatars). The P9 10/16/22/28 ramp is retired.
- Space: `--space-2xs 4 · xs 8 · sm 12 · md 16 · lg 20 · xl 24 · 2xl 32 ·
  3xl 40 · 4xl 48`. Terminal density: prefer the small end; 18px section
  padding, 12–14px card padding are the norm on data surfaces.

## 4. Typography

- **UI: Switzer** (self-hosted; weights 400/600/700). Figma stand-in is
  Inter — every Figma text style notes this; do not ship Inter.
- **Numerals: Geist Mono** (400/600) with `[font-variant-numeric:tabular-nums]`.
- Ramp (Figma style → px/lh): `UI/Display 28/34·700` · `UI/Title 25/32·700`
  (market question) · `UI/Heading 17/24·600` · `UI/Body 14/20` ·
  `UI/Body-sm 13/18` · `UI/Label 12/16·600` · `UI/Micro 11/14·600·+1px caps`
  · `Num/XL 34/40·600` (hero probability) · `Num/L 20/26·600` ·
  `Num/M 14/20·600` · `Num/S 13/18` · `Num/Micro 10/14·600·+1.2px caps`.
- Serif display is permitted **only** as a landing-page editorial flourish
  (the Kalshi/Robinhood pattern) — never in product UI.

## 5. Brand

- Wordmark: lowercase **`taptrade`**, Switzer 700, `--ink`. The split-leaf
  mark (ink left lobe, lime right lobe) precedes it; source of truth
  `app/components/BrandMark.tsx`.
- The landing page runs the **dark ink variant** (near-black ground, lime
  accents, "Where local moments become markets."); the product runs light.
  These are the only two brand surfaces — no third mood.
- Prior identities — "TapTrade." with mint period, Schibsted Grotesk wordmark,
  forest tile, Martian Grotesk uppercase — retired (§10).

## 6. Components (Figma `02 System` ↔ code)

| Figma component | States/variants | Code counterpart |
|---|---|---|
| `Button` | Primary/Secondary/Ghost/Disabled × M/S | `ui/Button` (`cta` et al) |
| `Cell/Side` | Yes/No × Selected | market head tiles, ticket side select |
| `Bar/Probability` | — (segments sized by real price) | hero/ticket split bar |
| `Cell/Stat` | — | market stats strip cells |
| `Row/KeyValue` | Default/Positive | ticket quote rows |
| `Row/Market` | — | feed market rows |
| `Tab/Range` | Default/Active | chart range tabs |
| `Nav/CategoryRow` | Default/Active | left topic rail |
| `Badge/Live` | — | LIVE indicator |
| `Field/Search` | — | top-bar search |
| `Toast/Notice` | Success/Info/Error | `ToastProvider` cards |
| `Organism/TopBar` | — | `prediction/TopBar` |
| `Organism/TradeTicket` | **10 states** (below) | `prediction/TradeTicket` |

Component rules: selection is always the action voice (wash + lime-text
stroke); disabled is always the inert recipe; one icon family (16px stroke
geometric); icons never emoji.

## 7. Trade ticket doctrine (handoff 10a–10n, kept and enforced)

- **The quote rows ARE the review surface.** The CTA submits immediately via
  **press-and-hold** — `Hold to place · N pts` — with helper text
  "press and hold to submit". There is **no confirm modal**; a "Review trade"
  label is a lie and shall not return.
- Ten card states: Ready · Limit (exchange only) · Sell (from position) ·
  Signed-out ("Log in to trade") · No-points (red balance, inert CTA,
  Add-points escape) · No-liquidity · Verify-required · Settled-won ·
  Halted · Quote-only (legacy AMM, read-only).
- Post-submit notices (`Toast/Notice`): status speaks **only through the
  dot** — the card is never tinted. A **partial fill** states the remainder
  and the returned points in the card body; that detail may not be
  toast-only. Rejected orders state that no points were taken.

## 8. Layout

- Desktop ≥1280: `200px topic rail · fluid main · 380px preview/ticket rail`,
  64px top bar (brand · uppercase nav · search FILL · auth), 1px hairline
  dividers between regions. 1024–1279: `72 · fluid · 340`. <1024: one
  column; ticket becomes a modal sheet below 1180 (Escape/backdrop dismiss,
  44px minimum controls); fixed bottom nav below 900.
- Feed model: static **Featured market** (no auto-advance, no carousel) +
  dense `Row/Market` list; selecting a row updates the preview rail.
- The chart owns the hero's right panel; its y-domain auto-scales to the
  series range (min 6¢ span); missing history renders an honest empty state.

## 9. Accessibility (computed 2026-08-06, WCAG 2.x relative luminance)

- `--ink` 17.58:1 on paper, 18.88:1 on card — AAA.
- `--ink-2` 8.9:1 on card — AAA. `--ink-3` 6.06:1 card / 5.65:1 paper — AA
  (fine for the 9–11px bold micro-labels).
- `--lime-text` 5.74:1 on card, 5.38:1 on wash, 5.15:1 on tint — AA.
- `--ink-on-lime` on `--lime` 13.0:1 — AAA. Raw lime as text: banned.
- `--dir-yes` 6.15:1 / `--dir-no` 6.51:1 on card — AA.
- Inert label on inert fill 5.35:1 — AA without opacity tricks.
- Focus: 2px `--lime-text` outline at 2px offset. All interactive targets
  ≥44px on touch surfaces. `prefers-reduced-motion` collapses all motion.

## 10. Retired directions — disposition ledger

| Direction | Fate |
|---|---|
| Liquid Glass (04/24–04/26) | retired 2026-04-26; tokens deleted |
| Warm-dark Robinhood (04/26–04/27) | retired 2026-04-27 |
| P8 warm-cream + chart-paper (04/27–07/07) | retired 2026-07-07 |
| P9 gallery-white + mint (07/07–~07/26) | superseded in code by Ink & lime repaint; formally retired 2026-08-06. Mint accent, seafoam/coral, Inter-as-ship-font, Schibsted wordmark all retired |
| P10/P11 dark terminal (approved 07/12, code-retired 07/26) | **reserved as the future Pro-mode recipe**; not a consumer default |
| Ink & lime handoff framing | absorbed: its tokens and states ARE the substrate of 1C; its rounded-friendly composition is replaced by terminal bones |

Legacy CSS aliases (`--t1..4`, `--surface-1..3`, `--border-1/2`, `--r-rh-*`,
`--accent*`, `--yes*`/`--no*` P9 forms) remain defined for unmigrated
call-sites. **Migration rule: any component you touch moves to the new names
in the same change.** The alias block is deleted when the last consumer goes.

## 11. Decisions log

The pre-1C dated log (2026-04-16 → 2026-08-03) is preserved in git history
(`git log -p DESIGN.md`, entries §11 of prior revisions). New entries:

| Date | Decision |
|---|---|
| 2026-08-06 | **1C locked as the single canonical system** (this document). Direction bake-off + research on `01 Direction` in Figma; system built on `02 System` (50 variables, 12 text styles, 13 components incl. 10-state TradeTicket); Market Detail + Feed frames on `03 Screens`. |
| 2026-08-06 | **Code pilot landed** (`0ba9782c`): 1C tokens added to `globals.css`; market stats strip → separated mono cells; side tiles → white Cell/Side cards; `cta` radius → `--radius-md`. Figma codeSyntax reconciled to repo names (`--dir-yes`, `--ink-on-lime`). gate.sh 8/9 PASS. |
| 2026-08-06 | **Ticket CTA doctrine affirmed**: press-and-hold submit, no confirm modal, quote rows are the review surface (handoff 10a decision, now system law). |
