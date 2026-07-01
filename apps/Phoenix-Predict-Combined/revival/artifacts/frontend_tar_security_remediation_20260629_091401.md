# Frontend tar Security Remediation Artifact

Generated: 2026-06-29 09:14:01 Europe/Malta

## Scope

This artifact covers the root Yarn resolution that removes the `tar` high
advisory cluster from inherited Talon frontend tooling paths.

## Changed Dependency Boundary

```txt
tar@^4.4.x -> tar@7.5.11
```

The inherited paths remain:

```txt
lerna -> @lerna/add -> @evocateur/pacote -> tar
lerna -> @lerna/publish -> @lerna/pack-directory -> @lerna/get-packed -> tar
lerna -> @lerna/bootstrap -> @lerna/run-lifecycle -> npm-lifecycle -> node-gyp -> tar
```

## Verification Results

- `yarn why tar`: resolved to `tar@7.5.11`.
- Direct tar create/extract smoke: passed and read back `points only`.
- Direct API check: `tar@7.5.11` exposes `c`, `create`, `extract`, `t`, and
  `x`.
- `yarn lerna run --scope @phoenix-ui/api-client build`: passed.
- `make security-deps`: passed and regenerated
  `revival/06_DEPENDENCY_VULNERABILITY_BASELINE.md`.
- Talon audit log summary: `critical 0, high 54, moderate 90, low 21`.
- Tiangge player app audit log summary:
  `critical 0, high 54, moderate 90, low 21`.
- Audit-log parser check: `0` `tar` findings in both regenerated logs.
- `make qa-preservation-modifications`: passed with `392` modified artifacts,
  `89` high-risk contract files, `35` large-change files, and `0`
  unclassified modified artifacts.

## Remaining Risk

The dependency baseline is improved but still reports `high 54` for both Talon
and Tiangge player app scopes. Scenario 12 therefore remains Partial.
