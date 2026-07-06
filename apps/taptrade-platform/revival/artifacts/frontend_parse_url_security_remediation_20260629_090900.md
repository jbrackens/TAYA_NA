# Frontend parse-url Security Remediation Artifact

Generated: 2026-06-29 09:09:00 Europe/Malta

## Scope

This artifact covers the root Yarn resolutions that clear the remaining critical
frontend audit cluster from the inherited Lerna publish/version dependency path.

## Changed Dependency Boundary

```txt
parse-url@^6.0.0 -> parse-url@8.1.0
parse-path@^7.0.0 -> parse-path@7.1.0
```

The inherited path remains:

```txt
lerna -> @lerna/version -> @lerna/github-client -> git-url-parse -> git-up -> parse-url -> parse-path
```

## Verification Results

- `yarn why parse-url`: resolved to `parse-url@8.1.0`.
- `yarn why parse-path`: resolved to `parse-path@7.1.0`.
- `yarn lerna list --all --json`: passed and listed 6 workspace packages.
- Direct CommonJS `parse-url` smoke test: passed for a GitHub URL.
- `yarn workspace @phoenix-ui/api-client build`: passed.
- `make security-deps`: passed and regenerated
  `revival/06_DEPENDENCY_VULNERABILITY_BASELINE.md`.
- Talon audit log summary: `critical 0, high 78, moderate 94, low 21`.
- Tiangge player app audit log summary:
  `critical 0, high 78, moderate 94, low 21`.
- Audit-log parser check: `0` `parse-url` and `0` `parse-path` findings in
  both regenerated logs.
- `make qa-preservation-modifications`: passed with `392` modified artifacts,
  `89` high-risk contract files, `35` large-change files, and `0`
  unclassified modified artifacts.

## Remaining Risk

The dependency baseline no longer reports critical advisories, but it still
reports `high 78` for both Talon and Tiangge player app scopes. Scenario 12
therefore remains Partial.
