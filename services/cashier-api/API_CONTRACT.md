> **Abandoned workstream — specification only.** `services/cashier-api/` is not a running
> service and this document describes nothing that exists. The product moved to
> non-redeemable points; the gateway's cashier, crypto and payment routes are
> unmounted by default and refuse to boot in production or staging. See
> `services/cashier-api/README.md` for why this tree is still in the repository, and
> `docs/archive/cashier/` for the design record.

# Cashier API Contract

**Status:** SUPERSEDED 2026-09-06 — abandoned workstream (was: "Draft.").
**Date:** 2026-05-25.

All mutating requests require:

- Authenticated user or signed provider callback.
- `Idempotency-Key` header.
- Immutable audit event.
- No transition from a terminal state.

## User APIs

All user APIs require authenticated user bearer/session auth. The authenticated
user id is authoritative; clients must not be allowed to create or read cashier
objects for arbitrary user ids.

### `GET /v1/cashier/wallet`

Returns the user's embedded wallet, smart wallet, settlement chain, and readiness
state.

Failure mode: if wallet provider is degraded, return a retryable error. Do not
create partial wallets without an idempotent recovery path.

### `POST /v1/cashier/deposit-intents`

Creates or returns an existing deposit intent for the same idempotency key.

Request:

- `rail`
- `settlementChain`

Response:

- deposit intent id
- status
- deposit address if available
- minimum amount and token metadata
- recovery/support message if not available

### `GET /v1/cashier/deposit-intents/:id`

Returns user-safe status only. Internal provider errors are mapped to stable states:
`created`, `address_issued`, `source_detected`, `bridging`, `settled`,
`recovery_required`, or `failed`.

### `POST /v1/cashier/withdrawal-intents`

Creates a gasless EVM withdrawal intent.

Request:

- destination address
- amount in base units
- settlement chain
- user authorization payload/hash

Response:

- withdrawal intent id
- policy decision
- relayer submission id if submitted

## Provider Callback APIs

### `POST /v1/provider-callbacks/:provider`

Requirements:

- Read raw body before parsing.
- Verify provider signature against raw body.
- Require provider signature metadata, currently modeled as
  `X-Provider-Signature` with optional `X-Provider-Timestamp` when the selected
  provider supports timestamped signing.
- Store raw body SHA-256.
- Compute idempotency key from provider, request id, chain, tx hash, and event/log
  index where available.
- Acknowledge duplicate callbacks without mutating terminal state.

Invalid signatures return non-2xx and never create bridge events.

## Admin APIs

Admin APIs are not V1 public surface. They must be behind operator auth, role
checks, audit logging, and two-person review above beta caps.

### `GET /v1/cashier/recovery-cases/:id`

Returns an operator-authorized recovery case. This endpoint must never be exposed
to regular users because it may contain provider evidence and compliance state.

### `GET /v1/cashier/reconciliation-reports/:businessDate`

Returns an operator-authorized reconciliation report for a business date. Reports
must be generated from persisted cashier state plus provider/chain observations,
not from frontend-visible status alone.
