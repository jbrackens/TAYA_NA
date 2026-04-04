/* @flow */
const Currencies = require('./Currencies');

describe('Currencies', function test(this: $npm$mocha$ContextDefinition) {
  this.timeout(30000);
  it('can get currencies', async () => {
    const currencies = await Currencies.getCurrencies('OS');

    expect(currencies.length).to.be.equal(1);
    expect(currencies).containSubset([{ id: 'NOK' }]);
  });

  it('can get all currencies', async () => {
    const currencies = await Currencies.getCurrencies('OS', true);

    expect(currencies.length).to.be.equal(2);
    expect(currencies).containSubset([{ id: 'NOK' }, { id: 'EUR' }]);
  });
});
