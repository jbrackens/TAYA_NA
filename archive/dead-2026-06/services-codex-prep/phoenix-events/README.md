# phoenix-events

Go service for external event ingestion, live-score updates, and event metadata.

## Implemented contract

- `POST /api/v1/events`
- `GET /api/v1/events/{event_id}`
- `GET /api/v1/events`
- `POST /api/v1/providers/events/upsert`
- `POST /api/v1/providers/mockdata/events/sync`
- `POST /api/v1/providers/oddin/events/sync`
- `POST /api/v1/providers/betgenius/events/sync`
- `PUT /api/v1/events/{event_id}/live-score`
- `PUT /api/v1/events/{event_id}/result`
- `GET /api/v1/sports`
- `GET /api/v1/stats/fixtures/{fixture_id}`
- `GET /api/v1/match-tracker/fixtures/{fixture_id}`
- `GET /api/v1/leagues/{sport}`
- `GET /admin/fixtures`
- `GET /admin/fixtures/{event_id}`
- `PUT /admin/fixtures/{fixture_id}/status`
- `GET /admin/tournaments`

## Storage model

The service uses the prep package schema from [`005_create_markets.sql`](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/migrations/005_create_markets.sql):

- `events`
- `event_outbox`

Team names, venue, country, live score, result state, and optional stats-centre fields are stored in `events.metadata` as JSONB because the prep schema does not define separate score/result/stat columns.

## Auth

Protected write routes require JWT auth and one of:

- `data-provider`
- `data_provider`
- `admin`

Admin trading reads and fixture-state updates require JWT auth and one of:

- `operator`
- `admin`
- `data-provider`
- `data_provider`

## Kafka / outbox

This service writes transactional outbox rows for:

- `phoenix.event.created`
- `phoenix.event.upserted`
- `phoenix.event.live-score-updated`
- `phoenix.event.completed`

The shared `phoenix-common/pkg/outbox` worker publishes them asynchronously.

`mockdata` sync uses the same normalized event upsert path and then applies fixture-status transitions when the provider payload carries a non-scheduled state.

`oddin` sync is the first provider-specific event adapter in Go. It normalizes pre-match/live Oddin sport-event payloads, resolves home/away competitors from the provider-side competitor array, prefixes provider IDs with `oddin:`, and applies fixture-status transitions from the Oddin event state.

`betgenius` sync normalizes fixture-ingest payloads from the old Scala feed shape, resolves home/away competitors from the `home_away` field, prefixes provider IDs with `betgenius:`, and applies schedule/cancel status transitions from Betgenius fixture state.

## Run

```bash
go run ./cmd/server
```

## Test

```bash
go test ./...
go test -race ./...
```
