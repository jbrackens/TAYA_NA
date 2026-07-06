# Office Limit History Enum Contract Cleanup

- Generated: `2026-06-29T09:56:00Z`
- Scope: office user limit history type naming and source regression.
- Decision: evidence only; no scenario status is promoted by this slice.

## Change

The office limit-history type no longer exposes inherited deposit/stake-shaped
TypeScript enum member names for responsible-play history rows:

- `LimitTypeEnum.POINT_ADD_AMOUNT` preserves the inherited serialized value
  `"DEPOSIT_AMOUNT"`.
- `LimitTypeEnum.PREDICTION_POINT_AMOUNT` preserves the inherited serialized
  value `"STAKE_AMOUNT"`.
- Rendered translation values remain point-safe: `Point add amount` and
  `Prediction point amount`.

## Verification

- `yarn --cwd talon-backoffice/packages/office vitest run tests/app-router-legacy-routes.test.ts`
- Result: 22 tests passed.
- Focused source scan found no active matches for
  `LimitTypeEnum.DEPOSIT_AMOUNT`, `LimitTypeEnum.STAKE_AMOUNT`,
  `DEPOSIT_AMOUNT =`, or `STAKE_AMOUNT =` in the office type/history files.
- `git diff --check` passed.
- Trailing whitespace scan on the edited office files found no matches.
- `make qa-preservation-modifications` passed with 395 modified artifacts, 90
  high-risk contract files, 36 large-change files, tracked line churn
  `+31577 / -6396`, and zero unclassified modified artifacts. Artifact:
  `revival/artifacts/preservation_modification_map_20260629_095613.md`.
- `make qa-rc-completion-audit` still failed with scenarios 4, 6, 7, 9, 10,
  11, and 12 Partial. Artifact:
  `revival/artifacts/rc_completion_audit_gate_20260629_095753.md`.

## Scenario Impact

- Scenario 10 remains Partial.
- Scenario 11 remains Partial.
- Scenario 12 remains Partial.

This removes another launch-adjacent office deposit/stake-shaped active type
name while preserving inherited serialized history values and point-safe
rendering.
