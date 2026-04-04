// @flow
require('flow-remove-types/register');
const _ = require('lodash');

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const dropClicks = async () => {
  try {
    logger.info('dropClicks: deleting clicks start');

    const { rows: clicks } = await pg.raw(`select id from clicks
where clicks."linkId" in (14662, 14661, 14065, 14325, 14230)
and not exists (
   select from players
   where players."clickId" = clicks.id)
order by "clickDate" desc limit 100`);

    logger.info('dropClicks: deleting clicks start', { count: clicks.length });

    try {
      for (const chunk of _.chunk(clicks, 10)) {
        await pg('clicks').delete().whereIn('id', chunk.map(c => c.id));
      }
    } catch (e) {
      logger.error('dropClicks: deleting click error', e);
    }

    logger.info('dropClicks: deleting clicks done');
  } catch (e) {
    logger.error('dropClicks: error', e);
  }
};

module.exports = dropClicks;
