/* @flow */
import type { Player, PlayerWithDetails, PlayerDraft, PlayerDetailsUpdate } from '../types/player';
import type { Balance, Bonus, Game, GameManufacturer } from '../types/backend';

export type SessionToken = string;
export type GetCountriesResponse = Array<{
  id: string,
  name: string,
  minimumAge: number,
  blocked: boolean,
  registrationAllowed: boolean,
}>;

export type RequestRegistrationRequest = { mobilePhone: string };
export type RequestRegistrationResponse = { mobilePhone: string, pinCode: string };
export type CompleteRegistrationRequest = {
  playerDraft: PlayerDraft,
  mobilePhone: string,
  pinCode: string,
};
export type CompleteRegistrationResponse = {
  player: PlayerWithDetails,
  token: SessionToken,
  activationCode: UUID,
};

export type RequestLoginRequest = { mobilePhone?: string, email?: string };
export type RequestLoginResponse = { mobilePhone: string, pinCode: string };
export type CompleteLoginRequest = {
  mobilePhone?: string,
  email?: string,
  pinCode: string,
  ipAddress: IPAddress,
  userAgent: string,
};
export type CompleteLoginResponse = { player: PlayerWithDetails, token: string };

export type RequestPasswordResetRequest = {
  mobilePhone?: string,
  email?: string,
  dateOfBirth: string,
};
export type ValidatePasswordResetRequest = RequestPasswordResetRequest;
export type ValidatePasswordResetResponse = {
  ...OkResult,
  requireCaptcha: boolean,
  email?: string,
  number: string,
  verificationChannel: 'email' | 'sms'
}
export type RequestPasswordResetResponse = {
  email: string,
  mobilePhone: string,
  pinCode: string
};
export type CompletePasswordResetRequest = {
  mobilePhone?: string,
  email?: string,
  pinCode: string,
  newPassword: string,
};
export type CompletePasswordResetResponse = { mobilePhone: string, ...OkResult };

export type CreditFreeSpinsRequest = {
  bonusCode: string,
  permalink: string,
  id?: string,
  metadata?: Object,
  spinValue?: ?Money,
  spinType?: ?string,
  spinCount?: ?number
};

export type CreditFreeSpinsResponse = { ...OkResult, externalId?: string, expires?: Date };
export type CreateTransactionResponse = { transaction: string, balance: Balance };
export type CreditBonusResponse = { bonus: Bonus, balance: Balance };
export type GiveBonusResponse = { bonus: Bonus, balance: Balance };

export type ReportFraudResponse = { fraud: Id };

export type GetGamesResponse = Array<Game>;
export type GetGameManufacturerResponse = ?{ blockedCountries: string[], ...GameManufacturer };

export type PlayerUpdateDetailsDraft = PlayerDetailsUpdate;
export type PlayerUpdateDetailsResponse = Player;

export type CreditRealTxType =
  | 'wallet_deposit'
  | 'wallet_compensation'
  | 'wallet_correction'
  | 'win'
  | 'win_jackpot'
  | 'win_local_jackpot'
  | 'win_freespins'
  | 'wallet_transaction_fee_return'
  | 'cancel_bet';
export type CreditBonusTxType = 'bonus_credit';
export type DebitBonusTxType = 'bonus_forfeit' | 'bonus_lost';
export type DebitTxType = 'bet' | 'cancel_win' | 'wallet_transaction_fee';
export type CreditReservedRealMoneyTxType = 'wallet_cancel_withdrawal';
export type DebitReservedRealMoneyTxType = 'wallet_withdrawal';
export type DebitReservedMoneyTxType = 'wallet_withdrawal_processed';

export type TurnBonusToRealTxType = 'turn_bonus_to_real';
export type TxType =
  | CreditRealTxType
  | DebitTxType
  | CreditBonusTxType
  | CreditReservedRealMoneyTxType
  | DebitReservedMoneyTxType
  | DebitReservedMoneyTxType
  | TurnBonusToRealTxType;

export type Transaction = {
  transactionId: Id,
  date: Date,
  type: TxType,
  amount: Money,
  bonusAmount: Money,
  realBalance: Money,
  bonusBalance: Money,
  reservedBalance: Money,
  roundId: Id,
  externalRoundId: string,
  closed: boolean,
  externalTransactionId: string,
  bonus: string,
  description: string,
};

export type TransactionSummary = {
  gameId: string,
  name: string,
  manufacturer: string,
  realBets: number,
  bonusBets: number,
  realWins: number,
  bonusWins: number,
  betCount: number,
  averageBet: number,
  biggestWin: number,
};