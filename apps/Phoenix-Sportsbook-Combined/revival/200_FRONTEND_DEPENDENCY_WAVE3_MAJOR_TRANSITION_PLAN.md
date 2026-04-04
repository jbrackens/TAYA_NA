# Frontend Dependency Modernization Wave 3 Major Transition Plan

Date: 2026-03-06  
Owner: Codex

## Objective

Execute major-version modernization across Talon + Sportsbook frontends (`react`, `next`, `typescript`, `jest`, `eslint`) with staged isolation, explicit compatibility checkpoints, and rollback-safe release gates.

## Constraints

1. Keep both frontend verify gates green at each cut point:
   - `make verify-talon`
   - `make verify-sportsbook`
2. Preserve current sportsbook + Talon runtime behavior while upgrading.
3. Avoid mixed major jumps in a single PR; isolate by migration phase.
4. Maintain shared workspace interoperability (`@phoenix-ui/utils`, shared build scripts, translations tooling).

## Branching Strategy

1. `codex/wave3-toolchain-spine`
   - Core lint/test/ts-jest/eslint scaffold modernization.
2. `codex/wave3-react-runtime`
   - React/react-dom and testing-library ecosystem migration.
3. `codex/wave3-next-runtime`
   - Next.js and webpack-compatible runtime alignment.
4. `codex/wave3-typescript-finalize`
   - TypeScript major uplift and type package convergence.
5. `codex/wave3-integration-hardening`
   - Shared cleanup, deprecation removals, and release rehearsal.

Each phase merges only after passing both frontend verify gates and targeted package-level checks.

## Phase Plan

## Phase W3-1: Toolchain Spine

Scope:
1. Upgrade `eslint` stack and compatible plugins.
2. Upgrade `jest` + runner utilities while preserving test command contracts.
3. Remove obsolete resolution pins only when no longer required.

Checkpoint:
1. `make verify-talon`
2. `make verify-sportsbook`
3. Targeted workspace tests for office/app-core critical containers.

Rollback:
1. Reapply lockfile from previous wave baseline.
2. Restore previous resolver pins and rerun verify gates.

## Phase W3-2: React Runtime

Scope:
1. Upgrade `react` + `react-dom` and align `@types/react*`.
2. Upgrade testing-library stack for new React behavior.
3. Address strict-mode/lifecycle behavior differences in hooks/components.

Checkpoint:
1. `make verify-talon`
2. `make verify-sportsbook`
3. Focused test suites for auth/profile/navigation/risk-management flows.

Rollback:
1. Revert React majors only, keep W3-1 toolchain changes.

## Phase W3-3: Next Runtime

Scope:
1. Upgrade Next.js major and aligned webpack/runtime configs.
2. Remove legacy OpenSSL provider fallback when no longer needed.
3. Revalidate app routing, API proxy routes, and translations watch/build flow.

Checkpoint:
1. `make verify-sportsbook`
2. `make verify-talon`
3. Local smoke on `/`, `/sports/*`, `/account`, and Talon office dashboard routes.

Rollback:
1. Revert Next major + related config files only.
2. Keep W3-1/W3-2 if still green.

## Phase W3-4: TypeScript Finalize

Scope:
1. Upgrade TypeScript major and align ts-node/ts-jest toolchain.
2. Remove TypeScript 4.3-only compatibility pins:
   - `@types/babel__traverse`
   - `@types/minimatch`
3. Close strict typing regressions exposed by upgraded declarations.

Checkpoint:
1. `make verify-talon`
2. `make verify-sportsbook`
3. Explicit `npx tsc --noEmit` in Talon office + sportsbook app packages.

Rollback:
1. Reintroduce known-good TS/resolution pin set and rerun compile gates.

## Phase W3-5: Integration Hardening + Release Prep

Scope:
1. Re-run dependency baseline report for post-wave comparison.
2. Execute release governance flow with runtime profile:
   - `make release-governance-private`
3. Publish compatibility delta and known-risk closure.

Checkpoint:
1. `make frontend-deps-baseline`
2. `make release-governance-private`
3. Document final wave outcome in revival progress log + backlog.

Rollback:
1. Keep prior wave branch tags for rapid revert.
2. Re-cut from last passing phase tag if any phase introduces sustained regressions.

## Gate Matrix

| Gate | W3-1 | W3-2 | W3-3 | W3-4 | W3-5 |
|---|---|---|---|---|---|
| `make verify-talon` | required | required | required | required | required |
| `make verify-sportsbook` | required | required | required | required | required |
| TypeScript no-emit checks | optional | optional | optional | required | required |
| Release runtime-profile gate | optional | optional | optional | optional | required |

## Deliverables

1. Phase-by-phase PRs with scoped change sets.
2. Updated lockfiles and removed obsolete compatibility pins.
3. Refreshed baseline artifact/report post-wave completion.
4. Updated plan/backlog/progress docs with execution evidence and residual risks.
