# Frontend dot-prop Security Remediation Artifact

Generated: 2026-06-29 09:47:16 Europe/Malta

## Scope

This artifact covers the targeted Yarn path resolutions that remove the
`dot-prop` high advisory cluster from active Talon/Tiangge frontend audit
evidence.

## Changed Dependency Boundary

```txt
@commitlint/cli/**/dot-prop -> dot-prop@4.2.1
@commitlint/config-conventional/**/dot-prop -> dot-prop@4.2.1
```

The inherited vulnerable paths remain as tooling paths but now resolve to a
patched implementation:

```txt
@commitlint/config-conventional -> conventional-changelog-conventionalcommits -> compare-func -> dot-prop
@commitlint/cli -> @commitlint/lint -> @commitlint/parse -> conventional-changelog-angular -> compare-func -> dot-prop
```

Existing safe Lerna conventional-changelog callers remain on `dot-prop@5.3.0`.

## Verification Results

- `yarn why dot-prop`: vulnerable `3.0.0` caller moved to `dot-prop@4.2.1`;
  safe Lerna `dot-prop@5.3.0` callers preserved.
- Direct `dot-prop` get/set/has smoke: passed.
- `printf 'feat: points dependency remediation\n' | yarn commitlint`: passed.
- `yarn lerna changed --json`: passed and listed
  `@phoenix-ui/api-client`, `@phoenix-ui/app`, and `@phoenix-ui/office`.
- `yarn workspace @phoenix-ui/api-client build`: passed.
- `make security-deps`: passed and regenerated
  `revival/06_DEPENDENCY_VULNERABILITY_BASELINE.md`.
- Talon audit log summary: `critical 0, high 29, moderate 86, low 17`.
- Tiangge player app audit log summary:
  `critical 0, high 29, moderate 86, low 17`.
- Audit-log parser check: `0` `dot-prop` findings in both regenerated logs.
- `make qa-preservation-modifications`: passed with `392` modified artifacts,
  `89` high-risk contract files, `35` large-change files, tracked line churn
  `+31447 / -6274`, and `0` unclassified modified artifacts.

## Remaining Risk

The dependency baseline is improved but still reports `high 29` for both Talon
and Tiangge player app scopes. Scenario 12 therefore remains Partial.
