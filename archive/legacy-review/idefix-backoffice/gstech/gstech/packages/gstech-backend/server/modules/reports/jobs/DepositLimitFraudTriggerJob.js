/* @flow */
const promiseLimit = require('promise-limit');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger')

const { addPlayerFraud } = require('../../frauds');

const limit = promiseLimit(4);

const update = async () => {
  logger.debug('deposit limit fraud trigger job: started...');

  const players = await pg('players')
    .select(
      'players.id',
      'players.username',
      'players.firstName',
      'players.lastName',
      'players.countryId',
      'players.email',
      'players.riskProfile',
    )
    .where({ verified: false })
    .whereRaw('(("depositLimitReached" + \'30 days\'::interval) < now())')
    .whereNotNull('depositLimitReached')
    .groupBy('players.id')
    .orderBy('depositLimitReached');

  logger.debug(`deposit limit fraud trigger for ${players.length} players.`);

  await Promise.all(
    players.map((player) =>
      limit(() => addPlayerFraud(player.id, 'deposit_limit_reached', ''))));

  logger.debug('deposit limit fraud trigger job completed.');
};

module.exports = { update };
