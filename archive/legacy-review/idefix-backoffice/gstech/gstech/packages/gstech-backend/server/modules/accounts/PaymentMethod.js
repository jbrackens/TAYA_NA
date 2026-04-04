/* @flow */
const pg = require('gstech-core/modules/pg');

export type PaymentMethod = {
  id: Id,
  name: string,
  active: boolean,
  requireVerification: boolean,
  allowAutoVerification: boolean,
};

const get = (name: string): Knex$QueryBuilder<PaymentMethod> =>
  pg('payment_methods').first('id', 'name', 'active', 'requireVerification', 'allowAutoVerification').where({ name });

const getById = (id: Id): Knex$QueryBuilder<PaymentMethod> =>
  pg('payment_methods').first('id', 'name', 'active', 'requireVerification', 'allowAutoVerification').where({ id });

module.exports = { get, getById };
