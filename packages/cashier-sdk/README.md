# Hula Na! Cashier SDK

Shared typed contract for cashier UI and backend services.

This package starts as a dependency-free TypeScript domain model. It should remain
small: types, discriminated unions, status helpers, decimal metadata, and request
shape definitions. Provider SDKs belong in services, not in this package.

Verification:

- `npm test` builds the package to a temporary directory and runs runtime tests
  for state transitions, idempotency keys, and decimal/base-unit validation.
- Fixture validation covers cashier API, bridge watcher, relayer, recovery,
  runtime flag, canary, and reconciliation JSON artifacts.
- The runtime helpers intentionally include service-side reducers and policy
  checks, but no provider SDKs and no network calls.
