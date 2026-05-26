import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertValidDepositIntent,
  assertValidRecoveryApproval,
  assertValidWithdrawalIntent,
  assertValidReconciliationReport,
  assertValidCanaryResult,
  summarizeReconciliationReport,
} from "../packages/cashier-sdk/.tmp-test-dist/index.js";
import { createCashierHandlers } from "../services/cashier-api/src/handlers.mjs";
import { createCashierRepositoryFromEnv } from "../services/cashier-api/src/bootstrap.mjs";
import { createInMemoryCashierRepository } from "../services/cashier-api/src/repository.mjs";
import {
  renderCanaryReport,
  renderReconciliationDashboard,
} from "../services/cashier-api/src/dashboard.mjs";
import { createLocalProviderAdapter } from "../services/bridge-watcher/src/local-provider-adapter.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

const fixtures = {
  wallet: readJson("services/cashier-api/fixtures/wallet.resolved.json"),
  tronDeposit: readJson("services/cashier-api/fixtures/deposit-intent.created.json"),
  withdrawal: readJson("services/cashier-api/fixtures/withdrawal-intent.created.json"),
  runtimeFlags: readJson("services/cashier-api/fixtures/runtime-flags.default.json"),
  recoveryCase: readJson("services/cashier-api/fixtures/recovery-case.destination-mismatch.json"),
  recoveryApproval: readJson("services/cashier-api/fixtures/recovery-approval.operator-a.json"),
  reconciliationReport: readJson("services/cashier-api/fixtures/reconciliation-report.daily-ok.json"),
  canary: readJson("services/cashier-api/fixtures/canary-result.ok.json"),
};

const repo = createInMemoryCashierRepository({
  wallets: [fixtures.wallet],
  depositIntents: [fixtures.tronDeposit],
  withdrawalIntents: [fixtures.withdrawal],
  runtimeFlags: fixtures.runtimeFlags,
  recoveryCases: [fixtures.recoveryCase],
  recoveryApprovals: [fixtures.recoveryApproval],
  reconciliationReports: [fixtures.reconciliationReport],
});
await assert.rejects(
  () =>
    createCashierRepositoryFromEnv({
      env: { NODE_ENV: "production", CASHIER_REPOSITORY_BACKEND: "memory" },
    }),
  /cashier_in_memory_repository_forbidden/,
);
const bootstrappedMemory = await createCashierRepositoryFromEnv({
  env: { NODE_ENV: "test", CASHIER_REPOSITORY_BACKEND: "memory" },
  seed: { wallets: [fixtures.wallet] },
});
assert.equal(bootstrappedMemory.backend, "memory");
assert.equal(
  (await bootstrappedMemory.repo.getWalletByUserId(fixtures.wallet.userId)).smartWalletAddress,
  fixtures.wallet.smartWalletAddress,
);
const providerAdapter = createLocalProviderAdapter({ rootDir: root });
const handlers = createCashierHandlers({
  repo,
  providerAdapter,
  now: () => "2026-05-25T00:25:00.000Z",
});

const userCtx = { userId: "user_maria_001", idempotencyKey: "deposit-intent:user_maria_001:local:001" };
const operatorCtx = {
  operatorId: "ops_ana",
  roles: ["cashier_operator"],
};

assert.equal((await handlers.getWallet({})).status, 401);
assert.equal((await handlers.getWallet(userCtx)).status, 200);

const disabledDeposit = await handlers.createDepositIntent(userCtx, {
  rail: "tron-usdt-deposit-address",
  settlementChain: "polygon",
});
assert.equal(disabledDeposit.status, 423);
assert.equal(disabledDeposit.body.flagKey, "tron_deposits_enabled");

await repo.setRuntimeFlag({
  flagKey: "tron_deposits_enabled",
  enabled: true,
  reason: "local stub test",
  updatedBy: "test",
  updatedAt: "2026-05-25T00:25:00.000Z",
});
const enabledDeposit = await handlers.createDepositIntent(userCtx, {
  rail: "tron-usdt-deposit-address",
  settlementChain: "polygon",
});
assert.equal(enabledDeposit.status, 201);
assertValidDepositIntent(enabledDeposit.body);

const replayedDeposit = await handlers.createDepositIntent(userCtx, {
  rail: "tron-usdt-deposit-address",
  settlementChain: "polygon",
});
assert.equal(replayedDeposit.status, 200);
assert.equal(replayedDeposit.body.id, enabledDeposit.body.id);

const disabledWithdrawal = await handlers.createWithdrawalIntent(
  { userId: "user_maria_001", idempotencyKey: "withdrawal:user_maria_001:local:001" },
  {
    destinationAddress: "0x7777777777777777777777777777777777777777",
    amountUnits: "10000000",
    asset: "hUSD",
    settlementChain: "polygon",
    userAuthorizationHash: "0x8888888888888888888888888888888888888888888888888888888888888888",
    userAuthorizationNonce: "withdrawal:user_maria_001:local:001",
    userAuthorizationExpiresAt: "2026-05-25T00:35:00.000Z",
  },
);
assert.equal(disabledWithdrawal.status, 423);

await repo.setRuntimeFlag({
  flagKey: "withdrawals_enabled",
  enabled: true,
  reason: "local stub test",
  updatedBy: "test",
  updatedAt: "2026-05-25T00:25:00.000Z",
});
const enabledWithdrawal = await handlers.createWithdrawalIntent(
  { userId: "user_maria_001", idempotencyKey: "withdrawal:user_maria_001:local:001" },
  {
    destinationAddress: "0x7777777777777777777777777777777777777777",
    amountUnits: "10000000",
    asset: "hUSD",
    settlementChain: "polygon",
    userAuthorizationHash: "0x8888888888888888888888888888888888888888888888888888888888888888",
    userAuthorizationNonce: "withdrawal:user_maria_001:local:001",
    userAuthorizationExpiresAt: "2026-05-25T00:35:00.000Z",
  },
);
assert.equal(enabledWithdrawal.status, 201);
assertValidWithdrawalIntent(enabledWithdrawal.body);

assert.equal((await handlers.listRecoveryCases({}, {})).status, 403);
assert.equal((await handlers.listRecoveryCases(operatorCtx, {})).status, 200);
const approval = await handlers.recordRecoveryApproval(operatorCtx, fixtures.recoveryCase.id, {
  approvalType: "release_above_beta_cap",
  decision: "approve",
  evidenceSha256: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  note: "fixture-backed local approval",
});
assert.equal(approval.status, 201);
assertValidRecoveryApproval(approval.body);

const reportResponse = await handlers.getReconciliationReport(operatorCtx, fixtures.reconciliationReport.businessDate);
assert.equal(reportResponse.status, 200);
assertValidReconciliationReport(reportResponse.body);
const reconciliationDashboard = renderReconciliationDashboard(
  summarizeReconciliationReport(reportResponse.body),
);
assert.equal(reconciliationDashboard.mismatchCount, 0);

assertValidCanaryResult(fixtures.canary);
const canaryDashboard = renderCanaryReport(fixtures.canary);
assert.match(canaryDashboard.summary, /^OK/);

const providerStatus = await providerAdapter.getProviderRequest("relay_req_test_001");
assert.equal(providerStatus.events.length, 2);
const callbackEvents = await providerAdapter.normalizeCallback("signed-callback-source-confirmed");
assert.equal(callbackEvents[0].callbackVerification.verifierKeyId, "relay-key-1");

const callbackDisabled = await handlers.ingestProviderCallback(
  { providerSignatureVerified: true },
  "relay",
  callbackEvents[0],
);
assert.equal(callbackDisabled.status, 423);
await repo.setRuntimeFlag({
  flagKey: "provider_callbacks_enabled",
  enabled: true,
  reason: "local stub test",
  updatedBy: "test",
  updatedAt: "2026-05-25T00:25:00.000Z",
});
assert.equal(
  (await handlers.ingestProviderCallback({ providerSignatureVerified: false }, "relay", callbackEvents[0])).status,
  401,
);
assert.equal(
  (await handlers.ingestProviderCallback({ providerSignatureVerified: true }, "relay", callbackEvents[0])).status,
  202,
);
assert.equal(
  (await handlers.ingestProviderCallback({ providerSignatureVerified: true }, "relay", callbackEvents[0])).status,
  200,
);

console.log("cashier service stub checks passed");
