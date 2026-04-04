/* @flow */
const crypto = require('crypto');
const utils = require('./utils');

const calculateFraudToken = (req: express$Request): string =>
  crypto
    .createHash('sha256')
    .update('Sosnovy Bor,Chernobyl', 'utf8')
    .update(`${req.headers['user-agent']}`)
    .update(`${utils.getRemoteAddress(req, false)}`)
    .digest('hex');

const validateFraudToken = (req: express$Request, token: ?string): boolean => {
  const token2 = calculateFraudToken(req);
  return token2 === token;
};

module.exports = { calculateFraudToken, validateFraudToken };
