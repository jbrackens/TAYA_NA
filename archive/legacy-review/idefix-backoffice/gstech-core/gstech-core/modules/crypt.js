/* @flow */
const crypto = require('crypto');

const md5 = (text: string) => crypto.createHash('md5').update(text).digest('hex');

const encrypt = (key: string, text: string) => {
  const cipher: any = crypto.createCipher('aes-256-cbc', key);
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
};

const decrypt = (key: string, text: string) => {
  const decipher: any = crypto.createDecipher('aes-256-cbc', key);
  return decipher.update(text, 'hex', 'utf8') + decipher.final('utf8');
};

const generatePin = (length: number): number => {
  const pin = Math.floor((10 ** (length - 1)) + (Math.random() * ((10 ** length) - (10 ** (length - 1)) - 1)));
  return pin;
};

module.exports = {
  encrypt,
  decrypt,
  md5,
  generatePin,
};
