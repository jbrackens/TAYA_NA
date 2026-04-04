// @flow
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { addTransaction } = require('./server/modules/payments/Payment');
const { activate } = require('./server/modules/players/Player');

(async () => {
  await pg.transaction(async (tx) => {
    const players = await pg('players').select('id').whereRaw(`"email" like '%@luckydino.com'`);
    for (const { id } of players) {
      await activate(id, '127.0.0.1', tx);
      const t = await addTransaction(id, null, 'compensation', 500000, 'testing', null, tx);
      logger.info('transaction added', { t });
    }
  });
  process.exit(0);
})();
