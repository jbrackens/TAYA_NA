# `@taptrade-ui/mock-server`

**Sportsbook-era. Not used by anything.** An Express mock API inherited from the
sportsbook fork: it serves `/fixtures`, `/sports`, `/pool-bet`, `/punters` and
friends on port 3010, with a small WebSocket handler alongside.

Neither `app` nor `office` depends on it, and neither is configured to reach
port 3010 — both talk to the Go gateway on `http://localhost:18080` via
`NEXT_PUBLIC_API_URL`. Stale `API_GLOBAL_ENDPOINT=http://localhost:3010` lines
in older docs came from here.

It is kept in the workspace but is not part of the prediction-market stack. Do
not add prediction endpoints to it; mock the gateway instead.

```bash
yarn run-local:dev   # nodemon + ts-node src/index.ts, if you really need it
```
