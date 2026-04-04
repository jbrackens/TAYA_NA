/* @flow */

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

export type ManufacturerSession = {
  id: Id,
  manufacturerSessionId: string,
  sessionId: Id,
  type: string,
  parameters: mixed,
  manufacturerId: string,
};

export type ManufacturerSessionWithPlayer = {
  playerId: Id,
} & ManufacturerSession;

const findManufacturerSession = (manufacturerId: string, manufacturerSessionId: string): Promise<?ManufacturerSession> =>
  pg('manufacturer_sessions').first('id', 'manufacturerSessionId', 'sessionId').where({ manufacturerId, manufacturerSessionId });

const findManufacturerSessionWithPlayer = (manufacturerId: string, manufacturerSessionId: string): Promise<?ManufacturerSessionWithPlayer> =>
  pg('manufacturer_sessions')
    .first('manufacturer_sessions.id', 'manufacturerSessionId', 'sessionId', 'playerId')
    .innerJoin('sessions', 'manufacturer_sessions.sessionId', 'sessions.id')
    .where({ manufacturerId, manufacturerSessionId });

const createManufacturerSession = async (manufacturerId: string, manufacturerSessionId: string, sessionId: Id, type: ?string, parameters: ?mixed): Promise<Id> =>
  pg.transaction(async (tx) => {
    logger.debug('>>>>>> createManufacturerSession', { manufacturerId, manufacturerSessionId, sessionId, type, parameters });
    await tx('manufacturer_sessions').update({ expired: true }).where({ manufacturerId, sessionId, type: type || null }).whereNot('manufacturerSessionId', manufacturerSessionId);
    const result = await tx.raw(`
    insert into manufacturer_sessions ("manufacturerId", "manufacturerSessionId", "sessionId", "type", "parameters")
    values (?,?,?,?,?) on conflict("manufacturerId", "manufacturerSessionId", "type")
    do update set
      "expired" = false,
      "parameters" = (
        case
          when manufacturer_sessions.parameters is null
            then NULLIF(COALESCE(manufacturer_sessions.parameters, '{}')::jsonb || COALESCE(excluded.parameters, '{}')::jsonb, '{}')
          when manufacturer_sessions.parameters is not null
            then (COALESCE(manufacturer_sessions.parameters, '{}'::jsonb) || COALESCE(excluded.parameters, '{}'::jsonb))
        end
      )
      returning id`, [manufacturerId, manufacturerSessionId, sessionId, type || null, parameters || null])
    logger.debug('<<<<<< createManufacturerSession', { result });
    return result.rows[0].id;
  });

const updateManufacturerSession = async (manufacturerId: string, manufacturerSessionId: string, parameters: mixed): Promise<any> =>
  pg('manufacturer_sessions').update({ parameters }).where({ manufacturerId, manufacturerSessionId });

const expireManufacturerSession = async (manufacturerId: string, manufacturerSessionId: string): Promise<any> =>
  pg('manufacturer_sessions').update({ expired: true }).where({ manufacturerId, manufacturerSessionId, expired: false });

const getManufacturerSessions = (manufacturerId: string, sessionId: Id): Knex$QueryBuilder<ManufacturerSession[]> =>
  pg('manufacturer_sessions')
    .innerJoin('game_manufacturers', 'manufacturer_sessions.manufacturerId', 'game_manufacturers.id')
    .whereRaw('(game_manufacturers.id = ? OR game_manufacturers."parentId" = ?)', [manufacturerId, manufacturerId])
    .where({ sessionId, expired: false });

const getManufacturerSessionsForPlayer = (manufacturerId: string, playerId: Id): Knex$QueryBuilder<ManufacturerSession> =>
  pg('manufacturer_sessions')
    .innerJoin('sessions', 'manufacturer_sessions.sessionId', 'sessions.id')
    .first('manufacturer_sessions.id', 'manufacturerSessionId', 'sessionId')
    .where({ manufacturerId, playerId, expired: false })
    .whereNull('endReason')
    .orderBy('createdAt', 'desc');

module.exports = {
  findManufacturerSession,
  createManufacturerSession,
  expireManufacturerSession,
  getManufacturerSessions,
  findManufacturerSessionWithPlayer,
  updateManufacturerSession,
  getManufacturerSessionsForPlayer,
};
