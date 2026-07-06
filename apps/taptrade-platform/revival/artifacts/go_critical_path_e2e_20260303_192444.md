# Go Critical Path E2E (2026-03-03)

| Check | Result | Detail |
|---|---|---|
| auth healthz | pass | `http://127.0.0.1:18088/healthz` |
| gateway healthz | pass | `http://127.0.0.1:18089/healthz` |
| auth login | pass | access token issued |
| auth session | pass | userId=`user-demo` |
| gateway fixtures | pass | fixtures=`2` |
| place bet | pass | betId=`b:local:000020` |
| settle bet | pass | status=`settled_won` |
| audit logs | pass | entries=`20` |
| wallet reconciliation | pass | entryCount=`38` |
