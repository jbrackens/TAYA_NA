/* @flow */
const commonResponders = require('../common/common-responders');
const coins = require('./coins');
const progress = require('./olaspill-progress');

module.exports = (commonResponders(progress, coins): any);
