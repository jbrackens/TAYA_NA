/* @flow */

const api = require('./routes');
const { prepareIpAddresses } = require('./Ip');

module.exports = {
  api,
  prepareIpAddresses,
};
