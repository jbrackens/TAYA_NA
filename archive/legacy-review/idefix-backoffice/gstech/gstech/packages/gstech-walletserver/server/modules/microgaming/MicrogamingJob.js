/* @flow */
const keys = require('lodash/keys');
const {
  processCommitQueue,
  processRollbackQueue,
  processFailedEndGameQueue,
} = require('./MicrogamingQueueJob');
const { getConf } = require('./MicrogamingGame');

const processJob = (): Promise<mixed> => Promise.all(keys(getConf().brands).map(async brandId => Promise.all([
  processCommitQueue(brandId),
  processRollbackQueue(brandId),
  processFailedEndGameQueue(brandId),
])));

module.exports = { processJob };
