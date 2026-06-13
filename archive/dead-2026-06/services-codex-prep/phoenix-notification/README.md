# phoenix-notification

`phoenix-notification` handles queued notifications, templates, delivery tracking, and user notification preferences.

## Implemented API
- `POST /api/v1/notifications`
- `GET /api/v1/templates`
- `PUT /api/v1/notifications/{notification_id}/status`
- `GET /api/v1/users/{user_id}/notification-preferences`
- `PUT /api/v1/users/{user_id}/notification-preferences`
- `GET /api/v1/notifications/{notification_id}`

## Storage
- `notification_templates`
- `notifications`
- `notification_channel_statuses`
- `notification_preferences`
- `users`
- `event_store`
- `event_outbox`

## Notes
- Dispatch is modeled as durable queueing plus channel-level delivery state, not direct provider sending.
- Preferences are enforced when notifications are queued; blocked channels are marked `suppressed`.
- Quiet-hours preferences are persisted now but not yet used for delayed dispatch scheduling.
