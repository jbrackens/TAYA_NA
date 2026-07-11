# 99RTP Predict Redesign — Phase 2: Product & Brand Strategy

**Date:** 2026-07-12 · Sources cited inline refer to the Phase 1 research report (`01-research-report.md`), which carries full URLs and dates.

---

## 1. Positioning

**One sentence:** A calm, evidence-forward event-trading floor — social in pace, brokerage-grade in honesty, friendlier than a terminal, and incapable of pretending to be a casino.

Derived positioning constraints (each traceable to Phase 1):

| Constraint | Source |
|---|---|
| Light-first identity — "genuinely designed light theme" is the unclaimed lane (Polymarket owns crypto-dark, Kalshi owns brokerage-sober, Robinhood owns dark+custom type) | Visual-trends research, avark.agency 2026-05-12 |
| One distinctive licensed/less-circulated typeface; Inter/Satoshi/Clash Display are documented template tells in 2026 | madegooddesigns 2026-05-21; inspotype 2025 |
| Neutrals + exactly one proprietary accent; the middle ground between "tech-bro neon" and "heritage-bank blue" is "where trust dies" | ballistic.media 2026; Porto Rocha/Robinhood 2024-25 |
| Wordmark = motion-capable system with one letterform intervention, not a static geometric sans | LogoLounge 2026 |
| Transparency as UI: fees, resolution, liquidity, loss-rates inline — top stated trust drivers for young investors | FINRA/CFA 2024-26; avark.agency 2026 |
| Social features = evidence & discussion, never copy-trading or streak amplification (causal risk-taking evidence) | Management Science 2020; Sci. Reports 2023 |
| Trade-confirmation micro-interaction is the category's open differentiation gap | avark.agency 2026-05-12 |
| Never display "regulated/licensed/safe" or imply protection; affirmatively state the play-points, non-registered status | Regulatory research 2026-07-12; CFTC RED-list pattern |

**Naming.** The visible product name stays **TapTrade** (the active white-label default in `app/lib/brand.ts`; "Hula Na" vs "TapTrade" is an owner-gated launch decision, P3-04). "99RTP" is the demo host, not a brand, and *should not* become one: "RTP" (return-to-player) is casino vocabulary — the exact association the brief forbids. The brand system below is name-portable by design (wordmark drawn as vector outlines from a component, tokens carry no name).

---

## 2. Three original visual directions

### Direction A — "Standing Question" (editorial forecast desk)

- **Strategic rationale:** If Kalshi is a brokerage and Polymarket is a crypto exchange, this is a *newsroom for the future* — every market is a standing question under editorial scrutiny. Distinctiveness comes from paper, prose, and evidentiary framing rather than app chrome.
- **Mood / principles:** bone-paper calm; questions read like headlines; numbers footnoted like citations; nothing blinks.
- **Logo/wordmark:** lowercase custom wordmark with an oversized terminal period; the mark is a "¶-meets-?" glyph — a question mark whose dot is the brand period. Motion: the period lands last (600ms) after the letters settle.
- **Typography:** one editorial serif for display (e.g. licensed Martina-Plantijn-class or free `Newsreader` opticals) + one workhorse grotesk for UI; tabular mono for data.
- **Color:** bone `#FAF7F2` page, near-black ink, single accent **press-blue** `#2447D6`-class; seafoam/coral kept strictly for market movement with labels.
- **Components:** cards become "briefs" with a visible resolution-source footnote row; hairline rules instead of shadows; charts annotated like print graphics (axis labels, source line).
- **Primary screens:** discovery = front page with a lead story market + column of briefs; mobile = single-column news feed with sticky question header.
- **Accessibility/feasibility:** serif display needs careful small-size discipline; largest re-skin distance from current code (every card/panel recomposed); risk of reading "newsletter, not tradable" — the exact failure DESIGN.md logged on 2026-04-27 when it rejected editorial-serif directions.
- **AI-slop distance:** maximal — nothing in the template corpus looks like a broadsheet trading floor.

### Direction B — "Signal Ink" (conviction pass on the product's own equity)

- **Strategic rationale:** The product already owns two genuinely original assets — the **split-T mark** (two crossbar segments = the two sides of a binary market over a committed stem) and the **tap-dot kinetic signature** (one dot that lands). Neither Polymarket, Kalshi, DraftKings, nor any casino has an equivalent. This direction commits fully: ink is the voice, the dot is the motion, *color is reserved for meaning*. Everything decorative is deleted; everything left is either content, structure, or signature.
- **Mood / principles:** gallery-white; ink-confident; "the quietest app that has ever taken your prediction seriously." Three rules: (1) ink speaks, (2) the dot moves, (3) color means.
- **Logo/wordmark:** custom-drawn vector wordmark (no font render): `taptrade.` in a characterful ink-trapped grotesk skeleton, with the **T crossbar split** into two offset halves (the mark's binary metaphor carried into the letterform — LogoLounge 2026 "one distinctive intervention") and the mint period as the landing dot. Favicon/app tile keeps the forest split-T. Motion behavior: crossbar halves slide together, dot lands, 900ms, honors reduced-motion.
- **Typography (two families + mono numerals):** **Bricolage Grotesque** (display — real ink traps, optical sizes, warm-but-precise, far less commodified than Clash Display) + **Inter** demoted to body/UI-only (never display, never brand) + IBM Plex Mono strictly for tabular data. Kills five legacy font loads (Clash, Inter Tight, Outfit, Space Grotesk, Schibsted).
- **Color:** page `#FFFFFF`; ink scale `#0D1114 → #A8B0B8`; **primary actions are ink** (editorial, deliberate — no other prediction product does ink CTAs); the mint of the brand survives *only* as the tap-dot/period `#10C8A0`; seafoam `#1A6849`-text/`#71EEB8`-fill = YES/up, coral `#A8472D`/`#FF8B6B` = NO/down, always with text labels. Collapses today's four-green ambiguity to one brand mint + one semantic seafoam.
- **Components:** current card anatomy retained but de-duplicated (one probability statement, not three); resolution-source line added to detail hero; ticket gains Max-loss/Fees rows; charts keep auto-domain with honest states.
- **Primary screens:** discovery = still market-led (no marketing hero), editorial "desk" modules (Closing today · Movers (real) · New questions); mobile = bottom tabs, compact ticket sheet.
- **Accessibility/feasibility:** all AA tokens already computed; ink CTAs trivially AA; smallest implementation distance (token + component-level, no layout rebuild); zero regression risk to the P9.2 truthful-ticket logic.
- **AI-slop distance:** high on execution (ink CTAs, split-crossbar wordmark, dot system), moderate on layout (kept card grammar — deliberately, users are trained on it).

### Direction C — "Open Ledger" (radical receipt transparency)

- **Strategic rationale:** own the one thing casinos can never copy — *auditability*. Every number wears its provenance: volume shows its window, charts show their source, settled markets show the attestation, the platform shows its loss-rate stats. The UI is the compliance document.
- **Mood / principles:** technical candor; "trust is a table, not a testimonial."
- **Logo/wordmark:** wordmark set in engineered mono-grotesk with a ledger-rule underline that doubles as the loading bar; mark = open-book/order-book pictogram of stacked bid/ask rows.
- **Typography:** engineered grotesk (e.g. `Familjen`/licensed Söhne-class) + mono used prominently (headers of data panels, not just cells).
- **Color:** white + graphite + **verification green** used ONLY on attested/settled states; movement uses labeled arrows more than color.
- **Components:** provenance chips (`source: FIFA · updated 14:02 UTC`) on every stat; order-book depth visible by default; a public "platform stats" page (aggregate P&L distribution, resolution record).
- **Primary screens:** discovery = dense sortable table + cards hybrid; mobile = list-first.
- **Accessibility/feasibility:** strong a11y story (labels everywhere); heavy new-surface cost (provenance metadata isn't in the API for most stats — would fabricate the very trust it sells until backend catches up); mono-prominence collides with the documented "Technical Mono is claimed DeFi territory" fatigue.
- **AI-slop distance:** high, but adjacent to the "code brutalism" trend curve (merge.rocks 2025).

---

## 3. Scorecard — three-lens judge panel (run 2026-07-12, independent agents; full outputs in `research-data/judge-panel.json`)

All three judges — a skeptical design director, a WCAG 2.2 specialist, and a brand strategist — independently picked **B**, while grading harder than the author's provisional numbers (a useful correction, preserved here):

| Criterion (averaged across 3 judges) | A · Standing Question | B · Signal Ink | C · Open Ledger |
|---|---|---|---|
| Distinctiveness | 4.0 | 3.7 | 3.0 |
| Clarity | 2.3 | 4.0 | 3.0 |
| Accessibility | 3.0 | 4.0 | 3.3 |
| Audience fit | 2.0 | 4.0 | 2.7 |
| Feasibility | 2.0 | 5.0 | 2.0 |
| Ownership | 2.3 | 4.0 | 2.3 |
| **Total /30** | **~16** | **~24.7** | **~16.3** |

Notable judge corrections adopted: A's "bone paper + serif + press blue" is itself a 2025-26 trend cluster (quiet-luxury editorial), not a 5-distinctive; C's provenance chips would *fabricate the trust they sell* until the backend can attest provenance (disqualifying); B's distinctiveness is real but **concentrated in three signatures that must survive implementation undiluted** — see conditions below.

### Judge conditions adopted as acceptance criteria

1. **Three non-negotiable signatures:** split-crossbar wordmark intervention · ink primary CTAs · tap-dot motion vocabulary. QA includes a **crop test**: a discovery screenshot with the logo removed must still be attributable to the brand.
2. **Wordmark craft guardrail:** derive letterform outlines from Bricolage Grotesque glyphs (OFL permits modification), confine intervention to the split crossbar + landing period; proof at 16–24px nav scale and favicon scale; if not excellent within two iterations, ship mark + type-set wordmark instead of a mediocre custom one.
3. **Ink-CTA state grammar (non-color):** ≥3:1 boundaries, WCAG 2.4.11/2.4.13-compliant focus appearance, distinct disabled morphology; recommendation to A/B the *ticket commit* CTA (ink vs filled control) before real-money launch, with the fallback pre-agreed.
4. **Token contracts:** any text token <4.5:1 is restricted to decorative/disabled roles; contrast checked in CI (test added in Phase 4).
5. **Semantic-decay prevention:** YES/NO rendered via composite components (color + text label + direction baked together), never raw color tokens.
6. **Name portability:** the brand rule is codified name-agnostically ("one split stroke on the letterform's key vertical + one landing dot") so a P3-04 rename survives the system.
7. **Share/OG template** carrying the signature (ink-dominant) — roadmap item, documented.

## 4. Recommendation — Direction B, "Signal Ink" (P10)

**Why B wins:** it is the only direction that (a) compounds existing owner-approved equity (split-T, tap dot, forest ink) instead of discarding it, (b) reaches production quality within the constraint "preserve working contracts and the truthful-ticket logic," and (c) attacks the actual documented weaknesses — commodified display face, four-green ambiguity, decorative-vs-meaningful color, template card-soup repetition — rather than repainting everything. A and C both contain a research-documented failure mode at their core (newsletter-not-tradable; claimed-DeFi-mono).

**What changes vs today (the "reset" content of P10):**
1. **Wordmark & logo:** custom vector wordmark with split-crossbar intervention + landing dot (replaces Schibsted text render); split-T mark retained, geometry-audited; both delivered as SVG components + standalone SVG assets.
2. **Type system:** 7 loaded families → **Bricolage Grotesque (display) + Inter (UI) + Plex Mono (tabular)**, self-hosted, `font-display: swap`, preloaded.
3. **Color system:** one brand mint (dot/period only) · ink primary actions · seafoam/coral semantics with mandatory text pairing · full-token AA re-audit. Purple stays banned (Legend tier re-mapped to gold).
4. **Honesty layer:** every fabricated signal removed or flag-gated + visibly labeled (Phase 1 §1.2 list, all ten findings).
5. **Safety layer:** RG/limits/notification controls surfaced in footer + account nav regardless of flag state (page content stays flag-gated per jurisdiction, but *discovery of controls* never disappears); play-points disclosure strengthened.
6. **IA:** landing page joins the product's light system and fetches real markets; discovery gets editorial desk modules with real data; carousel auto-advance removed.
7. **Motion tokens:** 120/180/300ms scale, tap-dot vocabulary only, global reduced-motion collapse (already present) extended to the new wordmark animation.

**Deliberately NOT changed:** trade-ticket logic and its truthful outcome states, API client contracts, routing, Redux/React-Query architecture, i18n keys (except honesty rewordings), the office app (out of scope this pass; tokens are shared so it inherits the palette).
