# Frontend lodash Security Remediation

Date: 2026-06-29

## Summary

Loop 373 removed the high-severity `lodash` advisory cluster from the active
frontend dependency baseline while preserving the inherited commitlint tooling
path.

The vulnerable path was limited to commitlint developer/release tooling:

- `@commitlint/cli > lodash`
- `@commitlint/cli > @commitlint/lint > lodash`
- `@commitlint/cli > @commitlint/lint > @commitlint/rules > @commitlint/ensure > lodash`
- `@commitlint/cli > @commitlint/load > lodash`
- `@commitlint/cli > @commitlint/load > @commitlint/resolve-extends > lodash`

## Change

- Added a targeted Talon workspace Yarn resolution:
  `@commitlint/cli/**/lodash: 4.18.1`.
- Regenerated `talon-backoffice/yarn.lock`.
- The current registry reports `lodash@4.18.1` as latest and the active audit
  advisory marks `>=4.18.0` as patched.

## Verification

- `npm view lodash version --json`: `4.18.1`.
- `npm view lodash@4.18.0 version main engines dependencies --json`: published.
- `yarn install --ignore-engines`: passed.
- `yarn why lodash`: commitlint lodash paths now resolve through hoisted
  `lodash@4.18.1`.
- Direct lodash `camelCase` and `template` smoke passed on `4.18.1`.
- `printf 'chore: lodash security remediation\n' | yarn commitlint`: passed.
- `yarn lerna list --all --json`: passed and found all six inherited workspace
  packages.
- `yarn workspace @phoenix-ui/api-client build`: passed.
- `make security-deps`: passed and regenerated the official dependency
  baseline.
- `make qa-preservation-modifications`: passed with 392 modified artifacts, 89
  high-risk contract files, 36 large-change files, tracked line churn
  `+31468 / -6302`, and zero unclassified modified artifacts.

## Result

The official dependency baseline now reports, for both Talon and Tiangge player
app scopes:

- `critical 0`
- `high 17`
- `moderate 76`
- `low 14`
- `3 unique advisory ids`

Both regenerated audit logs have zero `lodash` findings.

Remaining high clusters after this loop:

- `braces`: 12 findings
- `ip`: 3 findings
- `lodash.set`: 2 findings

Scenario 12 remains Partial because high advisories remain, backend JVM SCA
evidence is still missing, complete preservation review is still required, and
the final RC audit remains incomplete.
