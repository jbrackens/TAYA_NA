/* @flow */
import type { Configuration } from './types/config';

const _ = require('lodash');
const nacl = require('tweetnacl');
const {
  encodeUTF8,
  decodeUTF8,
  encodeBase64,
  decodeBase64,
} = require('tweetnacl-util');

const defaultKey = 'pJB/3EJA9FJfFVrwvifjtXPg9gnYyjatZ+V+3GlkqeY=';

const newNonce = () => nacl.randomBytes(nacl.secretbox.nonceLength);

const encrypt = (value: string, publicKey: string) => {
  const nonce = newNonce();
  const message = decodeUTF8(value);
  const box = nacl.secretbox(message, nonce, decodeBase64(publicKey));

  const fullMessage = new Uint8Array(nonce.length + box.length);
  fullMessage.set(nonce);
  fullMessage.set(box, nonce.length);
  return `GS[${encodeBase64(fullMessage)}]`;
};

const decrypt = (messageWithNonce: string, publicKey: string, privateKey: string) => {
  const messageWithNonceAsUint8Array = decodeBase64(messageWithNonce);
  const nonce = messageWithNonceAsUint8Array.slice(0, nacl.secretbox.nonceLength);
  const message = messageWithNonceAsUint8Array.slice(nacl.secretbox.nonceLength, messageWithNonce.length);

  const decrypted = nacl.secretbox.open(message, nonce, decodeBase64(publicKey), decodeBase64(privateKey));

  if (!decrypted) {
    throw new Error('Could not decrypt message');
  }

  return encodeUTF8(decrypted);
};

const keyGen = () => {
  const pair = nacl.box.keyPair();
  const keyPair = {
    privateKey: encodeBase64(pair.secretKey),
    publicKey: encodeBase64(pair.publicKey),
  };

  return keyPair;
};

const decryptObject = (obj: any, publicKey: string, privateKey: string) => {
  _.each(_.keys(obj), (key) => {
    const value = obj[key];
    if (_.isObject(value)) {
      decryptObject(value, publicKey, privateKey);
    } else if (_.isString(value)) {
      const r = value.match(/^GS\[(.*)\]$/);
      if (r) {
        obj[key] = decrypt(r[1], publicKey, privateKey); // eslint-disable-line no-param-reassign
      }
    }
  });
  return obj;
};

const decryptConfig = function identity<T>(obj: Configuration<T>): T {
  const pubKey = obj.publicKey;
  const prvKey = process.env.CONFIG_KEY || defaultKey;

  if (!pubKey || pubKey.trim() === '') throw new Error('Public key not found');
  if (!prvKey || prvKey.trim() === '') throw new Error('Private key not found');

  const decrypted = decryptObject(obj, pubKey, prvKey);
  return decrypted.data;
};

module.exports = {
  keyGen,
  encrypt,
  decrypt,
  decryptObject,
  decryptConfig,
};
