/* @flow */
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';
import type { Deposit, Withdrawal } from 'gstech-core/modules/types/backend';

const hstore = require('hstore.js');
const keys = require('lodash/fp/keys');

const PLAYERS = 'players';
const PLAYER_FIELDS = [
  'id',
  'brandId',
  'username',
  'email',
  'firstName',
  'lastName',
  'address',
  'postCode',
  'city',
  'mobilePhone',
  'countryId',
  'dateOfBirth',
  'languageId',
  'nationalId',
  'currencyId',
  'allowEmailPromotions',
  'allowSMSPromotions',
  'gamblingProblem',
  'accountClosed',
  'accountSuspended',
  'testPlayer',
  'createdAt',
  'activated',
  'verified',
  'tcVersion',
  'placeOfBirth',
  'nationality',
  'additionalFields',
];
const walletErrorCodes = require('gstech-core/modules/errors/wallet-error-codes');
const { personPlayerIdsQuery } = require('../../persons/Person');

const getPlayer = async (id: Id, tx: Knex): Promise<PlayerWithDetails> => {
  const player = await tx(PLAYERS)
    .with('person', personPlayerIdsQuery(tx, id))
    .leftOuterJoin('player_limits', (qb) =>
      qb
        .onIn('playerId', tx.select('playerIds').from('person'))
        .on('active', tx.raw('?', true))
        .on('type', tx.raw('?', 'exclusion'))
        .andOn((qb) =>
          qb.on(tx.raw('expires > now()')).orOn(tx.raw('(expires is null and permanent=true)')),
        ),
    )
    .first([
      ...PLAYER_FIELDS.map((field) => `players.${field}`),
      'players.registrationSource',
      'players.affiliateRegistrationCode',
      tx.raw(
        'max(case when player_limits.expires is null and player_limits.permanent then \'2999-01-01\' else player_limits.expires end) as "selfExclusionEnd"',
      ),
      'allowGameplay',
      'preventLimitCancel',
      'allowTransactions',
      'loginBlocked',
      'accountClosed',
      'gamblingProblem',
      'accountSuspended',
      'numDeposits',
      'activated',
      'emailStatus',
      'mobilePhoneStatus',
      'tcVersion',
      'tags',
      'partial',
      'realityCheckMinutes',
      tx.raw('case when hash is null then true else false end as pnp'),
      tx.raw(`"lastLogin"<now()-'2 years'::interval as "marketingExpired"`),
      tx.raw('("depositLimitReached" is not null) as flagged'),
      tx.raw('(("depositLimitReached" + \'30 days\'::interval) < now()) as locked'),
      tx.raw('("depositLimitReached" + \'30 days\'::interval) as "lockTime"'),
    ])
    .groupBy('players.id')
    .where({ 'players.id': id });
  if (id == null) {
    return Promise.reject(walletErrorCodes.PLAYER_NOT_FOUND);
  }
  const {
    id: playerId,
    brandId,
    username,
    email,
    firstName,
    lastName,
    address,
    postCode,
    city,
    mobilePhone,
    countryId,
    dateOfBirth,
    languageId,
    nationalId,
    currencyId,
    allowEmailPromotions,
    allowSMSPromotions,
    createdAt,
    activated,
    verified,
    selfExclusionEnd,
    allowGameplay,
    preventLimitCancel,
    allowTransactions,
    loginBlocked,
    accountClosed,
    accountSuspended,
    gamblingProblem,
    numDeposits,
    testPlayer,
    emailStatus,
    mobilePhoneStatus,
    tcVersion,
    tags,
    flagged,
    locked,
    lockTime,
    partial,
    pnp,
    marketingExpired,
    placeOfBirth,
    nationality,
    additionalFields,
    registrationSource,
    affiliateRegistrationCode,
    realityCheckMinutes,
  } = player;

  const deactivated =
    selfExclusionEnd != null ||
    accountClosed ||
    accountSuspended ||
    gamblingProblem ||
    marketingExpired;
  const result: PlayerWithDetails = {
    id: playerId,
    brandId,
    username,
    email,
    firstName,
    lastName,
    address,
    postCode,
    city,
    mobilePhone,
    countryId,
    dateOfBirth,
    languageId,
    nationalId,
    currencyId,
    allowEmailPromotions: allowEmailPromotions && !deactivated && emailStatus !== 'failed',
    allowSMSPromotions: allowSMSPromotions && !deactivated && mobilePhoneStatus !== 'failed',
    createdAt,
    activated,
    verified,
    selfExclusionEnd,
    allowGameplay,
    preventLimitCancel,
    allowTransactions,
    loginBlocked,
    accountClosed,
    accountSuspended,
    numDeposits,
    testPlayer,
    gamblingProblem,
    tcVersion,
    partial,
    pnp,
    tags: tags ? keys(hstore.parse(tags)) : [],
    dd: {
      flagged: flagged && !verified,
      locked: flagged && !!locked && !verified,
      lockTime,
    },
    placeOfBirth,
    nationality,
    additionalFields,
    registrationSource,
    affiliateRegistrationCode,
    realityCheckMinutes,
  };
  return result;
};

const getDeposit = (transactionKey: string, tx: Knex): Knex$QueryBuilder<Deposit> =>
  tx('payments')
    .innerJoin('players', 'payments.playerId', 'players.id')
    .leftOuterJoin('bonuses', 'payments.bonusId', 'bonuses.id')
    .leftOuterJoin('player_counters', (qb) =>
      qb
        .on('payments.id', 'player_counters.paymentId')
        .onIn('player_counters.type', ['deposit_wager', 'deposit_campaign'])
        .on('player_counters.active', tx.raw('?', true)),
    )
    .innerJoin('payment_methods', 'payments.paymentMethodId', 'payment_methods.id')
    .innerJoin('payment_providers', 'payments.paymentProviderId', 'payment_providers.id')
    .innerJoin('payment_method_limits', {
      'payment_method_limits.brandId': 'players.brandId',
      'payment_method_limits.currencyId': 'players.currencyId',
      'payment_method_limits.paymentMethodId': 'payments.paymentMethodId',
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

const getWithdrawal = (id: Id, tx: Knex): Promise<Withdrawal> =>
  tx('payments')
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
    .leftJoin('payment_providers', 'payments.paymentProviderId', 'payment_providers.id')
    .where({
      paymentType: 'withdraw',
      'payments.id': id,
    });

module.exports = {
  getPlayer,
  getDeposit,
  getWithdrawal,
};
