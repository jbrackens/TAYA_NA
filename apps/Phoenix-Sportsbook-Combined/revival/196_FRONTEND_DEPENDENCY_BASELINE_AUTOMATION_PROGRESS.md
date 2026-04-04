# Frontend Dependency Baseline Automation Progress

Date: 2026-03-06  
Scope: Reduce frontend runtime-upgrade risk (R002) by introducing a repeatable dependency baseline command with actionable artifact output for Talon and Sportsbook.

## Delivered

1. Added new baseline script:
   - `scripts/frontend/dependency-modernization-baseline.sh`
2. Script behavior:
   - runs `yarn outdated --json` for:
     - `talon-backoffice`
     - `phoenix-frontend-brand-viegg`
   - parses outdated tables into structured summaries
   - classifies updates by version delta (`major`/`minor`/`patch`)
   - writes timestamped artifacts under `revival/artifacts/frontend_dependency_baseline_*`
   - writes top-package markdown snapshots per surface
   - publishes consolidated report:
     - `revival/195_FRONTEND_DEPENDENCY_MODERNIZATION_BASELINE.md`
3. Added Makefile target:
   - `make frontend-deps-baseline`
4. Captured current baseline output:
   - Talon: 110 outdated entries (83 major / 13 minor / 14 patch)
   - Sportsbook: 110 outdated entries (85 major / 12 minor / 13 patch)

## Files Changed

1. `scripts/frontend/dependency-modernization-baseline.sh`
2. `Makefile`
3. `revival/195_FRONTEND_DEPENDENCY_MODERNIZATION_BASELINE.md`
4. `revival/artifacts/frontend_dependency_baseline_20260306_181157/*`
5. `revival/42_BACKLOG_EXECUTION_PHASES.md`
6. `revival/SPORTSBOOK_REVIVAL_PLAN.md`

## Validation

1. Script syntax:

```bash
bash -n scripts/frontend/dependency-modernization-baseline.sh
```

2. Make target resolution:

```bash
make -n frontend-deps-baseline
```

3. Runtime execution:

```bash
make frontend-deps-baseline
```

Result: pass.

## Notes

1. This does not apply upgrades yet; it establishes reproducible upgrade inventory/evidence.
2. Recommended next slice: execute a low-risk patch/minor-only upgrade wave (shared tooling/types) and rerun:
   - `make verify-sportsbook`
   - `make verify-talon`
