# Frontend API Contract Typing Progress (B024)

Date: 2026-03-03  
Repo: `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined`

## Scope Completed in This Iteration

1. Added generic API-hook typing support in shared sportsbook utility API service.
2. Added typed `UseApi` alias and generic return support in sportsbook `app-core` API wrapper.
3. Added new contract tests for `app-core` API wrapper endpoint/baseUrl wiring.
4. Kept backward compatibility for legacy call sites by defaulting generic type parameters to `any`.

## Files Updated

1. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/utils-core/src/services/api/api-service.ts`
2. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/services/api/api-service.ts`
3. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/api-service.test.ts`

## Validation Evidence

1. `yarn workspace @phoenix-ui/utils test --runTestsByPath src/services/api/__tests__/api-service.test.ts` (pass)
2. `yarn workspace @phoenix-ui/app test --runTestsByPath services/api/__tests__/api-service.test.ts` (pass)
3. `make verify-sportsbook` (pass)

## Notes

1. Strict generic defaults (`unknown`) caused type breakages across legacy consumers; defaults were adjusted to `any` for compatibility while preserving opt-in typed usage.
2. Existing webpack/translation warnings remain unchanged and are not introduced by this work.
3. Follow-up DTO rollout, response-shape fixtures, and auth/profile/settings typed-flow expansion are captured in `revival/37_SPORTSBOOK_DTO_TYPING_PROGRESS.md` and `revival/36_TALON_API_CONTRACT_TYPING_PROGRESS.md`.

## Completion Status

1. B024 is complete for relaunch scope across sportsbook + Talon critical paths.
2. Remaining low-risk typing cleanup is non-blocking hygiene and can proceed incrementally after launch gates.
