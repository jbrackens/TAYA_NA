# Office Limit History Translation-Key Cleanup

- Generated: `2026-06-29T10:01:00Z`
- Scope: office user limit-history rendering and source regression.
- Decision: evidence only; no scenario status is promoted by this slice.

## Change

The office limit-history table no longer translates inherited backend history
values directly as launch-facing translation keys:

- `DEPOSIT_AMOUNT` now maps through `limitTypeTranslationKey` to
  `LIMIT_TYPE_POINT_ADD_AMOUNT`.
- `STAKE_AMOUNT` now maps through `limitTypeTranslationKey` to
  `LIMIT_TYPE_PREDICTION_POINT_AMOUNT`.
- Rendered labels remain point-safe: `Point add amount` and
  `Prediction point amount`.
- The inherited serialized history values remain preserved in
  `LimitTypeEnum.POINT_ADD_AMOUNT = "DEPOSIT_AMOUNT"` and
  `LimitTypeEnum.PREDICTION_POINT_AMOUNT = "STAKE_AMOUNT"`.

## Verification

- `yarn --cwd talon-backoffice/packages/office vitest run tests/app-router-legacy-routes.test.ts`
- Result: 22 tests passed.
- Focused source scan found no active matches for direct inherited translation
  keys or enum members: `DEPOSIT_AMOUNT: "Point add amount"`,
  `STAKE_AMOUNT: "Prediction point amount"`,
  `page-users-details:${limitType}`, `LimitTypeEnum.DEPOSIT_AMOUNT`,
  `LimitTypeEnum.STAKE_AMOUNT`, `DEPOSIT_AMOUNT =`, or `STAKE_AMOUNT =`.
- `git diff --check` passed.
- Trailing whitespace scan on the edited office files found no matches.
- `make qa-preservation-modifications` passed with 396 modified artifacts, 90
  high-risk contract files, 36 large-change files, tracked line churn
  `+31606 / -6397`, and zero unclassified modified artifacts. Artifact:
  `revival/artifacts/preservation_modification_map_20260629_100105.md`.
- `make qa-rc-completion-audit` still failed with scenarios 4, 6, 7, 9, 10,
  11, and 12 Partial. Artifact:
  `revival/artifacts/rc_completion_audit_gate_20260629_100426.md`.

## Scenario Impact

- Scenario 10 remains Partial.
- Scenario 11 remains Partial.
- Scenario 12 remains Partial.

This removes another launch-adjacent office display-key dependency on inherited
deposit/stake wording while preserving inherited serialized history values and
point-safe rendering.
