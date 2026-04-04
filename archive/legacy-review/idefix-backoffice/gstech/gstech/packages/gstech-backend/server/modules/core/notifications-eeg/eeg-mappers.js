/* @flow */
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';
import type { Deposit, Withdrawal } from 'gstech-core/modules/types/backend';
import type { EEGPlayer, EEGDeposit, EEGWithdrawal } from './eeg-types';

const mapParameters = (parameters: ?Object) =>
  parameters
    ? Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, String(value)]))
    : null;

const mapEEGPlayer = (player: PlayerWithDetails): EEGPlayer => ({
  playerId: player.id,
  brandId: player.brandId,
  username: player.username,
  email: player.email,
  firstName: player.firstName,
  lastName: player.lastName,
  address: player.address,
  postCode: player.postCode,
  city: player.city,
  mobilePhone: player.mobilePhone,
  countryId: player.countryId,
  dateOfBirth: player.dateOfBirth,
  languageId: player.languageId,
  nationalId: player.nationalId,
  currencyId: player.currencyId,
  allowEmailPromotions: player.allowEmailPromotions,
  allowSMSPromotions: player.allowSMSPromotions,
  createdAt: new Date(player.createdAt).getTime(),
  activated: player.activated,
  verified: player.verified,
  selfExclusionEnd: player.selfExclusionEnd ? new Date(player.selfExclusionEnd).getTime() : null,
  allowGameplay: player.allowGameplay,
  allowTransactions: player.allowTransactions,
  loginBlocked: player.loginBlocked,
  accountClosed: player.accountClosed,
  accountSuspended: player.accountSuspended,
  numDeposits: player.numDeposits,
  testPlayer: player.testPlayer,
  gamblingProblem: player.gamblingProblem,
  tcVersion: player.tcVersion,
  partial: player.partial,
  tags: player.tags,
  placeOfBirth: player.placeOfBirth,
  nationality: player.nationality,
  additionalFields: player.additionalFields,
  registrationSource: player.registrationSource,
});

const mapEEGDeposit = (deposit: Deposit): EEGDeposit => ({
  paymentId: deposit.paymentId,
  playerId: deposit.playerId,
  accountId: deposit.accountId,
  timestamp: new Date(deposit.timestamp).getTime(),
  transactionKey: deposit.transactionKey,
  status: deposit.status,
  paymentParameters: mapParameters(deposit.parameters),
  accountParameters: {}, // mapParameters(deposit.accountParameters), // TODO: missing value
  counterId: deposit.counterId,
  counterTarget: deposit.counterTarget != null ? deposit.counterTarget / 100 : null,
  counterValue: deposit.counterValue != null ? deposit.counterValue / 100 : null,
  bonus: deposit.bonus,
  bonusId: deposit.bonusId,
  amount: deposit.amount / 100,
  paymentFee: deposit.paymentFee != null ? deposit.paymentFee / 100 : null,
  paymentCost: deposit.paymentCost != null ? deposit.paymentCost / 100 : null,
  paymentMethod: deposit.paymentMethod,
  paymentProvider: deposit.paymentProvider,
  index: deposit.index,
});

const mapEEGWithdrawal = (withdrawal: Withdrawal): EEGWithdrawal => ({
  paymentId: withdrawal.paymentId,
  playerId: withdrawal.playerId,
  accountId: withdrawal.accountId,
  account: withdrawal.account,
  timestamp: new Date(withdrawal.timestamp).getTime(),
  transactionKey: withdrawal.transactionKey,
  status: withdrawal.status,
  amount: withdrawal.amount / 100,
  paymentParameters: mapParameters(withdrawal.paymentParameters),
  accountParameters: mapParameters(withdrawal.accountParameters),
  paymentMethod: withdrawal.paymentMethodName,
  paymentProvider: withdrawal.paymentProvider,
});

module.exports = {
  mapEEGPlayer,
  mapEEGDeposit,
  mapEEGWithdrawal,
};
