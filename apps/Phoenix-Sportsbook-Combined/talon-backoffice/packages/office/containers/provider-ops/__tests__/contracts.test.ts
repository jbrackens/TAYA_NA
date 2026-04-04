import {
  buildBetInterventionAuditLogQuery,
  buildProviderAcknowledgementSLAAuditLogQuery,
  buildBetInterventionPayload,
  buildProviderAcknowledgementSLAUpdatePayload,
  buildProviderAcknowledgementAuditLogQuery,
  buildProviderCancelPayload,
  buildProviderStreamAcknowledgementPayload,
  buildStreamKey,
  buildProviderStreamAuditLogQuery,
  canSubmitBetIntervention,
  canSubmitProviderCancel,
  computeStreamBreaches,
  computeAcknowledgementStaleness,
  computeStreamRiskScore,
  computeStreamRiskSummary,
  createDefaultBetInterventionForm,
  normalizeProviderAcknowledgementSLASettings,
  isStreamUnhealthy,
  normalizeProviderStreamAcknowledgements,
  normalizeFeedHealthResponse,
  resolveProviderAcknowledgementSLAThresholds,
  sortStreamsByRisk,
} from "../contracts";

describe("provider-ops contracts", () => {
  test("normalizes feed health payload into stable view state", () => {
    const normalized = normalizeFeedHealthResponse({
      enabled: true,
      thresholds: {
        maxLagMs: 15000,
      },
      summary: {
        unhealthyStreams: 2,
      },
      cancel: {
        totalFailed: 3,
      },
      streams: [
        {
          adapter: "odds88",
          stream: "delta",
          state: "running",
          lastLagMs: 10,
        },
        {
          adapter: "",
          stream: "metadata",
        },
      ],
    });

    expect(normalized.enabled).toBe(true);
    expect(normalized.thresholds.maxLagMs).toBe(15000);
    expect(normalized.thresholds.maxGapCount).toBe(0);
    expect(normalized.summary.unhealthyStreams).toBe(2);
    expect(normalized.cancel.totalFailed).toBe(3);
    expect(normalized.streams).toHaveLength(1);
    expect(normalized.streams[0].adapter).toBe("odds88");
  });

  test("builds and validates provider cancel payload", () => {
    const payload = buildProviderCancelPayload({
      adapter: " odds88 ",
      playerId: " user-1 ",
      betId: " bet-1 ",
      requestId: " req-1 ",
      reason: "",
    });

    expect(payload).toEqual({
      adapter: "odds88",
      playerId: "user-1",
      betId: "bet-1",
      requestId: "req-1",
      reason: "manual provider cancel",
    });
    expect(canSubmitProviderCancel(payload)).toBe(true);
    expect(
      canSubmitProviderCancel({
        ...payload,
        adapter: "",
      }),
    ).toBe(false);
  });

  test("builds settle intervention payload and validates required fields", () => {
    const settleForm = {
      ...createDefaultBetInterventionForm(),
      betId: "bet-1",
      action: "settle" as const,
      reason: "manual settle",
      winningSelectionId: "sel-9",
      winningSelectionName: "Home",
      resultSource: "ops_console",
    };
    expect(canSubmitBetIntervention(settleForm)).toBe(true);
    expect(buildBetInterventionPayload(settleForm)).toEqual({
      reason: "manual settle",
      winningSelectionId: "sel-9",
      winningSelectionName: "Home",
      resultSource: "ops_console",
    });
  });

  test("maps intervention action to audit-log query contract", () => {
    expect(buildBetInterventionAuditLogQuery("cancel")).toEqual({
      action: "bet.cancelled",
      p: 1,
      limit: 20,
    });
    expect(buildBetInterventionAuditLogQuery("settle")).toEqual({
      action: "bet.settled",
      p: 1,
      limit: 20,
    });
  });

  test("builds provider stream audit query by stream health state", () => {
    expect(
      buildProviderStreamAuditLogQuery({
        adapter: "odds88",
        state: "error",
        lastError: "downstream timeout",
      }),
    ).toEqual({
      action: "provider.cancel.failed",
      actorId: "odds88",
      p: 1,
      limit: 20,
    });

    expect(
      buildProviderStreamAuditLogQuery({
        adapter: "odds88",
        state: "running",
        lastError: "",
      }),
    ).toEqual({
      action: "provider.cancel.succeeded",
      actorId: "odds88",
      p: 1,
      limit: 20,
    });
  });

  test("builds acknowledgement audit query and computes stale buckets", () => {
    expect(
      buildProviderAcknowledgementAuditLogQuery(
        {
          adapter: "odds88",
          stream: "settlement",
        },
        {
          lastAction: "reassigned",
        },
      ),
    ).toEqual({
      preset: "provider-reassigned",
      action: "provider.stream.reassigned",
      targetId: "odds88:settlement",
      p: 1,
      limit: 20,
    });

    expect(
      computeAcknowledgementStaleness("2026-03-05T10:00:00Z", new Date("2026-03-05T10:10:00Z")),
    ).toBe("fresh");
    expect(
      computeAcknowledgementStaleness("2026-03-05T10:00:00Z", new Date("2026-03-05T10:20:00Z")),
    ).toBe("warning");
    expect(
      computeAcknowledgementStaleness("2026-03-05T10:00:00Z", new Date("2026-03-05T10:40:00Z")),
    ).toBe("critical");
    expect(
      computeAcknowledgementStaleness(
        "2026-03-05T10:00:00Z",
        new Date("2026-03-05T10:20:00Z"),
        { warningMinutes: 5, criticalMinutes: 10 },
      ),
    ).toBe("critical");
    expect(buildProviderAcknowledgementSLAAuditLogQuery()).toEqual({
      preset: "provider-ack-sla-default",
      action: "provider.stream.sla.default.updated",
      targetId: "provider.stream.sla.default",
      p: 1,
      limit: 20,
    });
    expect(buildProviderAcknowledgementSLAAuditLogQuery("odds88")).toEqual({
      preset: "provider-ack-sla-adapter",
      action: "provider.stream.sla.adapter.updated",
      targetId: "odds88",
      p: 1,
      limit: 20,
    });
  });

  test("builds stable stream keys for ack ownership map", () => {
    expect(
      buildStreamKey({
        adapter: " odds88 ",
        stream: " settlement ",
      }),
    ).toBe("odds88:settlement");
  });

  test("builds acknowledgement payload and normalizes persisted acknowledgements", () => {
    const payload = buildProviderStreamAcknowledgementPayload(
      {
        adapter: "odds88",
        stream: "settlement",
      },
      " ops.user.1 ",
      " investigating stream ",
    );
    expect(payload).toEqual({
      streamKey: "odds88:settlement",
      adapter: "odds88",
      stream: "settlement",
      action: "acknowledge",
      operator: "ops.user.1",
      note: "investigating stream",
    });

    const resolvePayload = buildProviderStreamAcknowledgementPayload(
      {
        adapter: "odds88",
        stream: "settlement",
      },
      "ops.user.1",
      "resolved stream incident",
      "resolve",
    );
    expect(resolvePayload.action).toBe("resolve");

    expect(
      normalizeProviderStreamAcknowledgements({
        items: [
          {
            streamKey: "odds88:settlement",
            operator: "ops.user.1",
            note: "investigating stream",
            status: "resolved",
            lastAction: "resolved",
            acknowledgedAt: "2026-03-05T15:00:00Z",
          },
        ],
      }),
    ).toEqual({
      "odds88:settlement": {
        streamKey: "odds88:settlement",
        adapter: "odds88",
        stream: "settlement",
        operator: "ops.user.1",
        note: "investigating stream",
        status: "resolved",
        lastAction: "resolved",
        acknowledgedAt: "2026-03-05T15:00:00Z",
      },
    });
  });

  test("normalizes and resolves provider acknowledgement SLA settings", () => {
    const normalized = normalizeProviderAcknowledgementSLASettings({
      default: {
        warningMinutes: 15,
        criticalMinutes: 30,
      },
      overrides: [
        {
          adapter: "odds88",
          warningMinutes: 8,
          criticalMinutes: 16,
        },
      ],
      effective: [
        {
          adapter: "odds88",
          warningMinutes: 8,
          criticalMinutes: 16,
          source: "override",
        },
      ],
    });

    expect(normalized.defaultSetting.warningMinutes).toBe(15);
    expect(normalized.defaultSetting.criticalMinutes).toBe(30);
    expect(normalized.overrides).toHaveLength(1);
    expect(
      resolveProviderAcknowledgementSLAThresholds("odds88", normalized),
    ).toEqual({
      warningMinutes: 8,
      criticalMinutes: 16,
    });
    expect(
      resolveProviderAcknowledgementSLAThresholds("betby", normalized),
    ).toEqual({
      warningMinutes: 15,
      criticalMinutes: 30,
    });

    expect(
      buildProviderAcknowledgementSLAUpdatePayload("odds88", 9, 18),
    ).toEqual({
      adapter: "odds88",
      warningMinutes: 9,
      criticalMinutes: 18,
    });
  });

  test("computes stream threshold breaches and unhealthy state", () => {
    const thresholds = {
      maxLagMs: 100,
      maxGapCount: 0,
      maxDuplicateCount: 3,
    };
    const stream = {
      adapter: "odds88",
      stream: "delta",
      state: "running",
      applied: 1,
      skipped: 0,
      replayCount: 0,
      duplicateCount: 4,
      gapCount: 1,
      errorCount: 0,
      lastLagMs: 120,
      lastRevision: 1,
      lastSequence: 1,
      lastEventAt: "",
      lastError: "",
      updatedAt: "",
    };

    const breaches = computeStreamBreaches(stream, thresholds);
    expect(breaches).toEqual({
      lag: true,
      gap: true,
      duplicate: true,
      error: false,
    });
    expect(isStreamUnhealthy(stream, thresholds)).toBe(true);
  });

  // M3-S4: multi-leg settle guard contract tests
  test("canSubmitBetIntervention rejects settle without required fields", () => {
    const incompleteSettle = {
      ...createDefaultBetInterventionForm(),
      betId: "bet-1",
      action: "settle" as const,
      reason: "manual settle",
      winningSelectionId: "",
    };
    expect(canSubmitBetIntervention(incompleteSettle)).toBe(false);
  });

  test("canSubmitBetIntervention accepts cancel for any bet type", () => {
    const cancelForm = {
      ...createDefaultBetInterventionForm(),
      betId: "bet-parlay-1",
      action: "cancel" as const,
      reason: "multi-leg cancel",
    };
    expect(canSubmitBetIntervention(cancelForm)).toBe(true);
  });

  test("canSubmitBetIntervention accepts refund for any bet type", () => {
    const refundForm = {
      ...createDefaultBetInterventionForm(),
      betId: "bet-parlay-1",
      action: "refund" as const,
      reason: "multi-leg refund",
    };
    expect(canSubmitBetIntervention(refundForm)).toBe(true);
  });

  test("buildBetInterventionPayload produces cancel payload without settle fields", () => {
    const cancelForm = {
      ...createDefaultBetInterventionForm(),
      betId: "bet-parlay-1",
      action: "cancel" as const,
      reason: "operator cancelled",
    };
    const payload = buildBetInterventionPayload(cancelForm);
    expect(payload).toEqual({ reason: "operator cancelled" });
    expect(payload).not.toHaveProperty("winningSelectionId");
    expect(payload).not.toHaveProperty("resultSource");
  });

  test("buildBetInterventionPayload produces refund payload without settle fields", () => {
    const refundForm = {
      ...createDefaultBetInterventionForm(),
      betId: "bet-1",
      action: "refund" as const,
      reason: "provider refund",
    };
    const payload = buildBetInterventionPayload(refundForm);
    expect(payload).toEqual({ reason: "provider refund" });
  });

  test("sorts streams by computed risk score and summarizes breach counts", () => {
    const thresholds = {
      maxLagMs: 100,
      maxGapCount: 0,
      maxDuplicateCount: 3,
    };
    const streams = [
      {
        adapter: "odds88",
        stream: "healthy",
        state: "running",
        applied: 1,
        skipped: 0,
        replayCount: 0,
        duplicateCount: 0,
        gapCount: 0,
        errorCount: 0,
        lastLagMs: 50,
        lastRevision: 1,
        lastSequence: 1,
        lastEventAt: "",
        lastError: "",
        updatedAt: "",
      },
      {
        adapter: "odds88",
        stream: "degraded",
        state: "running",
        applied: 1,
        skipped: 0,
        replayCount: 0,
        duplicateCount: 5,
        gapCount: 1,
        errorCount: 0,
        lastLagMs: 150,
        lastRevision: 1,
        lastSequence: 1,
        lastEventAt: "",
        lastError: "",
        updatedAt: "",
      },
      {
        adapter: "odds88",
        stream: "erroring",
        state: "error",
        applied: 1,
        skipped: 0,
        replayCount: 0,
        duplicateCount: 0,
        gapCount: 0,
        errorCount: 3,
        lastLagMs: 90,
        lastRevision: 1,
        lastSequence: 1,
        lastEventAt: "",
        lastError: "failure",
        updatedAt: "",
      },
    ];

    const sorted = sortStreamsByRisk(streams, thresholds);
    expect(sorted.map((stream) => stream.stream)).toEqual([
      "erroring",
      "degraded",
      "healthy",
    ]);

    const highestRisk = computeStreamRiskScore(sorted[0], thresholds);
    const nextRisk = computeStreamRiskScore(sorted[1], thresholds);
    expect(highestRisk).toBeGreaterThan(nextRisk);

    const summary = computeStreamRiskSummary(streams, thresholds);
    expect(summary).toEqual({
      lag: 1,
      gap: 1,
      duplicate: 1,
      error: 1,
      unhealthy: 2,
      healthy: 1,
    });
  });
});
