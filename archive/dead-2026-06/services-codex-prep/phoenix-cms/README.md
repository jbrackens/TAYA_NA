# phoenix-cms

Go CMS service for pages, promotions, and banners.

## Implemented endpoints
- `POST /api/v1/pages`
- `GET /api/v1/pages/{page_id}`
- `GET /api/v1/pages`
- `POST /api/v1/promotions`
- `GET /api/v1/promotions`
- `POST /api/v1/banners`
- `GET /api/v1/banners`

## Roles
- `content_editor` or `admin`: create pages, banners
- `marketing`, `operator`, or `admin`: create promotions
- public: read pages, promotions, banners

## Notes
- Public reads only return published/active content.
- Writes append to `event_store` and `event_outbox`.
- Promotions are handled here as the platform content/catalog surface; retention continues to own campaigns, bonuses, and leaderboards.
