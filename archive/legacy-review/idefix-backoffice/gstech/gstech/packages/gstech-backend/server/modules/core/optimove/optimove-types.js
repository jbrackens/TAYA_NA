// @flow

export type OptimoveCustomer = {
  PlayerID: Id,
  RegisteredDate: Date,
  Email: string,
  MobilePhone: string,
  DateOfBirth: string,
  IsOptIn?: boolean,
  IsSMSOptIn?: boolean,
  IsEmailOptIn?: boolean,
  IsBlocked: boolean,
  IsTest: boolean,
  CasinoName: BrandId,
  Alias: string,
  Gender: ?string,
  Country: string,
  Currency: string,
  FirstName: string,
  LastName: string,
  ReferralType: ?string,
  AffiliateID: ?string,
  Language: string,
  RegisteredPlatform: ?string,
  Activated: boolean,
  AccountClosed: boolean,
  AccountSuspended: boolean,
  GamblingProblem: boolean,
  ExclusionLimit: boolean,
  TimeoutLimit: boolean,
  Balance?: number,
};

export type OptimoveTransactionType = 'deposit' | 'withdraw' | 'compensation' | 'correction';
export type OptimoveTransactionStatus =
  | 'created'
  | 'pending'
  | 'accepted'
  | 'processing'
  | 'complete'
  | 'settled'
  | 'failed'
  | 'expired'
  | 'cancelled';
export type OptimoveTransaction = {
  TransactionID: Id,
  PlayerID: Id,
  TransactionDate: Date,
  TransactionType: OptimoveTransactionType,
  TransactionAmount: number,
  Platform: string,
  Status: OptimoveTransactionStatus,
};

export type OptimoveGameType = {
  GameID: Id,
  GameName: string,
  GameCategory: string,
};

export type OptimoveGame = {
  GameRoundID: Id,
  GameDate: Date,
  GameID: Id,
  PlayerID: Id,
  Platform: string,
  RealBetAmount: Money,
  RealWinAmount: Money,
  BonusBetAmount: Money,
  BonusWinAmount: Money,
  NetGamingRevenue?: Money,
  NumberofRealBets: Integer,
  NumberofBonusBets: Integer,
  NumberofSessions?: Integer,
  NumberofRealWins: Integer,
  NumberofBonusWins: Integer,
};

export type OptimoveGameWithGameType = {
  ...OptimoveGame,
  GameType: OptimoveGameType,
};
