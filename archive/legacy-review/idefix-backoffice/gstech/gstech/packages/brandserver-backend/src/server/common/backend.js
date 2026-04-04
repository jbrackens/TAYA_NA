/* @flow */
const logger = require('./logger');
const datastorage = require('./datastorage');

const init = (): Promise<void> =>
  Promise.all([datastorage.init()]).then(async () => {
    logger.debug('Backend initialized 🦖');
  });

module.exports = {
  init,
};
