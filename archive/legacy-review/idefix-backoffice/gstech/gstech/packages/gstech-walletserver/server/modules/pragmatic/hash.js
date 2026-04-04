/* @flow */
const sortBy = require('lodash/sortBy');
const keys = require('lodash/keys');
const crypto = require('crypto');

const md5 = (text: string) => crypto.createHash('md5').update(text).digest('hex').toLowerCase();

const calculateHash = (secretKey: string, params: any): string => {
  const k = sortBy(keys<string>(params));
  return md5(k.filter(key => key !== 'hash' && params[key] != null && params[key] !== '').map(key => `${key}=${params[key]}`).join('&') + secretKey);
};

module.exports = { calculateHash };
