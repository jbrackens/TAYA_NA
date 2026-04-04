// @flow
import type {
  CallbackUniqueKey,
  CallbackDraft,
  Callback,
  CallbackLogDraft,
  CallbackLog,
} from '../../../../../types/repository/callbacks';

const { DateTime } = require('luxon');

const CALLBACK_FIELDS = [
  'callbacks.id',
  'callbacks.affiliateId',
  'callbacks.linkId',
  'callbacks.brandId',
  'callbacks.method',
  'callbacks.trigger',
  'callbacks.url',
  'callbacks.enabled',
  'callbacks.createdBy',
  'callbacks.createdAt',
  'callbacks.updatedAt',
];

const getCallbacks = async (knex: Knex, affiliateId: Id): Promise<Callback[]> => {
  const callbacks = await knex('callbacks')
    .select(CALLBACK_FIELDS)
    .where({ affiliateId })
    .orderBy('callbacks.id');

  return callbacks;
};

const getCallback = async (knex: Knex, callbackId: Id): Promise<?Callback> => {
  const [callback] = await knex('callbacks')
    .select(CALLBACK_FIELDS)
    .where({ 'callbacks.id': callbackId });

  return callback;
};

const findCallback = async (
  knex: Knex,
  { affiliateId, linkId, brandId, trigger }: { ...CallbackUniqueKey, ... },
): Promise<?Callback> => {
  const [callback] = await knex('callbacks')
    .select(CALLBACK_FIELDS)
    .where({ affiliateId, brandId, trigger })
    .where((qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> =>
      qb.where({ linkId }).orWhere({ linkId: null }),
    );

  return callback;
};

const createCallback = async (knex: Knex, affiliateId: Id, callbackDraft: CallbackDraft, userId: Id): Promise<Callback> => {
  const now = DateTime.utc();
  const [callback] = await knex('callbacks')
    .insert({ affiliateId, ...callbackDraft, createdBy: userId, createdAt: now, updatedAt: now })
    .returning(CALLBACK_FIELDS);

  return callback;
};

const updateCallback = async (knex: Knex, affiliateId: Id, callbackId: Id, callbackDraft: CallbackDraft): Promise<Callback> => {
  const now = DateTime.utc();
  const [callback] = await knex('callbacks')
    .update({ affiliateId, ...callbackDraft, updatedAt: now })
    .where({ id: callbackId })
    .returning(CALLBACK_FIELDS);

  return callback;
};

const deleteCallback = async (knex: Knex, callbackId: Id): Promise<number> => {
  const count = await knex('callbacks')
    .delete()
    .where({ id: callbackId });

  return count;
};

const createCallbackLog = async (knex: Knex, callbackLogDraft: CallbackLogDraft): Promise<CallbackLog> => {
  const [callbackLog] = await knex('callback_logs')
    .insert(callbackLogDraft)
    .returning('*');

  return callbackLog;
};

const findCallbackLog = async (knex: Knex, callbackId: Id, playerId: Id): Promise<?CallbackLog> => {
  const [callbackLog] = await knex('callback_logs')
    .select('id', 'callbackId', 'playerId', 'status', 'callbackDate', 'callbackResponse')
    .where({ callbackId, playerId });

  return callbackLog;
};

module.exports = {
  getCallbacks,
  getCallback,
  findCallback,
  createCallback,
  updateCallback,
  deleteCallback,
  createCallbackLog,
  findCallbackLog,
};
