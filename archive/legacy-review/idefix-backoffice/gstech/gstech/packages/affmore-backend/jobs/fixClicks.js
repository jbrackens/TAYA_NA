 
/* @flow */
require('flow-remove-types/register');

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const fixClicks = async () => {
  try {
    logger.info('fixClicks: begin');

    const { rows: clicks } = await pg.raw(`select id, "clickDate" from clicks where "clickDate" >= '2022-11-30T7:08' and id < 40000000 order by id limit 5000`);

    logger.info('fixClicks: start', { count: clicks.length });

    for (const click of clicks) {
      await pg.transaction(async tx => {
        const { rows: [updatedClick] } = await tx.raw(`update clicks set id = nextval('clicks_id_seq'::regclass) where id = ${click.id} and "clickDate" > '2022-11-30T7:08' returning *`);
        const { rows: players } = await tx.raw(`select id from players where "registrationDate" >= '2022-11-30T7:08' and "clickId" = ${click.id}`);

        if (players.length === 0) return;
        if (players.length > 1) { logger.warn(`fixClicks: more than one player found for the click`, { players }); return; }

        if (players.length === 1) {
          const { rows: [updatedPlayer] } = await tx.raw(`update players set "clickId" = ${updatedClick.id} where id = ${players[0].id} returning *`);
          logger.info(`fixClicks: player was updated to use the new click`, { updatedPlayer });
        } else {
          logger.info('fixClicks: cannot update players', { players });
        }
      });
    }

    logger.info('fixClicks: done!');
  } catch (e) {
    logger.error('fixClicks: error', e);
  }
};

module.exports = fixClicks;
