# phoenix-social

`phoenix-social` implements player profiles, follow relationships, feed reads, and direct messaging for the Go rebuild.

## Implemented API
- `GET /api/v1/users/{user_id}/profile`
- `POST /api/v1/users/{user_id}/follow/{target_user_id}`
- `GET /api/v1/users/{user_id}/followers`
- `GET /api/v1/feed`
- `POST /api/v1/messages`
- `GET /api/v1/messages/{conversation_id}`

## Storage
- `social_profiles`
- `social_follows`
- `social_messages`
- joins into `users`, `bets`, `markets`, and `events` for public profile stats and feed activity

## Events
- `phoenix.social.followed`
- `phoenix.social.message-sent`

## Stack
- router: `chi/v5`
- db: `pgx/v5`
- money math: `shopspring/decimal`
- outbox publishing: `phoenix-common/pkg/outbox`

## Notes
- feed is contract-aligned around `bet_placed` activity and uses live bet history instead of a separate denormalized feed table.
- display metadata is optional; profile reads fall back to `users.first_name/last_name` and `users.username` when `social_profiles` is empty.
