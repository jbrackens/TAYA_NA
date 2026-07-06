import { describe, expect, it } from "vitest";
import { normalizeRecentActivities } from "../lib/utils/recent-activities";
import { TalonPunterActivityEnum } from "../types/punters";

describe("recent activity normalization", () => {
  it("coerces legacy currency timeline amounts to point units", () => {
    const activities = normalizeRecentActivities({
      data: [
        {
          entry_id: "wallet-1",
          entry_type: "wallet_transaction",
          occurred_at: "2026-03-14T10:00:00Z",
          title: "Point adjustment",
          description: "Admin grant",
          amount: "25.50",
          currency: "USD",
        },
        {
          entry_id: "prediction-1",
          entry_type: "bet",
          occurred_at: "2026-03-14T12:00:00Z",
          title: "Prediction placed",
          description: "MLBB final",
          status: "placed",
          amount: "12",
          currency: "GBP",
        },
      ],
    });

    expect(activities).toEqual([
      {
        id: "wallet-1",
        date: "2026-03-14T10:00:00Z",
        type: TalonPunterActivityEnum.PREDICTION_RESULT,
        message: "Point adjustment - Admin grant",
        data: {
          unit: "PTS",
          amount: 25.5,
        },
      },
      {
        id: "prediction-1",
        date: "2026-03-14T12:00:00Z",
        type: TalonPunterActivityEnum.PREDICTION_ORDER,
        message: "Prediction placed - MLBB final",
        data: {
          unit: "PTS",
          amount: 12,
        },
      },
    ]);
  });
});
