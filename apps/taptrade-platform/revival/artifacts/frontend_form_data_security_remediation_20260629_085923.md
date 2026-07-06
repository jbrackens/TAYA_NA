# Frontend form-data Security Remediation Artifact

Generated: 2026-06-29 08:59:23 Europe/Malta

## Scope

This artifact covers the Talon workspace dependency-resolution change that
removes the `form-data` high/critical advisory cluster from the active launch
frontend audit evidence.

## Changed Dependency Boundary

```txt
form-data@~2.3.2 -> form-data@2.5.6
```

The inherited path remains:

```txt
jest -> @jest/core -> jest-config -> jest-environment-jsdom -> jsdom -> request -> form-data
```

## Verification Results

- `yarn why form-data`: resolved to `form-data@2.5.6`; the warning about the
  resolution being incompatible with requested `~2.3.2` is expected because this
  is a root security resolution.
- `make security-deps`: passed and regenerated
  `revival/06_DEPENDENCY_VULNERABILITY_BASELINE.md`.
- Talon audit log summary: `critical 2, high 80, moderate 98, low 21`.
- Tiangge player app audit log summary:
  `critical 2, high 80, moderate 98, low 21`.
- Audit-log parser check: `0` `form-data` findings in both regenerated logs.
- Lockfile check: `form-data@2.5.6, form-data@~2.3.2` is present.
- `yarn workspace @phoenix-ui/api-client build`: passed.
- `make qa-preservation-modifications`: passed with `392` modified artifacts,
  `89` high-risk contract files, `35` large-change files, and `0`
  unclassified modified artifacts.

## Remaining Risk

The dependency baseline is improved but not clean. It still reports `critical 2`
and `high 80` for both Talon and Tiangge player app scopes, so Scenario 12 must
remain Partial.
