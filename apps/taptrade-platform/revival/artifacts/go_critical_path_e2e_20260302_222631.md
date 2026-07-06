# Go Critical Path E2E (2026-03-02)

| Check | Result | Detail |
|---|---|---|
| auth healthz | pass | `http://127.0.0.1:18081/healthz` |
| gateway healthz | pass | `http://127.0.0.1:18080/healthz` |
| auth login | pass | access token issued |
| auth session | pass | userId=`user-demo` |
| gateway fixtures | pass | fixtures=`2` |
| place bet | fail | http=307 |
