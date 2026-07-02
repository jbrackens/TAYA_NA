# Frontend Residual Security Advisories

Date: 2026-06-29

## Summary

Loop 375 reviewed the remaining high-severity frontend advisory clusters after
the targeted `braces` remediation. The active Yarn audit baseline now has no
critical findings and five remaining high findings, all from old Lerna
toolchain transitive paths.

The remaining high clusters are:

- `ip`: 3 findings.
- `lodash.set`: 2 findings.

Both advisory families report `patched_versions: <0.0.0` in the current Yarn
audit payload, so there is no patched package version available to target with a
preservation-safe Yarn resolution.

## Residual Advisory Details

### `ip`

- Advisory: `GHSA-2p57-rm9w-gvfp`
- Title: `ip SSRF improper categorization in isPublic`
- Reported vulnerable range: `<=2.0.1`
- Reported patched range: `<0.0.0`
- Installed version: `1.1.5`
- Findings: 3

Observed paths:

- `lerna > @lerna/publish > @evocateur/npm-registry-fetch > make-fetch-happen > socks-proxy-agent > socks > ip`
- `lerna > @lerna/add > @evocateur/pacote > @evocateur/npm-registry-fetch > make-fetch-happen > socks-proxy-agent > socks > ip`
- `lerna > @lerna/publish > @lerna/npm-publish > @evocateur/libnpmpublish > @evocateur/npm-registry-fetch > make-fetch-happen > socks-proxy-agent > socks > ip`

### `lodash.set`

- Advisory: `GHSA-p6mc-m468-83gw`
- Title: `Prototype Pollution in lodash`
- Reported vulnerable range: `>=3.7.0 <=4.3.2`
- Reported patched range: `<0.0.0`
- Installed version: `4.3.2`
- Findings: 2

Observed paths:

- `lerna > @lerna/version > @lerna/github-client > @octokit/rest > lodash.set`
- `lerna > @lerna/publish > @lerna/version > @lerna/github-client > @octokit/rest > lodash.set`

## Preservation Decision

No package override was applied in this loop.

Reasons:

- The advisory payload explicitly reports no patched upstream package range for
  either residual cluster.
- `ip@2.0.1` remains inside the vulnerable range, so forcing `ip` to the latest
  published package version would not remove the advisory.
- `lodash.set` is a single-purpose package whose current published line is the
  vulnerable line reported by the advisory feed. Replacing it with the full
  `lodash` package would change the CommonJS export shape expected by inherited
  `@octokit/rest` code.
- Both clusters are confined to Lerna add/version/publish toolchain paths, not
  launch runtime player, office, gateway, or points-economy code paths.
- A broad Lerna major-version migration would be a separate preservation-risk
  slice because this repository still relies on inherited Lerna workspace
  behavior.

## Verification

- Parsed `revival/artifacts/talon_yarn_audit_2026-03-02.log`:
  `critical 0, high 5, moderate 0, low 0; 2 unique advisory ids`, modules
  `ip: 3`, `lodash.set: 2`.
- Parsed `revival/artifacts/tiangge_player_yarn_audit_2026-03-02.log`:
  `critical 0, high 5, moderate 0, low 0; 2 unique advisory ids`, modules
  `ip: 3`, `lodash.set: 2`.
- `yarn why ip` confirmed the remaining `ip@1.1.5` path is through
  `lerna > @lerna/publish > ... > socks > ip`.
- `yarn why lodash.set` confirmed the remaining `lodash.set@4.3.2` path is
  through `lerna > @lerna/version > @lerna/github-client > @octokit/rest`.
- `git diff --check`: passed.
- Trailing-whitespace scan across updated mission docs and frontend remediation
  reports: passed.

## Result

Scenario 12 remains Partial. The frontend residual high advisories are now
explicitly reviewed and scoped, but they are not remediated because the current
advisory feed provides no patched upstream range. The remaining release-candidate
work is to decide whether to replace the inherited Lerna toolchain in a
dedicated preservation-risk slice, complete backend JVM SCA with Java/SBT or a
dedicated SCA tool available, and finish the final preservation/RC audit.
