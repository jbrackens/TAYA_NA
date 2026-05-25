export function createCashierHandlers({ repo, providerAdapter, now = () => new Date().toISOString() }) {
  return {
    async getWallet(ctx) {
      const auth = requireUser(ctx);
      if (!auth.ok) return auth;
      const wallet = await repo.getWalletByUserId(ctx.userId);
      if (!wallet) return json(503, { error: "wallet_unavailable" });
      return json(200, wallet);
    },

    async createDepositIntent(ctx, request) {
      const auth = requireUser(ctx);
      if (!auth.ok) return auth;
      const idempotency = requireIdempotencyKey(ctx);
      if (!idempotency.ok) return idempotency;

      const flagKey =
        request.rail === "tron-usdt-deposit-address"
          ? "tron_deposits_enabled"
          : "evm_deposits_enabled";
      const enabled = await isFlagEnabled(repo, flagKey);
      if (!enabled) return json(423, { error: "rail_disabled", flagKey });

      const existing = await repo.findDepositIntentByIdempotencyKey(ctx.userId, ctx.idempotencyKey);
      if (existing) return json(200, existing);

      const wallet = await repo.getWalletByUserId(ctx.userId);
      if (!wallet) return json(503, { error: "wallet_unavailable" });

      const route = await providerAdapter.createDepositRoute({
        userId: ctx.userId,
        wallet,
        rail: request.rail,
        settlementChain: request.settlementChain,
        idempotencyKey: ctx.idempotencyKey,
        now: now(),
      });
      const intent = {
        id: route.depositIntentId,
        userId: ctx.userId,
        rail: request.rail,
        status: route.depositAddress ? "address_issued" : "created",
        sourceChain: route.sourceChain,
        sourceAsset: route.sourceAsset,
        sourceDecimals: route.sourceDecimals,
        settlementChain: request.settlementChain,
        settlementAsset: route.settlementAsset,
        destinationWalletAddress: wallet.smartWalletAddress,
        provider: route.provider,
        providerRequestId: route.providerRequestId,
        ...(route.depositAddress ? { depositAddress: route.depositAddress } : {}),
        idempotencyKey: ctx.idempotencyKey,
        createdAt: route.createdAt,
        updatedAt: route.createdAt,
      };
      return json(201, await repo.saveDepositIntent(intent));
    },

    async getDepositIntent(ctx, id) {
      const auth = requireUser(ctx);
      if (!auth.ok) return auth;
      const intent = await repo.getDepositIntent(id);
      if (!intent || intent.userId !== ctx.userId) return json(404, { error: "deposit_intent_not_found" });
      return json(200, intent);
    },

    async createWithdrawalIntent(ctx, request) {
      const auth = requireUser(ctx);
      if (!auth.ok) return auth;
      const idempotency = requireIdempotencyKey(ctx);
      if (!idempotency.ok) return idempotency;
      if (!(await isFlagEnabled(repo, "withdrawals_enabled"))) {
        return json(423, { error: "rail_disabled", flagKey: "withdrawals_enabled" });
      }

      const existing = await repo.findWithdrawalIntentByIdempotencyKey(ctx.userId, ctx.idempotencyKey);
      if (existing) return json(200, existing);
      const wallet = await repo.getWalletByUserId(ctx.userId);
      if (!wallet) return json(503, { error: "wallet_unavailable" });

      const createdAt = now();
      const intent = {
        id: `wd_local_${stableSuffix(ctx.idempotencyKey)}`,
        userId: ctx.userId,
        status: "user_authorized",
        settlementChain: request.settlementChain,
        sourceWalletAddress: wallet.smartWalletAddress,
        destinationAddress: request.destinationAddress,
        amount: {
          asset: request.asset,
          chain: request.asset === "hUSD" ? "settlement" : request.settlementChain,
          decimals: request.asset === "USDT" && request.settlementChain === "bsc" ? 18 : 6,
          units: request.amountUnits,
        },
        idempotencyKey: ctx.idempotencyKey,
        userAuthorizationHash: request.userAuthorizationHash,
        userAuthorizationNonce: request.userAuthorizationNonce,
        userAuthorizationExpiresAt: request.userAuthorizationExpiresAt,
        createdAt,
        updatedAt: createdAt,
      };
      return json(201, await repo.saveWithdrawalIntent(intent));
    },

    async ingestProviderCallback(ctx, provider, event) {
      if (!(await isFlagEnabled(repo, "provider_callbacks_enabled"))) {
        return json(423, { error: "provider_callbacks_disabled" });
      }
      if (!ctx.providerSignatureVerified) {
        return json(401, { error: "invalid_provider_signature" });
      }
      const inserted = await repo.insertBridgeEvent({ ...event, provider });
      return json(inserted.inserted ? 202 : 200, {
        accepted: true,
        duplicate: !inserted.inserted,
        bridgeEventId: inserted.event.id,
      });
    },

    async listRecoveryCases(ctx, filter = {}) {
      const auth = requireOperator(ctx);
      if (!auth.ok) return auth;
      return json(200, { recoveryCases: await repo.listRecoveryCases(filter) });
    },

    async getRecoveryCase(ctx, id) {
      const auth = requireOperator(ctx);
      if (!auth.ok) return auth;
      const recoveryCase = await repo.getRecoveryCase(id);
      if (!recoveryCase) return json(404, { error: "recovery_case_not_found" });
      return json(200, recoveryCase);
    },

    async recordRecoveryApproval(ctx, recoveryCaseId, request) {
      const auth = requireOperator(ctx);
      if (!auth.ok) return auth;
      const recoveryCase = await repo.getRecoveryCase(recoveryCaseId);
      if (!recoveryCase) return json(404, { error: "recovery_case_not_found" });
      const createdAt = now();
      const approval = {
        id: `approval_local_${stableSuffix(`${recoveryCaseId}:${ctx.operatorId}:${request.approvalType}`)}`,
        recoveryCaseId,
        operatorId: ctx.operatorId,
        approvalType: request.approvalType,
        decision: request.decision,
        evidenceSha256: request.evidenceSha256,
        note: request.note,
        createdAt,
      };
      return json(201, await repo.recordRecoveryApproval(approval));
    },

    async getReconciliationReport(ctx, businessDate) {
      const auth = requireOperator(ctx);
      if (!auth.ok) return auth;
      const report = await repo.getReconciliationReportByBusinessDate(businessDate);
      if (!report) return json(404, { error: "reconciliation_report_not_found" });
      return json(200, report);
    },
  };
}

export async function isFlagEnabled(repo, flagKey) {
  const flag = await repo.getRuntimeFlag(flagKey);
  return Boolean(flag?.enabled);
}

function requireUser(ctx) {
  if (!ctx?.userId) return json(401, { error: "user_auth_required" });
  return { ok: true };
}

function requireOperator(ctx) {
  if (!ctx?.operatorId || !ctx.roles?.includes("cashier_operator")) {
    return json(403, { error: "operator_auth_required" });
  }
  return { ok: true };
}

function requireIdempotencyKey(ctx) {
  if (!ctx?.idempotencyKey) return json(400, { error: "idempotency_key_required" });
  return { ok: true };
}

function json(status, body) {
  return { ok: status >= 200 && status < 300, status, body };
}

function stableSuffix(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
