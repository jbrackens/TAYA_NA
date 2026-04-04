/* @flow */
module.exports = (!process.env.KALEVALA_V2 ? require('./journey-v1') : require('./journey-v2'): any); // FIXME: kalevala-v2
