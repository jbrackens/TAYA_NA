# 167 - GitHub Branch/Tag Ruleset Automation

Date: 2026-03-05  
Owner: Codex

## Scope
Automated one-time canonical-remote ruleset setup required by Section 13 for release governance.

## Implementation

Added:
- `scripts/release/configure-github-rulesets.sh`

Updated:
- `revival/33_RELEASE_SIGNOFF_CHECKLIST.md`
- `revival/32_PHASE_9_TO_10_COMPLETION_CHECKPOINT.md`

### Script behavior
`configure-github-rulesets.sh <owner/repo>` upserts:
1. `Phoenix Release Branch Gates` (target: branch, pattern `refs/heads/release/*`)
2. `Phoenix Release Tag Gates` (target: tag, patterns `refs/tags/release-*`, `refs/tags/v*`)

Required status checks enforced by payload:
- `Release Gates / Phase 9 Launch Readiness Gate`
- `Verify Go Parity / verify-go`
- `Verify Frontends / verify-sportsbook`
- `Verify Frontends / verify-talon`

Tag ruleset enforces release gate check:
- `Release Gates / Phase 9 Launch Readiness Gate`

Optional runtime-profile enforcement:
- Add `--include-runtime-profile-checks` to also require:
  - `Release Runtime Profile Gates / Phase 9 Runtime Profile Launch Readiness`
  - (applies to both branch and tag rulesets)

### Validation
- `bash -n scripts/release/configure-github-rulesets.sh`
- `scripts/release/configure-github-rulesets.sh octo/example --dry-run`

Result: pass (dry-run payloads render expected rules).

## Outcome
Branch/tag governance is now scriptable and repeatable; applying to the canonical remote only requires repo-admin execution with the real `<owner/repo>` slug.

## Canonical Remote Attempt (2026-03-05)

Canonical remote selected:
- `jbrackens/phoenix-sportsbook-combined`
- `https://github.com/jbrackens/phoenix-sportsbook-combined`

Execution:
- `scripts/release/configure-github-rulesets.sh jbrackens/phoenix-sportsbook-combined`

Result:
- Blocked by GitHub feature gating on private repositories:
  - `HTTP 403: Upgrade to GitHub Pro or make this repository public to enable this feature.`

Next action:
- Enable private-repo rulesets (GitHub Pro) or temporarily switch repo visibility to public, then rerun:
  - `scripts/release/configure-github-rulesets.sh jbrackens/phoenix-sportsbook-combined --include-runtime-profile-checks`

## Private Fallback (2026-03-06)

Because private-repo rulesets remain plan-gated, governance now has an explicit fallback path:

1. Install hooks:
   - `make release-install-private-governance-hooks`
2. Enforce release gate bundle:
   - `make release-governance-private`

Implemented assets:

1. `.githooks/pre-push`
2. `scripts/release/private-governance-enforce.sh`
3. `scripts/release/install-private-governance-hooks.sh`

This fallback enforces runtime-profile launch-readiness in the mandatory release gate bundle until ruleset APIs are available.
