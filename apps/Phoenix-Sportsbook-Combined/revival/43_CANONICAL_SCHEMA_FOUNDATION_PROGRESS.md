# Canonical Schema Foundation Progress (SB-001)

Date: 2026-03-04
Backlog reference: `SB-001` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Added versioned canonical schema package:
   - `go-platform/modules/platform/canonical/v1`
2. Added schema metadata and compatibility utilities:
   - `SchemaName`, semver constants, `CurrentSchema()`, `ParseVersion()`, `IsCompatible()`.
3. Added canonical core entity models:
   - Fixture, Market, Selection, Bet, Settlement, Translation (+ status enums).
4. Added canonical feed envelope model:
   - schema/provider/stream/entity/action/revision/sequence/occurredAt/payload.
5. Added envelope validation and payload decode helpers.
6. Exposed canonical schema metadata through admin config endpoint:
   - `GET /api/v1/admin/config` now includes `canonicalSchema`.
7. Added unit and integration coverage:
   - canonical package tests and updated gateway config route test.

## Validation

1. `cd go-platform/modules/platform && go test ./...`
   - pass
2. `cd go-platform/services/gateway && go test ./...`
   - pass

## Why this satisfies SB-001

1. Canonical model is now explicitly published as code (`platform/canonical/v1`).
2. Versioning and compatibility policy is codified in one package.
3. Runtime visibility exists via admin config response (`canonicalSchema`) so adapters and ops can assert active canonical contract.

## Next

1. SB-002: add provider adapter interface and registry over this canonical package.
2. SB-003: add revision checkpoint store and replay contract that emits canonical envelopes.
