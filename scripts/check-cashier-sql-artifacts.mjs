import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const rollback = readFileSync(
  new URL("../services/cashier-api/migrations/001_cashier_core.rollback.sql", import.meta.url),
  "utf8",
).toLowerCase();
const seed = readFileSync(
  new URL("../services/cashier-api/seeds/local_cashier_seed.sql", import.meta.url),
  "utf8",
).toLowerCase();
const docs = readFileSync(
  new URL("../services/cashier-api/MIGRATION_ROLLBACK.md", import.meta.url),
  "utf8",
).toLowerCase();

for (const table of [
  "reconciliation_items",
  "reconciliation_reports",
  "recovery_approvals",
  "cashier_runtime_flags",
  "recovery_cases",
  "withdrawal_intents",
  "bridge_events",
  "deposit_intents",
  "cashier_wallets",
]) {
  assert.ok(rollback.includes(`drop table if exists ${table}`), `rollback missing ${table}`);
  assert.ok(seed.includes(`insert into ${table}`), `seed missing ${table}`);
}

for (const flag of [
  "tron_deposits_enabled",
  "evm_deposits_enabled",
  "withdrawals_enabled",
  "relayer_enabled",
  "provider_callbacks_enabled",
]) {
  assert.ok(seed.includes(flag), `seed missing runtime flag ${flag}`);
}

assert.ok(docs.includes("production rollback must be approved"), "rollback docs must warn on production use");
assert.ok(docs.includes("point-in-time backup"), "rollback docs must require backup");

console.log("cashier SQL artifact checks passed");
