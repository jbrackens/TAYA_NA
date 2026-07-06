# Go Platform Scaffold (B011)

Date: 2026-03-02

## Objective
Create the first runnable Go workspace to start the backend migration off Scala/Akka.

## Delivered Structure
- `go-platform/go.work`
- `go-platform/modules/platform`
  - shared runtime config and HTTP server primitives
- `go-platform/services/gateway`
  - starter service with `/healthz` and `/readyz`
- `go-platform/services/auth`
  - starter service with `/healthz` and `/readyz`

## Validation
```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined
make go-test
```

## Notes
- This is intentionally minimal and provides the baseline module boundaries for upcoming API implementation tasks (`B012+`).
- Service defaults:
  - gateway: `:18080`
  - auth: `:18081`
