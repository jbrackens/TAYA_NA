# Frontend semver Security Remediation Artifact

Generated: 2026-06-29 09:52:42 Europe/Malta

## Scope

This artifact covers the targeted Yarn path resolutions that remove the
`semver` high advisory cluster from active Talon/Tiangge frontend audit
evidence.

## Changed Dependency Boundary

```txt
**/@commitlint/is-ignored/semver -> semver@6.3.1
**/simple-update-notifier/semver -> semver@7.7.3
```

The inherited paths remain:

```txt
@commitlint/cli -> @commitlint/lint -> @commitlint/is-ignored -> semver
@phoenix-ui/mock-server -> nodemon -> simple-update-notifier -> semver
```

## Verification Results

- `yarn why semver`: `@commitlint/is-ignored` resolves through hoisted
  `semver@6.3.1`, and `simple-update-notifier` resolves to `semver@7.7.3`.
- Direct semver smoke: passed for root `6.3.1` and
  `simple-update-notifier` `7.7.3`.
- `printf 'feat: points dependency remediation\n' | yarn commitlint`: passed.
- `nodemon` plus `simple-update-notifier` module-load smoke: passed.
- `yarn lerna changed --json`: passed and listed
  `@phoenix-ui/api-client`, `@phoenix-ui/app`, and `@phoenix-ui/office`.
- `yarn workspace @phoenix-ui/api-client build`: passed.
- `make security-deps`: passed and regenerated
  `revival/06_DEPENDENCY_VULNERABILITY_BASELINE.md`.
- Talon audit log summary: `critical 0, high 27, moderate 86, low 17`.
- Tiangge player app audit log summary:
  `critical 0, high 27, moderate 86, low 17`.
- Audit-log parser check: `0` `semver` findings in both regenerated logs.
- `make qa-preservation-modifications`: passed with `392` modified artifacts,
  `89` high-risk contract files, `35` large-change files, tracked line churn
  `+31455 / -6285`, and `0` unclassified modified artifacts.

## Remaining Risk

The dependency baseline is improved but still reports `high 27` for both Talon
and Tiangge player app scopes. Scenario 12 therefore remains Partial.
