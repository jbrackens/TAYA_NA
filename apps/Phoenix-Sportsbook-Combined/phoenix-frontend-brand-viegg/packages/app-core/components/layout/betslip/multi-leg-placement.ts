import {
  FixedExoticQuoteRequest,
  FixedExoticType,
} from "../../../services/api/contracts";
import { BetSlipData } from "./list";

export const resolveFixedExoticType = (
  legsCount: number,
): FixedExoticType | null => {
  if (legsCount === 2) {
    return "exacta";
  }
  if (legsCount === 3) {
    return "trifecta";
  }
  return null;
};

export const buildFixedExoticQuoteRequest = (
  args: {
    userId: string;
    requestId: string;
    stakeCents: number;
  },
  bets: Array<BetSlipData>,
): FixedExoticQuoteRequest | null => {
  const userId = `${args.userId || ""}`.trim();
  const requestId = `${args.requestId || ""}`.trim();
  const exoticType = resolveFixedExoticType(bets.length);
  if (!userId || !requestId || !exoticType) {
    return null;
  }

  return {
    userId,
    requestId,
    exoticType,
    stakeCents: args.stakeCents,
    legs: bets.map((bet, index) => ({
      position: index + 1,
      marketId: bet.brandMarketId,
      selectionId: bet.selectionId,
      requestedOdds: bet.odds?.decimal || undefined,
    })),
  };
};
