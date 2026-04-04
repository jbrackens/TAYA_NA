/* @flow */
const crypto = require('crypto');
const config = require('../../../config');

const configuration = config.providers.qpay;

const key = Buffer.from(configuration.aesKey, 'base64');
const iv = Buffer.from(configuration.aesIV, 'utf8');

const encrypt = (data: { [string]: string }): string => {
  const line = Object.values(data).join('|');

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(line, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return encrypted;
};

const decrypt = (encrypted: string): string => {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = decipher.update(encrypted, 'base64', 'utf8');
  return (decrypted + decipher.final('utf8'));
};

module.exports = {
  encrypt,
  decrypt,
}