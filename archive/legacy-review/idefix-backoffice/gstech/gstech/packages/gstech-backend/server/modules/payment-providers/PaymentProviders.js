/* @flow */

const pg = require('gstech-core/modules/pg');
const { upsert2 } = require('gstech-core/modules/knex');

export type PaymentProviderUpdate = {
  deposits?: boolean,
  withdrawals?: boolean,
  active?: boolean,
  priority?: number,
  blockCountries?: boolean,
  countries?: { brandId: BrandId, id: string }[],
  currencies?: {
    brandId: BrandId,
    id: string,
    minDeposit: number,
    maxDeposit: number,
    minWithdrawal: number,
    maxWithdrawal: number,
    maxPendingDeposits?: number,
  }[],
};

const getPaymentProviderDetails = (paymentProviderId: Id): any =>
  pg('payment_providers')
    .select(
      'payment_providers.*',
      pg.raw(
        '(?)',
        pg
          .select(
            pg.raw(
              `coalesce(
            array_agg(json_build_object(
              'brandId', payment_provider_currencies."brandId",
              'id', payment_provider_currencies."currencyId",
              'minDeposit', payment_provider_limits."minDeposit",
              'maxDeposit', payment_provider_limits."maxDeposit",
              'maxPendingDeposits', payment_provider_limits."maxPendingDeposits",
              'minWithdrawal', payment_provider_limits."minWithdrawal",
              'maxWithdrawal', payment_provider_limits."maxWithdrawal"
            )) filter (where payment_provider_currencies.id is not null),
            '{}'
          ) as currencies`,
            ),
          )
          .from('payment_provider_currencies')
          .leftJoin('payment_provider_limits', {
            'payment_provider_limits.brandId': 'payment_provider_currencies.brandId',
            'payment_provider_limits.currencyId': 'payment_provider_currencies.currencyId',
            'payment_provider_limits.paymentProviderId':
              'payment_provider_currencies.paymentProviderId',
          })
          .where({ 'payment_provider_currencies.paymentProviderId': paymentProviderId }),
      ),
      pg.raw(
        '(?)',
        pg
          .select(
            pg.raw(
              `coalesce(
            array_agg(json_build_object(
              'brandId', payment_provider_countries."brandId",
              'id', payment_provider_countries."countryId"
            )) filter (where payment_provider_countries.id is not null),
            '{}'
          ) as countries`,
            ),
          )
          .from('payment_provider_countries')
          .where({ paymentProviderId }),
      ),
    )
    .where({ 'payment_providers.id': paymentProviderId })
    .first();

const updatePaymentProviderDetails = async (
  paymentProviderId: Id,
  draft: PaymentProviderUpdate,
) => {
  const { currencies, countries, ...rest } = draft;

  await pg.transaction(async (tx) => {
    if (Object.keys(rest).length) {
      await tx('payment_providers').where({ id: paymentProviderId }).update(rest);
    }

    // clear current config before applying the new one
    await tx('payment_provider_currencies').del().where({ paymentProviderId });
    await tx('payment_provider_limits').del().where({ paymentProviderId });
    await tx('payment_provider_countries').del().where({ paymentProviderId });
    if (currencies && currencies.length) {
      await Promise.all(
        currencies.map(async ({ id, brandId, ...limit }) => {
          try {
            await upsert2(
              tx,
              'payment_provider_currencies',
              {
                currencyId: id,
                brandId,
                paymentProviderId,
              },
              ['brandId', 'paymentProviderId', 'currencyId'],
            );
            return await upsert2(
              tx,
              'payment_provider_limits',
              {
                currencyId: id,
                brandId,
                paymentProviderId,
                ...limit,
              },
              ['brandId', 'paymentProviderId', 'currencyId'],
            );
          } catch (e) {
            if (e.message.includes('payment_provider_currencies_currencyId_fkey')) {
              throw new Error(`Incorrect currency ${id} for brand ${brandId}`);
            }
            throw e;
          }
        }),
      );
    }
    if (countries && countries.length) {
      await Promise.all(
        countries.map(async ({ brandId, id }) => {
          try {
            return await tx('payment_provider_countries').insert({
              countryId: id,
              brandId,
              paymentProviderId,
            });
          } catch (e) {
            // TODO for unit test compatibility - rename this constraint after completing pg migration
            if (
              e.message.includes('payment_provider_countries_brandId_countryId_fkey')
              || e.message.includes('payment_provider_countries_brandId_fkey1')
            ) {
              throw new Error(`Incorrect country ${id} for brand ${brandId}`);
            }
            throw e;
          }
        }),
      );
    }
  });
};
module.exports = {
  getPaymentProviderDetails,
  updatePaymentProviderDetails,
};
