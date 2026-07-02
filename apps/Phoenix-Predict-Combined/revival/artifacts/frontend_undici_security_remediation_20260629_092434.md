# Frontend undici Security Remediation Artifact

Generated: 2026-06-29 09:24:34 Europe/Malta

## Scope

This artifact covers the root Yarn resolution that removes the `undici` high
advisory cluster from active Talon/Tiangge frontend audit evidence.

## Changed Dependency Boundary

```txt
undici@^7.19.0 / undici@^7.21.0 / undici@^7.25.0 -> undici@7.28.0
```

The inherited paths remain:

```txt
enzyme -> cheerio -> undici
@phoenix-ui/office -> jsdom -> undici
@phoenix-ui/app -> isomorphic-dompurify -> jsdom -> undici
```

## Verification Results

- `yarn why undici`: resolved to `undici@7.28.0`.
- Direct jsdom + cheerio + undici MockAgent smoke: passed.
- `yarn workspace @phoenix-ui/api-client build`: passed.
- `make security-deps`: passed and regenerated
  `revival/06_DEPENDENCY_VULNERABILITY_BASELINE.md`.
- Talon audit log summary: `critical 0, high 42, moderate 86, low 17`.
- Tiangge player app audit log summary:
  `critical 0, high 42, moderate 86, low 17`.
- Audit-log parser check: `0` `undici` findings in both regenerated logs.
- `make qa-preservation-modifications`: passed with `392` modified artifacts,
  `89` high-risk contract files, `35` large-change files, and `0`
  unclassified modified artifacts.

## Remaining Risk

The dependency baseline is improved but still reports `high 42` for both Talon
and Tiangge player app scopes. Scenario 12 therefore remains Partial.
