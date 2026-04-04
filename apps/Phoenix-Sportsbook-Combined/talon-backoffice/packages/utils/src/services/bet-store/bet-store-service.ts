import { DisplayOdds } from "../..";

const BETS = "Bets";
const SUMMARY_VALUES = "SummaryValues";

export enum Status {
  Loading = "loading",
  Error = "error",
}

export enum BetReason {
  INSUFFICIENT_FUNDS = "insufficientFunds",
  STAKE_TOO_HIGH = "stakeTooHigh",
  SELECTION_ODDS_HAVE_CHANGED = "selectionOddsHaveChanged",
  NOT_BETTABLE = "marketNotBettable",
  CANNOT_BET = "punterCannotBet",
  MARKET_NOT_FOUND = "marketNotFound",
  PUNTER_DOES_NOT_EXIST = "punterProfileDoesNotExist",
  SELECTION_NOT_FOUND = "selectionNotFound",
  WALLET_NO_FOUND = "walletNotFound",
  RESERVATION_ALREADY_EXISTS = "reservationAlreadyExists",
}

export type Bet = {
  brandMarketId: string;
  marketName: string;
  fixtureName: string;
  selectionId: string;
  selectionName: string;
  odds: DisplayOdds;
  fixtureStatus: string;
  fixtureId: string;
  sportId: string;
  stake?: number;
  status?: Status | "";
  reason?: BetReason;
  betId?: string;
  areOddsUpdated?: boolean;
};

export type SelectedBed = {
  brandMarketId: string;
  selectionId: string;
  newOddsValue: DisplayOdds;
};

export type SummaryValues = {
  totalStake: number;
  possibleReturn: number;
  betValues: {
    [key: string]: {
      bet: number;
      toReturn: number;
    };
  };
  totalOdds: number;
  multiBetsPossibleReturn: number;
};

export type UseBets = {
  getBets: () => Array<Bet> | null;
  clearBets: () => void;
  saveBet: (newBet: Bet) => void;
  setBets: (bets: Array<Bet> | null) => void;
  setSummaryValues: (summaryValues: SummaryValues | null) => void;
  getSummaryValues: () => SummaryValues | null;
};

export const useBets = (): UseBets => {
  const getBets = () => {
    const bets = sessionStorage.getItem(BETS);
    return bets ? JSON.parse(bets) : bets;
  };

  const clearBets = () => sessionStorage.removeItem(BETS);

  const saveBet = (newBet: Bet) => {
    if (!newBet) {
      return;
    }
    const allBets = getBets();
    if (allBets) {
      sessionStorage.setItem(BETS, JSON.stringify([...allBets, newBet]));
    } else {
      sessionStorage.setItem(BETS, JSON.stringify([newBet]));
    }
  };

  const setBets = (bets: Array<Bet> | null) => {
    if (bets) {
      sessionStorage.setItem(BETS, JSON.stringify(bets));
    } else {
      sessionStorage.setItem(BETS, JSON.stringify([]));
    }
  };

  const setSummaryValues = (summaryValues: SummaryValues | null) => {
    if (summaryValues) {
      sessionStorage.setItem(SUMMARY_VALUES, JSON.stringify(summaryValues));
    } else {
      const emptySummaryValues = {
        totalStake: 0,
        possibleReturn: 0,
        betValues: {},
      };
      sessionStorage.setItem(
        SUMMARY_VALUES,
        JSON.stringify(emptySummaryValues),
      );
    }
  };

  const getSummaryValues = () => {
    const summaryValues = sessionStorage.getItem(SUMMARY_VALUES);
    return summaryValues ? JSON.parse(summaryValues) : summaryValues;
  };

  return {
    getBets,
    clearBets,
    saveBet,
    setBets,
    setSummaryValues,
    getSummaryValues,
  };
};
