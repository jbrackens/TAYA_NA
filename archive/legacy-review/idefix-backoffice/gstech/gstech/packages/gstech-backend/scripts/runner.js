/* @flow */
require('flow-remove-types/register')({ all: true });
const _ = require('lodash');

require(`./${process.argv[_.findIndex(process.argv, (a) => a === '--') + 1]}`);
