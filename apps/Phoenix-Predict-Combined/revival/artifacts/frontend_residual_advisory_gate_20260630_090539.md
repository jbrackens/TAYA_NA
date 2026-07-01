# Frontend Residual Advisory Gate

- Generated: `2026-06-30T09:05:40.039Z`
- Result: **pass**
- Decision: critical advisories are forbidden; high advisories may remain only when they match the reviewed inherited Lerna residuals.

## Allowed Residual High Advisories

| Module | Advisory | Maximum rows per audit | Required version | Required patched range | Rationale |
|---|---|---:|---|---|---|
| `ip` | `GHSA-2p57-rm9w-gvfp` | 3 | `1.1.5` | `<0.0.0` | Inherited Lerna add/publish package-fetch proxy path; current advisory feed reports no patched upstream range. |
| `lodash.set` | `GHSA-p6mc-m468-83gw` | 2 | `4.3.2` | `<0.0.0` | Inherited Lerna version/publish GitHub client path; current advisory feed reports no patched upstream range. |

## Audit Results

| Scope | Critical rows | High rows | Observed high keys | Source log |
|---|---:|---:|---|---|
| Talon workspace | 0 | 5 | `ip|GHSA-2p57-rm9w-gvfp` (3), `lodash.set|GHSA-p6mc-m468-83gw` (2) | `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/revival/artifacts/talon_yarn_audit_20260630_090523.log` |
| Tiangge player app | 0 | 5 | `ip|GHSA-2p57-rm9w-gvfp` (3), `lodash.set|GHSA-p6mc-m468-83gw` (2) | `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/revival/artifacts/tiangge_player_yarn_audit_20260630_090523.log` |

## Verification

- No critical advisory rows were present in either high-threshold audit log.
- Every high advisory row matched a reviewed residual Lerna tooling path.
- No new high advisory module, advisory id, patched range, installed version, or non-Lerna path was observed.

## Notes

- This gate does not claim the residual advisories are remediated.
- A future Lerna replacement or dependency cleanup may reduce these rows; lower counts still pass.
- Any new high or critical advisory must be remediated or explicitly reviewed before this gate can pass.
