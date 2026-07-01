# Frontend trim-newlines Security Remediation Artifact

Generated: 2026-06-29 09:31:44 Europe/Malta

## Scope

This artifact covers the root Yarn resolution that removes the `trim-newlines`
high advisory cluster from active Talon/Tiangge frontend audit evidence.

## Changed Dependency Boundary

```txt
trim-newlines@^1.0.0 / trim-newlines@^2.0.0 -> trim-newlines@3.0.1
```

The inherited paths remain:

```txt
@commitlint/cli -> meow -> trim-newlines
lerna -> @lerna/version -> conventional-changelog-* -> meow -> trim-newlines
lerna -> @lerna/version -> conventional-commits -> get-pkg-repo -> meow -> trim-newlines
```

## Verification Results

- `yarn why trim-newlines`: resolved to `trim-newlines@3.0.1`.
- Direct `trim-newlines` smoke: passed.
- `printf 'feat: points dependency remediation\n' | yarn commitlint`: passed.
- `yarn lerna changed --json`: passed and listed
  `@phoenix-ui/api-client`, `@phoenix-ui/app`, and `@phoenix-ui/office`.
- `yarn workspace @phoenix-ui/api-client build`: passed.
- `make security-deps`: passed and regenerated
  `revival/06_DEPENDENCY_VULNERABILITY_BASELINE.md`.
- Talon audit log summary: `critical 0, high 36, moderate 86, low 17`.
- Tiangge player app audit log summary:
  `critical 0, high 36, moderate 86, low 17`.
- Audit-log parser check: `0` `trim-newlines` findings in both regenerated
  logs.
- `make qa-preservation-modifications`: passed with `392` modified artifacts,
  `89` high-risk contract files, `35` large-change files, tracked line churn
  `+31437 / -6256`, and `0` unclassified modified artifacts.

## Remaining Risk

The dependency baseline is improved but still reports `high 36` for both Talon
and Tiangge player app scopes. Scenario 12 therefore remains Partial.
