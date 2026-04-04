/* @flow */
const pg = require('gstech-core/modules/pg');
const { PLAYERS, PLAYER_FIELDS } = require('../players/Player');

const report = async (brandId: ?string): Promise<any> => {
  const users = pg(PLAYERS)
    .select([...PLAYER_FIELDS, 'lastLogin'])
    .where({ accountClosed: false })
    .whereRaw('"lastLogin" < NOW() - INTERVAL \'30 months\'')
    .orderBy('lastLogin');
  if (brandId != null) {
    users.where({ brandId });
  }
  return users;
};

module.exports = { report };
