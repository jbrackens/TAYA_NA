import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createCashierHandlers } from "../src/handlers.mjs";
import { createInMemoryCashierRepository } from "../src/repository.mjs";

const fixtures = {
  wallet: readJson("../fixtures/wallet.resolved.json"),
  runtimeFlags: readJson("../fixtures/runtime-flags.default.json"),
  recoveryCase: readJson("../fixtures/recovery-case.destination-mismatch.json"),
};

test("mutating cashier handlers write immutable audit events", async () => {
  const repo = createInMemoryCashierRepository({
    wallets: [fixtures.wallet],
    runtimeFlags: fixtures.runtimeFlags,
  });
  const handlers = createCashierHandlers({
    repo,
    providerAdapter: {
      async createDepositRoute() {
        return {
          depositIntentId: "dep_audit_001",
          sourceChain: "tron",
          sourceAsset: "USDT",
          sourceDecimals: 6,
          settlementAsset: "hUSD",
          provider: "relay",
          providerRequestId: "relay_req_audit_001",
          depositAddress: "TMockDepositAddressForAudit111111111111",
          createdAt: "2026-05-25T00:25:00.000Z",
        };
      },
    },
    now: () => "2026-05-25T00:25:00.000Z",
  });

  await repo.setRuntimeFlag({
    flagKey: "tron_deposits_enabled",
    enabled: true,
    reason: "audit test",
    updatedBy: "test",
    updatedAt: "2026-05-25T00:24:00.000Z",
  });
  const response = await handlers.createDepositIntent(
    {
      userId: fixtures.wallet.userId,
      idempotencyKey: "deposit-intent:audit:001",
    },
    { rail: "tron-usdt-deposit-address", settlementChain: "polygon" },
  );
  assert.equal(response.status, 201);

  const auditEvents = await repo.listAuditEventsBySubject("deposit", response.body.id);
  assert.equal(auditEvents.length, 1);
  assert.equal(auditEvents[0].eventType, "cashier.deposit_intent.created");
  assert.equal(auditEvents[0].actorType, "user");
  assert.equal(auditEvents[0].actorId, fixtures.wallet.userId);
  assert.match(auditEvents[0].payloadSha256, /^[a-f0-9]{64}$/);
});

test("recovery approval status requires two distinct approving operators", async () => {
  const repo = createInMemoryCashierRepository({
    recoveryCases: [fixtures.recoveryCase],
  });
  const handlers = createCashierHandlers({
    repo,
    providerAdapter: {},
    now: () => "2026-05-25T00:25:00.000Z",
  });
  const approvalType = "release_above_beta_cap";

  const first = await handlers.recordRecoveryApproval(
    { operatorId: "ops_ana", roles: ["cashier_operator"] },
    fixtures.recoveryCase.id,
    {
      approvalType,
      decision: "approve",
      evidenceSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      note: "first approval",
    },
  );
  assert.equal(first.status, 201);

  const afterFirst = await handlers.getRecoveryApprovalStatus(
    { operatorId: "ops_ana", roles: ["cashier_operator"] },
    fixtures.recoveryCase.id,
    approvalType,
  );
  assert.equal(afterFirst.body.approvalCount, 1);
  assert.equal(afterFirst.body.twoPersonApproved, false);

  await handlers.recordRecoveryApproval(
    { operatorId: "ops_bea", roles: ["cashier_operator"] },
    fixtures.recoveryCase.id,
    {
      approvalType,
      decision: "approve",
      evidenceSha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      note: "second approval",
    },
  );

  const afterSecond = await handlers.getRecoveryApprovalStatus(
    { operatorId: "ops_ana", roles: ["cashier_operator"] },
    fixtures.recoveryCase.id,
    approvalType,
  );
  assert.equal(afterSecond.body.approvalCount, 2);
  assert.equal(afterSecond.body.twoPersonApproved, true);

  const auditEvents = await repo.listAuditEventsBySubject(
    "recovery_case",
    fixtures.recoveryCase.id,
  );
  assert.equal(auditEvents.length, 2);
  assert.ok(auditEvents.every((event) => event.actorType === "operator"));
});

test("operator can generate a daily reconciliation report from persisted observations", async () => {
  const depositIntent = {
    id: "dep_recon_001",
    userId: fixtures.wallet.userId,
    rail: "tron-usdt-deposit-address",
    status: "settled",
    sourceChain: "tron",
    sourceAsset: "USDT",
    sourceDecimals: 6,
    settlementChain: "polygon",
    settlementAsset: "hUSD",
    destinationWalletAddress: fixtures.wallet.smartWalletAddress,
    provider: "relay",
    providerRequestId: "relay_req_recon_001",
    depositAddress: "TMockDepositAddressForRecon111111111111",
    settledAmount: {
      asset: "hUSD",
      chain: "settlement",
      decimals: 6,
      units: "24900000",
    },
    idempotencyKey: "deposit-intent:recon:001",
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:08:00.000Z",
  };
  const repo = createInMemoryCashierRepository({
    depositIntents: [depositIntent],
    bridgeEvents: [
      {
        id: "bridge_evt_recon_001",
        provider: "relay",
        providerRequestId: "relay_req_recon_001",
        depositIntentId: depositIntent.id,
        status: "destination_confirmed",
        idempotencyKey: "relay:recon:001",
        sourceChain: "tron",
        sourceTxHash: "tron_tx_recon_001",
        destinationChain: "polygon",
        destinationTxHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
        destinationWalletAddress: fixtures.wallet.smartWalletAddress,
        amount: {
          asset: "hUSD",
          chain: "settlement",
          decimals: 6,
          units: "24900000",
        },
        observedAt: "2026-05-25T00:08:00.000Z",
        createdAt: "2026-05-25T00:08:01.000Z",
      },
    ],
  });
  const handlers = createCashierHandlers({
    repo,
    providerAdapter: {},
    now: () => "2026-05-25T23:59:00.000Z",
  });

  const response = await handlers.generateReconciliationReport(
    { operatorId: "ops_ana", roles: ["cashier_operator"] },
    "2026-05-25",
  );
  assert.equal(response.status, 201);
  assert.equal(response.body.items.length, 1);
  assert.equal(response.body.items[0].status, "matched");

  const saved = await handlers.getReconciliationReport(
    { operatorId: "ops_ana", roles: ["cashier_operator"] },
    "2026-05-25",
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.body.id, response.body.id);

  const auditEvents = await repo.listAuditEventsBySubject(
    "reconciliation_report",
    response.body.id,
  );
  assert.equal(auditEvents[0].eventType, "cashier.reconciliation.completed");
  assert.equal(auditEvents[0].eventPayload.mismatchCount, 0);
});

test("operator runtime flag changes are allowlisted and audited", async () => {
  const repo = createInMemoryCashierRepository({
    runtimeFlags: fixtures.runtimeFlags,
  });
  const handlers = createCashierHandlers({
    repo,
    providerAdapter: {},
    now: () => "2026-05-25T00:30:00.000Z",
  });
  const operatorCtx = { operatorId: "ops_ana", roles: ["cashier_operator"] };

  assert.equal((await handlers.setRuntimeFlag({}, "withdrawals_enabled", {})).status, 403);
  assert.equal(
    (await handlers.setRuntimeFlag(operatorCtx, "unsupported_flag", {
      enabled: true,
      reason: "test",
    })).status,
    400,
  );
  assert.equal(
    (await handlers.setRuntimeFlag(operatorCtx, "withdrawals_enabled", {
      enabled: true,
    })).status,
    400,
  );

  const response = await handlers.setRuntimeFlag(
    operatorCtx,
    "withdrawals_enabled",
    {
      enabled: true,
      reason: "incident drill",
    },
  );
  assert.equal(response.status, 200);
  assert.equal(response.body.enabled, true);
  assert.equal(response.body.updatedBy, "ops_ana");

  const listed = await handlers.listRuntimeFlags(operatorCtx);
  assert.equal(listed.status, 200);
  assert.ok(
    listed.body.runtimeFlags.some(
      (flag) => flag.flagKey === "withdrawals_enabled" && flag.enabled === true,
    ),
  );

  const auditEvents = await repo.listAuditEventsBySubject(
    "runtime_flag",
    "withdrawals_enabled",
  );
  assert.equal(auditEvents.length, 1);
  assert.equal(auditEvents[0].eventType, "cashier.runtime_flag.changed");
  assert.equal(auditEvents[0].actorId, "ops_ana");
});

function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
}
