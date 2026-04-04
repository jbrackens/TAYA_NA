/* @flow */
const Transaction = require('./Transaction');
const routes = require('./routes');

export type CreateCompensation = { amount: Money };
const createCompensation = (playerId: Id, { amount }: CreateCompensation, tx: Knex): Promise<Id> =>
  Transaction.creditRealMoneyTransaction(playerId, {
    amount,
    type: 'wallet_compensation',
    manufacturerId: null,
    externalTransactionId: null,
    gameRoundId: null,
    playerBonusId: null,
  }, tx);

export type CreatePaymentFee = { amount: Money, targetTransactionId?: Id, externalTransactionId?: string };
const createPaymentFee = (playerId: Id, { amount, targetTransactionId, externalTransactionId }: CreatePaymentFee, tx: Knex): Promise<Id> =>
  Transaction.debitTransaction(playerId, {
    amount,
    subTransactionId: 0,
    targetTransactionId,
    bonusAmount: 0,
    type: 'wallet_transaction_fee',
    manufacturerId: null,
    externalTransactionId,
    gameRoundId: null,
    playerBonusId: null,
  }, tx);

export type RefundPaymentFee = { amount: Money };
const refundPaymentFee = (playerId: Id, { amount }: RefundPaymentFee, tx: Knex): Promise<Id> =>
  Transaction.creditTransaction(playerId, {
    amount,
    subTransactionId: 0,
    targetTransactionId: null,
    bonusAmount: 0,
    type: 'wallet_transaction_fee_return',
    manufacturerId: null,
    externalTransactionId: null,
    gameRoundId: null,
    playerBonusId: null,
  }, tx);

export type CreateCorrection = { amount: Money };
const createCorrection = (playerId: Id, { amount }: CreateCorrection, tx: Knex): Promise<Id> =>
  Transaction.creditRealMoneyTransaction(playerId, {
    amount,
    type: 'wallet_correction',
    manufacturerId: null,
    externalTransactionId: null,
    gameRoundId: null,
    playerBonusId: null,
  }, tx);

export type TurnBonusToReal = { bonusAmount: Money, gameRoundId: ?Id, playerBonusId: Id };
const turnBonusToReal = async (playerId: Id, { bonusAmount, gameRoundId, playerBonusId }: TurnBonusToReal, tx: Knex) => {
  await Transaction.turnBonusToRealTransaction(playerId, {
    playerBonusId,
    bonusAmount,
    gameRoundId,
    manufacturerId: null,
    externalTransactionId: null,
  }, tx);
};

export type Withdraw = { amount: Money };
const withdraw = (playerId: Id, { amount }: Withdraw, tx: Knex): Promise<Id> =>
  Transaction.debitReservedRealMoneyTransaction(playerId, {
    amount,
    type: 'wallet_withdrawal',
    manufacturerId: null,
    externalTransactionId: null,
    gameRoundId: null,
  }, tx);

export type Deposit = { amount: Money, externalTransactionId: string };
const deposit = (playerId: Id, { amount, externalTransactionId }: Deposit, tx: Knex$Transaction<any>): Promise<Id> =>
  Transaction.creditRealMoneyTransaction(playerId, {
    amount,
    type: 'wallet_deposit',
    manufacturerId: null,
    externalTransactionId,
    gameRoundId: null,
    playerBonusId: null,
  }, tx);

export type CompleteWithdrawal = { amount: Money, externalTransactionId: string };
const completeWithdrawal = (playerId: Id, { amount, externalTransactionId }: CompleteWithdrawal, tx: Knex$Transaction<any>): Promise<Id> =>
  Transaction.debitReservedMoneyTransaction(playerId, {
    amount,
    type: 'wallet_withdrawal_processed',
    manufacturerId: null,
    externalTransactionId,
  }, tx);

export type CreditBonus = { playerBonusId: Id, bonusAmount: Money };
const creditBonus = (playerId: Id, { playerBonusId, bonusAmount }: CreditBonus, tx: Knex): Promise<Id> =>
  Transaction.creditBonusTransaction(playerId, {
    playerBonusId,
    bonusAmount,
    type: 'bonus_credit',
    externalTransactionId: null,
    gameRoundId: null,
    manufacturerId: null,
  }, tx);

export type Win = {
  amount: Money,
  bonusAmount: Money,
  gameRoundId: Id,
  playerBonusId: ?Id,
  manufacturerId: string,
  externalTransactionId: string,
  subTransactionId: Id,
  type: 'win' | 'win_jackpot' | 'win_local_jackpot' | 'win_freespins'
};

const win = (playerId: Id, { type, amount, bonusAmount, gameRoundId, playerBonusId, manufacturerId, externalTransactionId, subTransactionId }: Win, tx: Knex$Transaction<any>): Promise<Id> =>
  Transaction.creditTransaction(playerId, {
    playerBonusId,
    bonusAmount,
    amount,
    type,
    gameRoundId,
    manufacturerId,
    externalTransactionId,
    subTransactionId,
    targetTransactionId: null,
  }, tx);

export type Bet = {
  amount: Money,
  bonusAmount: Money,
  playerBonusId: ?Id,
  gameRoundId: Id,
  manufacturerId: string,
  externalTransactionId: string,
  subTransactionId: Id,
};

const bet = (playerId: Id, { amount, bonusAmount, playerBonusId, gameRoundId, manufacturerId, externalTransactionId, subTransactionId }: Bet, tx: Knex): Promise<Id> =>
  Transaction.debitTransaction(playerId, {
    playerBonusId,
    amount,
    bonusAmount,
    type: 'bet',
    gameRoundId,
    manufacturerId,
    externalTransactionId,
    subTransactionId,
    targetTransactionId: null,
  }, tx);

export type ForfeitBonus = { bonusAmount: Money, playerBonusId: Id };
const forfeitBonus = (playerId: Id, { bonusAmount, playerBonusId }: ForfeitBonus, tx: Knex): Promise<Id> =>
  Transaction.debitBonusTransaction(playerId, {
    playerBonusId,
    bonusAmount,
    type: 'bonus_forfeit',
    manufacturerId: null,
    externalTransactionId: null,
    gameRoundId: null,
  }, tx);

export type ExpireBonus = { bonusAmount: Money, playerBonusId: Id };
const expireBonus = (playerId: Id, { bonusAmount, playerBonusId }: ExpireBonus, tx: Knex): Promise<Id> =>
  Transaction.debitBonusTransaction(playerId, {
    playerBonusId,
    bonusAmount,
    type: 'bonus_lost',
    manufacturerId: null,
    externalTransactionId: null,
    gameRoundId: null,
  }, tx);


module.exports = {
  createCompensation,
  createCorrection,
  turnBonusToReal,
  withdraw,
  creditBonus,
  win,
  deposit,
  bet,
  forfeitBonus,
  expireBonus,
  completeWithdrawal,
  createPaymentFee,
  refundPaymentFee,
  cancelTransaction: Transaction.cancelTransaction,
  getTransactions: Transaction.getTransactions,
  routes: {
    getTransactionsHandler: routes.getTransactions,
    getTransactionDatesHandler: routes.getTransactionDates,
    getTransactionSummaryHandler: routes.getTransactionsSummary,
  },
};
