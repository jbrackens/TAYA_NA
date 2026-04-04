# Provider Adapter Interface Progress (SB-002)

Date: 2026-03-04
Backlog reference: `SB-002` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Added provider adapter contract package:
   - `go-platform/modules/platform/canonical/adapter/adapter.go`
2. Added canonical provider command contracts:
   - place bet, cancel bet, max stake, cashout quote/accept.
3. Added stream/snapshot integration contract:
   - `SupportedStreams`, `SubscribeStream`, `FetchSnapshot`.
4. Added adapter registry with plugin boundary:
   - `Register`, `Get`, `Names`.
5. Added schema compatibility enforcement at registration:
   - adapter must declare canonical schema compatible with `canonical/v1`.
6. Added registry/unit tests covering:
   - register/get, duplicate rejection, incompatible schema rejection, deterministic sorted names.

## Validation

1. `cd go-platform/modules/platform && go test ./...`
   - pass
2. `cd go-platform/services/gateway && go test ./...`
   - pass

## Why this satisfies SB-002 foundation

1. Provider-specific implementation now has a strict interface boundary.
2. New providers can be added via registry without frontend contract changes.
3. Canonical schema compatibility is enforced before adapter activation.

## Next

1. SB-003: implement revision checkpoint store and replay contract using canonical envelopes.
2. Start wiring first concrete provider adapter implementation against this interface.
