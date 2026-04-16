# Go Critical Path E2E (2026-03-03)

| Check | Result | Detail |
|---|---|---|
| auth healthz | pass | `http://127.0.0.1:18081/healthz` |
| gateway healthz | pass | `http://127.0.0.1:18080/healthz` |
| auth login | fail | missing access token |
