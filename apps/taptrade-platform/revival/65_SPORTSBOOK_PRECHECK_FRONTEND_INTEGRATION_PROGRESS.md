# Sportsbook Precheck Frontend Integration Progress (SB-105)

Date: 2026-03-04  
Backlog reference: `SB-105` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Re-enabled sportsbook betslip place-bet UX path in summary component.
2. Wired sportsbook betslip single-bet submission flow to call `POST /api/v1/bets/precheck` before geolocation/place submission.
3. Added stable reason-code handling from precheck response/error payloads and surfaced those codes in existing betslip error rendering.
4. Added typed contracts for precheck request/response and gateway error envelope in frontend API types.
5. Added translation coverage for stable snake_case precheck reason taxonomy keys in sportsbook `api-errors` locale.

## Behavior Notes

1. Precheck runs before geolocation/place execution for loading single bets.
2. If precheck endpoint is unavailable (`404`/`405` or network failure), flow falls back to legacy place path to preserve local compatibility during transition.
3. When precheck rejects placement, betslip:
   - resets loading statuses,
   - shows list-level errors,
   - renders stable reason-code messages via `api-errors` translation namespace.

## Key Files

1. Betslip precheck call path + placement flow gating:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/index.tsx`
2. Place-bet UX re-enable:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/summary/index.tsx`
3. Frontend contracts:
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/contracts.ts`
4. Stable reason-code translations:
   - `phoenix-frontend-brand-viegg/packages/app/public/static/locales/en/api-errors.json`

## Validation

1. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --testPathPattern=components/layout/betslip/__tests__/betslice.test.tsx --passWithNoTests`
   - pass (`15` tests)

## Why this satisfies SB-105 integration

1. Sportsbook frontend now actively calls `/api/v1/bets/precheck` in bet placement flow.
2. Stable precheck reason taxonomy is consumed and surfaced to user-facing error UI.
3. Integration is backwards-compatible while backend cutover remains in progress.

## Next

1. Add SB-106 sportsbook UX path for alternative-odds offer accept/commit.
2. Start SB-202 bet-builder composition/pricing foundation.
3. Add dashboard/alerts for offer commit/expire/stale quote ratio based on new feed metrics.
