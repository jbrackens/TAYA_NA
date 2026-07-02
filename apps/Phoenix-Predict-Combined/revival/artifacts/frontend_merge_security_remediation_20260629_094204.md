# Frontend merge Security Remediation Artifact

Generated: 2026-06-29 09:42:04 Europe/Malta

## Scope

This artifact covers the root Yarn resolution that removes the `merge` high
advisory cluster from active Talon/Tiangge frontend audit evidence.

## Changed Dependency Boundary

```txt
merge@^1.2.0 -> merge@2.1.1
```

The inherited path remains:

```txt
@phoenix-ui/utils -> watch -> exec-sh -> merge
@phoenix-ui/app -> @phoenix-ui/utils -> watch -> exec-sh -> merge
```

## Verification Results

- `yarn why merge`: resolved to `merge@2.1.1`.
- Direct `merge.recursive` smoke: passed.
- `exec-sh` module-load smoke: passed.
- `yarn workspace @phoenix-ui/api-client build`: passed.
- `yarn lerna changed --json`: passed and listed
  `@phoenix-ui/api-client`, `@phoenix-ui/app`, and `@phoenix-ui/office`.
- `make security-deps`: passed and regenerated
  `revival/06_DEPENDENCY_VULNERABILITY_BASELINE.md`.
- Talon audit log summary: `critical 0, high 31, moderate 86, low 17`.
- Tiangge player app audit log summary:
  `critical 0, high 31, moderate 86, low 17`.
- Audit-log parser check: `0` `merge` findings in both regenerated logs.
- `make qa-preservation-modifications`: passed with `392` modified artifacts,
  `89` high-risk contract files, `35` large-change files, tracked line churn
  `+31444 / -6266`, and `0` unclassified modified artifacts.

## Remaining Risk

The dependency baseline is improved but still reports `high 31` for both Talon
and Tiangge player app scopes. Scenario 12 therefore remains Partial.
