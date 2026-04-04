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

const secrets = require('./secrets');

const newNonce = () => nacl.randomBytes(nacl.box.nonceLength);

const encrypt = (value: string, publicKey: string): string => {
  const nonce = newNonce();
  const message = decodeUTF8(value);
  const [keyB, keyA] = publicKey.split('|');
  const sharedA = nacl.box.before(decodeBase64(keyB), decodeBase64(keyA));
  const box = nacl.box.after(message, nonce, sharedA);

  const fullMessage = new Uint8Array(nonce.length + box.length);
  fullMessage.set(nonce);
  fullMessage.set(box, nonce.length);
  return `GS[${encodeBase64(fullMessage)}]`;
};

const decrypt = (messageWithNonce: string, sharedA: string): string => {
  const messageWithNonceAsUint8Array = decodeBase64(messageWithNonce);
  const nonce = messageWithNonceAsUint8Array.slice(0, nacl.box.nonceLength);
  const message = messageWithNonceAsUint8Array.slice(nacl.box.nonceLength, messageWithNonce.length);

  const decrypted = nacl.box.open.after(message, nonce, sharedA);

  if (!decrypted) {
    throw new Error('Could not decrypt message');
  }

  return encodeUTF8(decrypted);
};

const keyGen = (): { privateKey: string, publicKey: string } => {
  const pairA = nacl.box.keyPair();
  const pairB = nacl.box.keyPair();
  const keyPair = {
    privateKey: `${encodeBase64(pairB.publicKey)}|${encodeBase64(pairA.secretKey)}`,
    publicKey: `${encodeBase64(pairA.publicKey)}|${encodeBase64(pairB.secretKey)}`,
  };
  return keyPair;
};

const decodePk = (pk: string) => {
  if (!pk || pk.trim() === '') throw new Error('Private key not found');
  const [keyA, keyB] = pk.split('|');
  return nacl.box.before(decodeBase64(keyA), decodeBase64(keyB));
};

const decryptObject = (obj: any, sharedA: any): any => {
  _.each<string, string, string[]>(_.keys(obj), (key) => {
    const value = obj[key];
    if (_.isObject(value)) {
      decryptObject(value, sharedA);
    } else if (_.isString(value)) {
      const r = value.match(/^GS\[(.*)\]$/);
      if (r) {
        obj[key] = decrypt(r[1], sharedA); // eslint-disable-line no-param-reassign
      }
    }
  });
  return obj;
};

const decryptConfig = function identity<T>(obj: Configuration<T>, privateKey?: string): T {
  const pk = privateKey || process.env.PRIVATE_KEY || secrets.PRIVATE_KEY ;
  const decrypted = decryptObject(obj, decodePk((pk: any))); // FIXME: type
  return decrypted.data;
};

const decryptConfigLine = (line: string): string => {
  const pk = process.env.PRIVATE_KEY || secrets.PRIVATE_KEY ;
  return decrypt(line, decodePk((pk: any))); // FIXME: type
};;

const decryptFullString = (text: string): ?string => {
  const pk = process.env.PRIVATE_KEY || secrets.PRIVATE_KEY ;
  const r = text.match(/^GS\[(.*)\]$/);
  if (r) {
    return decrypt(r[1], decodePk((pk: any))); // FIXME: type
  }
  return null;
};

module.exports = {
  keyGen,
  encrypt,
  decryptConfig,
  decryptConfigLine,
  decryptFullString,
};
