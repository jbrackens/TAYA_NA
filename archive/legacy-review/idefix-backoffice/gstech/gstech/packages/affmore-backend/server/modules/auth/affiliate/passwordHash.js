 
/* @flow */

const crypto = require('crypto');

const randomBytes = (length: number): Promise<string> =>
  new Promise((resolve, reject) =>
    crypto.randomBytes(length, (err, salt) => (err ? reject(err) : resolve(salt.toString('hex')))),
  );
const randomHash = (password: string, salt: string): Promise<string> =>
  new Promise((resolve, reject) =>
    crypto.pbkdf2(password, salt, 25000, 512, 'sha1', (err, hash: any) =>
      err ? reject(err) : resolve(Buffer.from(hash, 'binary').toString('hex')),
    ),
  );

const createPasswordHash = async (password: string): Promise<{ hash: string, salt: string }> => {
  const salt = await randomBytes(20);
  const hash = await randomHash(password, salt);

  return { hash, salt };
};

const checkPasswordHash = async (password: string, hash: string, salt: string): Promise<boolean> => {
  const maybeHash = await randomHash(password, salt);
  return maybeHash === hash;
};

module.exports = {
  createPasswordHash,
  checkPasswordHash,
};
