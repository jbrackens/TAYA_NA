# Private Repo Governance Fallback Progress

Date: 2026-03-06  
Owner: Codex

## Scope

Close the remaining release-governance blockers caused by GitHub private-repo ruleset plan gating by introducing an enforceable private fallback path that keeps release branch/tag checks mandatory in local/operator workflows.

## Delivered

1. Added private governance gate bundle script:
   - `scripts/release/private-governance-enforce.sh`
   - Runs mandatory checks and writes checklist artifact:
     1. `make verify-go`
     2. `make verify-talon`
     3. `make verify-sportsbook`
     4. `make release-launch-readiness`
     5. `make release-launch-readiness-runtime-profile` (runtime-profile gate is mandatory)
     6. `make release-stability-burnin` (default enabled; configurable via `RUN_STABILIZATION_BURNIN`)
2. Added hook installation helper:
   - `scripts/release/install-private-governance-hooks.sh`
3. Added versioned pre-push enforcement hook:
   - `.githooks/pre-push`
   - Triggers governance gate automatically when pushing:
     - `refs/heads/release/*`
     - `refs/tags/release-*`
     - `refs/tags/v*`
4. Added make targets:
   - `make release-governance-private`
   - `make release-install-private-governance-hooks`
5. Hardened ruleset automation error handling:
   - `scripts/release/configure-github-rulesets.sh` now probes feature access first and reports explicit private-plan block guidance plus fallback commands, avoiding opaque follow-on jq failures.

## Validation

```bash
bash -n scripts/release/private-governance-enforce.sh
bash -n scripts/release/install-private-governance-hooks.sh
bash -n scripts/release/configure-github-rulesets.sh
make -n release-governance-private
make -n release-install-private-governance-hooks
```

Result: pass.

## Operator Usage

1. Install the release-ref hook once per clone:

```bash
make release-install-private-governance-hooks
```

2. Run governance gate explicitly (or let hook enforce on release-ref pushes):

```bash
make release-governance-private
```

3. Emergency bypass (must be documented in release sign-off):

```bash
SKIP_PRIVATE_GOVERNANCE_GUARD=1 git push origin release/<name>
```

## Outcome

Private-repo governance is now operational without GitHub Pro rulesets, and runtime-profile gate enforcement is included in the mandatory fallback path for release refs.
