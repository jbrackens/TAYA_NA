# Local Stack Runbook

This runbook standardizes local startup for the combined Phoenix sportsbook stack.

## Services and Ports
- Phoenix backend (Scala/Akka): `http://localhost:13551` (status endpoint: `/api/v1/status`)
- Talon backoffice frontend: `http://localhost:3000`
- Sportsbook frontend: `http://localhost:3002`

## One-Time Bootstrap
```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined
make java-profile
source .runtime/java-profile.env
make bootstrap
```

## Start / Stop / Status
```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined
make start
make status
make logs
make stop
```

## Full Quality Gate
```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined
make verify
```

## Notes
- `scripts/local-stack.sh` manages process IDs and logs in `.runtime/`.
- Talon `packages/office/.env.local` is set to local backend endpoints.
- Sportsbook `packages/app/.env.local` is created if missing and points to local backend endpoints.
- Frontends run with `NODE_OPTIONS=--openssl-legacy-provider` for compatibility while Node 20 migration hardening continues.
- Java runtime profile defaults to Java 21 and automatically falls back to Java 17 if needed.
