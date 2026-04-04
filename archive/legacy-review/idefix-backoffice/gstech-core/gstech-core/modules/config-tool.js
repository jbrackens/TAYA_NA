require('flow-remove-types/register');

const miserypt = require('./miserypt');

const generateKeyPair = () => {
  const keyPair = miserypt.keyGen();
  console.log({ keyPair }); // eslint-disable-line no-console
};

const encrypt = (configurationSet, value) => {
  const jsonConfig = require(`../config.${configurationSet}.js`);
  const encrypted = miserypt.encrypt(value, jsonConfig.publicKey);
  console.log({ encrypted }); // eslint-disable-line no-console
};

const args = process.argv.slice(2);
const action = args && args[0];

if (action === 'keygen') generateKeyPair();

if (action === 'encrypt') {
  const configurationSet = args[1];
  const value = args[2];

  encrypt(configurationSet, value);
}
