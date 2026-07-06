# Talon API Contract Typing Progress (B024)

Date: 2026-03-03  
Repo: `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined`

## Scope Completed in This Iteration

1. Added generic API-hook typing support in Talon shared utility API service (`useApiHookTyped`) while preserving legacy `useApiHook` behavior.
2. Added typed `UseApi` alias and generic return support in Talon `app` API wrapper.
3. Added typed tuple response and generic hook plumbing in Talon `office` API wrapper.
4. Added contract tests for Talon `app` and Talon `office` API wrappers covering endpoint/baseUrl/handler wiring and response mapping.
5. Preserved backward compatibility by keeping generic defaults as `any` and supporting string method call sites.

## Files Updated

1. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/talon-backoffice/packages/utils/src/services/api/api-service.ts`
2. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/talon-backoffice/packages/app/services/api/api-service.ts`
3. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/talon-backoffice/packages/office/services/api/api-service.ts`
4. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/talon-backoffice/packages/app/services/api/__tests__/api-service.test.ts`
5. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/talon-backoffice/packages/office/services/api/__tests__/api-service.test.ts`

## Validation Evidence

1. `yarn workspace @phoenix-ui/utils dist` (pass)
2. `yarn workspace @phoenix-ui/app test --runTestsByPath services/api/__tests__/api-service.test.ts` (pass)
3. `yarn workspace @phoenix-ui/office test --runTestsByPath services/api/__tests__/api-service.test.ts` (pass)
4. `make verify-talon` (pass)

## Notes

1. TypeScript generic-return casting needed an `unknown` bridge in Talon utils to satisfy strict `tsc` checks where transitional states can return `undefined` data/error.
2. Existing legacy warnings remain unchanged (Next.js/i18next build warnings and browserslist update notice).

## Remaining B024 Work

1. Extend explicit DTO-level generics to high-risk sportsbook + Talon API consumers (wallet/bet/fixture/admin mutation paths).
2. Add API response-shape fixture validation for key sportsbook and Talon endpoints beyond wrapper wiring.
3. Reduce `any` usage opportunistically where call-site contracts are already stable and tested.
