# Launch Readiness Preservation Gates

- Date: 2026-06-29
- Scope: release governance, inherited-artifact preservation review
- Scenarios: 10, 11, 12 remain Partial

## Summary

Launch readiness now runs the three preservation gates before the platform and
journey checks:

- `make qa-preservation-deletions`
- `make qa-preservation-modifications`
- `make qa-preservation-contract-anchors`

This makes deleted inherited artifacts, broad modified artifacts, and public
contract-anchor removals mandatory release-signoff checks rather than only
pre-commit checks.

## Preservation Boundary

This change does not rewrite product logic, restore deleted money-path files,
or mark the inherited contracts as fully preserved. It strengthens the review
path so the current broad Tiangge migration cannot reach launch readiness while
those preservation checks are skipped.

## Verification

- `bash -n scripts/release/launch-readiness-gate.sh` passed.
- `make qa-preservation-deletions` passed with 54 classified deleted artifacts
  and zero unclassified deleted paths. Artifact:
  `revival/artifacts/preservation_deletion_map_20260629_161826.md`.
- `make qa-preservation-contract-anchors` passed with no unexpected removed
  public anchors. Artifact:
  `revival/artifacts/preservation_contract_anchors_20260629_161826.md`.
- `make qa-preservation-modifications` passed with 410 classified modified
  artifacts, 90 high-risk contract files, 36 large-change files, tracked line
  churn `+31948 / -6624`, and zero unclassified modified paths. Artifact:
  `revival/artifacts/preservation_modification_map_20260629_161836.md`.
- `git diff --check` passed.
- `make qa-rc-completion-audit` failed as intended with scenarios 4, 6, 7, 9,
  10, 11, and 12 still Partial. Artifact:
  `revival/artifacts/rc_completion_audit_gate_20260629_161854.md`.

## Remaining Risk

The preservation gates classify and compare the current diff; they do not prove
every inherited business rule, operational workflow, or internal compatibility
contract remains behaviorally equivalent. High-risk modified files and deleted
operational tools still need reviewable replacement evidence before RC.
