# JVM Dependency Baseline (SBT)

Date (UTC): 2026-03-02T20:33:15Z

## Scope
- Backend: `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-backend`
- Command: `sbt -batch -v -Dsbt.log.noformat=true -Dsbt.color=false -Dsbt.supershell=false "phoenix-backend/update" "phoenix-backend/evicted"`

## Result
- Status: **failed**
- Summary: SBT launcher exited before build bootstrap logs were emitted.
- Blocker: sbt_launcher_exit_no_output
- Exit code: 2

## Artifact
- `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/backend_sbt_update_2026-03-02.log`

## Notes
- This baseline does not yet include CVE resolution; it captures dependency graph/eviction visibility for follow-up SCA gating.
- If failure is network related, rerun once connectivity to artifact repositories is available.
