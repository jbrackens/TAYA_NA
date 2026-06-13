import { BetType, BetOutcome, BetStatus, IdAndName } from "@phoenix-ui/utils";

export declare type TalonBetLeg = {
  id: string;
  fixture: {
    id: string;
    name: string;
    startTime: string;
  };
  market: IdAndName;
  selection: IdAndName;
  sport: IdAndName;
  competitor: IdAndName;
  tournament: IdAndName;
  odds: number;
  settledAt?: string;
  outcome?: BetOutcome;
  status: BetStatus;
  eventTime?: string;
};

export declare type TalonBet = {
  betId: string;
  transactionId?: string;
  betType: BetType;
  stake: {
    amount: number;
    currency: string;
  };
  settledAt?: string;
  cancelledAt?: string;
  odds: number;
  sports: IdAndName[];
  profitLoss?: number;
  legs: TalonBetLeg[];
  outcome?: BetOutcome;
};

export type TalonBets = TalonBet[];
