# Frontend http-cache-semantics Security Remediation Artifact

Generated: 2026-06-29 09:37:16 Europe/Malta

## Scope

This artifact covers the root Yarn resolution that removes the
`http-cache-semantics` high advisory cluster from active Talon/Tiangge frontend
audit evidence.

## Changed Dependency Boundary

```txt
http-cache-semantics@^3.8.1 -> http-cache-semantics@4.2.0
```

The inherited path remains:

```txt
lerna -> @lerna/publish -> @evocateur/npm-registry-fetch -> make-fetch-happen -> http-cache-semantics
```

## Verification Results

- `yarn why http-cache-semantics`: resolved Office `got` and Lerna
  `make-fetch-happen` paths to `http-cache-semantics@4.2.0`.
- Direct `http-cache-semantics` smoke: passed.
- `make-fetch-happen` plus `@evocateur/npm-registry-fetch` module-load smoke:
  passed.
- `yarn lerna changed --json`: passed and listed
  `@phoenix-ui/api-client`, `@phoenix-ui/app`, and `@phoenix-ui/office`.
- `yarn workspace @phoenix-ui/api-client build`: passed.
- `make security-deps`: passed and regenerated
  `revival/06_DEPENDENCY_VULNERABILITY_BASELINE.md`.
- Talon audit log summary: `critical 0, high 33, moderate 86, low 17`.
- Tiangge player app audit log summary:
  `critical 0, high 33, moderate 86, low 17`.
- Audit-log parser check: `0` `http-cache-semantics` findings in both
  regenerated logs.
- `make qa-preservation-modifications`: passed with `392` modified artifacts,
  `89` high-risk contract files, `35` large-change files, tracked line churn
  `+31439 / -6262`, and `0` unclassified modified artifacts.

## Remaining Risk

The dependency baseline is improved but still reports `high 33` for both Talon
and Tiangge player app scopes. Scenario 12 therefore remains Partial.
