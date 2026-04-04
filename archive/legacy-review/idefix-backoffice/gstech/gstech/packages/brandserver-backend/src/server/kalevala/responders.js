/* @flow */
const progress = require('./kalevala-progress');
const coins = require('./coins');
const commonResponders = require('../common/common-responders');

const commons: any = commonResponders(progress, coins);

module.exports = commons;
