/* @flow */
const Payments = require('./Payments');

describe('Payments', function test(this: $npm$mocha$ContextDefinition) {
  this.timeout(30000);
  it('can get payment providers', async () => {
    const paymentProviders = await Payments.getPaymentProviders();
    expect(paymentProviders).containSubset([{ name: 'Entercash' }]);
  });
});
