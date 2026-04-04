# Service and Endpoint Inventory Index

This index points to machine-generated inventories created during Sprint 0 (`B002`).

## Backend Route Inventories
1. Path-focused route expressions (recommended primary reference):
   - `02_backend_route_patterns.csv`
2. Full extracted `.in(...)` expressions (includes body/query inputs and non-path inputs):
   - `02_backend_endpoint_inventory.csv`

## Frontend Route Inventory
1. Next.js page route inventory for both launch surfaces:
   - `02_frontend_route_inventory.csv`

## Extraction Scope Notes
1. Backend extraction source files:
   - `*Routes.scala`
   - `*TapirEndpoints.scala`
2. Backoffice route mount assumptions:
   - `/admin` for backoffice mountpoint
   - `/admin/trading` for trading-specific backoffice subset
3. Websocket and docs routes are explicitly appended because they are Akka directives, not Tapir `.in(...)` definitions.

## Caveats
1. Inventory rows capture route expressions from source lines, not normalized OpenAPI artifacts.
2. Some path rows include dynamic segments (`path[...]`, `punterId`, etc.) in source form.
3. A later sprint should generate normalized OpenAPI/route catalogs from compiled services for strict parity checks.

