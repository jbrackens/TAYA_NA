# Payment Provider Simulator

- Ran at: 2026-03-15T18:13:14Z
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
{"transaction_id":"92000000-0000-0000-0000-000000000012","status":"ACTION_REQUIRED","direction":"Deposit","amount":"75","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:13:16.839462Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"pending_deposit"},"created_at":"2026-03-15T17:53:16.769234Z"}
```

## Event history for demo-pxp-deposit-001

- HTTP status: 200

```json
{"data":[{"id":"5dbd28b1-9e57-4c49-9169-be115d3e8d2e","transaction_id":"92000000-0000-0000-0000-000000000012","status":"ACTION_REQUIRED","source":"provider","reason":"ACTION_REQUIRED","provider":"pxp","provider_reference":"demo-pxp-deposit-001","payload":{"merchant_transaction_id":"demo-pxp-deposit-001","next_retry_at":"","payment_method":"card","provider_decision":"manual_review","provider_message":"demo action required","provider_reason":"seeded action required","provider_reference":"demo-pxp-deposit-001","provider_state":"ACTION_REQUIRED","required_action":"upload_document"},"created_at":"2026-03-15T18:13:16.839959Z"},{"id":"733517e0-b6fb-46b2-b89a-f7703256b084","transaction_id":"92000000-0000-0000-0000-000000000012","status":"PENDING","source":"system","reason":"provider_pending_created","provider":"pxp","provider_reference":"demo-pxp-deposit-001","payload":{"payment_method":"card","seed_case":"pending_deposit","transaction_type":"deposit"},"created_at":"2026-03-15T17:53:16.770202Z"}]}
```

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
{"transaction_id":"92000000-0000-0000-0000-000000000012","status":"PROCESSING","direction":"Deposit","amount":"75","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:13:18.128928Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"pending_deposit"},"created_at":"2026-03-15T17:53:17.945448Z"}
```

## Final transaction detail for demo-pxp-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000012","status":"PROCESSING","direction":"Deposit","amount":"75","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:13:18.128928Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"pending_deposit"},"created_at":"2026-03-15T17:53:17.945448Z"}
```

## Event history for demo-pxp-deposit-001

- HTTP status: 200

```json
{"data":[{"id":"68518b06-64db-490d-ab2d-610eae89e1bb","transaction_id":"92000000-0000-0000-0000-000000000012","status":"PROCESSING","source":"admin-approve","reason":"approved in investor demo simulator","provider":"pxp","provider_reference":"demo-pxp-deposit-001","payload":{"action":"approve","previous_status":"PENDING_APPROVAL"},"created_at":"2026-03-15T18:13:18.129502Z"},{"id":"a947c4d3-dde9-4d0a-85f6-fa4dd2c202dd","transaction_id":"92000000-0000-0000-0000-000000000012","status":"PENDING_APPROVAL","source":"provider","reason":"PENDING_APPROVAL","provider":"pxp","provider_reference":"demo-pxp-deposit-001","payload":{"merchant_transaction_id":"demo-pxp-deposit-001","next_retry_at":"","payment_method":"card","provider_decision":"awaiting_review","provider_message":"demo approval required","provider_reason":"ready for ops approval","provider_reference":"demo-pxp-deposit-001","provider_state":"PENDING_APPROVAL","required_action":""},"created_at":"2026-03-15T18:13:18.034223Z"},{"id":"03137375-cfd9-4482-b246-7aaf37547196","transaction_id":"92000000-0000-0000-0000-000000000012","status":"PENDING","source":"system","reason":"provider_pending_created","provider":"pxp","provider_reference":"demo-pxp-deposit-001","payload":{"payment_method":"card","seed_case":"pending_deposit","transaction_type":"deposit"},"created_at":"2026-03-15T17:53:17.946636Z"}]}
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
{"transaction_id":"92000000-0000-0000-0000-000000000012","status":"SUCCEEDED","direction":"Deposit","amount":"75","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:13:19.183413Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"pending_deposit"},"created_at":"2026-03-15T17:53:19.093269Z"}
```

## Final transaction detail for demo-pxp-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000012","status":"SUCCEEDED","direction":"Deposit","amount":"75","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:13:19.183413Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"pending_deposit"},"created_at":"2026-03-15T17:53:19.093269Z"}
```

## Event history for demo-pxp-deposit-001

- HTTP status: 200

```json
{"data":[{"id":"968df995-9513-407a-92b4-d0536d9624ca","transaction_id":"92000000-0000-0000-0000-000000000012","status":"SUCCEEDED","source":"admin-reconcile","reason":"reconcile seeded pending deposit","provider":"pxp","provider_reference":"demo-pxp-deposit-001","payload":{"merchant_transaction_id":"","payment_method":"card","provider_reference":"demo-pxp-deposit-001","provider_state":"SUCCEEDED","reconciliation_reason":"reconcile seeded pending deposit"},"created_at":"2026-03-15T18:13:19.187461Z"},{"id":"34a19164-1d4d-4bc9-8d65-5821432b1ab7","transaction_id":"92000000-0000-0000-0000-000000000012","status":"PENDING","source":"system","reason":"provider_pending_created","provider":"pxp","provider_reference":"demo-pxp-deposit-001","payload":{"payment_method":"card","seed_case":"pending_deposit","transaction_type":"deposit"},"created_at":"2026-03-15T17:53:19.094237Z"}]}
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
{"transaction_id":"92000000-0000-0000-0000-000000000013","status":"DECLINED","direction":"Withdrawal","amount":"40","currency":"USD","payment_method":"bank-transfer","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","reference":"bank-transfer","provider_updated_at":"2026-03-15T18:13:20.14152Z","metadata":{"orchestration_mode":"provider","payment_method":"bank-transfer","reservation_id":"demo-reservation-withdrawal-001","seed_case":"pending_withdrawal"},"created_at":"2026-03-15T18:03:20.053863Z"}
```

## Final transaction detail for demo-pxp-withdrawal-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000013","status":"DECLINED","direction":"Withdrawal","amount":"40","currency":"USD","payment_method":"bank-transfer","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","reference":"bank-transfer","provider_updated_at":"2026-03-15T18:13:20.14152Z","metadata":{"orchestration_mode":"provider","payment_method":"bank-transfer","reservation_id":"demo-reservation-withdrawal-001","seed_case":"pending_withdrawal"},"created_at":"2026-03-15T18:03:20.053863Z"}
```

## Event history for demo-pxp-withdrawal-001

- HTTP status: 200

```json
{"data":[{"id":"c2dd4a95-e42e-4228-af33-a64a2e3b0cfa","transaction_id":"92000000-0000-0000-0000-000000000013","status":"DECLINED","source":"admin-decline","reason":"declined in investor demo simulator","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","payload":{"action":"decline","previous_status":"PENDING_REVIEW"},"created_at":"2026-03-15T18:13:20.142279Z"},{"id":"f94b9856-7e9f-4bbf-85c5-9c85068b51b6","transaction_id":"92000000-0000-0000-0000-000000000013","status":"PENDING_REVIEW","source":"provider","reason":"MANUAL_REVIEW","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","payload":{"merchant_transaction_id":"demo-pxp-withdrawal-001","next_retry_at":"","payment_method":"bank-transfer","provider_decision":"manual_review","provider_message":"demo withdrawal review","provider_reason":"provider requested manual review","provider_reference":"demo-pxp-withdrawal-001","provider_state":"MANUAL_REVIEW","required_action":"operator_review"},"created_at":"2026-03-15T18:13:20.095269Z"},{"id":"d5c4c8ca-4fc3-4fbf-b724-6c89514dd8b3","transaction_id":"92000000-0000-0000-0000-000000000013","status":"PENDING","source":"system","reason":"provider_pending_created","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","payload":{"payment_method":"bank-transfer","reservation_id":"demo-reservation-withdrawal-001","seed_case":"pending_withdrawal","transaction_type":"withdrawal"},"created_at":"2026-03-15T18:03:20.054604Z"}]}
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
{"transaction_id":"92000000-0000-0000-0000-000000000013","status":"RETRYING","direction":"Withdrawal","amount":"40","currency":"USD","payment_method":"bank-transfer","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","reference":"bank-transfer","provider_updated_at":"2026-03-15T18:13:21.250857Z","metadata":{"orchestration_mode":"provider","payment_method":"bank-transfer","reservation_id":"demo-reservation-withdrawal-001","seed_case":"pending_withdrawal"},"created_at":"2026-03-15T18:03:21.16429Z"}
```

## Final transaction detail for demo-pxp-withdrawal-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000013","status":"RETRYING","direction":"Withdrawal","amount":"40","currency":"USD","payment_method":"bank-transfer","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","reference":"bank-transfer","provider_updated_at":"2026-03-15T18:13:21.250857Z","metadata":{"orchestration_mode":"provider","payment_method":"bank-transfer","reservation_id":"demo-reservation-withdrawal-001","seed_case":"pending_withdrawal"},"created_at":"2026-03-15T18:03:21.16429Z"}
```

## Event history for demo-pxp-withdrawal-001

- HTTP status: 200

```json
{"data":[{"id":"3c574f2f-b451-48ce-8b6b-410b53c748e4","transaction_id":"92000000-0000-0000-0000-000000000013","status":"RETRYING","source":"admin-retry","reason":"retry requested in investor demo simulator","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","payload":{"action":"retry"},"created_at":"2026-03-15T18:13:21.251084Z"},{"id":"b52a8f5f-2b0e-424c-8219-801a8d63520a","transaction_id":"92000000-0000-0000-0000-000000000013","status":"FAILED","source":"provider","reason":"FAILED","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","payload":{"merchant_transaction_id":"demo-pxp-withdrawal-001","next_retry_at":"","payment_method":"bank-transfer","provider_decision":"retryable_failure","provider_message":"demo retry path","provider_reason":"temporary provider outage","provider_reference":"demo-pxp-withdrawal-001","provider_state":"FAILED","required_action":"retry"},"created_at":"2026-03-15T18:13:21.205127Z"},{"id":"7f5223a4-a9f2-4049-b71f-54fa0b28fdbf","transaction_id":"92000000-0000-0000-0000-000000000013","status":"PENDING","source":"system","reason":"provider_pending_created","provider":"pxp","provider_reference":"demo-pxp-withdrawal-001","payload":{"payment_method":"bank-transfer","reservation_id":"demo-reservation-withdrawal-001","seed_case":"pending_withdrawal","transaction_type":"withdrawal"},"created_at":"2026-03-15T18:03:21.165019Z"}]}
```

## Scenario: deposit_refund

## Admin action refund for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000011","status":"REFUNDED","direction":"Deposit","amount":"60","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:13:22.310499Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:28:22.226993Z"}
```

## Final transaction detail for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000011","status":"REFUNDED","direction":"Deposit","amount":"60","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:13:22.310499Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:28:22.226993Z"}
```

## Event history for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"data":[{"id":"2dabce2d-ae9d-4046-835e-d40a61975fdf","transaction_id":"92000000-0000-0000-0000-000000000011","status":"REFUNDED","source":"admin-refund","reason":"refund requested in investor demo simulator","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","payload":{"action":"refund"},"created_at":"2026-03-15T18:13:22.311462Z"},{"id":"b3717021-767d-4195-972b-f3683fbd28d4","transaction_id":"92000000-0000-0000-0000-000000000011","status":"SUCCEEDED","source":"provider","reason":"seeded_provider_success","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","payload":{"payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:28:22.227754Z"}]}
```

## Scenario: deposit_reverse

## Admin action reverse for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000011","status":"REVERSED","direction":"Deposit","amount":"60","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:13:23.831367Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:28:23.785382Z"}
```

## Final transaction detail for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000011","status":"REVERSED","direction":"Deposit","amount":"60","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:13:23.831367Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:28:23.785382Z"}
```

## Event history for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"data":[{"id":"8b4f8dd7-4f3f-400e-926d-4ec59a59b115","transaction_id":"92000000-0000-0000-0000-000000000011","status":"REVERSED","source":"admin-reverse","reason":"reverse requested in investor demo simulator","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","payload":{"action":"reverse"},"created_at":"2026-03-15T18:13:23.832533Z"},{"id":"7c4ba069-690e-4032-9de1-f62a183ef711","transaction_id":"92000000-0000-0000-0000-000000000011","status":"SUCCEEDED","source":"provider","reason":"seeded_provider_success","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","payload":{"payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:28:23.786882Z"}]}
```

## Scenario: deposit_chargeback

## Admin action chargeback for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000011","status":"CHARGEBACK","direction":"Deposit","amount":"60","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:13:24.813067Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:28:24.765646Z"}
```

## Final transaction detail for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"transaction_id":"92000000-0000-0000-0000-000000000011","status":"CHARGEBACK","direction":"Deposit","amount":"60","currency":"USD","payment_method":"card","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","reference":"card","provider_updated_at":"2026-03-15T18:13:24.813067Z","metadata":{"orchestration_mode":"provider","payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:28:24.765646Z"}
```

## Event history for demo-pxp-settled-deposit-001

- HTTP status: 200

```json
{"data":[{"id":"823d3448-4b74-42a4-b9f4-171a8aade3f3","transaction_id":"92000000-0000-0000-0000-000000000011","status":"CHARGEBACK","source":"admin-chargeback","reason":"chargeback requested in investor demo simulator","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","payload":{"action":"chargeback"},"created_at":"2026-03-15T18:13:24.814471Z"},{"id":"d55e0dde-3c7f-42e7-8b59-6c81795e6507","transaction_id":"92000000-0000-0000-0000-000000000011","status":"SUCCEEDED","source":"provider","reason":"seeded_provider_success","provider":"pxp","provider_reference":"demo-pxp-settled-deposit-001","payload":{"payment_method":"card","seed_case":"succeeded_deposit"},"created_at":"2026-03-15T17:28:24.766727Z"}]}
```

