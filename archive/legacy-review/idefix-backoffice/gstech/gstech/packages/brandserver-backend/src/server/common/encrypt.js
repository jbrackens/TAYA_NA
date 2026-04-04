/* @flow */
const crypto = require('crypto');

const encrypt = (password: string, text: string): string => {
  const cipher = crypto.createCipher('aes-256-ctr', password);
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
};

const decrypt = (password: string, text: string): null | string => {
  try {
    const decipher = crypto.createDecipher('aes-256-ctr', password);
    return decipher.update(text, 'hex', 'utf8') + decipher.final('utf8');
  } catch (error) {
    return null;
  }
};

module.exports = { encrypt, decrypt };
