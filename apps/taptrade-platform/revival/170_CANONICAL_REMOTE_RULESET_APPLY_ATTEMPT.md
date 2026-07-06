# 170 - Canonical Remote Ruleset Apply Attempt

Date: 2026-03-05  
Owner: Codex

## Scope
Execute the Section 13 mandatory governance step on the canonical GitHub remote.

## Actions Performed

1. Created canonical repository:
   - `gh repo create jbrackens/phoenix-sportsbook-combined --private --description "Phoenix Sportsbook Combined canonical remote" --confirm`
2. Verified access/ownership:
   - `gh repo view jbrackens/phoenix-sportsbook-combined --json nameWithOwner,url,defaultBranchRef,viewerPermission`
   - `viewerPermission: ADMIN`
3. Attempted ruleset apply:
   - `scripts/release/configure-github-rulesets.sh jbrackens/phoenix-sportsbook-combined`

## Result

- Repository creation: **pass**
- Ruleset apply: **blocked**
- Blocking error:
  - `HTTP 403: Upgrade to GitHub Pro or make this repository public to enable this feature.`

## Impact

Mandatory release branch/tag ruleset enforcement cannot be applied yet on the private canonical remote.

## Required Next Step

Either:

1. Upgrade account plan to enable private-repo rulesets, then rerun:
   - `scripts/release/configure-github-rulesets.sh jbrackens/phoenix-sportsbook-combined`
2. Temporarily make the repository public, rerun the same command, then reassess visibility policy.

## Interim Enforcement (2026-03-06)

Until native ruleset APIs are available, release governance is enforced through the private fallback path:

1. `make release-install-private-governance-hooks`
2. `make release-governance-private`

See: `revival/199_PRIVATE_REPO_GOVERNANCE_FALLBACK_PROGRESS.md`.
