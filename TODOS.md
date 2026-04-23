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

## Shipped

### Privacy opt-out UI for leaderboards — shipped 2026-04-23

- Migration 016 adds `punters.display_anonymous BOOLEAN NOT NULL DEFAULT false`.
- `GET/PUT /api/v1/me/privacy` reads/writes the flag with session auth.
- Leaderboard display-name query renders `Trader #<rank>` when the flag is on,
  `COALESCE(username, substring(id, 1, 10))` otherwise.
- Toggle lives on the `/account` page under "Appearance on public boards",
  server-confirmed update (no optimistic flip) so React 19 Strict Mode's
  double-effect doesn't race the mount fetch.
- Shipped in commits through 2026-04-23 after the loyalty + leaderboards
  backend + frontend lands in this same series.
