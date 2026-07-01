# Frontend tmp Security Remediation

Date: 2026-06-29

## Summary

Loop 372 removed the high-severity `tmp` advisory cluster from the active
frontend dependency baseline while preserving the inherited Lerna workspace and
prompt tooling path.

The vulnerable path was limited to developer/release tooling:

- `lerna > @lerna/clean > @lerna/prompt > inquirer > external-editor > tmp`
- `lerna > @lerna/publish > @lerna/otplease > @lerna/prompt > inquirer > external-editor > tmp`
- `lerna > @lerna/publish > @lerna/npm-dist-tag > @lerna/otplease > @lerna/prompt > inquirer > external-editor > tmp`

## Change

- Added a targeted Talon workspace Yarn resolution:
  `**/external-editor/tmp: 0.2.7`.
- Regenerated `talon-backoffice/yarn.lock`.
- The first candidate, `tmp@0.2.6`, was rejected after the current advisory
  database reported it as vulnerable to CVE-2026-49982. The accepted patch is
  `tmp@0.2.7`.

## Verification

- `npm view tmp@0.2.7 version main engines dependencies --json`: published,
  main `lib/tmp.js`, Node engine `>=14.14`, no dependencies.
- `yarn install --ignore-engines`: passed.
- `yarn why tmp`: inherited Lerna prompt path now resolves to `tmp@0.2.7`.
- Direct `tmp.file` smoke: created and cleaned up a temporary file using
  `tmp@0.2.7`.
- `external-editor` module-load smoke: passed with expected exported API keys.
- `yarn lerna list --all --json`: passed and found all six inherited workspace
  packages.
- `yarn workspace @phoenix-ui/api-client build`: passed.
- `make security-deps`: passed and regenerated the official dependency
  baseline.
- `make qa-preservation-modifications`: passed with 392 modified artifacts, 89
  high-risk contract files, 36 large-change files, tracked line churn
  `+31466 / -6296`, and zero unclassified modified artifacts.

## Result

The official dependency baseline now reports, for both Talon and Tiangge player
app scopes:

- `critical 0`
- `high 22`
- `moderate 86`
- `low 14`
- `4 unique advisory ids`

Both regenerated audit logs have zero `tmp` findings.

Remaining high clusters after this loop:

- `braces`: 12 findings
- `lodash`: 5 findings
- `ip`: 3 findings
- `lodash.set`: 2 findings

Scenario 12 remains Partial because high advisories remain, backend JVM SCA
evidence is still missing, complete preservation review is still required, and
the final RC audit remains incomplete.
