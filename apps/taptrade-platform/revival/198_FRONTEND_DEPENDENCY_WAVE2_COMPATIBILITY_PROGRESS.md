# Frontend Dependency Modernization Wave 2 Compatibility Progress

Date: 2026-03-06  
Scope: Execute the second dependency modernization wave across Talon + Sportsbook with lockfile-wide range-satisfying upgrades, then harden compatibility to keep both verify gates green.

## Delivered

1. Applied wave-2 dependency refreshes by running `yarn upgrade` in both frontend repos:
   - `talon-backoffice`
   - `phoenix-frontend-brand-viegg`
2. Added TypeScript 4.3 compatibility resolutions in both frontend roots:
   - `@types/babel__traverse: 7.20.6` (newer versions fail TS4.3 parse)
   - `@types/react: 17.0.2`
   - `@types/react-dom: 17.0.2`
   - `@types/react-test-renderer: 17.0.1`
   - `@types/minimatch: 3.0.5` (avoids stub package break)
3. Fixed Talon compile regression exposed by upgraded types:
   - Removed obsolete Promise `.done()` call in:
     - `talon-backoffice/packages/office/components/terms-and-conditions-form/index.tsx`
4. Re-ran and passed verification gates after compatibility hardening:
   - `make verify-talon`
   - `make verify-sportsbook`
5. Re-ran dependency baseline and corrected a transient false-zero report:
   - Initial rerun produced `0` entries because `yarn outdated` reported stale lockfiles.
   - After explicit `yarn install` normalization in both repos, baseline rerun produced valid totals.

## Baseline Delta (Wave 1 -> Wave 2)

1. Talon outdated entries: `103 -> 92` (`-11`)
2. Sportsbook outdated entries: `103 -> 95` (`-8`)

Baseline evidence:
- `revival/artifacts/frontend_dependency_baseline_20260306_182233/*` (post-wave-1)
- `revival/artifacts/frontend_dependency_baseline_20260306_183915/*` (post-wave-2 normalized)

## Files Changed

1. `talon-backoffice/package.json`
2. `talon-backoffice/yarn.lock`
3. `talon-backoffice/packages/office/components/terms-and-conditions-form/index.tsx`
4. `phoenix-frontend-brand-viegg/package.json`
5. `phoenix-frontend-brand-viegg/yarn.lock`
6. `revival/195_FRONTEND_DEPENDENCY_MODERNIZATION_BASELINE.md`
7. `revival/artifacts/frontend_dependency_baseline_20260306_183915/*`
8. `revival/42_BACKLOG_EXECUTION_PHASES.md`
9. `revival/SPORTSBOOK_REVIVAL_PLAN.md`

## Validation

1. Dependency upgrade and lockfile normalization:

```bash
source ~/.nvm/nvm.sh && nvm use 20
cd talon-backoffice && YARN_CACHE_FOLDER=/tmp/yarn-cache-phoenix-talon-wave2 yarn upgrade
cd ../phoenix-frontend-brand-viegg && YARN_CACHE_FOLDER=/tmp/yarn-cache-phoenix-sportsbook-wave2 yarn upgrade
cd ../talon-backoffice && YARN_CACHE_FOLDER=/tmp/yarn-cache-phoenix-talon-wave2 yarn install
cd ../phoenix-frontend-brand-viegg && YARN_CACHE_FOLDER=/tmp/yarn-cache-phoenix-sportsbook-wave2 yarn install
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

1. This wave intentionally prioritized lockfile-level modernization plus compatibility stabilization rather than framework major migrations.
2. Remaining outdated set is now dominated by major-version transitions (`react`/`next`/`typescript`/`jest`/`eslint` and adjacent ecosystem packages).
3. Next wave should be a dedicated major-upgrade program with isolated branch strategy, stricter contract coverage, and staged release gates.
