/* @flow */
const spelpaus = require('./modules/spelpaus');

const providers = {
  SE: spelpaus.api,
};

export type Provider = $Keys<typeof providers>;

module.exports = { providers };
