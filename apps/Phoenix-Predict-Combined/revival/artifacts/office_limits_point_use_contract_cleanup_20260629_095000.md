# Office Limits Point-Use Contract Cleanup

- Generated: `2026-06-29T09:50:00Z`
- Scope: office user limit editor naming and source regression.
- Decision: evidence only; no scenario status is promoted by this slice.

## Change

The active office user limit editor no longer models the point-use section with
stake/loss-shaped UI/form state names:

- `EditableLimitSection` continues to use `pointUse`.
- The form field is now `pointUse` instead of `losses`.
- The translation key is now `HEADER_CARD_LIMITS_POINT_USE`.
- The enum member is now `TalonPunterLimitsTypesEnum.POINT_USE`, preserving the
  inherited serialized API value `"stake"` for compatibility.

## Verification

- `yarn --cwd talon-backoffice/packages/office vitest run tests/app-router-legacy-routes.test.ts`
- Result: 22 tests passed.
- Focused source scan found no active matches for `values.losses`,
  `field="losses"`, `HEADER_CARD_LIMITS_LOSS`,
  `TalonPunterLimitsTypesEnum.STAKE`, or `STAKE =` in the edited office limit
  files.
- `git diff --check` passed.
- Trailing whitespace scan on the edited office files found no matches.
- `make qa-preservation-modifications` passed with 395 modified artifacts, 90
  high-risk contract files, 36 large-change files, tracked line churn
  `+31567 / -6392`, and zero unclassified modified artifacts. Artifact:
  `revival/artifacts/preservation_modification_map_20260629_095303.md`.
- `make qa-rc-completion-audit` still failed with scenarios 4, 6, 7, 9, 10,
  11, and 12 Partial. Artifact:
  `revival/artifacts/rc_completion_audit_gate_20260629_095321.md`.

## Scenario Impact

- Scenario 10 remains Partial.
- Scenario 11 remains Partial.
- Scenario 12 remains Partial.

This removes another launch-adjacent office stake/loss-shaped active naming path
without changing the inherited serialized API key or backend compatibility
contract.
