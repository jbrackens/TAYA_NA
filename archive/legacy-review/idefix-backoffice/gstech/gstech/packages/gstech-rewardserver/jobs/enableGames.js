/* @flow */

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

module.exports = async () => {
  const data = require('./games.json');
  for (const d of data) {
    logger.info('enabling game:', { d });
    await pg('games').update({ active: true }).where({ brandId: 'VB', permalink: d.permalink });
    await pg('games').update({ active: true }).where({ brandId: 'SN', permalink: d.permalink });
  }
};
