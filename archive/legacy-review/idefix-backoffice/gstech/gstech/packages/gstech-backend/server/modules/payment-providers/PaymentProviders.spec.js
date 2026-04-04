/* @flow */

const pg = require('gstech-core/modules/pg');

const PaymentProviders = require('./PaymentProviders');

describe('PaymentProviders', () => {
  describe('getPaymentProviderDetails', () => {
    it('returns payment provider with countries and currencies', async () => {
      const result = await PaymentProviders.getPaymentProviderDetails(3);

      expect(result).to.deep.containSubset({
        id: 3,
        name: 'Neteller',
        active: true,
        deposits: true,
        paymentMethodId: 2,
        priority: 100,
        withdrawals: true,
        blockCountries: true,
        countries: [{ brandId: 'LD', id: 'NO' }],
        currencies: [
          {
            brandId: 'LD',
            id: 'EUR',
            minDeposit: 2000,
            maxDeposit: 1000000,
            maxPendingDeposits: null,
            minWithdrawal: 2500,
            maxWithdrawal: 10000000,
          },
          {
            brandId: 'LD',
            id: 'SEK',
            minDeposit: 20000,
            maxDeposit: 10000000,
            maxPendingDeposits: null,
            minWithdrawal: 25000,
            maxWithdrawal: 100000000,
          },
          {
            brandId: 'LD',
            id: 'NOK',
            minDeposit: 20000,
            maxDeposit: 10000000,
            maxPendingDeposits: null,
            minWithdrawal: 25000,
            maxWithdrawal: 100000000,
          },
          {
            brandId: 'LD',
            id: 'USD',
            minDeposit: 2000,
            maxDeposit: 1000000,
            maxPendingDeposits: null,
            minWithdrawal: 2500,
            maxWithdrawal: 10000000,
          },
          {
            brandId: 'LD',
            id: 'GBP',
            minDeposit: 2000,
            maxDeposit: 1000000,
            maxPendingDeposits: null,
            minWithdrawal: 2500,
            maxWithdrawal: 10000000,
          },
          {
            brandId: 'LD',
            id: 'INR',
            minDeposit: null,
            maxDeposit: null,
            maxPendingDeposits: null,
            minWithdrawal: null,
            maxWithdrawal: null,
          },
        ]
      });
    });
  });

  describe('updatePaymentProviderDetails', () => {
    it('does not accept non existing countries', async () => {
      try {
        await PaymentProviders.updatePaymentProviderDetails(34, {
          active: true,
          countries: [{ brandId: 'KK', id: 'SE' }],
        });
        expect(true).to.equal(false);
      } catch (e) {
        expect(e.message).to.equal('Incorrect country SE for brand KK');
      }
    });

    it('does not accept non existing currencies', async () => {
      try {
        await PaymentProviders.updatePaymentProviderDetails(
          34,
          ({
            currencies: [{ brandId: 'KK', id: 'IDK' }],
          }: any),
        );
        expect(true).to.equal(false);
      } catch (e) {
        expect(e.message).to.equal('Incorrect currency IDK for brand KK');
      }
    });

    describe('can update payment_providers, payment_providers_limits, currencies and countries', () => {
      const currencies = [
        {
          brandId: 'KK',
          id: 'EUR',
          minDeposit: 0,
          maxDeposit: 10,
          minWithdrawal: 0,
          maxWithdrawal: 10,
        },
        {
          brandId: 'LD',
          id: 'EUR',
          minDeposit: 0,
          maxDeposit: 10,
          minWithdrawal: 0,
          maxWithdrawal: 10,
        },
        {
          brandId: 'LD',
          id: 'USD',
          minDeposit: 0,
          maxDeposit: 10,
          minWithdrawal: 0,
          maxWithdrawal: 10,
        },
      ];

      beforeEach(async () => {
        await PaymentProviders.updatePaymentProviderDetails(34, {
          countries: [{ brandId: 'KK', id: 'FI' }],
          currencies,
          blockCountries: false,
        });
      });

      it('can update payment_providers, payment_providers_limits, currencies and countries', async () => {
        const [ paymentProvider, dbCurrencies, dbLimits ]  = await Promise.all([
          pg('payment_providers').where({ id: 34 }).first(),
          pg('payment_provider_currencies').where({ paymentProviderId: 34 }),
          pg('payment_provider_limits').where({ paymentProviderId: 34 })
        ]);
        expect(paymentProvider.blockCountries).to.equal(false);
        expect(dbCurrencies).to.deep.containSubset(
          currencies.map(({ id, brandId }) => ({ currencyId: id, brandId })),
        );
        expect(dbLimits).to.deep.containSubset(
          currencies.map(({ id, ...rest }) => ({ ...rest, currencyId: id })),
        );
      });

      it('can remove specific currencies and limits', async () => {
        const removed = currencies.pop();
        if (!removed) expect(true).to.equal(false);
        else {
          await PaymentProviders.updatePaymentProviderDetails(34, {
            countries: [{ brandId: 'KK', id: 'FI' }],
            currencies,
            blockCountries: false,
          });
          const [dbCurrencies, dbLimits] = await Promise.all([
            pg('payment_provider_currencies').where({ paymentProviderId: 34 }),
            pg('payment_provider_limits').where({ paymentProviderId: 34 }),
          ]);
          expect(dbCurrencies)
            .to.deep.containSubset(currencies.map((c) => ({ currencyId: c.id, brandId: c.brandId })))
            .but.not.deep.containSubset([{ brandId: removed?.brandId, currencyId: removed?.id }]);
          expect(dbLimits)
            .to.deep.containSubset(currencies.map(({ id, ...c }) => ({ ...c, currencyId: id })))
            .but.not.deep.containSubset([removed].map(({ id, ...r }) => ({ ...r, currencyId: id })));
        }
      });

      it('can remove all currencies and limits', async () => {
        await PaymentProviders.updatePaymentProviderDetails(34, {
          countries: [{ brandId: 'KK', id: 'FI' }], currencies: [], blockCountries: false,
        });
        const [dbCurrencies, dbLimits] = await Promise.all([
          pg('payment_provider_currencies').where({ paymentProviderId: 34 }),
          pg('payment_provider_limits').where({ paymentProviderId: 34 }),
        ]);
        expect(dbCurrencies).to.be.empty();
        expect(dbLimits).to.be.empty();
      })
    });
  });
});
