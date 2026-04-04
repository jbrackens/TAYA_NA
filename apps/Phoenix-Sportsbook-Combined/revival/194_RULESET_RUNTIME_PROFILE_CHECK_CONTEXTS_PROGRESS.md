# Ruleset Runtime-Profile Check Contexts Progress

Date: 2026-03-06  
Scope: Extend ruleset automation so runtime-profile workflow checks can be promoted to required status as soon as private-repo rulesets become available.

## Delivered

1. Extended `scripts/release/configure-github-rulesets.sh` with:
   - `--include-runtime-profile-checks`
2. When enabled, branch/tag rulesets now include:
   - `Release Runtime Profile Gates / Phase 9 Runtime Profile Launch Readiness`
3. Updated release sign-off governance docs with the exact post-unblock command to apply runtime-profile required checks.
4. Updated ruleset automation progress docs to include the new flag path.

## Files Changed

1. `scripts/release/configure-github-rulesets.sh`
2. `revival/33_RELEASE_SIGNOFF_CHECKLIST.md`
3. `revival/167_GITHUB_RULESET_AUTOMATION_PROGRESS.md`

## Validation

1. Script syntax:

```bash
bash -n scripts/release/configure-github-rulesets.sh
```

2. Dry-run payload rendering with runtime checks:

```bash
scripts/release/configure-github-rulesets.sh octo/example --dry-run --include-runtime-profile-checks
```

Result: pass.

## Notes

1. Enforcement remains blocked until private-repo ruleset feature access is available.
2. Once unblocked, runtime-profile check contexts can be promoted in the same ruleset apply command.
