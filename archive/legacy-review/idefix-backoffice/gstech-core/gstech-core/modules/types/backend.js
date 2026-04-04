/* @flow */
import type { PaymentProvider } from '../constants';
import type { Player } from './player';

export type Brand = {|
  name: string,
|};

export type Account = {|
  playerId: Id,
  paymentMethodId: Id,
  account: string,
  accountHolder: ?string,
  parameters: any,
  withdrawals: boolean,
  kycChecked: boolean,
|};

export type BalanceResult = {|
  realBalance: Money,
  totalBalance: Money,
  currencyId: string,
|};

export type Balance = {|
  balance: Money,
  bonusBalance: Money,
  numDeposits: number,
  currencyId: string,
  brandId: BrandId,
|};

export type PlayerResult = Player & BalanceResult;

export type DepositStatus = 'created' | 'pending' | 'complete' | 'settled' | 'failed' | 'expired' | 'cancelled';

export type DepositReference = {|
  transactionKey: string
|};

export type Deposit = {|
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
  amount: Money,
  parameters: mixed,
  index: number,
  paymentFee: number,
  counterId: ?Id,
  counterValue: ?Money,
  counterTarget: ?Money,
|} & DepositReference;

export type WithdrawalStatus = 'created' | 'pending' | 'accepted' | 'processing' | 'complete' | 'failed' | 'expired' | 'cancelled';

export type Withdrawal = {|
  paymentId: Id,
  transactionKey: UUID,
  timestamp: Date,
  accountId: Id,
  amount: Money,
  status: WithdrawalStatus,
  account: string,
  playerId: Id,
  username: string,
  paymentMethodName: string,
  paymentProvider: ?PaymentProvider,
  paymentParameters: ?any,
  accountParameters: ?any,
|};
