# Release Sign-off Checklist

Date: 2026-03-03  
Repo: `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined`

## Purpose

This checklist is the mandatory sign-off sequence before release approval.

## Required Gate Sequence

1. Phase 9 launch-readiness gate
2. Phase 10 stabilization burn-in gate

Both gates must pass in the same release cycle.

## Execution Options

### Option A: CI (preferred)

Run GitHub Actions workflow:

- `.github/workflows/release-gates.yml`
- `.github/workflows/release-runtime-profile.yml` (runtime-capable runner; managed MS-008 profile path)

Expected jobs:

1. `Phase 9 Launch Readiness Gate`
2. `Phase 10 Stabilization Burn-in` (optional input can disable, but required for full sign-off)
3. `Phase 9 Runtime Profile Launch Readiness` (self-hosted workflow dispatch)
4. `Phase 10 Stabilization Burn-in (Runtime Profile Flow)` (optional input can disable, but required for full sign-off)

Required artifacts from workflow:

1. `phase9-launch-readiness`
2. `phase10-stabilization-burnin`
3. `phase9-runtime-profile-launch-readiness`
4. `phase10-runtime-profile-stabilization`

### Required Governance Setup (once per canonical remote)

Apply branch/tag rulesets so release refs enforce required checks:

```bash
scripts/release/configure-github-rulesets.sh <owner/repo>
```

Canonical remote selected:

- `jbrackens/phoenix-sportsbook-combined`
- `https://github.com/jbrackens/phoenix-sportsbook-combined`

Current status (2026-03-05):

- Ruleset apply attempted with:
  - `scripts/release/configure-github-rulesets.sh jbrackens/phoenix-sportsbook-combined`
- GitHub API response:
  - `HTTP 403: Upgrade to GitHub Pro or make this repository public to enable this feature.`
- Action required:
  - Enable private-repo rulesets (GitHub Pro) or temporarily switch repo visibility to public, then rerun the same command.
  - To require runtime-profile gate contexts after plan unblock, use:
    - `scripts/release/configure-github-rulesets.sh jbrackens/phoenix-sportsbook-combined --include-runtime-profile-checks`

### Private-Repo Fallback Governance (active while rulesets are blocked)

When private-repo rulesets are unavailable, enforce release branch/tag policy with the versioned local hook + gate bundle:

```bash
make release-install-private-governance-hooks
make release-governance-private
```

Behavior:

1. Hook: `.githooks/pre-push`
2. Trigger refs:
   - `release/*` branches
   - `release-*` tags
   - `v*` tags
3. Enforced gate bundle:
   - `verify-go`
   - `verify-talon`
   - `verify-sportsbook`
   - `release-launch-readiness`
   - `release-launch-readiness-runtime-profile`
   - `release-stability-burnin` (enabled by default)

Emergency bypass (must be documented in sign-off record):

```bash
SKIP_PRIVATE_GOVERNANCE_GUARD=1 git push origin <release-ref>
```

Expected required checks on release branches:

1. `Release Gates / Phase 9 Launch Readiness Gate`
2. `Verify Go Parity / verify-go`
3. `Verify Frontends / verify-sportsbook`
4. `Verify Frontends / verify-talon`
5. `Release Runtime Profile Gates / Phase 9 Runtime Profile Launch Readiness` (when runtime profile checks are enabled)

Expected required checks on release tags:

1. `Release Gates / Phase 9 Launch Readiness Gate`
2. `Release Runtime Profile Gates / Phase 9 Runtime Profile Launch Readiness` (when runtime profile checks are enabled)

### Option B: Local Manual Gate Run

Run from repo root:

```bash
make release-launch-readiness
make release-stability-burnin
```

To include MS-008 cross-sport runtime enforcement in local sign-off with a managed runtime profile (recommended):

```bash
make release-launch-readiness-runtime-profile
make release-stability-burnin
```

This command uses:

- profile file: `scripts/release/profiles/runtime-gate.env`
- managed stack lifecycle (start -> health wait -> runtime gate -> teardown)
- launch-readiness runtime gate enforcement (`RUN_MULTI_SPORT_RUNTIME_GATE=1`)

Optional runtime profile and gate knobs:

```bash
RUNTIME_GATE_PROFILE_FILE=scripts/release/profiles/runtime-gate.env \
RUNTIME_GATE_PICK_FREE_PORTS=1 \
MULTI_SPORT_FRONTEND_BASE_URL=http://127.0.0.1:3002 \
MULTI_SPORT_GATEWAY_BASE_URL=http://127.0.0.1:18080 \
MULTI_SPORT_ITERATIONS=5 \
MULTI_SPORT_SPORTS_CSV=mlb,nfl,nba,ufc,ncaa_baseball \
MULTI_SPORT_CHECK_ESPORTS_COMPAT=1 \
make release-launch-readiness-runtime-profile
```

Required local artifacts:

1. `revival/30_LAUNCH_READINESS_GATE.md`
2. `revival/artifacts/launch_readiness_*.md`
3. `revival/artifacts/runtime_gate_profile_*.md` (runtime-profile execution evidence)
4. `revival/31_POST_LAUNCH_STABILIZATION_BASELINE.md`
5. `revival/artifacts/stabilization_burnin_*.md`
6. `revival/artifacts/stability_metrics_*.txt`
7. (when runtime gate enabled) `revival/artifacts/launch_*_multisportruntimeregressiongate.log`

If DB migration rehearsal is intentionally de-scoped for a cycle, keep cutover default:

```bash
ENABLE_DB_MIGRATION_VALIDATION=false make release-cutover-rehearsal
```

## Go/No-Go Rules

1. Any failed gate step is a NO-GO.
2. Any non-zero failed cycle in stabilization burn-in is a NO-GO.
3. If either gate is rerun, both gates must be re-run and re-signed in sequence.
4. If runtime gate is enabled for a sign-off cycle, it becomes mandatory for that cycle; any runtime-gate failure is a NO-GO.

## Evidence Logging

For each sign-off cycle, update:

1. `revival/SPORTSBOOK_REVIVAL_PLAN.md` journal row with artifact links
2. `revival/30_LAUNCH_READINESS_GATE.md`
3. `revival/31_POST_LAUNCH_STABILIZATION_BASELINE.md`
