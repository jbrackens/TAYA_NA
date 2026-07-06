# Platform Health Check (2026-03-02)

| Check | URL | Result | HTTP | Sample Body |
|---|---|---|---|---|
| gateway healthz | http://127.0.0.1:18080/healthz | pass | 200 | `ok` |
| gateway readyz | http://127.0.0.1:18080/readyz | pass | 200 | `{"service":"gateway","status":"ready"}` |
| gateway status | http://127.0.0.1:18080/api/v1/status | pass | 200 | `{"service":"gateway","status":"up"}` |
| auth healthz | http://127.0.0.1:18081/healthz | pass | 200 | `ok` |
| auth readyz | http://127.0.0.1:18081/readyz | pass | 200 | `{"service":"auth","status":"ready"}` |
| auth status | http://127.0.0.1:18081/api/v1/status | pass | 200 | `{"service":"auth","status":"up"}` |
