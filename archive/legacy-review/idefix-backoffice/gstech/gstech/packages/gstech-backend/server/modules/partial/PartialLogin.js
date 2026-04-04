/* @flow */
import type { PartialLogin, PartialLoginStatus, PartialLoginWithParameters } from 'gstech-core/modules/types/backend';

const FIELDS = [
  'id',
  'timestamp',
  'transactionKey',
  'status',
  'amount',
  'paymentMethod',
  'languageId',
  'countryId',
  'currencyId',
  'playerId',
  'ipAddress',
  'tcVersion',
  'affiliateRegistrationCode',
  'registrationSource',
];

const create = async (
  knex: Knex,
  partialLoginDraft: {
    transactionKey: string,
    amount: Money,
    paymentMethod: string,
    languageId: string,
    currencyId: string,
    countryId: string,
    ipAddress: IPAddress,
    tcVersion: number,
    affiliateRegistrationCode?: string,
    registrationSource?: string,
    parameters?: any,
  },
): Promise<PartialLogin> => {
  const [partialLogin] = await knex('partial_logins')
    .insert({
      ...partialLoginDraft,
      status: 'started'
    })
    .returning(FIELDS);

  return partialLogin;
};

const get = (knex: Knex, transactionKey: string, status: ?PartialLoginStatus): Knex$QueryBuilder<?PartialLoginWithParameters> =>
  knex('partial_logins').first([...FIELDS, 'parameters']).where({ transactionKey }).modify(qb => status && qb.where({ status }));

const verify = (knex: Knex, transactionKey: string, playerId: ?Id): Knex$QueryBuilder<PartialLogin[]> => // TODO: playerId shouldn't be nullable
  knex('partial_logins').update({ status: 'verified', playerId }).where({ transactionKey, status: 'started' }).returning(FIELDS);

const fail = (knex: Knex, transactionKey: string): Knex$QueryBuilder<PartialLogin[]> =>
  knex('partial_logins').update({ status: 'failed' }).where({ transactionKey }).whereIn('status', ['started', 'verified']).returning(FIELDS);

const complete = (knex: Knex, transactionKey: string): Knex$QueryBuilder<PartialLogin[]> =>
  knex('partial_logins').update({ status: 'completed' }).where({ transactionKey, status: 'verified' }).returning(FIELDS);

const updateParams = (knex: Knex, transactionKey: string, parameters: any): Knex$QueryBuilder<?PartialLogin> =>
  knex('partial_logins').update({ parameters }).where({ transactionKey }).returning('*');

const appendParams = (knex: Knex, transactionKey: string, parameters: any): Knex$QueryBuilder<?PartialLogin> =>
    knex('partial_logins').update({ parameters: knex.raw('? || parameters', JSON.stringify(parameters)) }).where({ transactionKey }).returning('*');

module.exports = {
  create,
  get,
  verify,
  complete,
  fail,
  updateParams,
  appendParams,
};
