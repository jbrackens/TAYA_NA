> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> See `DESIGN.md` for the shipped design system and `CLAUDE.md` for current architecture.

# 2026-07 redesign research

**Status:** the design this was gathered for was REJECTED; the research outlived it.
**Rejected branch:** tag `archive/p10-signal-ink-2026-07-12` (commit `af47e4f2`).

On 2026-07-12 a full redesign ("P10 Signal Ink", then "P11 Standing Question") was built and rejected
by the owner. The visual work is dead and is not archived here. What is kept is the research that
preceded it, which is not design-specific and does not exist anywhere else in the repo.

Every **non-visual** fix from that branch was re-implemented fresh on `main` and deployed the same
day — verified again 2026-09-06. `04-change-log.md` is the file-level inventory of what was ported.

| File | Why it is kept |
|---|---|
| `research-data/prediction-market-regulatory-and-industr.json` | 34 dated, URL-cited regulatory findings. The only claims-perimeter source in the repo — relevant to what the product may and may not say about itself. |
| `research-data/addictive-dark-patterns-in-gambling--spo.json` | 25 cited findings on dark patterns and enforcement actions. The app follows a no-dark-patterns rule that is otherwise written down nowhere. |
| `research-data/accessibility-and-performance-audit---ta.json` | 27 file:line a11y/perf findings. Most are closed on main; the open ones are still open. |
| `research-data/fake-misleading-data-presentation-audit-.json` | 12 findings on fabricated or misleading data surfaces. One (#5) is still open — see `docs/licensability-gaps.md`. |
| `research-data/{kalshi,polymarket,draftkings-predictions,og-com,stake-com}.json` | Five competitor product/UX audits from 2026-07-12. |
| `research-data/how-adult-gen-z-and-millennial-retail-tr.json` | Audience research on young-adult retail traders. |
| `04-change-log.md` | File-level inventory of the branch, split honesty / brand / performance. |

Not copied (kept only at the tag): the redesign spec, brand strategy, judge-panel scoring, QA report,
six screenshots, and the wordmark generation script — all specific to the rejected direction.
