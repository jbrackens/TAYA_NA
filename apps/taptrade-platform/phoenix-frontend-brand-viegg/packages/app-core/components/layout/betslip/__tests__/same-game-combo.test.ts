import { BetSlipData } from "../list";
import {
  getSameGameComboValidationErrorCode,
  SAME_GAME_COMBO_DUPLICATE_MARKET_CODE,
  SAME_GAME_COMBO_FIXTURE_MISMATCH_CODE,
} from "../same-game-combo";

const createBet = (value: Partial<BetSlipData>): BetSlipData =>
  ({
    betslipId: "bet-1",
    brandMarketId: "m:local:001",
    marketName: "Match Winner",
    fixtureName: "Fixture",
    selectionId: "home",
    selectionName: "Home",
    odds: {
      american: "+100",
      decimal: 2,
      fractional: "1/1",
    },
    fixtureStatus: "open",
    fixtureId: "f:local:001",
    sportId: "football",
    ...value,
  } as BetSlipData);

describe("same-game-combo validation", () => {
  test("returns null when all legs are from one fixture and distinct markets", () => {
    const result = getSameGameComboValidationErrorCode([
      createBet({
        betslipId: "bet-1",
        brandMarketId: "m:local:001",
        fixtureId: "f:local:001",
      }),
      createBet({
        betslipId: "bet-2",
        brandMarketId: "m:local:002",
        fixtureId: "f:local:001",
        selectionId: "over",
      }),
    ]);

    expect(result).toBeNull();
  });

  test("returns duplicate-market code when market appears more than once", () => {
    const result = getSameGameComboValidationErrorCode([
      createBet({
        betslipId: "bet-1",
        brandMarketId: "m:local:001",
        selectionId: "home",
      }),
      createBet({
        betslipId: "bet-2",
        brandMarketId: "m:local:001",
        selectionId: "away",
      }),
    ]);

    expect(result).toBe(SAME_GAME_COMBO_DUPLICATE_MARKET_CODE);
  });

  test("returns fixture-mismatch code when legs span multiple fixtures", () => {
    const result = getSameGameComboValidationErrorCode([
      createBet({
        betslipId: "bet-1",
        brandMarketId: "m:local:001",
        fixtureId: "f:local:001",
      }),
      createBet({
        betslipId: "bet-2",
        brandMarketId: "m:local:004",
        fixtureId: "f:local:002",
      }),
    ]);

    expect(result).toBe(SAME_GAME_COMBO_FIXTURE_MISMATCH_CODE);
  });
});
