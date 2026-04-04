/* @flow */

import type { Deposit } from "gstech-core/modules/types/backend";

require('flow-remove-types/register');

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { createProducer } = require('gstech-core/modules/bus');

const Segments = require('../server/modules/segments');
const Player = require('../server/modules/players');

(async () => {
  logger.debug('starting to fill kafka with initial data...');

  const depositEvent = await createProducer('DepositEvent');

  const depositHandler = async (deposit: Deposit) => {
    logger.debug(`pushing player deposit data: ${deposit.paymentId}`);
    const player = await Player.getPlayerWithRisk(deposit.playerId);
    const segments = await Segments.getPlayerSegments(deposit.playerId);
    await depositEvent({ player, deposit, segments, updateType: 'Deposit' });
  }

  await pg('payments')
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
    .innerJoin('payment_method_limits', {
      'payment_method_limits.brandId': 'players.brandId',
      'payment_method_limits.currencyId': 'players.currencyId',
      'payment_method_limits.paymentMethodId': 'payments.paymentMethodId',
    })
    .select(
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
    .where({ status: 'complete', paymentType: 'deposit' })
    .stream({ highWaterMark: 2 })
    .on('data', depositHandler)
    .on('error', logger.error);

})();
