/* @flow */
import type { Withdrawal } from 'gstech-core/modules/types/backend';
import type { RiskProfile } from 'gstech-core/modules/types/player';
import type { WageringCounterType } from '../../limits/Counter';
import type { PlayerBonus } from '../../bonuses/Bonus';

const { brandDefinitions } = require('gstech-core/modules/constants')

const logger = require('gstech-core/modules/logger');
const { v1: uuid } = require('uuid');
const times = require('lodash/fp/times');
const sortBy = require('lodash/fp/sortBy');
const pg = require('gstech-core/modules/pg');
const slack = require('gstech-core/modules/slack');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const {
  getAccountStatus,
  getBalance,
  getPlayerById,
  getPlayerIdefixUrl,
  getSowClearanceState,
} = require('../../players');
const { doMaintenance } = require('../../bonuses');
const { getWageringRequirementCounter } = require('../../limits');
const transactions = require('../../transactions');
const { getAccount } = require('../../accounts');
const { addPaymentEvent } = require('../Payment');
const { validateWithdrawal } = require('../validate');
const Notification = require('../../core/notifications');
const EEG = require('../../core/notifications-eeg');
const Optimove = require('../../core/optimove');
const { formatMoney } = require('../../core/money');
const { getWdMethods } = require('./WithdrawalInfo');
const { addPlayerFraudTx } = require('../../frauds');
const { validateProviderAccount } = require('../validate');
const User = require('../../users/User');
const { WITHDRAWAL_CAN_ACCEPT_DELAY_HOURS, WITHDRAWAL_ACCEPT_DELAY_HOURS } = require('./constants');
const { getActiveCounters } = require('../../limits/Counter');
const { getActiveBonuses } = require('../../bonuses');
const { getWithdrawalFeeConfiguration } = require('./calculator');

const WITHDRAWAL_LIMIT = 2000;

const getCancellationStatuses = async (tx: Knex, userId?: number): Promise<string[]> => {
  const user = userId && await User.getById(userId).transacting(tx);

  if (user && user.paymentAccess) return ['pending', 'processing', 'accepted'];
  return ['pending'];
};

const addWithdrawal = async (playerId: Id, sessionId: ?Id, accountIdx: Id, amount: Money, paymentFee: ?Money, message: ?string, userId: ?Id, parameters: mixed, tx: Knex): Promise<any> => {
  const transactionKey = uuid();
  const player = await getPlayerById(playerId);
  const { paymentMethodId, id: accountId } = await getAccount(accountIdx).where({ playerId });
  const transactionId = await transactions.withdraw(playerId, { amount }, tx);
  const [{ id: paymentId }] = await tx('payments')
    .insert({
      transactionKey,
      transactionId,
      playerId,
      accountId,
      paymentMethodId,
      amount,
      paymentType: 'withdraw',
      status: 'pending',
      paymentFee,
      parameters,
      sessionId,
    })
    .returning('id');
  if (paymentFee != null) {
    const paymentFeeId = await transactions.createPaymentFee(playerId, {
      amount: paymentFee,
    }, tx);
    await addPaymentEvent(playerId, 'withdraw', paymentId, userId, paymentFee, 'created', `Payment fee ${formatMoney(paymentFee)}`, null, paymentFeeId, tx);
  }
  await addPaymentEvent(playerId, 'withdraw', paymentId, userId, amount, 'pending', message, null, transactionId, tx);
  await EEG.notifyPlayerWithdrawal(playerId, paymentId, tx);
  await Optimove.notifyPlayerWithdrawal(playerId, paymentId, tx);

  slack.logMessage(
    brandDefinitions[player.brandId].site,
    ['Withdraw', getPlayerIdefixUrl(player.username, player.brandId), ':money_with_wings: :', formatMoney(amount, player.currencyId)].join(' '),
    {},
    'warning'
  );
  return transactionKey;
};

const createWithdrawal = async (playerId: Id, sessionId: ?Id, accountId: Id, amount: Money, paymentFee: ?Money): Promise<string> =>
  pg.transaction(async (tx) => {
    const counters = await getWageringRequirementCounter(playerId);
    if (counters.limit > 0 && counters.type !== 'deposit_wager') {
      return Promise.reject({ error: errorCodes.WITHDRAWAL_FAILED_REQUIREMENTS_NOT_MET });
    }

    const { balance, bonusBalance } = await getBalance(playerId).transacting(tx).forUpdate();
    if (bonusBalance > 0) {
      return Promise.reject({ error: errorCodes.WITHDRAWAL_FAILED_BONUS_ACTIVE });
    }

    if (balance < amount) {
      return Promise.reject({ error: errorCodes.WITHDRAWAL_FAILED_NOT_ENOUGH_BALANCE });
    }
    const withdrawalId = await addWithdrawal(playerId, sessionId, accountId, amount, paymentFee, null, null, null, tx);
    return withdrawalId;
  });


const processWithdrawal = async (transactionKey: string, message: string, rawTransaction: any, parameters: mixed = {}, userId?: ?Id = null): Promise<boolean> =>
  pg.transaction(async (tx) => {
    const payment = await tx('payments').first('playerId', 'id', 'amount', 'externalTransactionId').where({
      transactionKey,
      status: 'accepted',
      paymentType: 'withdraw',
    }).forUpdate();
    if (payment == null) {
      return false;
    }

    await tx('payments').update({
      status: 'processing',
      parameters,
    }).where({ id: payment.id });

    await addPaymentEvent(payment.playerId, 'withdraw', payment.id, userId, null, 'processing', message, rawTransaction, null, tx);
    await EEG.notifyPlayerWithdrawal(payment.playerId, payment.id, tx);
    await Optimove.notifyPlayerWithdrawal(payment.playerId, payment.id, tx);
    return true;
  });

const markWithdrawalAsComplete = async (transactionKey: string, externalTransactionId: string, message: string, rawTransaction: any, paymentCost?: Money): Promise<boolean> =>
  pg.transaction(async (tx) => {
    const payment = await tx('payments').first('playerId', 'id', 'amount', 'externalTransactionId').where({
      transactionKey,
      status: 'processing',
      paymentType: 'withdraw',
    }).forUpdate();
    if (payment != null) {
      const { amount, playerId, id } = payment;
      const transactionId = await transactions.completeWithdrawal(playerId, { amount, externalTransactionId }, tx);
      const updated: number = await tx('payments').update({ status: 'complete', externalTransactionId, transactionId, paymentCost }).where({ id, status: 'processing', paymentType: 'withdraw' });
      if (updated === 1) {
        await addPaymentEvent(playerId, 'withdraw', payment.id, null, null, 'complete', message, rawTransaction, transactionId, tx);
        await EEG.notifyPlayerWithdrawal(playerId, id, tx);
        await Optimove.notifyPlayerWithdrawal(playerId, id, tx);
        return true;
      }
    }
    return false;
  });

const doCancelWithdrawal = async (
  playerId: Id,
  transactionKey: string,
  statuses: string[],
  tx: Knex,
): Promise<{
  amount: number,
  transactionKey: string,
  paymentId: Id,
  transactionId: ?number,
}> => {
  const withdrawal = await tx('payments')
    .first('amount', 'transactionId', 'paymentFee')
    .where({
      playerId,
      transactionKey,
      paymentType: 'withdraw',
    })
    .whereIn('status', statuses)
    .forUpdate();

  if (withdrawal == null) {
    return Promise.reject({ error: errorCodes.UNABLE_TO_CANCEL_TRANSACTION });
  }
  const { amount } = withdrawal;
  const [{ id: paymentId }] = await tx('payments')
    .update({ status: 'cancelled' })
    .where({ transactionKey })
    .whereIn('status', statuses)
    .returning('id');
  const transactionId = await transactions.cancelTransaction(withdrawal.transactionId, null, tx);
  if (withdrawal.paymentFee != null && withdrawal.paymentFee > 0) {
    const paymentFeeId = await transactions.refundPaymentFee(
      playerId,
      { amount: withdrawal.paymentFee },
      tx,
    );
    await addPaymentEvent(
      playerId,
      'withdraw',
      paymentId,
      null,
      withdrawal.paymentFee,
      'cancelled',
      `Returned payment fee ${formatMoney(withdrawal.paymentFee)}`,
      null,
      paymentFeeId,
      tx,
    );
  }

  const player = await getPlayerById(playerId);
  slack.logMessage(
    brandDefinitions[player.brandId].site,
    [
      'Cancel withdrawal',
      getPlayerIdefixUrl(player.username, player.brandId),
      formatMoney(amount, player.currencyId),
    ].join(' '),
    {},
    'good',
  );
  return { amount, transactionKey, paymentId, transactionId };
};

const cancelWithdrawal = (playerId: Id, transactionKey: string, userId?: Id): any =>
  pg.transaction(async (tx) => {
    await doMaintenance(playerId, tx);
    const statuses = await getCancellationStatuses(tx, userId);
    const transaction = await doCancelWithdrawal(playerId, transactionKey, statuses, tx);
    const { paymentId, transactionId } = transaction;
    await addPaymentEvent(playerId, 'withdraw', paymentId, userId, null, 'cancelled', null, null, transactionId, tx);
    await EEG.notifyPlayerWithdrawal(playerId, paymentId, tx);
    await Optimove.notifyPlayerWithdrawal(playerId, paymentId, tx);
    return transaction;
  });

const rejectFailedWithdrawal = async (transactionKey: string, message: string, rawTransaction: ?mixed): Promise<any> =>
  pg.transaction(async (tx) => {
    const withdrawal = await tx('payments')
      .first('amount', 'playerId', 'id', 'paymentProviderId', 'status')
      .where({ transactionKey, paymentType: 'withdraw' })
      .whereIn('status', ['accepted', 'processing', 'complete'])
      .forUpdate();

    if (withdrawal == null) {
      throw new Error('Unable to reject failed withdrawal - not in complete, processing or accepted state');
    }

    const { status, playerId, amount, id: paymentId, paymentProviderId } = withdrawal;
    await addPaymentEvent(playerId, 'withdraw', paymentId, null, amount, 'failed', message, rawTransaction, null, tx);
    if (status === 'complete') {
      const { name } = await tx('payment_providers').first('name').where({ id: paymentProviderId });
      const details = { paymentId, transactionKey, amount, paymentProvider: name };
      await addPlayerFraudTx(playerId, 'failed_withdrawal', transactionKey, details, tx);
      return withdrawal;
    }
    await tx('payments').update({ status: 'pending' }).where({ id: withdrawal.id });
    await EEG.notifyPlayerWithdrawal(playerId, paymentId, tx);
    await Optimove.notifyPlayerWithdrawal(playerId, paymentId, tx);
    return withdrawal;
  });

const getWithdrawal = (transactionKey: UUID): any =>
  pg('payments')
    .first(
      'payments.id as paymentId',
      'username',
      'payments.transactionKey',
      'payments.timestamp',
      'payments.playerId',
      'payments.parameters as paymentParameters',
      'accountId',
      'amount',
      'status',
      'accounts.account',
      'payment_methods.name as paymentMethodName',
      'payment_methods.id as paymentMethodId',
      pg.raw(
        'array_agg("payment_providers"."id" order by "payment_providers"."id") as "paymentProviderIds"',
      ),
      pg.raw(
        'array_agg("payment_providers"."name" order by "payment_providers"."id") as "paymentProviderNames"',
      ),
      pg.raw(
        'json_agg(payment_providers.priority order by "payment_providers"."id") as "priority"',
      ),
      // TODO should this be aliased to accountParameters instead to match Withdrawal typedef?
      pg.raw('json_agg(accounts.parameters order by "payment_providers"."id") as "parameters"'),
      pg.raw(
        '("payments"."paymentProviderId" IS NULL AND "payments"."timestamp" > now() - (? || \' hours\')::interval) as "canAcceptWithDelay"',
        [WITHDRAWAL_CAN_ACCEPT_DELAY_HOURS],
      ),
      pg.raw(
        '(CASE WHEN "payments"."paymentProviderId" IS NOT NULL THEN max("logs"."timestamp") + (? || \' hours\')::interval ELSE NULL END) as "delayedAcceptTime"',
        [WITHDRAWAL_ACCEPT_DELAY_HOURS],
      ),
    )
    .innerJoin('players', 'payments.playerId', 'players.id')
    .innerJoin('accounts', 'accounts.id', 'payments.accountId')
    .innerJoin('payment_methods', 'accounts.paymentMethodId', 'payment_methods.id')
    .innerJoin('payment_providers', (qb) =>
      qb
        .on('payment_providers.paymentMethodId', 'payment_methods.id')
        .andOn('payment_providers.withdrawals', pg.raw('?', ['true'])),
    )
    .leftJoin(
      pg.raw(
        '(select distinct on (payment_event_logs."paymentId") payment_event_logs."paymentId", payment_event_logs.timestamp from payment_event_logs where "userId" is not null and status = \'pending\' order by payment_event_logs."paymentId", payment_event_logs.timestamp desc) as logs on logs."paymentId" = payments.id',
      ),
    )
    .groupBy('payments.id', 'accounts.account', 'payment_methods.id', 'username')
    .where({
      paymentType: 'withdraw',
      'payments.transactionKey': transactionKey,
    });

const getAcceptedWithdrawal = (id: Id): Promise<Withdrawal> =>
  pg('payments')
    .first(
      'payments.id as paymentId',
      'payments.transactionKey',
      'payments.timestamp',
      'payments.playerId',
      'accountId',
      'amount',
      'status',
      'accounts.account',
      'payments.parameters as paymentParameters',
      'accounts.parameters as accountParameters',
      'payment_methods.name as paymentMethodName',
      'payment_providers.id as paymentProviderId',
      'payment_providers.name as paymentProvider',
    )
    .innerJoin('accounts', {
      'accounts.id': 'payments.accountId',
      'accounts.playerId': 'payments.playerId',
    })
    .innerJoin('payment_methods', 'accounts.paymentMethodId', 'payment_methods.id')
    .innerJoin('payment_providers', 'payments.paymentProviderId', 'payment_providers.id')
    .where({
      paymentType: 'withdraw',
      'payments.id': id,
      status: 'accepted',
    });

const getPaymentByTransactionKey = (transactionKey: UUID, tx: Knex) =>
  tx('payments')
    .first('amount as originalAmount', 'playerId', 'accountId', 'id as paymentId', 'transactionId')
    .where({
      transactionKey,
      status: 'pending',
      paymentType: 'withdraw',
    }).forUpdate();

const doAcceptWithdrawalWithExceedLimit = async (transactionKey: UUID, paymentProviderId: Id, amount: number, userId: Id, parameters: mixed, tx: Knex): Promise<{ paymentId: Id, ready: boolean}> => {
  const payment = await getPaymentByTransactionKey(transactionKey, tx);

  if (payment != null) {
    const { originalAmount, playerId, accountId, paymentId, transactionId } = payment;
    logger.debug('doAcceptWithdrawalWithExceedLimit', payment);
    await validateWithdrawal(playerId, paymentProviderId, amount, parameters, payment);
    const paymentEvent = await tx('payment_event_logs').first('userId').where({ status: 'accepted', paymentId, transactionId });
    logger.debug('doAcceptWithdrawalWithExceedLimit event', payment, paymentEvent);
    if (!paymentEvent) {
      if (amount < originalAmount) {
        const statuses = await getCancellationStatuses(tx, userId);
        await doCancelWithdrawal(playerId, transactionKey, statuses, tx);
        const newTransactionKey = await addWithdrawal(playerId, null, accountId, amount, null, null, userId, parameters, tx);
        const { transactionId: newTransactionId, paymentId: newPaymentId } = await getPaymentByTransactionKey(newTransactionKey, tx);
        await addPaymentEvent(playerId, 'withdraw', newPaymentId, userId, amount, 'accepted', null, null, newTransactionId, tx);
        return await addWithdrawal(playerId, null, accountId, originalAmount - amount, null, null, userId, null, tx);
      }

      await addPaymentEvent(playerId, 'withdraw', paymentId, userId, amount, 'accepted', null, null, transactionId, tx);
      return { paymentId, ready: false };
    }

    if (paymentEvent && paymentEvent.userId === userId) {
      return Promise.reject({ error: errorCodes.WITHDRAWAL_FAILED_NEED_ACCEPTANCE_THE_SECOND_USER });
    }

    if (paymentEvent && paymentEvent.userId !== userId) {
      const updated: number = await tx('payments').update({ paymentProviderId, status: 'accepted', parameters }).where({ playerId, transactionKey, status: 'pending', paymentType: 'withdraw' });
      if (updated === 1) {
        await addPaymentEvent(playerId, 'withdraw', paymentId, userId, amount, 'accepted', null, null, null, tx);
        return { paymentId, ready: true };
      }
    }
  }

  return Promise.reject({ error: errorCodes.WITHDRAWAL_ALREADY_ACCEPTED });
};

const doAcceptWithdrawal = async (
  transactionKey: UUID,
  paymentProviderId: Id,
  amount: number,
  userId: Id,
  parameters: mixed,
  tx: Knex$Transaction<any>,
): Promise<{ playerId: Id, paymentId: Id }> => {
  const payment = await getPaymentByTransactionKey(transactionKey, tx);

  if (payment != null) {
    const { originalAmount, playerId, accountId, paymentId } = payment;
    await validateWithdrawal(playerId, paymentProviderId, amount, parameters, payment);
    if (amount < originalAmount) {
      const statuses = await getCancellationStatuses(tx, userId);
      await doCancelWithdrawal(playerId, transactionKey, statuses, tx);
      const newTransactionKey = await addWithdrawal(
        playerId,
        null,
        accountId,
        amount,
        null,
        null,
        userId,
        null,
        tx,
      );
      await addWithdrawal(
        playerId,
        null,
        accountId,
        originalAmount - amount,
        null,
        null,
        userId,
        null,
        tx,
      );
      return doAcceptWithdrawal(
        newTransactionKey,
        paymentProviderId,
        amount,
        userId,
        parameters,
        tx,
      );
    }

    const updated: number = await tx('payments')
      .update({ paymentProviderId, status: 'accepted', parameters })
      .where({ transactionKey, status: 'pending', paymentType: 'withdraw' });
    if (updated === 1) {
      await addPaymentEvent(
        playerId,
        'withdraw',
        paymentId,
        userId,
        amount,
        'accepted',
        null,
        null,
        null,
        tx,
      );
      return { playerId, paymentId };
    }
  }

  return Promise.reject({ error: errorCodes.WITHDRAWAL_ALREADY_ACCEPTED });
};

const acceptWithdrawal = async (transactionKey: UUID, paymentProviderId: Id, amount: number, userId: Id, playerId: Id, data: mixed) => {
  const { currencyId } = await pg('players').first('currencyId').where({ id: playerId });
  const { defaultConversion } = await pg('base_currencies').first('defaultConversion').where({ id: currencyId });

  if (amount / (defaultConversion * 100) >= WITHDRAWAL_LIMIT) {
    const res = await pg.transaction(async (tx) => {
      const result = await doAcceptWithdrawalWithExceedLimit(transactionKey, paymentProviderId, amount, userId, data, tx);
      await tx('payments').update({ parameters: data }).where({ id: result.paymentId, transactionKey, status: 'pending', paymentType: 'withdraw' });
      logger.debug('acceptWithdrawal', transactionKey, result);
      return result;
    });
    if (res.ready) {
      await pg.transaction(async (tx) => {
        EEG.notifyPlayerWithdrawal(playerId, res.paymentId, tx);
        Optimove.notifyPlayerWithdrawal(playerId, res.paymentId, tx);
      });
      await Notification.notifyWithdrawal(playerId, res.paymentId, userId);
    }
    return;
  }

  const { paymentId } = await pg.transaction(tx => doAcceptWithdrawal(transactionKey, paymentProviderId, amount, userId, data, tx));
  await Notification.notifyWithdrawal(playerId, paymentId, userId);
  await Optimove.notifyPlayerWithdrawal(playerId, paymentId, pg);
  await EEG.notifyPlayerWithdrawal(playerId, paymentId, pg);
};

const acceptWithdrawalWithDelay = async (transactionKey: UUID, paymentProviderId: Id, amount: number, userId: Id, playerId: Id, data: mixed) => {
  await pg.transaction(async (tx) => {
    const payment = await getPaymentByTransactionKey(transactionKey, tx);
    if (payment != null) {
      const updated: number = await tx('payments').update({ paymentProviderId, parameters: data }).where({ transactionKey, status: 'pending', paymentType: 'withdraw' });
      if (updated === 1) {
        await addPaymentEvent(playerId, 'withdraw', payment.paymentId, userId, amount, 'pending', 'Will be accepted automatically with a delay', null, payment.transactionId, tx);
      }
      return Promise.resolve();
    }

    return Promise.reject({ error: errorCodes.WITHDRAWAL_ALREADY_ACCEPTED });
  });
};

const getPendingWithdrawals = (playerId: Id): Knex$QueryBuilder<Withdrawal[]> =>
  pg('payments')
    .select('payments.transactionKey', 'accountId', 'amount', 'paymentFee', 'accounts.account', 'payment_methods.name', 'kycChecked', 'timestamp as created')
    .innerJoin('accounts', 'accounts.id', 'payments.accountId')
    .innerJoin('payment_methods', 'accounts.paymentMethodId', 'payment_methods.id')
    .where({ 'payments.playerId': playerId, status: 'pending', paymentType: 'withdraw' })
    .orderBy('timestamp');

export type PendingWithdrawal = {
  transactionKey: UUID,
  paymentProviderId: Id,
  amount: Money,
  userId: Id,
  playerId: Id,
  parameters: mixed,
};

const getPendingWithdrawalsReadyToAccept = (hoursOffset: number): Knex$QueryBuilder<PendingWithdrawal[]> =>
  pg('payments')
    .select('payments.transactionKey', 'paymentProviderId', 'amount', 'userId', 'playerId', 'parameters')
    .innerJoin(pg.raw('(select distinct on (payment_event_logs."paymentId") payment_event_logs."paymentId", payment_event_logs.timestamp, payment_event_logs."userId" from payment_event_logs where "userId" is not null and status = \'pending\' order by payment_event_logs."paymentId", payment_event_logs.timestamp desc) as logs on logs."paymentId" = payments.id'))
    .whereRaw('logs.timestamp <= now() - (? || \' hours\')::interval', hoursOffset)
    .whereNotNull('payments.paymentProviderId')
    .where({ 'payments.status': 'pending', paymentType: 'withdraw' });

const getWithdrawalStatus = (playerId: Id, transactionKey: UUID): Knex$QueryBuilder<{}> =>
  pg('payments')
    .first('payments.transactionKey', 'accountId', 'amount', 'accounts.account', 'payment_methods.name', 'kycChecked', 'status')
    .innerJoin('accounts', 'accounts.id', 'payments.accountId')
    .innerJoin('payment_methods', 'accounts.paymentMethodId', 'payment_methods.id')
    .where({ 'payments.playerId': playerId, paymentType: 'withdraw', transactionKey });

const getWithdrawalMethods = async (playerId: Id): Promise<any> =>
  pg.transaction(async tx => getWdMethods(playerId, tx));

export type PaymentProvider = {
  account: string,
  id: Id,
  name: string,
  provider: string,
  parameters: mixed,
  priority: number,
};

type WithdrawalWithOptions = {
  account: any,
  accountId: any,
  amount: any,
  canAcceptWithDelay: any,
  delayedAcceptTime: any,
  formattedAmount: string,
  id: any,
  paymentMethod: {
    id: any,
    name: any,
  },
  paymentParameters: any,
  paymentProviders: Array<PaymentProvider>,
  timestamp: any,
};


const getWithdrawalWithOptions = async (withdrawalId: UUID): Promise<WithdrawalWithOptions> => {
  const withdrawal = await getWithdrawal(withdrawalId);
  const player = await getPlayerById(withdrawal.playerId);

  const availableProviders: PaymentProvider[] = times(index => ({
    account: withdrawal.account,
    id: withdrawal.paymentProviderIds[index],
    name: withdrawal.paymentProviderNames[index],
    provider: withdrawal.paymentProviderNames[index],
    parameters: withdrawal.parameters[index],
    priority: withdrawal.priority[index],
  }), withdrawal.paymentProviderIds.length);

  const paymentProviders: PaymentProvider[] = sortBy<PaymentProvider>(
    ({ priority }) => priority,
  )(availableProviders).filter((x) => validateProviderAccount(player, x, x));
  const result = {
    id: withdrawal.transactionKey,
    amount: withdrawal.amount,
    formattedAmount: formatMoney(withdrawal.amount, player.currencyId),
    accountId: withdrawal.accountId,
    account: withdrawal.account,
    timestamp: withdrawal.timestamp,
    paymentParameters: withdrawal.paymentParameters,
    canAcceptWithDelay: withdrawal.canAcceptWithDelay,
    delayedAcceptTime: withdrawal.delayedAcceptTime,
    paymentMethod: {
      id: withdrawal.paymentMethodId,
      name: withdrawal.paymentMethodName,
    },
    paymentProviders,
  };
  return result;
};

type WithdrawalInfo = {
  accessStatus: {
    accountClosed: boolean,
    accountSuspended: boolean,
    activated: boolean,
    allowGameplay: boolean,
    preventLimitCancel: boolean,
    allowTransactions: boolean,
    depositLimitReached: ?Date,
    documentsRequested: boolean,
    gamblingProblem: boolean,
    loginBlocked: boolean,
    modified: {
      [key: string]: {
        name: string,
        timestamp: Date,
      },
    },
    pep: boolean,
    riskProfile: RiskProfile,
    verified: boolean,
  },
  accounts: any,
  balance: {
    balance: Money,
    bonusBalance: Money,
    brandId: BrandId,
    currencyId: string,
    numDeposits: number,
  },
  bonuses: Array<PlayerBonus>,
  counters: { amount: Money, limit: Money, type?: WageringCounterType },
  wagering: {
    bonus: boolean,
    complete: boolean,
    completed: number,
    wagered: Money,
    wageringRequirement: Money,
  },
  withdrawalAllowed: boolean,
  sowClear: boolean,
  withdrawalFeeConfiguration: ?{
    withdrawalFee: number,
    withdrawalFeeMax: number,
    withdrawalFeeMin: number,
  },
};

const getWithdrawalInfo = async (playerId: Id): Promise<WithdrawalInfo> => {
  const [{ methods }, accessStatus, balance, bonuses, counters, depositCounters, sowClearanceState] = await Promise.all([
    getWithdrawalMethods(playerId),
    getAccountStatus(playerId),
    getBalance(playerId),
    getActiveBonuses(playerId),
    getWageringRequirementCounter(playerId),
    getActiveCounters(playerId, ['deposit_wager']),
    getSowClearanceState(playerId),
  ]);
  const { wageringRequirement, wagered } = bonuses.reduce((result, bonus) =>
    ({
      wageringRequirement: result.wageringRequirement + bonus.wageringRequirement,
      wagered: result.wagered + bonus.wagered,
    }), { wageringRequirement: 0, wagered: 0 });
  const withdrawalAllowed = bonuses.length === 0 && (counters.type === 'deposit_wager' || counters.amount >= counters.limit) && accessStatus.allowTransactions;
  const wagering = wageringRequirement > counters.limit
    ? {
      wageringRequirement,
      wagered,
      completed: wageringRequirement > 0 ? Math.floor(100.0 * wagered / wageringRequirement) : 100,  
      complete: !(wageringRequirement > 0),
      bonus: true,
    } : {
      wageringRequirement: counters.limit,
      wagered: counters.amount,
      completed: counters.limit > 0 ? Math.floor(100.0 * counters.amount / counters.limit) : 100,  
      complete: !(counters.limit > 0),
      bonus: false,
    };

  const withdrawalFeeConfiguration = await getWithdrawalFeeConfiguration(balance.brandId, playerId, balance.currencyId, depositCounters);
  const minWithdrawal = depositCounters.length > 0 && balance.balance;

  return {
    accounts: methods.map((m) => ({ ...m, ...(minWithdrawal ? { minWithdrawal } : {}) })),
    sowClear: sowClearanceState === 'CLEAR',
    wagering,
    withdrawalAllowed,
    accessStatus,
    balance,
    bonuses,
    counters,
    withdrawalFeeConfiguration,
  };
};

module.exports = {
  addWithdrawal,
  createWithdrawal,
  cancelWithdrawal,
  processWithdrawal,
  markWithdrawalAsComplete,
  rejectFailedWithdrawal,
  getWithdrawal,
  acceptWithdrawal,
  acceptWithdrawalWithDelay,
  getPendingWithdrawals,
  getPendingWithdrawalsReadyToAccept,
  getWithdrawalStatus,
  getAcceptedWithdrawal,
  getWithdrawalMethods,
  getWithdrawalWithOptions,
  getWithdrawalInfo,
};
