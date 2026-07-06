import usersReducer, {
  getUserRecentActivitiesSucceeded as getListRecentActivitiesSucceeded,
} from "../lib/slices/usersSlice";
import usersDetailsReducer, {
  getUserRecentActivitiesSucceeded as getDetailsRecentActivitiesSucceeded,
} from "../lib/slices/usersDetailsSlice";
import { OfficePunterActivityEnum } from "../types/punters";

describe("users recent activity normalization", () => {
  it("accepts legacy recent activity arrays and emits prediction-native types", () => {
    const payload = [
      {
        id: "legacy-1",
        date: "2026-03-14T09:00:00Z",
        type: "BET_PLACEMENT",
        message: "Legacy prediction order",
        data: {
          unit: "PTS",
          amount: 10,
        },
      },
    ];

    const state = usersReducer(
      undefined,
      getListRecentActivitiesSucceeded(payload as any),
    );

    expect(state.recentActivities).toEqual([
      {
        ...payload[0],
        type: OfficePunterActivityEnum.PREDICTION_ORDER,
      },
    ]);
  });

  it("maps Go timeline payloads into office recent activity items", () => {
    const payload = {
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
          entry_id: "verification-1",
          entry_type: "verification_session",
          occurred_at: "2026-03-14T11:00:00Z",
          title: "Verification sent for review",
          description: "Manual review pending",
          metadata: {
            providerDecision: "manual_review",
          },
        },
      ],
    };

    const state = usersReducer(
      undefined,
      getListRecentActivitiesSucceeded(payload as any),
    );

    expect(state.recentActivities).toEqual([
      {
        id: "wallet-1",
        date: "2026-03-14T10:00:00Z",
        type: OfficePunterActivityEnum.PREDICTION_RESULT,
        message: "Point adjustment - Admin grant",
        data: {
          unit: "PTS",
          amount: 25.5,
        },
      },
      {
        id: "verification-1",
        date: "2026-03-14T11:00:00Z",
        type: OfficePunterActivityEnum.SYSTEM_LOGIN,
        message: "Verification sent for review - Manual review pending",
        data: {
          ip: "manual_review",
        },
      },
    ]);
  });

  it("details slice uses the same normalization for Go timeline payloads", () => {
    const state = usersDetailsReducer(
      undefined,
      getDetailsRecentActivitiesSucceeded({
        data: [
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
      } as any),
    );

    expect(state.recentActivities).toEqual([
      {
        id: "prediction-1",
        date: "2026-03-14T12:00:00Z",
        type: OfficePunterActivityEnum.PREDICTION_ORDER,
        message: "Prediction placed - MLBB final",
        data: {
          unit: "PTS",
          amount: 12,
        },
      },
    ]);
  });
});
