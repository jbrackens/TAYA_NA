/* @flow */
const { generatePin } = require('./crypt');

describe('Crypt', () => {
  it('can generate random pin', () => {
    const arr = [...Array(5).keys()];
    const pins = arr.map(() => generatePin(6));

    pins.map((p) => {
      console.log({ p }); // eslint-disable-line no-console
      return expect(p.toString().length).to.be.equal(6);
    });
  });
});
