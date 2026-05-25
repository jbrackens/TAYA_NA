/**
 * Repository contract for the non-custodial cashier schema.
 *
 * This module intentionally starts with an in-memory implementation so local
 * handlers, dashboards, and mock E2E replay can be tested without credentials or
 * a database. A SQL implementation should preserve these method boundaries and
 * table ownership.
 */

export function createInMemoryCashierRepository(seed = {}) {
  const wallets = new Map((seed.wallets ?? []).map((wallet) => [wallet.userId, clone(wallet)]));
  const depositIntents = new Map(
    (seed.depositIntents ?? []).map((intent) => [intent.id, clone(intent)]),
  );
  const withdrawalIntents = new Map(
    (seed.withdrawalIntents ?? []).map((intent) => [intent.id, clone(intent)]),
  );
  const runtimeFlags = new Map(
    (seed.runtimeFlags ?? []).map((flag) => [flag.flagKey, clone(flag)]),
  );
  const recoveryCases = new Map(
    (seed.recoveryCases ?? []).map((recoveryCase) => [recoveryCase.id, clone(recoveryCase)]),
  );
  const recoveryApprovals = new Map(
    (seed.recoveryApprovals ?? []).map((approval) => [approval.id, clone(approval)]),
  );
  const bridgeEvents = new Map(
    (seed.bridgeEvents ?? []).map((event) => [event.idempotencyKey, clone(event)]),
  );
  const reconciliationReports = new Map(
    (seed.reconciliationReports ?? []).map((report) => [report.businessDate, clone(report)]),
  );

  return {
    async getWalletByUserId(userId) {
      return clone(wallets.get(userId));
    },

    async upsertWallet(wallet) {
      wallets.set(wallet.userId, clone(wallet));
      return clone(wallet);
    },

    async getRuntimeFlag(flagKey) {
      return clone(runtimeFlags.get(flagKey));
    },

    async listRuntimeFlags() {
      return [...runtimeFlags.values()].map(clone);
    },

    async setRuntimeFlag(flag) {
      runtimeFlags.set(flag.flagKey, clone(flag));
      return clone(flag);
    },

    async getDepositIntent(id) {
      return clone(depositIntents.get(id));
    },

    async findDepositIntentByIdempotencyKey(userId, idempotencyKey) {
      return clone(
        [...depositIntents.values()].find(
          (intent) => intent.userId === userId && intent.idempotencyKey === idempotencyKey,
        ),
      );
    },

    async saveDepositIntent(intent) {
      depositIntents.set(intent.id, clone(intent));
      return clone(intent);
    },

    async listDepositIntentsByUser(userId) {
      return [...depositIntents.values()]
        .filter((intent) => intent.userId === userId)
        .sort(descCreatedAt)
        .map(clone);
    },

    async getWithdrawalIntent(id) {
      return clone(withdrawalIntents.get(id));
    },

    async findWithdrawalIntentByIdempotencyKey(userId, idempotencyKey) {
      return clone(
        [...withdrawalIntents.values()].find(
          (intent) => intent.userId === userId && intent.idempotencyKey === idempotencyKey,
        ),
      );
    },

    async saveWithdrawalIntent(intent) {
      withdrawalIntents.set(intent.id, clone(intent));
      return clone(intent);
    },

    async listWithdrawalIntentsByUser(userId) {
      return [...withdrawalIntents.values()]
        .filter((intent) => intent.userId === userId)
        .sort(descCreatedAt)
        .map(clone);
    },

    async insertBridgeEvent(event) {
      if (bridgeEvents.has(event.idempotencyKey)) {
        return { inserted: false, event: clone(bridgeEvents.get(event.idempotencyKey)) };
      }
      bridgeEvents.set(event.idempotencyKey, clone(event));
      return { inserted: true, event: clone(event) };
    },

    async listBridgeEvents() {
      return [...bridgeEvents.values()].map(clone);
    },

    async listRecoveryCases(filter = {}) {
      return [...recoveryCases.values()]
        .filter((recoveryCase) =>
          Object.entries(filter).every(([key, value]) => value === undefined || recoveryCase[key] === value),
        )
        .sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt))
        .map(clone);
    },

    async getRecoveryCase(id) {
      return clone(recoveryCases.get(id));
    },

    async saveRecoveryCase(recoveryCase) {
      recoveryCases.set(recoveryCase.id, clone(recoveryCase));
      return clone(recoveryCase);
    },

    async recordRecoveryApproval(approval) {
      recoveryApprovals.set(approval.id, clone(approval));
      return clone(approval);
    },

    async listRecoveryApprovals(recoveryCaseId) {
      return [...recoveryApprovals.values()]
        .filter((approval) => approval.recoveryCaseId === recoveryCaseId)
        .map(clone);
    },

    async getReconciliationReportByBusinessDate(businessDate) {
      return clone(reconciliationReports.get(businessDate));
    },
  };
}

function descCreatedAt(a, b) {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

function clone(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}
