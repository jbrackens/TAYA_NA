/* @flow */
require('flow-remove-types/register');

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const Person = require('../server/modules/persons/Person');

(async () => {
  logger.debug('starting to group player into persons..');

  const { rows: players } =
    await pg.raw(`SELECT array_agg(id) as ids, "email", "mobilePhone", COUNT(id) as count
    FROM players where email != 'anonymized@luckydino.com'
    GROUP BY "email", "mobilePhone"
    HAVING COUNT(id) > 1
    ORDER BY COUNT(id)`);

  for (const { ids, email, mobilePhone, count } of players) {
    logger.debug(`same person detected with details: `, { ids, email, mobilePhone, count });
    const [firstPlayer, ...rest] = ids;
    for (const s of rest) await Person.connectPlayersWithPerson(pg, firstPlayer, s);
  }
  process.exit();
})();
