# MS-008 Runtime Gate Profile Environment Progress

Date: 2026-03-06  
Scope: Provision a dedicated, repeatable runtime-gate execution profile so MS-008 enforcement can run as a managed release sign-off command rather than an ad-hoc manual sequence.

## Delivered

1. Added dedicated runtime profile runner:
   - `scripts/release/runtime-gate-profile.sh`
2. Added versioned runtime profile configuration:
   - `scripts/release/profiles/runtime-gate.env`
3. Added managed execution flow in one command:
   - optional bootstrap
   - managed stack start with profile ports/env
   - HTTP readiness waits (backend, gateway, sportsbook, talon)
   - enforced launch-readiness runtime gate (`RUN_MULTI_SPORT_RUNTIME_GATE=1`)
   - automatic stack teardown (configurable)
4. Added runtime profile evidence artifact:
   - `revival/artifacts/runtime_gate_profile_*.md`
5. Added Make target wiring:
   - `make release-launch-readiness-runtime-profile`
6. Updated release governance docs to use this command as the recommended local runtime sign-off path.

## Files Changed

1. `scripts/release/runtime-gate-profile.sh`
2. `scripts/release/profiles/runtime-gate.env`
3. `Makefile`
4. `revival/33_RELEASE_SIGNOFF_CHECKLIST.md`
5. `revival/30_LAUNCH_READINESS_GATE.md`
6. `revival/42_BACKLOG_EXECUTION_PHASES.md`
7. `revival/SPORTSBOOK_REVIVAL_PLAN.md`

## Validation

1. Script syntax:

```bash
bash -n scripts/release/runtime-gate-profile.sh
```

Result: pass.

2. Make target resolution:

```bash
make -n release-launch-readiness-runtime-profile
```

Result: pass.

## Notes

1. This change closes the remaining MS-008 action to define/provision a runtime-gate profile environment.
2. Making this strictly always-on in CI still requires a runtime-capable execution environment (self-hosted runner or equivalent ephemeral stack orchestration).
