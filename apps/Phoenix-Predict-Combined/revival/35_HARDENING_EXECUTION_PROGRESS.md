# Hardening Execution Progress

Date: 2026-03-03  
Repo: `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined`

## Scope Completed

1. Upgraded frontend SBOM generation from partial fallback inventories to CycloneDX JSON outputs.
2. Hardened sportsbook verify flow to reduce `next build` SIGKILL flakiness under memory pressure.
3. Re-ran cutover + launch-readiness + stabilization gates with hardened paths.
4. Extended B024 hardening into Talon API wrappers with typed hook contracts and targeted contract tests.
5. Extended B024 hardening into sportsbook DTO consumers (wallet/bets/fixtures/transactions) and fixed a typed open-bets mapping defect.
6. Added sportsbook response-shape guard functions + fixture contract tests and extended typed API coverage into auth/profile/settings/geocomply flows.
7. Hardened sportsbook and Talon verifiers to bypass `NODE_OPTIONS` OpenSSL restrictions by invoking Next builds with direct `node --openssl-legacy-provider`.
8. Applied no-legacy-migration scope decision and closed B018/B021 for relaunch with `verify-go` gate evidence.
9. Archived historical migration onboarding docs as reference-only and aligned master scope wording with no-legacy-migration relaunch.

## Security Hardening (SBOM)

### Change

Updated SBOM script:

- `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/scripts/security/generate-sbom.sh`

Behavior:

1. Primary: `npm sbom`
2. Fallback: `npx @cyclonedx/cyclonedx-npm --ignore-npm-errors`
3. Last resort fallback: `yarn list` JSONL inventory

### Evidence

Command:

```bash
make security-sbom
```

Artifacts:

1. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/sbom_20260303_135139/summary.md`
2. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/sbom_20260303_135139/talon-backoffice.cyclonedx.json`
3. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/sbom_20260303_135139/phoenix-frontend-brand-viegg.cyclonedx.json`
4. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/21_SBOM_BASELINE.md`

Result: both frontend components report `ok` with CycloneDX output.

## Build/Gate Hardening (Sportsbook + Talon Verify)

### Change

Updated verifiers:

1. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/scripts/frontend/verify-sportsbook.sh`
2. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/scripts/frontend/verify-talon.sh`

Hardening:

1. Added tunable build memory/retry controls.
2. Pinned Yarn execution to active runtime (`YARN_BIN`) across runtime switches.
3. Enforced `CI=1` and `NEXT_TELEMETRY_DISABLED=1` for deterministic build behavior.
4. Replaced legacy OpenSSL injection via `NODE_OPTIONS` with direct `node --openssl-legacy-provider .../next build` execution.

### Evidence

Commands:

```bash
BUILD_RETRIES_NODE20=1 BUILD_RETRIES_NODE16=1 make verify-sportsbook
make verify-talon
```

Artifacts:

1. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/sportsbook_verify_20260303_151115.log`
2. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/talon_verify_20260303_151153.log`
3. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/sportsbook_verify_20260303_191258.log`
4. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/talon_verify_20260303_191352.log`
5. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/sportsbook_verify_20260303_192002.log`
6. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/talon_verify_20260303_192041.log`

Result: both verify gates pass under the hardened runtime paths.

## Release Dry-Run Refresh

### Evidence

Commands:

```bash
make release-launch-readiness
make release-stability-burnin
```

Artifacts:

1. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/release_launch_readiness_run_20260303_192101.log`
2. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/launch_readiness_20260303_192101.md`
3. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/release_stability_burnin_run_20260303_192503.log`
4. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/stabilization_burnin_20260303_192504.md`

Result: launch-readiness gate remains GO and stabilization burn-in remains pass (`12/12` cycles, `0` failed).

## Relaunch-Scope Closure (B018/B021)

### Change

Updated relaunch scope to explicitly exclude legacy data migration onboarding for this revival cycle, then closed remaining settlement/reconciliation items against live-path correctness gates.

Updated docs:

1. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/14_GO_BET_SETTLEMENT_PROGRESS.md`
2. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/15_GO_LEDGER_RECONCILIATION_PROGRESS.md`
3. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/SPORTSBOOK_REVIVAL_PLAN.md`
4. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/16_RECONCILIATION_DATA_INPUT_SPEC.md`
5. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/17_HISTORICAL_EXPORT_PARITY_READINESS.md`

### Evidence

Command:

```bash
make verify-go
```

Artifact:

1. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/verify_go_20260303_190842.log`

Result: Go settlement + reconciliation gates are green and tracked as complete for relaunch scope.

## Frontend API Hardening (B024)

### Change

Updated sportsbook contracts and consumers:

1. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/services/api/contracts.ts`
2. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/response-shapes.test.ts`
3. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/fixtures/*.json`
4. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/layout/index.tsx`
5. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/account-status-bar/index.tsx`
6. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/services/geocomply/index.tsx`
7. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/hooks/useLogout/index.tsx`

Hardening:

1. Added runtime response-shape guards for wallet/bets/fixtures/wallet-transactions payloads.
2. Added fixture-based tests that validate expected payload shapes and malformed-payload rejection.
3. Extended typed `useApi` coverage into remaining auth/profile/settings/geocomply flows.

### Evidence

Commands:

```bash
yarn workspace @phoenix-ui/app test --runTestsByPath services/api/__tests__/api-service.test.ts services/api/__tests__/response-shapes.test.ts
BUILD_RETRIES_NODE20=1 BUILD_RETRIES_NODE16=1 make verify-sportsbook
make verify-talon
```

Artifacts:

1. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/sportsbook_api_contract_tests_20260303_151220.log`
2. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/sportsbook_verify_20260303_151115.log`
3. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/talon_verify_20260303_151153.log`
4. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/37_SPORTSBOOK_DTO_TYPING_PROGRESS.md`

Result: typed DTO coverage and response-shape fixture validation are active, and both frontend verify gates remain green.

## Remaining Hardening Gaps

1. `cyclonedx-npm` still emits peer-tree warning noise (`ELSPROBLEMS`) even though CycloneDX files are generated.
2. Dependency modernization is still required to reduce legacy peer mismatch noise.
3. Branch protection/ruleset enforcement for mandatory release workflows still requires repository-admin configuration.
