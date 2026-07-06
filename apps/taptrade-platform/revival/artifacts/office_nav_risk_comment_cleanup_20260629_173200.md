# Office Navigation and Risk Comment Cleanup Artifact

- Generated: 2026-06-29 17:32:00 Europe/Malta
- Loop: 394
- Primary report: `revival/78_OFFICE_NAV_RISK_COMMENT_CLEANUP.md`

## Changed Files

- `talon-backoffice/packages/office/providers/menu/structure.ts`
- `talon-backoffice/packages/office/providers/menu/defaults.ts`
- `talon-backoffice/packages/office/app/(dashboard)/prediction-admin/risk/page.tsx`
- `talon-backoffice/packages/office/next.config.js`
- `talon-backoffice/packages/office/tests/app-router-legacy-routes.test.ts`
- `scripts/qa/preservation-modification-gate.sh`

## Evidence

- Active Office navigation and risk comments now use retired pre-Tiangge or
  legacy compatibility wording instead of inherited sportsbook-era wording.
- The Office regression now scans the active navigation/risk source files for
  the retired comment phrases.
- The preservation modification gate classifies Office provider/config files
  as Office admin and operations surfaces.

## Verification

- `yarn --cwd talon-backoffice/packages/office vitest run tests/app-router-legacy-routes.test.ts`
  passed with 25 tests.
- Focused source scan returned no matches for `sportsbook`, `freebet`,
  `odds-boost`, `bet/stake`, or `fixture exposure` in the touched active
  Office navigation/risk files.
- `make qa-preservation-modifications` passed and wrote
  `revival/artifacts/preservation_modification_map_20260629_153140.md`.
- `make qa-rc-completion-audit` failed as intended and wrote
  `revival/artifacts/rc_completion_audit_gate_20260629_153140.md`.
