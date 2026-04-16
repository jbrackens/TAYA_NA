import usersReducer, {
  getUserRecentActivitiesSucceeded as getListRecentActivitiesSucceeded,
} from "../usersSlice";
import usersDetailsReducer, {
  getUserRecentActivitiesSucceeded as getDetailsRecentActivitiesSucceeded,
} from "../usersDetailsSlice";
import { TalonPunterActivityEnum } from "../../../types/punters.d";

describe("users recent activity normalization", () => {
  test("accepts legacy recent activity arrays", () => {
    const payload = [
      {
        id: "legacy-1",
        date: "2026-03-14T09:00:00Z",
        type: TalonPunterActivityEnum.BET_PLACEMENT,
        message: "Legacy bet placement",
        data: {
          unit: "$",
          amount: 10,
        },
      },
    ];

    const state = usersReducer(
      undefined,
      getListRecentActivitiesSucceeded(payload as any),
    );

    expect(state.recentActivities).toEqual(payload);
  });

  test("maps Go timeline payloads into Talon recent activity items", () => {
    const payload = {
      data: [
        {
          entry_id: "wallet-1",
          entry_type: "wallet_transaction",
          occurred_at: "2026-03-14T10:00:00Z",
          title: "Deposit approved",
          description: "Visa card payment",
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
        type: TalonPunterActivityEnum.BET_WON,
        message: "Deposit approved - Visa card payment",
        data: {
          unit: "$",
          amount: 25.5,
        },
      },
      {
        id: "verification-1",
        date: "2026-03-14T11:00:00Z",
        type: TalonPunterActivityEnum.SYSTEM_LOGIN,
        message: "Verification sent for review - Manual review pending",
        data: {
          ip: "manual_review",
        },
      },
    ]);
  });

  test("details slice uses the same normalization for Go timeline payloads", () => {
    const state = usersDetailsReducer(
      undefined,
      getDetailsRecentActivitiesSucceeded({
        data: [
          {
            entry_id: "bet-1",
            entry_type: "bet",
            occurred_at: "2026-03-14T12:00:00Z",
            title: "Bet placed",
            description: "EPL Match Odds",
            status: "placed",
            amount: "12",
            currency: "GBP",
          },
        ],
      } as any),
    );

    expect(state.recentActivities).toEqual([
      {
        id: "bet-1",
        date: "2026-03-14T12:00:00Z",
        type: TalonPunterActivityEnum.BET_PLACEMENT,
        message: "Bet placed - EPL Match Odds",
        data: {
          unit: "£",
          amount: 12,
        },
      },
    ]);
  });
});
