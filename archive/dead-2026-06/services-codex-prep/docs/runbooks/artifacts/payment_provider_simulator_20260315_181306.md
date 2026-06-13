# Payment Provider Simulator

- Ran at: 2026-03-15T18:13:06Z
- Gateway: http://localhost:8080
- Scenario request: deposit_approve

## Scenario: deposit_approve

## Provider callback PENDING_APPROVAL for demo-pxp-deposit-001

- HTTP status: 200

```xml
<?xml version="1.0" encoding="UTF-8"?>
<PaymentStateChangedNotificationResponse><status>OK</status><transactionId>92000000-0000-0000-0000-000000000012</transactionId></PaymentStateChangedNotificationResponse>
```

## Admin action approve for demo-pxp-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000012","status":"PROCESSING","direction":"Deposit","amount":"75","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:13:08.178008Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"pending_deposit"},"created_at":"2026-03-15T17:53:08.074465Z"}
```

## Final transaction detail for demo-pxp-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000012","status":"PROCESSING","direction":"Deposit","amount":"75","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:13:08.178008Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"pending_deposit"},"created_at":"2026-03-15T17:53:08.074465Z"}
```

## Event history for demo-pxp-deposit-001

- HTTP status: 200

```json
{"data":[{"id":"096b2f09-6e66-4b05-898c-baa5e047f567","transaction_id":"92000000-0000-0000-0000-000000000012","status":"PROCESSING","source":"admin-approve","reason":"approved in investor demo simulator","provider":"pxp","provider_reference":"demo-pxp-deposit-001","payload":{"action":"approve","previous_status":"PENDING_APPROVAL"},"created_at":"2026-03-15T18:13:08.178204Z"},{"id":"39619ca6-c543-4d9b-8786-7b5415ac44f8","transaction_id":"92000000-0000-0000-0000-000000000012","status":"PENDING_APPROVAL","source":"provider","reason":"PENDING_APPROVAL","provider":"pxp","provider_reference":"demo-pxp-deposit-001","payload":{"merchant_transaction_id":"demo-pxp-deposit-001","next_retry_at":"","payment_method":"card","provider_decision":"awaiting_review","provider_message":"demo approval required","provider_reason":"ready for ops approval","provider_reference":"demo-pxp-deposit-001","provider_state":"PENDING_APPROVAL","required_action":""},"created_at":"2026-03-15T18:13:08.128212Z"},{"id":"277c8779-7c36-41e8-aad6-6dd77e00421c","transaction_id":"92000000-0000-0000-0000-000000000012","status":"PENDING","source":"system","reason":"provider_pending_created","provider":"pxp","provider_reference":"demo-pxp-deposit-001","payload":{"payment_method":"card","seed_case":"pending_deposit","transaction_type":"deposit"},"created_at":"2026-03-15T17:53:08.075259Z"}]}
```

