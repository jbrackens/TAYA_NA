# MS-008 Release Governance Wiring Progress

Date: 2026-03-06  
Scope: Wire MS-008 cross-sport runtime regression enforcement into release governance with explicit runtime preconditions and deterministic default behavior.

## Delivered

1. Updated launch-readiness gate script to support optional MS-008 runtime enforcement:
   - new gate toggle: `RUN_MULTI_SPORT_RUNTIME_GATE` (`0`/`1`, default `0`)
   - runtime gate env controls:
     - `MULTI_SPORT_FRONTEND_BASE_URL`
     - `MULTI_SPORT_GATEWAY_BASE_URL`
     - `MULTI_SPORT_ITERATIONS`
     - `MULTI_SPORT_SPORTS_CSV`
     - `MULTI_SPORT_CHECK_ESPORTS_COMPAT`
2. Added explicit `skip` reporting in launch-readiness checklist output when runtime gate is not enabled.
3. Added convenience make target:
   - `make release-launch-readiness-runtime`
4. Updated release sign-off checklist docs with runtime-gate invocation and evidence expectations.

## Files Changed

1. `scripts/release/launch-readiness-gate.sh`
2. `Makefile`
3. `revival/33_RELEASE_SIGNOFF_CHECKLIST.md`

## Validation

1. Script syntax:

```bash
bash -n scripts/release/launch-readiness-gate.sh
bash -n scripts/qa/sports-regression-gate.sh
```

Result: pass.

2. Make target resolution:

```bash
make -n release-launch-readiness-runtime
make -n qa-sports-regression
```

Result: pass.

## Notes

1. CI determinism is preserved because runtime gate remains opt-in by default in launch-readiness.
2. Local sign-off can enforce runtime parity by using `make release-launch-readiness-runtime` with live sportsbook/go-gateway processes.
