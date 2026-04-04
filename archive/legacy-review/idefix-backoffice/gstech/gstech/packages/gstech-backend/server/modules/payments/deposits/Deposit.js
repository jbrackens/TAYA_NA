/* @flow */
import type { Deposit, DepositStatus } from 'gstech-core/modules/types/backend';
import type { Player } from 'gstech-core/modules/types/player';
import type { CMoney } from 'gstech-core/modules/money-class'
import type { PaymentProvider } from 'gstech-core/modules/constants';
import type { Bonus } from '../../bonuses/Bonus';

const { brandDefinitions } = require('gstech-core/modules/constants')

const _ = require('lodash');
const { DateTime } = require('luxon');
const { v1: uuid } = require('uuid');
const find = require('lodash/find');
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const slack = require('gstech-core/modules/slack');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const { Money: MoneyClass } = require('gstech-core/modules/money-class');
const { findOrCreateAccount, updateAccountParameters } = require('../../accounts');
const {
  getRequireDueDiligenceFlags,
  getAccountStatus,
  raiseRiskProfileTx,
  updateAccountStatusTx,
  removeTag,
  getLifetimeDeposits,
  getRecentCumulativeDeposits,
  getSowClearanceState,
} = require('../../players/Player');
const { getPlayerById, getPlayerIdefixUrl } = require('../../players');
const { createDepositWageringCounter, updateCounters } = require('../../limits');
const { activateBonus, creditBonus, getAvailableDepositBonuses, getAvailablePnpDepositBonusesByBrand, doMaintenance, forfeitBonus } = require('../../bonuses');
const transactions = require('../../transactions');
const { validateDepositLimits } = require('../PaymentLimits');
const { checkDeposit, updateLimitWithDeposit, getActiveLimits } = require('../../limits');
const Jurisdictions = require('../../jurisdictions/Jurisdictions');
const { addPaymentEvent, addTransaction } = require('../Payment');
const Notification = require('../../core/notifications');
const EEG = require('../../core/notifications-eeg');
const Optimove = require('../../core/optimove');
const { formatMoney } = require('../../core/money');
const { addPlayerFraudTx, addPlayerFraud } = require('../../frauds');
const { getPreviousDeposit } = require('./DepositInfo');
const { hasValidDocument } = require('../../kyc');
const { addEvent } = require('../../players/PlayerEvent');
const { personPlayerIdsQuery } = require('../../persons/Person');
const { getUnchecked } = require('../../frauds/Fraud');

export type DepositMethod = {
  methodId: Id,
  providerId: Id,
  method: string,
  provider: string,
  minDeposit: Money,
  maxDeposit: Money,
  account: string[],
  accountId: string[],
  parameters: mixed[],
};

export type RawDeposit = {
  id: Id,
  timestamp: Date,
  playerId: Id,
  index: number,
  transactionKey: string,
  transactionId: Id,
  status: DepositStatus,
  amount: Money,
  paymentType: string,
  externalTransactionId: string,
  paymentMethodId: Id,
  paymentProviderId: Id,
  accountId: Id,
  bonusId: Id,
  playerBonusId: Id,
  parameters: mixed,
  paymentFee: Money,
  paymentCost: Money,
};

export type DepositReference = {
  transactionKey: string
}


const validateAccount = async (playerId: Id) => {
  const { locked } = await getRequireDueDiligenceFlags(playerId);
  if (locked) {
    await addPlayerFraud(playerId, 'due_diligence_required', moment().format('YYYYMMDD'), { });
    return Promise.reject({ error: errorCodes.DEPOSITS_NOT_ALLOWED });
  }
  const sowState = await getSowClearanceState(playerId);
  if (sowState !== 'CLEAR') {
    await addEvent(playerId, null, 'account', 'sow.blockedTx', { sowState });
    return Promise.reject({
      error: { PENDING: errorCodes.SOW_PENDING_CLEARANCE, FAIL: errorCodes.SOW_REJECTED }[sowState],
    });
  }
  return true;
};

const getPendingDeposits = (playerId: Id): Knex$QueryBuilder<any> =>
  pg('payments').where({
    paymentType: 'deposit',
    status: 'pending',
    playerId,
  });

const convertToBaseCurrency = (amount: Money, currencyId: string, tx: Knex$Transaction<any>) =>
  tx('base_currencies').first(pg.raw('(? / "defaultConversion") as "converted"', amount)).where({ id: currencyId }).then(({ converted }) => converted);

const getPendingDepositsForPaymentMethod = (playerId: Id, paymentMethodId: Id) =>
  pg('payments')
    .where({
      paymentType: 'deposit',
      status: 'pending',
      playerId,
      paymentMethodId,
    })
    .whereRaw('timestamp < now() - \'5 days\'::interval');

const preStartDepositFraudCheck = async (playerId: Id, paymentMethodId: Id) => {
  const ok = await pg.transaction(async (tx) => {
    const pendingDeposits = await getPendingDepositsForPaymentMethod(playerId, paymentMethodId)
      .count('* as p')
      .transacting(tx)
      .then(([{ p }]) => Number(p));
    if (pendingDeposits > 0) {
      await addEvent(playerId, null, 'account', 'pendingDeposits.blocked', {
        pending: pendingDeposits,
      }).transacting(tx);
      return false;
    }
    return true;
  });
  if (!ok) return Promise.reject({ error: errorCodes.DEPOSITS_NOT_ALLOWED });
  return ok;
};

const startDeposit = async (playerId: Id, paymentProviderId: Id, amount: Money, bonusId: ?Id, parameters: ?mixed, paymentFee: ?Money, sessionId: ?Id, transactionKey: string = uuid()): Promise<DepositReference> => {
  // TODO all this should be done in single transaction
  const { paymentMethodId } = await pg('payment_providers').first('paymentMethodId').where({ id: paymentProviderId });
  const player = await getPlayerById(playerId);

  await preStartDepositFraudCheck(playerId, paymentMethodId);
  await validateAccount(playerId);
  await validateDepositLimits(playerId, paymentProviderId, amount);
  await checkDeposit(playerId);
  await Jurisdictions.checkDeposit(player);
  const accessStatus = await getAccountStatus(playerId);
  if (!accessStatus.allowTransactions) {
    return Promise.reject({ error: errorCodes.DEPOSITS_NOT_ALLOWED });
  }

  const timeoutLimit = await getActiveLimits(playerId, 'timeout');
  const activeExclusion = await getActiveLimits(playerId, 'exclusion');
  if (timeoutLimit || activeExclusion)
    return Promise.reject({ error: errorCodes.DEPOSITS_NOT_ALLOWED });

  // PnP Bonuses is EUR only
  if (bonusId != null) {
    const regularBonuses = await getAvailableDepositBonuses(playerId);
    const pnpBonuses = await getAvailablePnpDepositBonusesByBrand(player.brandId);

    const bonuses = [...regularBonuses, ...pnpBonuses];
    if (!bonuses.some(({ id }) => id === bonusId)) {
      return Promise.reject({ error: errorCodes.INVALID_BONUS_ID });
    }
  }

  const data = { playerId, paymentMethodId, paymentProviderId, amount, paymentFee, transactionKey, bonusId, parameters, paymentType: 'deposit', sessionId };
  await pg.transaction(async (tx) => {
    await tx('payments').insert(data);
    await doMaintenance(playerId, tx);

    await EEG.notifyPlayerDeposit(playerId, transactionKey, tx);
    await Optimove.notifyPlayerDeposit({ playerId, transactionKey, trace: "startDeposit" }, tx);
  });

  return { transactionKey };
};

const creditDepositBonus = async (playerId: Id, bonus: Bonus, amount: Money, deposit: Deposit, tx: Knex$Transaction<any>) => {
  if (amount >= bonus.minAmount) {
    const bonusAmount = Math.min(bonus.maxAmount, Math.round(Number(amount * bonus.depositMatchPercentage) / 100));
    if (bonus.playerBonusId == null) {
      return await creditBonus(bonus.id, playerId, bonusAmount, null, null, tx);
    }
    await activateBonus(bonus.playerBonusId, bonus.id, playerId, bonusAmount, null, null, tx);
    return bonus.playerBonusId;
  }
  logger.warn('creditDepositBonus with too low amount', { playerId, bonus, amount, deposit });
  return null;
};

const checkLifetimeDeposits = async (
  playerId: Id,
  amount: Money,
  currencyId: string,
  tx: Knex$Transaction<any>,
): Promise<Money> => {
  const getBucket = (money: CMoney) => _.floor(_.divide(_.max([money.asFixed(), 0]), 2500000));
  const totalMoney = new MoneyClass((await getLifetimeDeposits(playerId, tx)).total, 'EUR');
  const amountMoney = new MoneyClass(amount, currencyId).asBaseCurrency();
  const total = totalMoney.asFixed();
  if (getBucket(totalMoney.subtract(amountMoney)) !== getBucket(totalMoney)) {
    logger.info(`entered new lifetime_deposit bracket: ${total}`);
    await addPlayerFraudTx(
      playerId,
      'lifetime_deposit',
      moment().format('YYYYMMDD'),
      { total },
      tx,
    );
  }
  if (total >= 2_000_00) await addPlayerFraudTx(playerId, 'lifetime_deposit_2k', '', { total }, tx);
  return total;
};

const checkDepositsThresholdNewAccounts = async (playerId: Id, total: number, tx: Knex) => {
  const player = await getPlayerById(playerId);
  const customerAccountAgeInDays = moment().diff(moment(player.createdAt), 'days', true);
  const rules = [
    { fraudKey: 'dep500_acc30days', thresholdDepositAmount: 500 * 100, minAge: 30 },
    { fraudKey: 'dep1000_acc60days', thresholdDepositAmount: 1000 * 100, minAge: 60 },
    { fraudKey: 'dep2500_acc90days', thresholdDepositAmount: 2500 * 100, minAge: 90 },
  ];
  for (const { fraudKey, thresholdDepositAmount, minAge } of rules)
    if (customerAccountAgeInDays < minAge && total >= thresholdDepositAmount)
      await addPlayerFraudTx(
        playerId,
        fraudKey,
        `${playerId}`,
        { total, accountAge: DateTime.fromJSDate(player.createdAt).toRelative() },
        tx,
      );
};

const checkDepositsCumulativeThreshold = async (playerId: Id, total: number, tx: Knex) => {
  const rules = [
    { fraudKey: 'cumulative_deposits_5k', thresholdDepositAmount: 5000 * 100 },
    { fraudKey: 'cumulative_deposits_10k', thresholdDepositAmount: 10000 * 100 },
    { fraudKey: 'cumulative_deposits_25k', thresholdDepositAmount: 25000 * 100 },
  ];
  for (const { fraudKey, thresholdDepositAmount } of rules)
    if (total >= thresholdDepositAmount)
      await addPlayerFraudTx(playerId, fraudKey, `${playerId}`, { total }, tx);
};

const checkDepositsThresholds = async (playerId: Id, tx: Knex) => {
  const { total } = await getLifetimeDeposits(playerId, tx, false);
  await checkDepositsThresholdNewAccounts(playerId, total, tx);
  await checkDepositsCumulativeThreshold(playerId, total, tx);
};

const checkRecentCumulativeSowThreshold = async (
  playerId: Id,
  tx: Knex$Transaction<any>,
) => {
  const { total } = await getRecentCumulativeDeposits(playerId, null, tx);
  if (total >= 10000000) {
    logger.info(`player ${playerId} reached sow limit: ${total}`);
    await addPlayerFraudTx(
      playerId,
      'cumulative_100k_180days',
      moment().format('YYYYMMDD'),
      { total },
      tx,
    );
    await removeTag(playerId, 'pass-sow', tx);
  }
};

const checkCumulativeDeposits = async (playerId: Id, amount: Money, currencyId: string, transactionKey: UUID, paymentMethodId: Id, tx: Knex) => {
  const row: any = await tx('players')
    .first(pg.raw('sum("amount" / conversion_rates."conversionRate") as total'), pg.raw('avg("monthlyIncomeThreshold") as "monthlyIncomeThreshold"'))
    .innerJoin('payments', 'players.id', 'payments.playerId')
    .innerJoin('conversion_rates', 'players.currencyId', 'conversion_rates.currencyId')
    .innerJoin('countries', {
      'players.countryId': 'countries.id',
      'players.brandId': 'countries.brandId',
    })
    .whereNotNull('countries.monthlyIncomeThreshold')
    .where({ playerId, paymentType: 'deposit' })
    .whereIn('status', ['complete', 'pending'])
    .where(pg.raw('payments.timestamp > now() - \'30 days\'::interval'));

  if (row != null) {
    const { total, monthlyIncomeThreshold } = row;
    if (total >= monthlyIncomeThreshold) {
      await addPlayerFraudTx(playerId, 'cumulative_deposits_over_amount', moment().format('YYYYMM'), { total }, tx);
    }
    if (total >= monthlyIncomeThreshold * 2) {
      const doc = await hasValidDocument(playerId, 'source_of_wealth');
      if (doc) {
        await addPlayerFraudTx(playerId, 'cumulative_deposits_2x', moment().format('YYYYMM'), { total }, tx);
      } else {
        await addPlayerFraudTx(playerId, 'cumulative_deposits_2x_nodoc', moment().format('YYYYMM'), { total }, tx);
      }
    }
  }
};

const checkHighRiskDepositMethods = async (playerId: Id, amount: Money, currencyId: string, transactionKey: UUID, paymentMethodId: Id, tx: Knex$Transaction<any>) => {
  const { highRisk, name } = await tx('payment_methods').first('name', 'highRisk').where({ id: paymentMethodId });
  if (highRisk) {
    await raiseRiskProfileTx(playerId, 'medium', `Risk profile automatically changed to medium because high risk payment method ${name} was used`, tx);
    const [{ successiveDepositCount }] = await tx('payments')
      .count('* as successiveDepositCount')
      .where({ playerId, paymentType: 'deposit' })
      .whereIn('status', ['complete', 'pending'])
      .where(pg.raw('timestamp > now() - \'1 hour\'::interval'));
    if (Number(successiveDepositCount) > 4) {
      await addPlayerFraudTx(playerId, 'successive_high_risk_deposits', moment().format('YYYYMMDD'), { paymentMethodName: name }, tx);
    }
  }
};

const checkBigDeposits = async (playerId: Id, amount: Money, currencyId: string, transactionKey: UUID, paymentMethodId: Id, tx: Knex) => {
  const q = tx('countries')
    .innerJoin('players', {
      'countries.id': 'players.countryId',
      'countries.brandId': 'players.brandId',
    })
    .innerJoin('base_currencies', 'base_currencies.id', 'players.currencyId')
    .first(pg.raw('least("monthlyIncomeThreshold", 200000) * "defaultConversion" as "bigDeposit"'))
    .where('players.id', playerId);

  const { bigDeposit } = await q;
  if (amount >= bigDeposit) {
    await addPlayerFraudTx(playerId, 'huge_deposit', moment().format('YYYYMM'), { transactionKey }, tx);
  }

  const { averageDeposit } = await tx('payments')
    .first(pg.raw('avg(amount) as "averageDeposit"'))
    .where({ playerId, paymentType: 'deposit' })
    .whereIn('status', ['complete', 'pending'])
    .whereNot('transactionKey', transactionKey);
  if (averageDeposit != null && amount >= 10 * averageDeposit) {
    await addPlayerFraudTx(playerId, 'sudden_big_deposit', moment().format('YYYYMM'), { transactionKey, averageDeposit, amount }, tx);
  }
};

const checkDepositAccounts = async (playerId: Id, amount: Money, currencyId: string, transactionKey: UUID, paymentMethodId: Id, account: string, tx: Knex$Transaction<any>) => {
  const [{ count }] = await tx('accounts').count('*').where({ playerId, active: true, paymentMethodId });
  if (Number(count) >= 3) {
    const { name: paymentMethodName } = await tx('payment_methods').first('name').where({ id: paymentMethodId });
    await addPlayerFraudTx(playerId, 'several_payment_accounts', `${paymentMethodName}:${account}`, { paymentMethodName }, tx);
  }
};

const checkDepositWhileMoneyOnAccount = async (playerId: Id, balance: Money, amount: Money, currencyId: string, transactionKey: UUID, paymentMethodId: Id, tx: Knex$Transaction<any>) => {
  const balanceOnAccountTreshold = 1000;
  const c = await convertToBaseCurrency(balance, currencyId, tx);
  if (c > balanceOnAccountTreshold * 100) {
    await addPlayerFraudTx(playerId, 'balance_on_account', moment().format('YYYYMMDDhh'), { balance, currencyId }, tx);
  }
};

const checkAlteringDepositMethods = async (playerId: Id, balance: Money, amount: Money, currencyId: string, transactionKey: UUID, paymentMethodId: Id, tx: Knex$Transaction<any>) => {
  const previousDeposit = await getPreviousDeposit(playerId);
  if (previousDeposit != null && previousDeposit.paymentMethodId !== paymentMethodId) {
    const c = await convertToBaseCurrency(balance, currencyId, tx);
    if (c > 100 * 100) {
      await addPlayerFraudTx(playerId, 'altering_deposit_method', '', { }, tx);
    }
  }
};

const updateDDRequirementFlag = async (playerId: Id, tx: Knex$Transaction<any>) => {
  const { personId } = await tx.from('players').select('personId').where({ id: playerId }).first();

  const condition = {
    ...(personId && { personId }),
    ...(!personId && { 'players.id': playerId }),
  };

  const { flagged } = await tx('players')
    .first(pg.raw('(sum(payments.amount / conversion_rates."conversionRate") >= 200000) as flagged'))
    .innerJoin('conversion_rates', 'players.currencyId', 'conversion_rates.currencyId')
    .leftOuterJoin('payments', 'players.id', 'payments.playerId')
    .where('payments.paymentType', 'deposit')
    .whereIn('payments.status', ['complete', 'pending'])
    .where(condition);

  if (flagged) {
    const playerNotFlaggedBefore = await tx('players').first().where(condition).whereNull('depositLimitReached');
    await tx('players').update({ depositLimitReached: pg.raw('now()') }).where(condition).whereNull('depositLimitReached');
    if (playerNotFlaggedBefore) {
      const fraudId = personId || playerId;
      await addPlayerFraudTx(playerId, 'pep_questionnaire', `${fraudId}`, null, tx);
    }
  }
};

const checkDepositVelocity = async (playerId: Id, tx: Knex$Transaction<any>) => {
  const excludeSafeProviders = (provs: PaymentProvider[]) =>
    pg.raw(`AND payment_providers."name" NOT IN (${Array(provs.length).fill('?').join()})`, provs);
  const sumInTimeFrame = (timeframe: string, exclProvs?: PaymentProvider[] = []) =>
    `sum("amount" / conversion_rates."conversionRate")
      FILTER (WHERE payments."timestamp" > now() - interval '${timeframe}' ${
      exclProvs.length ? excludeSafeProviders(exclProvs).toString() : ''
    })`;
  const txInTimeFrame = (timeframe: string, exclProvs?: PaymentProvider[] = []) =>
    `COUNT(*) FILTER (WHERE payments."timestamp" > now() - interval '${timeframe}' ${
      exclProvs.length ? excludeSafeProviders(exclProvs).toString() : ''
    })`;
  const safePaymentProviders: PaymentProvider[] = ['Euteller', 'Brite', 'Trustly'];
  const fraudReport = await tx('payments')
    .first({
      tx3min: pg.raw(txInTimeFrame('3 minute')),
      tx12min: pg.raw(txInTimeFrame('12 minute')),
      tx24h: pg.raw(txInTimeFrame('24 hours', safePaymentProviders)),
      sum3min: pg.raw(sumInTimeFrame('3 minute')),
      sum12min: pg.raw(sumInTimeFrame('12 minute')),
      sum24h: pg.raw(sumInTimeFrame('24 hours', safePaymentProviders)),
    })
    .innerJoin('players', 'payments.playerId', 'players.id')
    .innerJoin('conversion_rates', 'players.currencyId', 'conversion_rates.currencyId')
    .innerJoin('payment_providers', 'payments.paymentProviderId', 'payment_providers.id')
    .where({ paymentType: 'deposit', status: 'complete', playerId })
    .whereRaw("timestamp > now() - '24 hours'::interval")
    .groupBy('playerId');

  if (!fraudReport) return;
  const { tx3min, tx12min, tx24h, sum3min, sum12min, sum24h } = fraudReport;
  const checks = [
    [tx3min, 3, 'velocity_dep3tx_3min', sum3min],
    [tx12min, 6, 'velocity_dep6tx_12min', sum12min],
    [tx24h, 10, 'velocity_dep10tx_24h', sum24h],
  ];
  for (const [deposits, threshold, fraudKey, amount] of checks)
    if (+deposits >= threshold)
      await addPlayerFraudTx(
        playerId,
        fraudKey,
        moment().format('YYYYMMDD'),
        { amount, deposits },
        tx,
      );
};

const checkDepositRejections = async (playerId: Id, tx: Knex$Transaction<any>) => {
  const countTimeFrame = ({ timeframe, failed = false }: { timeframe: string, failed?: boolean }) =>
    `COUNT(*) FILTER (
      WHERE "timestamp" >= now() - '${timeframe}'::interval
      ${failed ? `AND status = 'failed')` : `)`}`;
  const fraudReport = await tx('payments')
    .first({
      fails24h: pg.raw(countTimeFrame({ timeframe: '24 hours', failed: true })),
      fails36h: pg.raw(countTimeFrame({ timeframe: '36 hours', failed: true })),
      fails72h: pg.raw(countTimeFrame({ timeframe: '72 hours', failed: true })),
      total24h: pg.raw(countTimeFrame({ timeframe: '24 hours' })),
      total36h: pg.raw(countTimeFrame({ timeframe: '36 hours' })),
      total72h: pg.raw(countTimeFrame({ timeframe: '72 hours' })),
      successes24h: pg.raw(
        `COUNT(*) FILTER (
          WHERE "timestamp" >= now() - '24 hours'::interval
          AND (status = 'complete' OR status = 'settled')
        )`,
      ),
    })
    .where({ paymentType: 'deposit', playerId })
    .whereRaw("timestamp >= now() - '72 hours'::interval")
    .groupBy('playerId');

  if (!fraudReport) return;
  const { fails24h, fails36h, fails72h, total24h, total36h, total72h, successes24h } =
    fraudReport;
  const possibleFrauds = [
    { timeframe: '72 hours', rejectionRate: +fails72h / +total72h, rejections: +fails72h },
    { timeframe: '36 hours', rejectionRate: +fails36h / +total36h, rejections: +fails36h },
    { timeframe: '24 hours', rejectionRate: +fails24h / +total24h, rejections: +fails24h },
  ];
  for (const { timeframe, rejectionRate, rejections } of possibleFrauds)
    if (rejectionRate >= 0.5 && rejections > 3) {
      const rejectionRateString = `${Intl.NumberFormat('en-US', {
        style: 'percent',
        maximumFractionDigits: 2,
      }).format(rejectionRate)}`;
      await addPlayerFraudTx(
        playerId,
        'high_rejection_rate',
        moment().format('YYYYMMDD'),
        { timeframe, rejectionRate: rejectionRateString, rejections },
        tx,
      );
    }
  if (+fails24h > 3 && +successes24h === 0)
    await addPlayerFraudTx(
      playerId,
      'high_rejection_count',
      moment().format('YYYYMMDD'),
      { fails24h },
      tx,
    );
};

const checkNoWageringBetweenDeposits = async (playerId: Id, transactionKey: string, tx: Knex$Transaction<any>) => {
  const lastPaymentDeposit = await tx('payments')
    .first('playerId', 'timestamp')
    .where({ playerId, paymentType: 'deposit', status: 'complete' })
    .whereNot({ transactionKey })
    .orderBy('timestamp', 'desc');
  if (!lastPaymentDeposit) return;

  const foundGameplayAfterLastDeposit = await tx('transactions')
    .first('timestamp')
    .where({ playerId, type: 'bet' })
    .where('timestamp', '>', lastPaymentDeposit.timestamp);
  if (!foundGameplayAfterLastDeposit) {
    const foundLastGameplay = await tx('transactions')
      .first('timestamp')
      .where({ playerId, type: 'bet' })
      .orderBy('timestamp', 'desc');

    const { amount } = await tx('payments')
      .first({ amount: pg.raw(`sum("amount" / conversion_rates."conversionRate")`) })
      .innerJoin('players', 'payments.playerId', 'players.id')
      .innerJoin('conversion_rates', 'players.currencyId', 'conversion_rates.currencyId')
      .where({ playerId, paymentType: 'deposit' })
      .whereIn('status', ['complete', 'pending'])
      .modify((qb) =>
        foundLastGameplay?.timestamp ? qb.where('timestamp', '>', foundLastGameplay.timestamp) : qb,
      )
      .groupBy('playerId');

    await addPlayerFraudTx(
      playerId,
      'no_wagering_between_deps',
      moment().format('YYYYMMDD'),
      {
        amount,
        lastGameplay: foundLastGameplay?.timestamp
          ? DateTime.fromJSDate(foundLastGameplay?.timestamp).toRelative()
          : 'None',
      },
      tx,
    );
  }
};

const getDoubleFromExpectedRange = (expectedRange: string) => {
  const pattern = /(?:\d+-)?(\d+)(?:\+)?/;
  const match = expectedRange.match(pattern);
  if (match) {
    const amountInEuro = parseInt(match[1], 10);
    const amountInCents = amountInEuro * 100;
    return 2 * amountInCents;
  }
  return undefined;
};

const getQuestionnaireAnswer = async (playerId: Id, questionnaire: string, key: string): Promise<{ answer?: string }> =>
  pg('player_questionnaire_answers')
    .with('person', personPlayerIdsQuery(pg, playerId))
    .first('answer')
    .innerJoin('player_questionnaires', 'player_questionnaires.id', 'player_questionnaire_answers.playerQuestionnaireId')
    .innerJoin('questionnaire_questions', 'questionnaire_questions.id', 'player_questionnaire_answers.questionId')
    .innerJoin('questionnaires', 'questionnaires.id', 'player_questionnaires.questionnaireId')
    .innerJoin('players', 'players.brandId', 'questionnaires.brandId')
    .whereIn('player_questionnaires.playerId', pg.select('playerIds').from('person'))
    .whereIn('questionnaire_questions.id', (subquery) =>
      subquery
        .select('id')
        .from('questionnaire_questions')
        .where('key', key)
        .whereIn('questionnaireId', (subSubQuery) =>
          subSubQuery.select('id').from('questionnaires').where({
            name: questionnaire,
          }),
        ),
    );

const isWithinLast30Days = (dateStr: string) => {
  if (!dateStr) return false;
  if (dateStr.length !== 8) return false;

  // Parse the date string
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Months are 0-indexed in JavaScript Date
  const day = parseInt(dateStr.substring(6, 8), 10);

  // Construct a date object from the parsed values
  const date = new Date(year, month, day);

  // Get today's date and subtract 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));

  // Compare the dates
  return date >= thirtyDaysAgo;
};

const checkExpectedMonthlyDepositAmount = async (playerId: Id, tx: Knex$Transaction<any>) => {
  const fraudKey = 'deposit_estimation_doubled';

  const uncheckedFrauds = await getUnchecked(playerId);
  const foundExistingFraud = uncheckedFrauds.find((f) => f.fraudKey === fraudKey);
  if (foundExistingFraud && isWithinLast30Days(foundExistingFraud.fraudId)) return;

  const queryResult = await getQuestionnaireAnswer(playerId, 'Lifetime_Deposit_2k', 'monthlyDeposit');
  if (!queryResult) return;
  const { answer } = queryResult;
  if (!answer) return;

  const limit = getDoubleFromExpectedRange(answer);
  if (!limit) {
    logger.warn(`!!! checkExpectedMonthlyDepositAmount: Invalid expected monthly deposit range: ${answer} for playerId: ${playerId}`);
    return;
  }

  const last30Days = moment().subtract(30, 'days').toDate();
  const { total } = await getRecentCumulativeDeposits(playerId, last30Days, tx);
  if (total >= limit) {
    logger.info(`player ${playerId} reached double expected monthly deposits limit: ${total}`);
    await addPlayerFraudTx(playerId, fraudKey, moment().format('YYYYMMDD'), { total, expected: answer }, tx);
  }
};

const preDepositFraudCheck = async (playerId: Id, balance: Money, amount: Money, currencyId: string, transactionKey: UUID, paymentMethodId: Id, tx: Knex$Transaction<any>) => {
  await checkAlteringDepositMethods(playerId, balance, amount, currencyId, transactionKey, paymentMethodId, tx);
  await checkDepositWhileMoneyOnAccount(playerId, balance, amount, currencyId, transactionKey, paymentMethodId, tx);
};

const fraudCheck = async (
  playerId: Id,
  amount: Money,
  currencyId: string,
  transactionKey: UUID,
  paymentMethodId: Id,
  tx: Knex$Transaction<any>,
) => {
  await checkBigDeposits(playerId, amount, currencyId, transactionKey, paymentMethodId, tx);
  await checkHighRiskDepositMethods(
    playerId,
    amount,
    currencyId,
    transactionKey,
    paymentMethodId,
    tx,
  );
  await checkCumulativeDeposits(playerId, amount, currencyId, transactionKey, paymentMethodId, tx);
  await checkLifetimeDeposits(playerId, amount, currencyId, tx);
  await checkRecentCumulativeSowThreshold(playerId, tx);
  await updateDDRequirementFlag(playerId, tx);
  await checkDepositVelocity(playerId, tx);
  await checkNoWageringBetweenDeposits(playerId, transactionKey, tx);
  await checkDepositsThresholds(playerId, tx);
  await checkDepositRejections(playerId, tx);
  await checkExpectedMonthlyDepositAmount(playerId, tx);
};

const logDepositToSlack = (player: Player, amount: Money, fee: Money, numDeposits: number) => {
  const logText = _.compact<string>([
    'Deposit',
    getPlayerIdefixUrl(player.username, player.brandId),
    formatMoney(amount, player.currencyId),
    fee > 0 ? `(Fee ${formatMoney(fee, player.currencyId)})` : null,
    `#${numDeposits + 1}`,
    numDeposits === 0 ? 'NDC :pow:' : null,
  ]).join(' ');
  slack.logMessage(brandDefinitions[player.brandId].site, logText, {}, 'good');
  const amountBaseCy = MoneyClass.parse(amount / 100, player.currencyId)
    .asBaseCurrency()
    .asFixed();
  if (['SN', 'VB'].includes(player.brandId) && amountBaseCy >= 30000)
    slack.logSNVBHighrollerMessage(brandDefinitions[player.brandId].site, logText, {}, 'good');
  if (amountBaseCy >= 50000)
    slack.logHighrollerMessage(brandDefinitions[player.brandId].site, logText, {}, 'good');
};

const processDeposit = async (
  newAmount: ?Money,
  transactionKey: UUID,
  account: ?string,
  accountHolder: ?string,
  externalTransactionId: string,
  nextStatus: ?('created' | 'pending' | 'complete' | 'settled'),
  message: ?string,
  rawTransaction?: any,
  accountParameters?: mixed,
  depositParameters?: mixed,
  paymentFee: ?Money,
  paymentCost: ?Money,
  userId: ?number,
): Promise<any> => {
  const result = await pg.transaction(async (tx) => {
    const deposit = await tx('payments')
      .first([
        'playerId',
        'id',
        'paymentMethodId',
        'bonusId',
        'status',
        'paymentFee',
        'amount',
        'accountId',
        'parameters',
      ])
      .where({ transactionKey })
      .forUpdate();

    const parameters = { ...deposit.parameters, ...(depositParameters && depositParameters) };

    if (deposit == null)
      return Promise.reject({ error: errorCodes.DEPOSIT_NOT_FOUND, transactionKey });

    let accountId;
    let status = nextStatus || deposit.status;
    const amount = newAmount || deposit.amount;
    const { playerId, id, paymentMethodId, bonusId } = deposit;
    if (account != null || deposit.accountId == null) {
      accountId = await findOrCreateAccount(playerId, paymentMethodId, account || '', accountHolder, null, accountParameters, tx);
    } else {
      accountId = deposit.accountId;
      await updateAccountParameters(accountId, accountParameters, tx);
    }

    if (status === 'settled') {
      if (newAmount !== deposit.amount) status = 'complete';
      await addPaymentEvent(playerId, 'deposit', id, userId, amount, status, message, rawTransaction, null, tx);
      // TODO: make to work with 'settled' state. Now set 'settled' deposit to 'complete' to not to break logic and reporting
      status = 'complete';
    }

    if (deposit.status !== 'created' || status === 'created') {
      await tx('payments').update({ accountId, parameters }).where({ id });
      if (deposit.status !== 'complete') {
        await tx('payments').update({ status }).where({ id });
        await addPaymentEvent(playerId, 'deposit', id, userId, amount, status, message, rawTransaction, null, tx);
      }
      return { id, playerId, transactionKey, accountId, processed: false };
    }

    // This is executed only when leaving created state (to pending or complete)
    const { numDeposits, currencyId, balance } = await tx('players').first('numDeposits', 'currencyId', pg.raw('(balance + "bonusBalance") as balance')).where({ id: playerId }).forUpdate();
    const [player] = await tx('players').update({ numDeposits: pg.raw('"numDeposits" + 1') }).where({ id: playerId }).returning('*');
    await preDepositFraudCheck(playerId, balance, amount, currencyId, transactionKey, paymentMethodId, tx);
    const transactionId = await transactions.deposit(playerId, { amount, externalTransactionId }, tx);
    await tx('payments').update({ status, accountId, transactionId, externalTransactionId, amount, index: numDeposits, paymentCost, parameters }).where({ id });
    await addPaymentEvent(playerId, 'deposit', id, userId, amount, status, message, rawTransaction, transactionId, tx);
    await createDepositWageringCounter(playerId, amount, id, 'deposit_wager', tx);
    await updateLimitWithDeposit(playerId, amount, tx);
    await updateCounters(playerId);
    const fee = paymentFee || deposit.paymentFee;
    if (fee) {
      const paymentFeeId = await transactions.createPaymentFee(playerId, { amount: fee, externalTransactionId, targetTransactionId: transactionId }, tx);
      await addPaymentEvent(playerId, 'deposit', deposit.id, userId, fee, 'complete', `Payment fee ${formatMoney(fee)}`, null, paymentFeeId, tx);
    }
    if (bonusId != null) {
      const availableBonuses = await getAvailableDepositBonuses(playerId);
      const bonus = find(availableBonuses, b => b.id === bonusId);
      if (bonus != null) {
        const playerBonusId = await creditDepositBonus(playerId, bonus, amount, deposit, tx);
        await tx('payments').update({ playerBonusId }).where({ id });
      }
    }

    await fraudCheck(playerId, amount, currencyId, transactionKey, paymentMethodId, tx);
    await checkDepositAccounts(playerId, amount, currencyId, transactionKey, paymentMethodId, account || String(accountId), tx);

    logDepositToSlack(player, amount, fee, numDeposits);
    await EEG.notifyPlayerDeposit(playerId, transactionKey, tx);
    await Optimove.notifyPlayerDeposit({ playerId, transactionKey, trace: "processDeposit" }, tx);

    return { id, playerId, transactionKey, accountId, processed: true };
  });

  await Notification.notifyDeposit(result.playerId, transactionKey);
  await Notification.updatePlayer(result.playerId);
  await Optimove.notifyPlayerUpdate(result.playerId, pg);

  return result;
};

const getDepositMethods = (playerId: Id): Knex$QueryBuilder<DepositMethod[]> =>
  pg('payment_methods')
    .select(
      pg.raw('array_agg(accounts.id) as "accountId"'),
      pg.raw('array_agg(accounts.account) as "account"'),
      pg.raw('json_agg(accounts.parameters) as "parameters"'),
      'payment_methods.id as methodId',
      'payment_providers.id as providerId',
      'payment_providers.name as provider',
      'payment_methods.name as method',
      pg.raw('min("minDeposit") as "minDeposit"'),
      pg.raw('max("maxDeposit") as "maxDeposit"'),
    )
    .innerJoin('payment_providers', 'payment_providers.paymentMethodId', 'payment_methods.id')
    .innerJoin('payment_provider_limits', 'payment_providers.id', 'payment_provider_limits.paymentProviderId')
    .innerJoin('players', {
      'payment_provider_limits.brandId': 'players.brandId',
      'payment_provider_limits.currencyId': 'players.currencyId',
    })
    .innerJoin('payment_provider_currencies', {
      'payment_providers.id': 'payment_provider_currencies.paymentProviderId',
      'payment_provider_currencies.brandId': 'players.brandId',
      'payment_provider_currencies.currencyId': 'players.currencyId',
    })
    .leftJoin('payment_provider_countries', {
      'payment_provider_countries.paymentProviderId': 'payment_providers.id',
      'payment_provider_countries.countryId': 'players.countryId',
      'payment_provider_countries.brandId': 'players.brandId',
    })
    .leftOuterJoin('accounts', {
      'payment_methods.id': 'accounts.paymentMethodId',
      'accounts.playerId': 'players.id',
      'accounts.active': pg.raw('?', true),
    })
    .whereRaw(pg.raw(`(case
      when payment_providers."blockCountries" then
        payment_provider_countries."countryId" is null
      else
        payment_provider_countries."countryId" is not null
      end) = true`))
    .where('players.id', playerId)
    .where('payment_methods.active', true)
    .where('payment_providers.active', true)
    .where('payment_providers.deposits', true)
    .groupBy('payment_methods.id')
    .groupBy('payment_providers.id')
    .orderBy('payment_providers.priority');

const getRawDeposit = (transactionKey: string): Knex$QueryBuilder<RawDeposit> =>
  pg('payments').first('*').where({ transactionKey });

const getRawDepositById = (id: Id): Knex$QueryBuilder<RawDeposit> =>
  pg('payments').first('*').where({ id });


const getDeposit = (transactionKey: string): Knex$QueryBuilder<Deposit> =>
  pg('payments')
    .innerJoin('players', 'payments.playerId', 'players.id')
    .leftOuterJoin('bonuses', 'payments.bonusId', 'bonuses.id')
    .leftOuterJoin('player_counters', (qb) =>
      qb
        .on('payments.id', 'player_counters.paymentId')
        .onIn('player_counters.type', ['deposit_wager', 'deposit_campaign'])
        .on('player_counters.active', pg.raw('?', true)),
    )
    .innerJoin('payment_methods', 'payments.paymentMethodId', 'payment_methods.id')
    .innerJoin('payment_providers', 'payments.paymentProviderId', 'payment_providers.id')
    .innerJoin('payment_provider_limits', {
      'payment_provider_limits.brandId': 'players.brandId',
      'payment_provider_limits.currencyId': 'players.currencyId',
      'payment_provider_limits.paymentProviderId': 'payments.paymentProviderId',
    })
    .first(
      'payments.id as paymentId',
      'player_counters.id as counterId',
      'player_counters.limit as counterTarget',
      'player_counters.amount as counterValue',
      'payments.timestamp',
      'transactionKey',
      'payments.playerId',
      'players.username as username',
      'bonuses.name as bonus',
      'bonuses.id as bonusId',
      'payments.status',
      'payments.amount',
      'parameters',
      'index',
      'paymentFee',
      'paymentCost',
      'payment_methods.name as paymentMethod',
      'payment_providers.name as paymentProvider',
      'minDeposit',
      'accountId',
    )
    .where({ transactionKey });

const validPreviousStates = {
  created: ['created'],
  pending: ['created', 'pending'],
  complete: ['pending', 'complete'],
  settled: ['pending', 'complete'],
  cancelled: ['created', 'cancelled'],
  failed: ['pending', 'created', 'complete', 'failed'],
  expired: ['pending', 'created', 'expired'],
};

const resolveFailedDeposit = async (playerId: Id, paymentId: Id, amount: Money, playerBonusId: ?Id, transactionKey: string, tx: Knex$Transaction<any>) => {
  const { balance } = await tx('players').first('balance', 'bonusBalance').where({ id: playerId }).forUpdate();
  if (playerBonusId != null) {
    try {
      await forfeitBonus(tx, playerId, playerBonusId);
    } catch (e) {
      logger.warn('forfeitBonus failed in resolveFailedDeposit', e);
    }
  }
  await addTransaction(playerId, null, 'correction', -Math.min(balance, amount), `Correction for failed but complete deposit ${transactionKey}`, null, tx);
  await updateAccountStatusTx(playerId, { allowTransactions: false, allowGameplay: false }, null, tx);
  await addPlayerFraudTx(playerId, 'failed_deposit', transactionKey, { transactionKey }, tx);
};

const setDepositStatus = async (transactionKey: string, status: DepositStatus, message: string, rawTransaction: any): Promise<any> => {
  const previousStates = validPreviousStates[status];
  if (previousStates == null) {
    throw new Error(`Invalid previous state  ${transactionKey} - ${status}`);
  }
  const result = await pg.transaction(async (tx) => {
    const row = await tx('payments')
      .first('playerId', 'id', 'status', 'amount', 'playerBonusId')
      .where({ transactionKey, paymentType: 'deposit' })
      .whereIn('status', previousStates)
      .forUpdate();

    if (row == null) {
      return Promise.reject({ error: errorCodes.INVALID_PAYMENT_STATE });
    }

    if (row.status !== status) {
      if ((status === 'failed' || status === 'expired') && (row.status === 'complete' || row.status === 'pending')) {
        await resolveFailedDeposit(row.playerId, row.id, row.amount, row.playerBonusId, transactionKey, tx);
      } else {
        await tx('payments').update({ status }).where({ id: row.id });
      }
      await checkDepositRejections(row.playerId, tx);
    }
    await addPaymentEvent(row.playerId, 'deposit', row.id, null, null, status, message, rawTransaction, null, tx);
    await EEG.notifyPlayerDeposit(row.playerId, transactionKey, tx);
    await Optimove.notifyPlayerDeposit({ playerId: row.playerId, transactionKey, trace: "setDepositStatus"}, tx);

    return row;
  });

  return result;
};

const getDepositLevel = async (playerId: Id): Promise<number> => {
  const { totalDeposit } = await pg('players')
    .first(pg.raw('sum(payments.amount / conversion_rates."conversionRate") as "totalDeposit"'))
    .leftJoin('payments', 'payments.playerId', 'players.id')
    .innerJoin('conversion_rates', 'players.currencyId', 'conversion_rates.currencyId')
    .where('payments.paymentType', 'deposit')
    .andWhere((qb) =>
      qb
        .where(
          pg.raw(
            `now() - '7 days'::interval > all (
        select "answeredAt" from player_questionnaires
        inner join questionnaires on questionnaires.id = player_questionnaires."questionnaireId"
        where "playerId" = ? and questionnaires.name like 'Total_Deposits_%'
      )`,
            [playerId],
          ),
        )
        .orWhere(
          pg.raw('not exists(select * from player_questionnaires where "playerId" = ?)', [
            playerId,
          ]),
        ),
    )
    .whereIn('payments.status', ['complete', 'pending'])
    .where('players.id', playerId);

  // eslint-disable-next-line no-nested-ternary
  return totalDeposit > 1500000 ? 15 : totalDeposit > 1000000 ? 10 : totalDeposit > 500000 ? 5 : 0;
}

const postLinkageCheck = async (playerId: Id, tx: Knex$Transaction<any>) => {
  logger.debug(`postLinkageCheck for player ${playerId}`);
  const lifetimeDeposits = await getLifetimeDeposits(playerId, tx);
  if (lifetimeDeposits.total) {
    const totalMoney = new MoneyClass(lifetimeDeposits.total, 'EUR');
    const total = totalMoney.asFixed();
    logger.debug(`Checking life time deposits for player ${playerId} with total ${total / 100}`);
    if (total >= 2_000_00)
      await addPlayerFraudTx(playerId, 'lifetime_deposit_2k', '', { total }, tx);
  }
  logger.debug(`Checking cumulative SOW for player ${playerId}`);
  await checkRecentCumulativeSowThreshold(playerId, tx);
  logger.debug(`Checking due diligence requirements for player ${playerId}`);
  await updateDDRequirementFlag(playerId, tx);
  logger.debug(`Checking deposit thresholds for player ${playerId}`);
  await checkDepositsThresholds(playerId, tx);
  logger.debug(`Checking expected monthly deposit amount for player ${playerId}`);
  await checkExpectedMonthlyDepositAmount(playerId, tx);
};

module.exports = {
  startDeposit,
  processDeposit,
  getDepositMethods,
  getPendingDeposits,
  getDeposit,
  getRawDeposit,
  getRawDepositById,
  setDepositStatus,
  getDepositLevel,
  getLifetimeDeposits,
  postLinkageCheck
};
