/* @flow */
require('flow-remove-types/register');

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { createProducer } = require('gstech-core/modules/bus');

const Player = require('../server/modules/players');
const Segments = require('../server/modules/segments');

(async () => {
  logger.debug('starting to fill kafka with initial data...');

  const playerUpdateEvent = await createProducer('PlayerUpdateEvent');

  const playerHandler = async ({ id: playerId }: { id: Id }) => {
    logger.debug(`pushing data for player: ${playerId}`);
    const player = await Player.getPlayerWithDetails(playerId);
    const segments = await Segments.getPlayerSegments(playerId);
    await playerUpdateEvent({ player, segments, updateType: 'Default' });
  };

  await pg.select('id').from('players').stream({ highWaterMark: 2 })
    .on('data', playerHandler)
    .on('error', logger.error);
})();
