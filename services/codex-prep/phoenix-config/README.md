# phoenix-config

Go parity-expansion service for configuration and terms administration.

## Routes

### Public
- `GET /health`
- `GET /ready`
- `GET /api/v1/terms/current`

### Admin
- `GET /admin/terms/current`
- `POST /admin/upload-terms`

`POST /admin/upload-terms` is the Go replacement for the old Scala `ConfigBackOfficeRoutes` terms upload endpoint. New versions are append-only and duplicate term versions are rejected. Manual uploads emit an audit row in the same transaction.
