/* @flow */
const clean = require('./clean');

describe('PaymentIQ', () => {
  it('cleans given string from non-ascii characters', () => {
    expect(clean('')).to.equal('');
    expect(clean('O\'Hara')).to.equal('OHara');
    expect(clean('O!Hara')).to.equal('OHara');
    expect(clean('喀耳刻')).to.equal('XXX');
    expect(clean('Mäöåp åpäöå')).to.equal('Maoap apaoa');
  });
});
