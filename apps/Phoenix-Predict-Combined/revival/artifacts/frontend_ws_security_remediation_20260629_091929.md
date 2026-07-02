# Frontend ws Security Remediation Artifact

Generated: 2026-06-29 09:19:29 Europe/Malta

## Scope

This artifact covers the root Yarn resolution that removes the `ws` high
advisory cluster from active Talon/Tiangge frontend audit evidence.

## Changed Dependency Boundary

```txt
ws@^7.0.0 / ws@^7.3.1 -> ws@7.5.11
```

The inherited paths remain:

```txt
@phoenix-ui/mock-server -> ws
jest -> @jest/core -> jest-config -> jest-environment-jsdom -> jsdom -> ws
```

## Verification Results

- `yarn why ws`: resolved to `ws@7.5.11`.
- Direct WebSocket echo smoke: passed with message `echo:points`.
- Direct `jsdom` smoke: passed and exposed `window.WebSocket`.
- `yarn workspace @phoenix-ui/api-client build`: passed.
- `make security-deps`: passed and regenerated
  `revival/06_DEPENDENCY_VULNERABILITY_BASELINE.md`.
- Talon audit log summary: `critical 0, high 48, moderate 90, low 21`.
- Tiangge player app audit log summary:
  `critical 0, high 48, moderate 90, low 21`.
- Audit-log parser check: `0` `ws` findings in both regenerated logs.
- `make qa-preservation-modifications`: passed with `392` modified artifacts,
  `89` high-risk contract files, `35` large-change files, and `0`
  unclassified modified artifacts.

## Non-Blocking Verification Caveat

`yarn workspace @phoenix-ui/mock-server dist` was attempted but failed on an
existing `@types/express-serve-static-core` `TS1337` type-library issue. The
direct WebSocket and jsdom smokes are the accepted behavioral evidence for this
dependency change.

## Remaining Risk

The dependency baseline is improved but still reports `high 48` for both Talon
and Tiangge player app scopes. Scenario 12 therefore remains Partial.
