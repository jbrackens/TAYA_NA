# Canonical Browser Journey Artifact

- Generated: `2026-06-28T19:41:46Z`
- Main report: `revival/42_CANONICAL_BROWSER_JOURNEY.md`
- Spec: `talon-backoffice/e2e/prediction/canonical-browser.ui.spec.ts`
- Status: passing proof added; not an RC completion claim

## Proof Scope

The canonical player browser journey now covers:

- Create account
- Accept points-only no-cashout disclosure
- Receive starter points
- Browse markets
- Watch a market
- Search/filter markets
- Open `VAL-MASTERS-FINAL`
- Read market detail/resolution/liquidity content
- Buy YES
- Buy NO
- View portfolio
- Inspect point ledger
- Comment and upvote
- Follow a public profile
- Claim an available reward
- Admin close market
- Admin resolve market
- Settlement updates point ledger
- User sees settlement in portfolio history
- User appears on leaderboard
- User sees activity feed row
- Retired player money routes return 404

## Commands

Final passing command:

```sh
PREDICT_BASE_URL=http://127.0.0.1:3022 npx playwright test --config playwright.prediction.config.ts e2e/prediction/canonical-browser.ui.spec.ts --project=ui --reporter=list
```

Result:

```txt
2 passed
```

## Runtime

- Postgres: `tiangge-e2e-pg-358`, port `56552`
- Auth: `18081`, DB mode
- Gateway: `18180`, DB prediction/wallet stores
- Player: `3022`
- Seeded market: `VAL-MASTERS-FINAL`

## Browser Sanity

- Final URL: `http://127.0.0.1:3022/discover/`
- Title: `Tiangge`
- Visible heading: `Market sentiment`
- Console warnings/errors: none observed
- Nonblank screenshot was emitted by browser QA.

## Preservation Gate Follow-up

- `make qa-preservation-deletions`: passed, 54 deleted artifacts classified, 0 unclassified deletions.
- `make qa-preservation-contract-anchors`: passed, no unexpected inherited public anchor removals.
- `make qa-preservation-modifications`: passed, 388 modified tracked artifacts classified, 87 high-risk contract files, 35 large-change files.

## Caveats

The browser proof uses API calls for admin close, settlement, leaderboard recompute, and direct ledger assertions until office-browser admin variants and a fully continuous player plus office browser workflow are added.
