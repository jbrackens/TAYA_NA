# Go Platform Scaffold

This directory is the initial Go workspace for the Phoenix sportsbook backend migration.

## Workspace Layout
- `modules/platform`: shared runtime primitives and reusable platform utilities.
- `services/gateway`: sportsbook-facing API gateway scaffold.
- `services/auth`: authentication/session service scaffold.

## Quick Start
```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/go-platform
go work sync
go test ./...
```

## Run Starter Services
```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/go-platform
go run ./services/gateway/cmd/gateway
go run ./services/auth/cmd/auth
```

Default service ports:
- gateway: `18080`
- auth: `18081`

Override with:
```bash
PORT=19000 go run ./services/gateway/cmd/gateway
```
