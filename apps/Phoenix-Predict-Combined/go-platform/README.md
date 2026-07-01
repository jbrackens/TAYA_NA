# Tiangge Go Platform

This directory is the Go workspace for Tiangge backend services. Tiangge is a
prediction-market app that uses non-redeemable gameplay points only.

## Workspace Layout
- `modules/platform`: shared runtime primitives and reusable platform utilities.
- `services/gateway`: prediction-market API gateway.
- `services/auth`: authentication/session service scaffold.

## Quick Start
```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/go-platform
go work sync
go test ./...
```

## Run Starter Services
```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/go-platform
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

## Launch Boundary

Launch services register points-only prediction, account, reward, moderation,
and admin operations. Historical compatibility packages may remain in source for
tests and archival migration work, but launch service configuration keeps those
external-value rails out of the active route tree.
