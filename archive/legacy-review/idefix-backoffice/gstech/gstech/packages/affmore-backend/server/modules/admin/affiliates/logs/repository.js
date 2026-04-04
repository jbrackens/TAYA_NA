// @flow
import type { LogDraft, Log } from '../../../../../types/repository/logs';

const { DateTime } = require('luxon');

const createAffiliateLog = async (knex: Knex, logDraft: LogDraft, affiliateId: Id, userId: Id): Promise<Log> => {
  const now = DateTime.utc();
  const [log] = await knex('logs')
    .insert({ affiliateId, ...logDraft, createdBy: userId, createdAt: now, updatedAt: now })
    .returning('*');

  return log;
};

const getAffiliateLogs = async (knex: Knex, affiliateId: Id): Promise<Log[]> => {
  const logs = await knex('logs')
    .select('logs.id', 'logs.affiliateId', 'logs.note', 'logs.attachments', 'logs.createdBy', 'logs.createdAt', 'logs.updatedAt')
    .where({ 'logs.affiliateId': affiliateId })
    .orderBy('logs.id', 'desc');

  return logs;
};

module.exports = {
  createAffiliateLog,
  getAffiliateLogs,
};
