# Sportsbook DTO Typing Progress (B024)

Date: 2026-03-03  
Repo: `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined`

## Scope Completed in This Iteration

1. Added shared API contract DTOs for paginated endpoints, wallet balance, and bet placement/status payloads.
2. Added explicit generic typing to high-risk sportsbook API consumers:
   - wallet balance
   - fixture list
   - open bets tab
   - win/loss statistics
   - transaction history
   - bet placement + pending bet status polling
3. Fixed a real type defect uncovered by typed responses in open-bets mapping by adding missing `fixtureId` and `sportId` fields required by `Bet`.
4. Added runtime response-shape guards for wallet, bets, fixtures, and wallet-transactions payloads.
5. Added fixture-based response-shape contract tests and positive/negative payload assertions.
6. Extended typed `useApi` coverage into remaining auth/profile/settings/geocomply flows.

## Files Updated

1. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/services/api/contracts.ts`
2. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/response-shapes.test.ts`
3. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/fixtures/wallet-balance.json`
4. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/fixtures/bets-page.json`
5. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/fixtures/fixtures-page.json`
6. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/fixtures/wallet-transactions-page.json`
7. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/current-balance/index.tsx`
8. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/index.tsx`
9. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/main-tabs/open-bets/index.tsx`
10. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/layout/fixture-list/index.tsx`
11. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/pages/win-loss-statistics/index.tsx`
12. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/pages/transaction-history/index.tsx`
13. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/layout/index.tsx`
14. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/account-status-bar/index.tsx`
15. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/services/geocomply/index.tsx`
16. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/hooks/useLogout/index.tsx`
17. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/scripts/frontend/verify-sportsbook.sh`
18. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/scripts/frontend/verify-talon.sh`

## Validation Evidence

1. Targeted API contract tests:
   - `yarn workspace @phoenix-ui/app test --runTestsByPath services/api/__tests__/api-service.test.ts services/api/__tests__/response-shapes.test.ts`
   - artifact: `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/sportsbook_api_contract_tests_20260303_151220.log`
2. Sportsbook gate:
   - `BUILD_RETRIES_NODE20=1 BUILD_RETRIES_NODE16=1 make verify-sportsbook`
   - artifact: `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/sportsbook_verify_20260303_151115.log`
3. Talon gate (verifier parity after runtime script updates):
   - `make verify-talon`
   - artifact: `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/talon_verify_20260303_151153.log`

## Runtime Hardening Note

1. Node 20 builds still require legacy OpenSSL behavior for Next 11/Webpack 5 in this codebase, but modern Node disallows setting that via `NODE_OPTIONS`.
2. Verifiers now invoke `node --openssl-legacy-provider .../next build` directly (instead of exporting the flag through `NODE_OPTIONS`) while keeping memory sizing and runtime-specific Yarn pinning.

## Completion Status

1. B024 is complete for relaunch scope (critical sportsbook + Talon flows typed, response-shape guards/fixtures in place, verify gates green).
2. Remaining typing cleanup in low-risk call sites is optional hygiene and can be handled as ongoing refactor work, not a launch gate.
