# Payment Provider Simulator

- Ran at: 2026-03-15T18:10:47Z
- Gateway: http://localhost:8080
- Scenario request: full_pack

## Scenario: deposit_action_required

## Provider callback ACTION_REQUIRED for demo-pxp-deposit-001

- HTTP status: 200

```xml
<?xml version="1.0" encoding="UTF-8"?>
<PaymentStateChangedNotificationResponse><status>OK</status><transactionId>92000000-0000-0000-0000-000000000012</transactionId></PaymentStateChangedNotificationResponse>
```

## Final transaction detail for demo-pxp-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000012","status":"ACTION_REQUIRED","direction":"Deposit","amount":"75","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:10:49.369334Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"pending_deposit"},"created_at":"2026-03-15T17:50:49.320656Z"}
```

## Event history for demo-pxp-deposit-001

- HTTP status: 200

```json
{"data":[{"id":"3b3c2dc5-f3c6-4b6f-b20b-cfd9cb881074","transaction_id":"92000000-0000-0000-0000-000000000012","status":"ACTION_REQUIRED","source":"provider","reason":"ACTION_REQUIRED","provider":"pxp","provider_reference":"demo-pxp-deposit-001","payload":{"merchant_transaction_id":"demo-pxp-deposit-001","next_retry_at":"","payment_method":"card","provider_decision":"manual_review","provider_message":"demo action required","provider_reason":"seeded action required","provider_reference":"demo-pxp-deposit-001","provider_state":"ACTION_REQUIRED","required_action":"upload_document"},"created_at":"2026-03-15T18:10:49.369923Z"},{"id":"860dd2d8-8748-464a-9c5a-c5ff3dc79b36","transaction_id":"92000000-0000-0000-0000-000000000012","status":"PENDING","source":"system","reason":"provider_pending_created","provider":"pxp","provider_reference":"demo-pxp-deposit-001","payload":{"payment_method":"card","seed_case":"pending_deposit","transaction_type":"deposit"},"created_at":"2026-03-15T17:50:49.321475Z"}]}
```

## Scenario: deposit_approve

## Provider callback PENDING_APPROVAL for demo-pxp-deposit-001

- HTTP status: 200

```xml
<?xml version="1.0" encoding="UTF-8"?>
<PaymentStateChangedNotificationResponse><status>OK</status><transactionId>92000000-0000-0000-0000-000000000012</transactionId></PaymentStateChangedNotificationResponse>
```

## Admin action approve for demo-pxp-deposit-001

- HTTP status: 400

```json
{"error":{"message":"transaction is not awaiting provider review","status":400}}
```

## Final transaction detail for demo-pxp-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000012","status":"PENDING","direction":"Deposit","amount":"75","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:10:50.352466Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"pending_deposit"},"created_at":"2026-03-15T17:50:50.313797Z"}
```

## Event history for demo-pxp-deposit-001

- HTTP status: 200

```json
{"data":[{"id":"34c468c3-48a1-4a02-8d39-18d176eccd8e","transaction_id":"92000000-0000-0000-0000-000000000012","status":"PENDING","source":"provider","reason":"PENDING_APPROVAL","provider":"pxp","provider_reference":"demo-pxp-deposit-001","payload":{"merchant_transaction_id":"demo-pxp-deposit-001","next_retry_at":"","payment_method":"card","provider_decision":"awaiting_review","provider_message":"demo approval required","provider_reason":"ready for ops approval","provider_reference":"demo-pxp-deposit-001","provider_state":"PENDING_APPROVAL","required_action":""},"created_at":"2026-03-15T18:10:50.35262Z"},{"id":"cf6e94b9-da44-43bb-98d3-99739f7e744a","transaction_id":"92000000-0000-0000-0000-000000000012","status":"PENDING","source":"system","reason":"provider_pending_created","provider":"pxp","provider_reference":"demo-pxp-deposit-001","payload":{"payment_method":"card","seed_case":"pending_deposit","transaction_type":"deposit"},"created_at":"2026-03-15T17:50:50.314537Z"}]}
```

## Scenario: reconcile_pending_deposit

## Reconciliation preview for demo-pxp-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000012","provider":"pxp","provider_reference":"demo-pxp-deposit-001","direction":"Deposit","current_status":"PENDING","requested_status":"SUCCEEDED","normalized_status":"SUCCEEDED","action":"complete_pending_deposit","allowed":true,"current_balance":"560","projected_balance":"635","requires_reservation":false,"reservation_satisfied":true}
```

## Reconcile request for demo-pxp-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000012","status":"SUCCEEDED","direction":"Deposit","amount":"75","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:10:51.476547Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"pending_deposit"},"created_at":"2026-03-15T17:50:51.376649Z"}
```

## Final transaction detail for demo-pxp-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000012","status":"SUCCEEDED","direction":"Deposit","amount":"75","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:10:51.476547Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"pending_deposit"},"created_at":"2026-03-15T17:50:51.376649Z"}
```

## Event history for demo-pxp-deposit-001

- HTTP status: 200

```json
{"data":[{"id":"0784af35-7231-4e65-aad0-ca0a0956bacc","transaction_id":"92000000-0000-0000-0000-000000000012","status":"SUCCEEDED","source":"admin-reconcile","reason":"reconcile seeded pending deposit","provider":"pxp","provider_reference":"demo-pxp-deposit-001","payload":{"merchant_transaction_id":"","payment_method":"card","provider_reference":"demo-pxp-deposit-001","provider_state":"SUCCEEDED","reconciliation_reason":"reconcile seeded pending deposit"},"created_at":"2026-03-15T18:10:51.484553Z"},{"id":"80b4bbfa-aa85-4c12-9340-4d7c6d76981e","transaction_id":"92000000-0000-0000-0000-000000000012","status":"PENDING","source":"system","reason":"provider_pending_created","provider":"pxp","provider_reference":"demo-pxp-deposit-001","payload":{"payment_method":"card","seed_case":"pending_deposit","transaction_type":"deposit"},"created_at":"2026-03-15T17:50:51.377309Z"}]}
```

## Scenario: withdrawal_review_decline

## Provider callback MANUAL_REVIEW for demo-pxp-withdrawal-001

- HTTP status: 200

```xml
<?xml version="1.0" encoding="UTF-8"?>
<PaymentStateChangedNotificationResponse><status>OK</status><transactionId>92000000-0000-0000-0000-000000000013</transactionId></PaymentStateChangedNotificationResponse>
```

## Admin action decline for demo-pxp-withdrawal-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000013","status":"DECLINED","direction":"Withdrawal","amount":"40","currency":"USD","payment_method":"bank-transfer","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","reference":"bank-transfer","provider_updated_at":"2026-03-15T18:10:52.664064Z","metadata":{"orchestration_mode":"provider","payment_method":"bank-transfer","reservation_id":"demo-reservation-withdrawal-001","seed_case":"pending_withdrawal"},"created_at":"2026-03-15T18:00:52.573882Z"}
```

## Final transaction detail for demo-pxp-withdrawal-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000013","status":"DECLINED","direction":"Withdrawal","amount":"40","currency":"USD","payment_method":"bank-transfer","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","reference":"bank-transfer","provider_updated_at":"2026-03-15T18:10:52.664064Z","metadata":{"orchestration_mode":"provider","payment_method":"bank-transfer","reservation_id":"demo-reservation-withdrawal-001","seed_case":"pending_withdrawal"},"created_at":"2026-03-15T18:00:52.573882Z"}
```

## Event history for demo-pxp-withdrawal-001

- HTTP status: 200

```json
{"data":[{"id":"d96fb60d-2e0a-4405-8ae6-e9aebb0879b6","transaction_id":"92000000-0000-0000-0000-000000000013","status":"DECLINED","source":"admin-decline","reason":"declined in investor demo simulator","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","payload":{"action":"decline","previous_status":"PENDING_REVIEW"},"created_at":"2026-03-15T18:10:52.664783Z"},{"id":"a09b3ee4-6406-42bb-b96d-c6c41e21d3f8","transaction_id":"92000000-0000-0000-0000-000000000013","status":"PENDING_REVIEW","source":"provider","reason":"MANUAL_REVIEW","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","payload":{"merchant_transaction_id":"demo-pxp-withdrawal-001","next_retry_at":"","payment_method":"bank-transfer","provider_decision":"manual_review","provider_message":"demo withdrawal review","provider_reason":"provider requested manual review","provider_reference":"demo-pxp-withdrawal-001","provider_state":"MANUAL_REVIEW","required_action":"operator_review"},"created_at":"2026-03-15T18:10:52.618456Z"},{"id":"5cdfb334-89a9-44b4-8ac7-2b767c57e315","transaction_id":"92000000-0000-0000-0000-000000000013","status":"PENDING","source":"system","reason":"provider_pending_created","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","payload":{"payment_method":"bank-transfer","reservation_id":"demo-reservation-withdrawal-001","seed_case":"pending_withdrawal","transaction_type":"withdrawal"},"created_at":"2026-03-15T18:00:52.574769Z"}]}
```

## Scenario: withdrawal_retry

## Provider callback FAILED for demo-pxp-withdrawal-001

- HTTP status: 200

```xml
<?xml version="1.0" encoding="UTF-8"?>
<PaymentStateChangedNotificationResponse><status>OK</status><transactionId>92000000-0000-0000-0000-000000000013</transactionId></PaymentStateChangedNotificationResponse>
```

## Admin action retry for demo-pxp-withdrawal-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000013","status":"RETRYING","direction":"Withdrawal","amount":"40","currency":"USD","payment_method":"bank-transfer","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","reference":"bank-transfer","provider_updated_at":"2026-03-15T18:10:53.909862Z","metadata":{"orchestration_mode":"provider","payment_method":"bank-transfer","reservation_id":"demo-reservation-withdrawal-001","seed_case":"pending_withdrawal"},"created_at":"2026-03-15T18:00:53.793122Z"}
```

## Final transaction detail for demo-pxp-withdrawal-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000013","status":"RETRYING","direction":"Withdrawal","amount":"40","currency":"USD","payment_method":"bank-transfer","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","reference":"bank-transfer","provider_updated_at":"2026-03-15T18:10:53.909862Z","metadata":{"orchestration_mode":"provider","payment_method":"bank-transfer","reservation_id":"demo-reservation-withdrawal-001","seed_case":"pending_withdrawal"},"created_at":"2026-03-15T18:00:53.793122Z"}
```

## Event history for demo-pxp-withdrawal-001

- HTTP status: 200

```json
{"data":[{"id":"e93aa720-5b96-488c-bea8-632c48ee0e4e","transaction_id":"92000000-0000-0000-0000-000000000013","status":"RETRYING","source":"admin-retry","reason":"retry requested in investor demo simulator","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","payload":{"action":"retry"},"created_at":"2026-03-15T18:10:53.910103Z"},{"id":"0b2eb6a0-6efd-4097-9231-08ddfeaf2260","transaction_id":"92000000-0000-0000-0000-000000000013","status":"FAILED","source":"provider","reason":"FAILED","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","payload":{"merchant_transaction_id":"demo-pxp-withdrawal-001","next_retry_at":"","payment_method":"bank-transfer","provider_decision":"retryable_failure","provider_message":"demo retry path","provider_reason":"temporary provider outage","provider_reference":"demo-pxp-withdrawal-001","provider_state":"FAILED","required_action":"retry"},"created_at":"2026-03-15T18:10:53.859375Z"},{"id":"be98691a-c8d7-428d-82b7-778c093957fc","transaction_id":"92000000-0000-0000-0000-000000000013","status":"PENDING","source":"system","reason":"provider_pending_created","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","payload":{"payment_method":"bank-transfer","reservation_id":"demo-reservation-withdrawal-001","seed_case":"pending_withdrawal","transaction_type":"withdrawal"},"created_at":"2026-03-15T18:00:53.79382Z"}]}
```

## Scenario: deposit_refund

## Admin action refund for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000011","status":"REFUNDED","direction":"Deposit","amount":"60","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:10:54.85526Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:25:54.803512Z"}
```

## Final transaction detail for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000011","status":"REFUNDED","direction":"Deposit","amount":"60","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:10:54.85526Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:25:54.803512Z"}
```

## Event history for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"data":[{"id":"e6e3ec1e-85fe-4a39-961c-184ae470aedc","transaction_id":"92000000-0000-0000-0000-000000000011","status":"REFUNDED","source":"admin-refund","reason":"refund requested in investor demo simulator","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","payload":{"action":"refund"},"created_at":"2026-03-15T18:10:54.85663Z"},{"id":"c5838dbb-8ada-451e-9019-4bb64bfbae7f","transaction_id":"92000000-0000-0000-0000-000000000011","status":"SUCCEEDED","source":"provider","reason":"seeded_provider_success","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","payload":{"payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:25:54.804467Z"}]}
```

## Scenario: deposit_reverse

## Admin action reverse for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000011","status":"REVERSED","direction":"Deposit","amount":"60","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:10:55.847095Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:25:55.794311Z"}
```

## Final transaction detail for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000011","status":"REVERSED","direction":"Deposit","amount":"60","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:10:55.847095Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:25:55.794311Z"}
```

## Event history for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"data":[{"id":"0f6cb48b-8301-403a-8c3e-65220ee39547","transaction_id":"92000000-0000-0000-0000-000000000011","status":"REVERSED","source":"admin-reverse","reason":"reverse requested in investor demo simulator","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","payload":{"action":"reverse"},"created_at":"2026-03-15T18:10:55.847942Z"},{"id":"9009d4a7-26cf-46db-ac03-7e375d848b61","transaction_id":"92000000-0000-0000-0000-000000000011","status":"SUCCEEDED","source":"provider","reason":"seeded_provider_success","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","payload":{"payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:25:55.795326Z"}]}
```

## Scenario: deposit_chargeback

## Admin action chargeback for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000011","status":"CHARGEBACK","direction":"Deposit","amount":"60","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:10:56.771671Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:25:56.730357Z"}
```

## Final transaction detail for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000011","status":"CHARGEBACK","direction":"Deposit","amount":"60","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:10:56.771671Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:25:56.730357Z"}
```

## Event history for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"data":[{"id":"d2c098f1-7227-4469-9614-c2c9343790e9","transaction_id":"92000000-0000-0000-0000-000000000011","status":"CHARGEBACK","source":"admin-chargeback","reason":"chargeback requested in investor demo simulator","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","payload":{"action":"chargeback"},"created_at":"2026-03-15T18:10:56.772721Z"},{"id":"30ba5a36-2936-47bd-8984-c99227c18de9","transaction_id":"92000000-0000-0000-0000-000000000011","status":"SUCCEEDED","source":"provider","reason":"seeded_provider_success","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","payload":{"payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:25:56.730965Z"}]}
```

