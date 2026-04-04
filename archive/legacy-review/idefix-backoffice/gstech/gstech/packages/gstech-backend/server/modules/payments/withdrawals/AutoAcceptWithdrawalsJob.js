/* @flow */
const { acceptWithdrawal, getPendingWithdrawalsReadyToAccept } = require('./Withdrawal');
const { WITHDRAWAL_ACCEPT_DELAY_HOURS } = require('./constants');

const update = async () => {
  const withdrawals = await getPendingWithdrawalsReadyToAccept(WITHDRAWAL_ACCEPT_DELAY_HOURS);
  await Promise.all(withdrawals.map(withdrawal => acceptWithdrawal(
    withdrawal.transactionKey,
    withdrawal.paymentProviderId,
    withdrawal.amount,
    withdrawal.userId,
    withdrawal.playerId,
    withdrawal.parameters,
  )));
};

module.exports = { update };
