/* @flow */
const { encrypt, decrypt, generatePin } = require('./crypt');

describe('Crypt', () => {
  let encrypted;
  const text = 'little fluffy clouds';
  const hash = 'cd86de83c54183fdf372c09d080113154e487f4c3a345f88c7d46f3a2690fb06';
  it('can encrypt', () => {
    encrypted = encrypt('t9ewrAj7No7XMEPU]8+2', text);
    expect(encrypted).to.be.equal(hash);
  });

  it('can decrypt', () => {
    const decrypted = decrypt('t9ewrAj7No7XMEPU]8+2', encrypted);
    expect(decrypted).to.be.equal(text);
  });

  it('can generate random pin', () => {
    const arr = [...Array(5).keys()];
    const pins = arr.map(() => generatePin(6));

    pins.map((p) => expect(p.toString().length).to.be.equal(6));
  });
});
