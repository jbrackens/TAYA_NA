import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const contract = JSON.parse(
  readFileSync(
    new URL("../services/cashier-api/observability-events.json", import.meta.url),
    "utf8",
  ),
);

assert.ok(Array.isArray(contract.events), "events must be an array");
const names = new Set();
for (const event of contract.events) {
  assert.match(event.name, /^cashier\.[a-z0-9_]+\.[a-z0-9_]+$/);
  assert.ok(!names.has(event.name), `duplicate event name: ${event.name}`);
  names.add(event.name);
  assert.ok(Array.isArray(event.requiredFields), `${event.name} fields must be array`);
  assert.ok(event.requiredFields.length > 0, `${event.name} must require fields`);
}

for (const requiredName of [
  "cashier.deposit_intent.created",
  "cashier.provider_callback.verified",
  "cashier.provider_callback.rejected",
  "cashier.bridge_event.inserted",
  "cashier.deposit_intent.transitioned",
  "cashier.recovery_case.created",
  "cashier.recovery_case.approval_recorded",
  "cashier.relayer.policy_denied",
  "cashier.runtime_flag.changed",
  "cashier.reconciliation.completed",
]) {
  assert.ok(names.has(requiredName), `missing required event ${requiredName}`);
}

console.log("cashier observability checks passed");
