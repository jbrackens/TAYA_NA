/* @flow */

const PaymentMethods = require('./PaymentMethods');

describe('getPaymentMethodWithProviders', () => {
  it('returns payment providers for given payment method', async () => {
    const result = await PaymentMethods.getPaymentMethodWithProviders(4);

    expect(result).to.deep.containSubset({
      name: 'CreditCard',
      active: true,
      paymentProviders: [
        {
          name: 'Worldpay',
          paymentMethodId: 4,
          active: true,
        },
        {
          name: 'APCO',
          paymentMethodId: 4,
          active: false,
        },
        {
          name: 'EMP',
          paymentMethodId: 4,
          active: true,
        },
        {
          name: 'Bambora',
          paymentMethodId: 4,
          active: true,
        },
        {
          name: 'Mifinity',
          paymentMethodId: 4,
          active: true,
        },
      ],
    });
  });
});