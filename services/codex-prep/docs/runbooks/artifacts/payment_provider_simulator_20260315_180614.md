# Payment Provider Simulator

- Ran at: 2026-03-15T18:06:14Z
- Gateway: http://localhost:8080
- Scenario request: full_pack

## Scenario: deposit_action_required

## Provider callback ACTION_REQUIRED for demo-pxp-deposit-001

- HTTP status: 401

```xml
{"error":{"code":"UNAUTHORIZED","details":null,"message":"invalid authorization header format","request_id":"20260315180616821537676","timestamp":"2026-03-15T18:06:16Z"}}
```

## Final transaction detail for demo-pxp-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Event history for demo-pxp-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Scenario: deposit_approve

## Provider callback PENDING_APPROVAL for demo-pxp-deposit-001

- HTTP status: 401

```xml
{"error":{"code":"UNAUTHORIZED","details":null,"message":"invalid authorization header format","request_id":"20260315180617850947676","timestamp":"2026-03-15T18:06:17Z"}}
```

## Admin action approve for demo-pxp-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Final transaction detail for demo-pxp-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Event history for demo-pxp-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Scenario: reconcile_pending_deposit

## Reconciliation preview for demo-pxp-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Reconcile request for demo-pxp-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Final transaction detail for demo-pxp-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Event history for demo-pxp-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Scenario: withdrawal_review_decline

## Provider callback MANUAL_REVIEW for demo-pxp-withdrawal-001

- HTTP status: 401

```xml
{"error":{"code":"UNAUTHORIZED","details":null,"message":"invalid authorization header format","request_id":"20260315180619844834427","timestamp":"2026-03-15T18:06:19Z"}}
```

## Admin action decline for demo-pxp-withdrawal-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Final transaction detail for demo-pxp-withdrawal-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Event history for demo-pxp-withdrawal-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Scenario: withdrawal_retry

## Provider callback FAILED for demo-pxp-withdrawal-001

- HTTP status: 401

```xml
{"error":{"code":"UNAUTHORIZED","details":null,"message":"invalid authorization header format","request_id":"20260315180620810157219","timestamp":"2026-03-15T18:06:20Z"}}
```

## Admin action retry for demo-pxp-withdrawal-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Final transaction detail for demo-pxp-withdrawal-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Event history for demo-pxp-withdrawal-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Scenario: deposit_refund

## Admin action refund for demo-pxp-settled-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Final transaction detail for demo-pxp-settled-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Event history for demo-pxp-settled-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Scenario: deposit_reverse

## Admin action reverse for demo-pxp-settled-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Final transaction detail for demo-pxp-settled-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Event history for demo-pxp-settled-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Scenario: deposit_chargeback

## Admin action chargeback for demo-pxp-settled-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Final transaction detail for demo-pxp-settled-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

## Event history for demo-pxp-settled-deposit-001

- HTTP status: 400

```json
{"error":{"message":"ERROR: operator does not exist: character varying = uuid (SQLSTATE 42883)","status":400}}
```

