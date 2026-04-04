/* @flow */
const pg = require('gstech-core/modules/pg');

type UpdatePaymentMethodDraft = {
  active?: boolean,
  requireVerification?: boolean,
  allowAutoVerification?: boolean,
  highRisk?: boolean,
};

const getPaymentMethods = (): Promise<{ id: Id, name: string, active: boolean }[]> =>
  pg('payment_methods')
    .select('*')
    .orderBy('active', 'desc')
    .orderBy('name');

const getPaymentMethodWithProviders = (paymentMethodId: Id): any =>
  pg('payment_providers')
    .select('payment_methods.*', pg.raw('json_agg(payment_providers order by payment_providers.active desc, payment_providers.name) as "paymentProviders"'))
    .leftJoin('payment_methods', 'payment_methods.id', 'payment_providers.paymentMethodId')
    .where({ paymentMethodId })
    .groupBy('payment_methods.id')
    .first();

const updatePaymentMethod = (paymentMethodId: Id, update: UpdatePaymentMethodDraft): any =>
  pg('payment_methods')
    .update(update)
    .where({ id: paymentMethodId })
    .returning('*');

module.exports = {
  getPaymentMethods,
  getPaymentMethodWithProviders,
  updatePaymentMethod,
};
