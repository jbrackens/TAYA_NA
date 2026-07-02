# Frontend fast-uri Security Remediation Artifact

Generated: 2026-06-29 09:57:51 Europe/Malta

## Scope

This artifact covers the targeted Yarn path resolution that removes the
`fast-uri` high advisory cluster from active Talon/Tiangge frontend audit
evidence.

## Changed Dependency Boundary

```txt
**/ajv/fast-uri -> fast-uri@3.1.2
```

The inherited path remains:

```txt
eslint -> table -> ajv -> fast-uri
```

## Verification Results

- `yarn why fast-uri`: resolved to `fast-uri@3.1.2`.
- Direct `fast-uri` parse/serialize smoke: passed.
- AJV URI-format validation smoke: passed.
- ESLint simple-file smoke: passed.
- `yarn workspace @phoenix-ui/api-client build`: passed.
- `make security-deps`: passed and regenerated
  `revival/06_DEPENDENCY_VULNERABILITY_BASELINE.md`.
- Talon audit log summary: `critical 0, high 25, moderate 86, low 17`.
- Tiangge player app audit log summary:
  `critical 0, high 25, moderate 86, low 17`.
- Audit-log parser check: `0` `fast-uri` findings in both regenerated logs.
- `make qa-preservation-modifications`: passed with `392` modified artifacts,
  `89` high-risk contract files, `36` large-change files, tracked line churn
  `+31460 / -6289`, and `0` unclassified modified artifacts.

## Remaining Risk

The dependency baseline is improved but still reports `high 25` for both Talon
and Tiangge player app scopes. Scenario 12 therefore remains Partial.
