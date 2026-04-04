import { DisplayOdds } from "../common/odd";

export enum BetOutcomeEnum {
  WON = "WON",
  LOST = "LOST",
  CANCELLED = "cancelled",
  CASHED_OUT = "cashedOut",
}

export enum BetStatusEnum {
  OPEN = "OPEN",
  SETTLED = "SETTLED",
  RESETTLED = "RESETTLED",
  CANCELLED = "CANCELLED",
  PUSHED = "PUSHED",
  VOIDED = "VOIDED",
}

export enum BetResultEnum {
  WON = "WON",
  LOST = "LOST",
  CANCELLED = "CANCELLED",
  CASHED_OUT = "CASHED_OUT",
}

export type BetResult =
  | BetResultEnum.WON
  | BetResultEnum.LOST
  | BetResultEnum.CANCELLED
  | BetResultEnum.CASHED_OUT;

export type BetStatus =
  | BetStatusEnum.OPEN
  | BetStatusEnum.CANCELLED
  | BetStatusEnum.SETTLED
  | BetStatusEnum.RESETTLED
  | BetStatusEnum.VOIDED
  | BetStatusEnum.PUSHED;

export type BetOutcome =
  | BetOutcomeEnum.WON
  | BetOutcomeEnum.LOST
  | BetOutcomeEnum.CANCELLED
  | BetOutcomeEnum.CASHED_OUT
  | undefined;

export enum BetTypeEnum {
  SINGLE = "SINGLE",
  MULTI = "MULTI",
}

export type BetType = BetTypeEnum.SINGLE | BetTypeEnum.MULTI;

export type BetPart = {
  id: string;
  fixture: {
    id: string;
    name: string;
    startTime: string;
    status: string;
  };
  market: {
    id: string;
    name: string;
  };
  selection: {
    id: string;
    name: string;
  };
  sport: {
    name: string;
    id: string;
  };
  competitor: {
    id: string;
    name: string;
  };
  tournament: {
    id: string;
    name: string;
  };
  odds: number;
  displayOdds: DisplayOdds;
  placedAt?: string;
  outcome?: BetOutcome;
  status: BetStatus;
  eventTime?: string;
};

export type BetDetail = {
  betId: string;
  transactionId?: string;
  betType: BetType;
  stake: {
    amount: number;
    currency: string;
  };
  placedAt?: string;
  cancelledAt?: string;
  odds: number;
  displayOdds: DisplayOdds;
  sports: Array<{
    id: string;
    name: string;
  }>;
  profitLoss?: number;
  legs: Array<BetPart>;
  outcome?: BetOutcome;
};
