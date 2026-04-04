import type { BetSlipData } from "./list";

export const SAME_GAME_COMBO_FIXTURE_MISMATCH_CODE =
  "same_game_combo_fixture_mismatch";
export const SAME_GAME_COMBO_DUPLICATE_MARKET_CODE =
  "same_game_combo_duplicate_market";

const normalizeValue = (value?: string): string => `${value || ""}`.trim();

export const getSameGameComboValidationErrorCode = (
  bets: Array<BetSlipData>,
): string | null => {
  if (!bets.length) {
    return null;
  }

  const fixtureIDs = new Set<string>();
  const marketIDs = new Set<string>();

  for (const bet of bets) {
    const fixtureID = normalizeValue(bet.fixtureId).toLowerCase();
    if (fixtureID.length) {
      fixtureIDs.add(fixtureID);
    }

    const marketID = normalizeValue(bet.brandMarketId).toLowerCase();
    if (marketID.length) {
      if (marketIDs.has(marketID)) {
        return SAME_GAME_COMBO_DUPLICATE_MARKET_CODE;
      }
      marketIDs.add(marketID);
    }
  }

  if (fixtureIDs.size > 1) {
    return SAME_GAME_COMBO_FIXTURE_MISMATCH_CODE;
  }

  return null;
};
