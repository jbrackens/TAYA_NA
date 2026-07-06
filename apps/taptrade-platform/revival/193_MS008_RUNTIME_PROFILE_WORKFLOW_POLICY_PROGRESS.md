# MS-008 Runtime Profile Workflow Policy Progress

Date: 2026-03-06  
Scope: Add runtime-capable workflow policy path so the managed MS-008 runtime profile can run in CI orchestration on self-hosted infrastructure.

## Delivered

1. Added new workflow:
   - `.github/workflows/release-runtime-profile.yml`
2. Workflow supports:
   - Phase 9 managed runtime profile launch-readiness gate
   - optional Phase 10 stabilization burn-in continuation
   - artifact uploads for launch/stabilization/runtime-profile logs and reports
3. Updated sign-off checklist to include:
   - runtime profile workflow path
   - expected runtime artifacts
4. Updated master revival plan immediate actions/progress journal to reflect this policy wiring.

## Files Changed

1. `.github/workflows/release-runtime-profile.yml`
2. `revival/33_RELEASE_SIGNOFF_CHECKLIST.md`
3. `revival/SPORTSBOOK_REVIVAL_PLAN.md`

## Validation

1. Make target dry-run for profile execution:

```bash
make -n release-launch-readiness-runtime-profile
```

Result: pass.

## Notes

1. This workflow is `workflow_dispatch` + `runs-on: self-hosted` so it does not disrupt hosted-runner determinism.
2. Converting this to a required check remains blocked until repository rulesets can be applied for the private repo plan.
