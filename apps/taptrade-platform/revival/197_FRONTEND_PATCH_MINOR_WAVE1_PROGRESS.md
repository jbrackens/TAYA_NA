# Frontend Patch/Minor Upgrade Wave 1 Progress

Date: 2026-03-06  
Scope: Execute first low-risk frontend dependency modernization wave (shared root patch/minor updates) and keep Talon/Sportsbook verify gates green.

## Delivered

1. Applied patch/minor upgrades in root frontend package manifests for both repos:
   - `@babel/runtime` -> `7.28.6`
   - `dayjs` -> `^1.11.19`
   - `lodash` -> `^4.17.23`
   - `qs` -> `^6.15.0`
   - `@types/enzyme` -> `^3.10.19`
   - `@types/enzyme-adapter-react-16` -> `^1.0.9`
   - `utility-types` -> `^3.11.0`
2. Resolved compatibility regression encountered during verification:
   - Newer `@types/lodash` revisions introduced TS syntax incompatible with current TypeScript 4.3 builds.
   - Pinned `@types/lodash` to `4.14.161` in:
     - `talon-backoffice/package.json`
     - `phoenix-frontend-brand-viegg/package.json`
     - `phoenix-frontend-brand-viegg/packages/app/package.json`
3. Regenerated lockfiles under Node 20 + isolated Yarn cache folders.
4. Re-ran and passed frontend verify gates:
   - `make verify-talon`
   - `make verify-sportsbook`
5. Re-ran dependency baseline after upgrades:
   - Talon outdated count reduced: `110 -> 103`
   - Sportsbook outdated count reduced: `110 -> 103`

## Files Changed

1. `talon-backoffice/package.json`
2. `talon-backoffice/yarn.lock`
3. `phoenix-frontend-brand-viegg/package.json`
4. `phoenix-frontend-brand-viegg/packages/app/package.json`
5. `phoenix-frontend-brand-viegg/yarn.lock`
6. `revival/195_FRONTEND_DEPENDENCY_MODERNIZATION_BASELINE.md`
7. `revival/artifacts/frontend_dependency_baseline_20260306_182233/*`
8. `revival/SPORTSBOOK_REVIVAL_PLAN.md`
9. `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Validation

1. Install and lockfile refresh under Node 20:

```bash
source ~/.nvm/nvm.sh && nvm use 20
YARN_CACHE_FOLDER=/tmp/yarn-cache-phoenix-talon yarn install
YARN_CACHE_FOLDER=/tmp/yarn-cache-phoenix-sportsbook yarn install
```

2. Frontend verify gates:

```bash
make verify-talon
make verify-sportsbook
```

3. Baseline rerun:

```bash
make frontend-deps-baseline
```

Result: pass.

## Notes

1. `@types/lodash` must remain pinned until TypeScript major upgrade planning is executed.
2. Next wave should target remaining patch/minor upgrades that are not blocked by TypeScript 4.3 syntax constraints.
