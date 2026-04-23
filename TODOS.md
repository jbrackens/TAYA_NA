# TODOs

Design and product debt tracked across planning cycles. Items here are intentionally deferred — each has a "why not now" reason and a trigger for revisit.

## Open

### Predict fee model decision

- **What:** Decide how Predict handles trading fees. Current state: `fee_rate_bps` column defaults to 0, no market sets it, no user-tier mechanism. Industry precedent: Kalshi uses a price-curve formula (`0.07 × P × (1−P)`, peaks at 50¢), Polymarket uses market-category tiers with maker rebates (2026 update); neither uses user-loyalty-tier fees.
- **Why:** Future loyalty iterations may want fee-based benefits (plan v1 explicitly dropped them), but the underlying fee model itself is undecided. Can't add tier-fee benefits on a zero-fee baseline. The decision affects revenue, competitor comparison, and the shape of any future loyalty work.
- **Pros of deciding now:** Unblocks tier-fee benefits as a future loyalty iteration. Aligns Predict with industry pricing norms users will expect. Creates a revenue lever.
- **Cons:** Introducing fees where users currently have none is a user-visible change. Needs product owner signoff + user communication strategy.
- **Context:** Surfaced during `/plan-eng-review` of the loyalty+leaderboards plan on 2026-04-23. Codex outside-voice review flagged that the plan's "0.5% → 0.1% fee tiers" were fictional because the baseline fee is 0. Three candidate approaches: (a) Kalshi-style price curve, (b) Polymarket-style category tiers + maker rebates, (c) flat percentage + tier discount. Each has different revenue, fairness, and competitive-positioning implications.
- **Depends on / blocked by:** Product owner decision on whether Predict charges fees at all in v1.
- **Revisit when:** Before any fee-based loyalty benefit is designed, OR when the revenue model gets a dedicated product review.

### Privacy opt-out UI for leaderboards

- **What:** Add an "Appear anonymously on leaderboards" toggle in `/account/settings`. Toggle flips a boolean on the user record; leaderboard queries respect it by displaying `Trader #<rank>` instead of `user.username`.
- **Why:** Loyalty + Leaderboards v1 ships with `user.username` visible by default. Users who want off the board have to change their handle — no "hide me entirely" path. First privacy-sensitive user will hit this gap.
- **Pros:** Unblocks any user who doesn't want their trading visible publicly. Removes a potential compliance friction in jurisdictions with data-subject-rights regimes (UK/EU).
- **Cons:** Each anonymous user degrades the leaderboard's social engagement value. Mitigation: preserve rank number + stats, hide only the handle.
- **Context:** Introduced in [PLAN-loyalty-leaderboards.md](PLAN-loyalty-leaderboards.md) §2.Leaderboard identity and §NOT in scope. Feature ships with defaults-visible; this tracks the opt-out UI.
- **Depends on:** Loyalty + Leaderboards implementation merged. Adds one column to `auth_users` (`display_anonymous BOOLEAN DEFAULT false`) + one predicate in the leaderboard rank query.
- **Revisit when:** First user requests it in support, OR compliance review flags it, OR we launch in a GDPR jurisdiction.
