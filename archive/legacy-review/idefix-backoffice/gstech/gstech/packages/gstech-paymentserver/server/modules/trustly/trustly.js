/* @flow */
const trustlyClient = require('trustly-client').default;

const config = require('../../../config');

const createTrustlyClient = (conf: { username: string, password: string}) => {
  const configuration = {
    username: conf.username,
    password: conf.password,
    privateKey: config.providers.trustly.privateKey,
    environment: config.env,
  };

  return trustlyClient(configuration);
};

module.exports = {
  standard: (createTrustlyClient(config.providers.trustly.accounts.standard): any),
  pnp: (createTrustlyClient(config.providers.trustly.accounts.pnp): any),
  bank: (createTrustlyClient(config.providers.trustly.accounts.bank): any),
};
