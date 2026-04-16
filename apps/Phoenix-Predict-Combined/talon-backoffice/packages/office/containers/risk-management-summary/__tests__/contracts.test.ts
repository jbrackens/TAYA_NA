import {
  buildPromoUsageQuery,
  DEFAULT_BREAKDOWN_LIMIT,
  normalizeRiskPlayerScore,
  normalizeRiskSegmentsResponse,
  normalizePromoUsageResponse,
  normalizeWalletCorrectionResponse,
  parsePromoUsageFiltersFromQuery,
} from "../contracts";

describe("risk management promo usage contracts", () => {
  test("parses filters from query with defaults", () => {
    const filters = parsePromoUsageFiltersFromQuery({
      userId: " user-1 ",
      freebetId: " fb-77 ",
      oddsBoostId: " ob-21 ",
      from: " 2026-03-05T00:00:00Z ",
      to: " 2026-03-05T23:59:59Z ",
      breakdownLimit: "50",
    });

    expect(filters).toEqual({
      userId: "user-1",
      freebetId: "fb-77",
      oddsBoostId: "ob-21",
      from: "2026-03-05T00:00:00Z",
      to: "2026-03-05T23:59:59Z",
      breakdownLimit: 50,
    });
  });

  test("builds api query payload with sanitized values", () => {
    const query = buildPromoUsageQuery({
      userId: "  ",
      freebetId: "fb-77",
      oddsBoostId: "",
      from: "",
      to: " 2026-03-05T23:59:59Z ",
      breakdownLimit: 0,
    });

    expect(query).toEqual({
      freebetId: "fb-77",
      to: "2026-03-05T23:59:59Z",
      breakdownLimit: DEFAULT_BREAKDOWN_LIMIT,
    });
  });

  test("normalizes promo usage response to stable shape", () => {
    const normalized = normalizePromoUsageResponse({
      summary: {
        totalBets: 10,
        totalStakeCents: "15000" as unknown as number,
        betsWithFreebet: 4,
        freebets: [
          {
            id: "fb-77",
            betCount: 3,
            totalStakeCents: 7000,
            totalFreebetAppliedCents: 2000,
          },
        ],
        oddsBoosts: [
          {
            id: "",
            betCount: 2,
            totalStakeCents: 5000,
            totalFreebetAppliedCents: 0,
          },
        ],
      },
    });

    expect(normalized.totalBets).toBe(10);
    expect(normalized.totalStakeCents).toBe(15000);
    expect(normalized.betsWithFreebet).toBe(4);
    expect(normalized.betsWithOddsBoost).toBe(0);
    expect(normalized.freebets).toEqual([
      {
        id: "fb-77",
        betCount: 3,
        totalStakeCents: 7000,
        totalFreebetAppliedCents: 2000,
      },
    ]);
    expect(normalized.oddsBoosts).toEqual([]);
  });

  test("normalizes wallet correction response to stable shape", () => {
    const normalized = normalizeWalletCorrectionResponse({
      items: [
        {
          taskId: "ct:1",
          userId: "u-1",
          type: "manual_review",
          status: "open",
          currentBalanceCents: 500,
          suggestedAdjustmentCents: 200,
          reason: "manual check",
        },
      ],
      summary: {
        open: 1,
        resolved: 0,
      },
    });

    expect(normalized.items).toHaveLength(1);
    expect(normalized.items[0].taskId).toBe("ct:1");
    expect(normalized.summary.open).toBe(1);
    expect(normalized.summary.resolved).toBe(0);
    expect(normalized.summary.total).toBe(0);
  });

  test("normalizes risk score and segments payloads", () => {
    const score = normalizeRiskPlayerScore({
      userId: "u-1",
      churnScore: "70" as unknown as number,
      ltvScore: 55,
      riskScore: 48,
      modelVersion: "risk-v1",
      generatedAt: "2026-03-05T09:00:00Z",
    });
    expect(score.userId).toBe("u-1");
    expect(score.churnScore).toBe(70);
    expect(score.modelVersion).toBe("risk-v1");

    const segments = normalizeRiskSegmentsResponse({
      items: [
        {
          userId: "u-1",
          segmentId: "vip",
          segmentReason: "value",
          riskScore: 12,
          hasManualOverride: false,
          generatedAt: "2026-03-05T09:00:00Z",
        },
        {
          userId: "",
          segmentId: "invalid",
          segmentReason: "",
          riskScore: 0,
          hasManualOverride: false,
          generatedAt: "",
        },
      ],
    });
    expect(segments).toHaveLength(1);
    expect(segments[0].segmentId).toBe("vip");
  });
});
