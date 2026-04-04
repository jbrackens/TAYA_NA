/* @flow */
const crypto = require('crypto');

const config = require('../../../config');

const sessionSignature = (verification: any, buffer?: boolean = false): string => {
  const payload = buffer ? verification : JSON.stringify(verification);
  const signature = crypto.createHash('sha256');
  signature.update(buffer ? payload : Buffer.from(payload, 'utf8'));
  signature.update(Buffer.from(config.providers.veriff.apiSecret, 'utf8'));
  return signature.digest('hex');
};

module.exports = {
  sessionSignature,
}
