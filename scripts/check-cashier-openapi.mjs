import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const spec = readFileSync(
  new URL("../services/cashier-api/openapi.yaml", import.meta.url),
  "utf8",
);

for (const required of [
  "/v1/cashier/wallet",
  "/v1/cashier/deposit-intents",
  "/v1/cashier/deposit-intents/{id}",
  "/v1/cashier/withdrawal-intents",
  "/v1/cashier/recovery-cases/{id}",
  "/v1/cashier/reconciliation-reports/{businessDate}",
  "/v1/provider-callbacks/{provider}",
  "ProviderSignature",
  "UserBearerAuth",
  "OperatorBearerAuth",
  "X-Provider-Signature",
  "Idempotency-Key",
  "Invalid provider signature",
  "CashierWallet",
  "CreateDepositIntentRequest",
  "DepositIntent",
  "CreateWithdrawalIntentRequest",
  "WithdrawalIntent",
  "RecoveryCase",
  "ReconciliationReport",
  "additionalProperties: false",
  "pattern: \"^(0|[1-9][0-9]*)$\"",
]) {
  assert.ok(spec.includes(required), `OpenAPI spec missing ${required}`);
}

console.log("cashier OpenAPI checks passed");
