/* @flow */
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');

export type TokenType = 'password' | 'activation';

const createToken = async (
  playerId: Id,
  type: TokenType,
  expireTimeInHours: number,
): Promise<UUID> =>
  pg('player_tokens')
    .insert({ playerId, type, expires: moment().add(expireTimeInHours, 'hours') })
    .returning('token')
    .then(([row]) => row?.token);

const useToken = async (token: UUID, type: TokenType, tx: Knex$Transaction<any>): Promise<any> =>
  tx('player_tokens')
    .where({ token, type })
    .whereRaw('"expires" >= now()')
    .delete()
    .returning('playerId')
    .then(([row]) => row?.playerId);

module.exports = { createToken, useToken };
