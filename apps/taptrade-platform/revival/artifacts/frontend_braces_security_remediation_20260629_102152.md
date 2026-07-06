# Frontend braces Security Remediation

Date: 2026-06-29

## Summary

Loop 374 removed the high-severity `braces` advisory cluster from the active
frontend dependency baseline while preserving inherited Jest/sane and
Lerna/globby/fast-glob tooling paths.

The vulnerable paths were:

- `jest > @jest/core > jest-haste-map > sane > micromatch > braces`
- `jest > ... > sane > anymatch > micromatch > braces`
- `lerna > @lerna/create > globby > fast-glob > micromatch > braces`
- `lerna > @lerna/bootstrap > @lerna/command > @lerna/project > globby > fast-glob > micromatch > braces`
- `lerna > @lerna/add > @lerna/bootstrap > @lerna/command > @lerna/project > globby > fast-glob > micromatch > braces`

## Change

- Added a targeted Talon workspace Yarn resolution:
  `**/micromatch/braces: 3.0.3`.
- Regenerated `talon-backoffice/yarn.lock`.
- This is a major-version override for older micromatch callers, so the loop
  accepted it only after direct glob, Lerna, player test, and API-client checks
  passed.

## Verification

- `npm view braces version --json`: `3.0.3`.
- `npm view braces@3.0.3 version main engines dependencies --json`: published,
  Node engine `>=8`, dependency `fill-range@^7.1.1`.
- `yarn install --ignore-engines`: passed with the expected compatibility
  warning for older `braces@^2.3.1` requests.
- `yarn why braces`: all reported micromatch/Jest/Lerna paths now resolve to
  `braces@3.0.3`.
- Direct `braces.expand` smoke passed.
- `micromatch` include/exclude smoke passed.
- `fast-glob` and `globby` workspace page-file discovery smokes passed.
- `yarn lerna list --all --json`: passed and found all six inherited workspace
  packages.
- `yarn test app/__tests__/market-subcategories.test.ts` from
  `packages/app`: passed 268 player-app tests through the supported `tsx`
  runner. An earlier direct `yarn jest ...` attempt was rejected as evidence
  because these player tests use `node:test`/ESM and are not run through root
  Jest.
- `yarn workspace @phoenix-ui/api-client build`: passed.
- `yarn workspace @phoenix-ui/api-client test`: passed with no tests found and
  exit code 0.
- `make security-deps`: passed and regenerated the official dependency
  baseline.
- `make qa-preservation-modifications`: passed with 392 modified artifacts, 89
  high-risk contract files, 36 large-change files, tracked line churn
  `+31472 / -6370`, and zero unclassified modified artifacts.

## Result

The official dependency baseline now reports, for both Talon and Tiangge player
app scopes:

- `critical 0`
- `high 5`
- `moderate 76`
- `low 14`
- `2 unique advisory ids`

Both regenerated audit logs have zero `braces` findings.

Remaining high clusters after this loop:

- `ip`: 3 findings
- `lodash.set`: 2 findings

Scenario 12 remains Partial because high advisories remain, backend JVM SCA
evidence is still missing, complete preservation review is still required, and
the final RC audit remains incomplete.
