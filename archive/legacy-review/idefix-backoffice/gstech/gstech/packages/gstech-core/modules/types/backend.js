/* @flow */
import type { PaymentProvider } from '../constants';
import type { Player } from './player';

export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'complete'
  | 'settled'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'accepted'
  | 'processing';
export type PaymentType = 'deposit' | 'withdraw' | 'compensation' | 'correction';

export type Brand = {
  name: string,
};

export type Account = {
  id: Id,
  playerId: Id,
  paymentMethodId: Id,
  account: string,
  accountHolder: ?string,
  parameters: any,
  withdrawals: boolean,
  kycChecked: boolean,
};

export type AccountWithParameters = {
  parameters: mixed,
} & Account;

export type BalanceResult = {
  realBalance: Money,
  totalBalance: Money,
  currencyId: string,
};

export type Balance = {
  balance: Money,
  bonusBalance: Money,
  numDeposits: number,
  currencyId: string,
  brandId: BrandId,
};

export type PlayerResult = Player & BalanceResult;

export type DepositStatus =
  | 'created'
  | 'pending'
  | 'complete'
  | 'settled'
  | 'failed'
  | 'expired'
  | 'cancelled';

export type DepositReference = {
  transactionKey: string,
};

export type Deposit = {
  paymentId: Id,
  playerId: Id,
  accountId: Id,
  username: string,
  timestamp: Date,
  transactionKey: string,
  paymentMethod: string,
  paymentProvider: PaymentProvider,
  status: DepositStatus,
  message: string,
  account: string,
  amount: Money,
  parameters: mixed,
  index: number,
  paymentFee: Money,
  paymentCost: Money,
  counterId: ?Id,
  counterValue: ?Money,
  counterTarget: ?Money,
  bonusId: ?Id,
  bonus: ?string,
};

export type Game = {
  id: Id,
  gameId: string,
  name: string,
  manufacturerId: string,
  manufacturerGameId: string,
  mobileGame: boolean,
  permalink: string,
};

export type GameWithBlockedCountries = {
  blockedCountries: CountryId[],
} & Game;

export type GameWithParameters = {
  parameters?: mixed,
} & Game;

export type GameManufacturer = {
  id: string,
  name: string,
  parentId?: string,
  license: string,
};

export type WithdrawalStatus =
  | 'created'
  | 'pending'
  | 'accepted'
  | 'processing'
  | 'complete'
  | 'failed'
  | 'expired'
  | 'cancelled';

export type Withdrawal = {
  paymentId: Id,
  transactionKey: UUID,
  timestamp: Date,
  accountId: Id,
  amount: Money,
  paymentFee: Money,
  status: WithdrawalStatus,
  account: string,
  playerId: Id,
  username: string,
  paymentMethodName: string,
  paymentProvider: ?PaymentProvider,
  paymentParameters: ?any,
  accountParameters: ?any,
};

export type Bonus = {
  id: Id,
  playerBonusId: ?Id,
  name: string,
  active: boolean,
  brandId: string,
  minAmount: Money,
  maxAmount: Money,
  depositBonus: boolean,
  depositCountMatch: boolean,
  depositCount: number,
  wageringRequirementMultiplier: number,
  depositMatchPercentage: number,
  archived: boolean,
};

export type BonusDraft = {
  name: string,
  minAmount: Money,
  maxAmount: Money,
  depositBonus: boolean,
  depositCount: number,
  depositCountMinimum: boolean,
  active: boolean,
  wageringRequirementMultiplier: number,
};

export type PartialLoginStatus = 'started' | 'verified' | 'completed' | 'failed';

export type PartialLogin = {
  id: Id,
  timestamp: Date,
  transactionKey: string,
  amount: Money,
  status: PartialLoginStatus,
  paymentMethod: PaymentProvider,
  languageId: string,
  currencyId: string,
  countryId?: string,
  playerId?: Id,
  ipAddress: IPAddress,
  tcVersion: number,
  affiliateRegistrationCode?: string,
  registrationSource?: string,
};

export type PartialLoginWithParameters = {
  ...PartialLogin,
  parameters: any,
};

export type ConversionRate = {
  currencyId: string,
  conversionRate: number,
};
