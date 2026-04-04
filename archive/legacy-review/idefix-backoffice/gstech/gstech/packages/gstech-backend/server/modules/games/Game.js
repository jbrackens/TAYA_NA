/* @flow */
import type { GameProvider } from 'gstech-core/modules/constants';
import type { RiskProfile } from 'gstech-core/modules/types/player';
import type { ClientInfo } from 'gstech-core/modules/clients/paymentserver-api-types';
import type {
  LaunchDemoGameRequest,
  LaunchGameRequest,
  GameLaunchOptions,
} from 'gstech-core/modules/clients/walletserver-api-types';

const logger = require('gstech-core/modules/logger');
const moment = require('moment-timezone');
const api = require('gstech-core/modules/clients/walletserver-api');
const pg = require('gstech-core/modules/pg');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const { checkGameStart } = require('../limits');
const Jurisdictions = require('../jurisdictions/Jurisdictions');
const { getManufacturerSessions, createManufacturerSession } = require('../sessions');
const { getPlayerById } = require('../players');
const Player = require('../players/Player');

export type Game = {
  id: Id,
  gameId: string,
  name: string,
  manufacturerId: GameProvider,
  manufacturerGameId: string,
  mobileGame: boolean,
  permalink: string,
};

export type GameWithBlockedCountries = {
  blockedCountries: CountryId[],
} & Game;

export type GameWithParameters = {
  parameters: ?mixed,
} & Game;

export type GameWithProfile = {
  wageringMultiplier: number,
  profile: string,
  riskProfile: RiskProfile,
} & Game;

export type GameProfile = {
  id: Id,
  name: string,
  brandId: string,
  wageringMultiplier: number,
  riskProfile: RiskProfile,
};

type GetAvailableProfilesByBrand = Array<{
  brandId: BrandId,
  brandName: string,
  gameProfileIds: Id[],
  gameProfileNames: string[],
}>;

type GetBrandGameProfiles = Array<{
  brandId: BrandId,
}>;

type LaunchDemoGame = {
  html?: string,
  parameters?: mixed,
  url?: string,
  ...
};

const get = (manufacturerId: string, manufacturerGameId: string): Knex$QueryBuilder<Game> =>
  pg('games')
    .first(
      'games.id',
      'games.name',
      'm2.id as manufacturerId',
      'manufacturerGameId',
      'mobileGame',
      'permalink',
    )
    .innerJoin('game_manufacturers AS m1', 'games.manufacturerId', 'm1.id')
    .innerJoin('game_manufacturers AS m2', (qb) =>
      qb.on('m1.id', 'm2.parentId').orOn({ 'm1.id': 'm2.id' }),
    )
    .where({ 'm2.id': manufacturerId, manufacturerGameId, archived: false });

const getByGameId = (manufacturerId: string, gameId: string): Knex$QueryBuilder<Game> =>
  pg('games')
    .first(
      'games.id',
      'games.name',
      'm2.id as manufacturerId',
      'manufacturerGameId',
      'mobileGame',
      'permalink',
    )
    .innerJoin('game_manufacturers AS m1', 'games.manufacturerId', 'm1.id')
    .innerJoin('game_manufacturers AS m2', (qb) =>
      qb.on('m1.id', 'm2.parentId').orOn({ 'm1.id': 'm2.id' }),
    )
    .where({ 'm2.id': manufacturerId, 'games.gameId': gameId, archived: false });

const getByPermalink = (permalink: string): Knex$QueryBuilder<Game[]> =>
  pg('games')
    .select(
      'games.id',
      'games.name',
      'manufacturerId',
      'manufacturerGameId',
      'mobileGame',
      'permalink',
    )
    .where({ permalink, archived: false })
    .orderBy('id');

const getWithProfile = (
  brandId: string,
  manufacturerId: string,
  manufacturerGameId: string,
): Knex$QueryBuilder<GameWithProfile> =>
  pg('games')
    .first(
      'games.id',
      'games.name',
      'permalink',
      'm2.id as manufacturerId',
      'manufacturerGameId',
      'wageringMultiplier',
      'riskProfile',
    )
    .innerJoin('game_manufacturers AS m1', 'games.manufacturerId', 'm1.id')
    .innerJoin('game_manufacturers AS m2', (qb) =>
      qb.on('m1.id', 'm2.parentId').orOn({ 'm1.id': 'm2.id' }),
    )
    .innerJoin('brand_game_profiles', {
      'games.id': 'brand_game_profiles.gameId',
      'brand_game_profiles.brandId': pg.raw('?', brandId),
    })
    .innerJoin('game_profiles', 'brand_game_profiles.gameProfileId', 'game_profiles.id')
    .where({ 'm2.id': manufacturerId, manufacturerGameId, archived: false });

const getByGameIdWithProfile = (
  brandId: string,
  manufacturerId: string,
  gameId: string,
): Knex$QueryBuilder<GameWithProfile> =>
  pg('games')
    .first(
      'games.id',
      'games.name',
      'permalink',
      'm2.id as manufacturerId',
      'manufacturerGameId',
      'wageringMultiplier',
      'riskProfile',
    )
    .innerJoin('brand_game_profiles', {
      'games.id': 'brand_game_profiles.gameId',
      'brand_game_profiles.brandId': pg.raw('?', brandId),
    })
    .innerJoin('game_profiles', 'brand_game_profiles.gameProfileId', 'game_profiles.id')
    .innerJoin('game_manufacturers AS m1', 'games.manufacturerId', 'm1.id')
    .innerJoin('game_manufacturers AS m2', (qb) =>
      qb.on('m1.id', 'm2.parentId').orOn({ 'm1.id': 'm2.id' }),
    )
    .where({ 'm2.id': manufacturerId, 'games.gameId': gameId, archived: false });

const getWithParameters = (gameId: Id): Knex$QueryBuilder<GameWithParameters> =>
  pg('games')
    .first([
      'parameters',
      'id',
      'name',
      'manufacturerId',
      'manufacturerGameId',
      'gameId',
      'mobileGame',
      'parameters',
      'permalink',
    ])
    .where({ id: gameId });

const getByGameIdWithParameters = (gameId: string): Knex$QueryBuilder<GameWithParameters> =>
  pg('games')
    .first([
      'id',
      'name',
      'manufacturerId',
      'manufacturerGameId',
      'gameId',
      'mobileGame',
      'parameters',
      'permalink',
    ])
    .where({ gameId });

const getAllGames = (): Knex$QueryBuilder<Game[]> =>
  pg('games')
    .select(
      'games.id',
      'games.name',
      'manufacturerId',
      'manufacturerGameId',
      'gameId',
      'mobileGame',
      'playForFun',
      'parameters',
      'game_manufacturers.name as manufacturerName',
      'rtp',
      'permalink',
    )
    .innerJoin('game_manufacturers', 'game_manufacturers.id', 'games.manufacturerId')
    .where({ 'game_manufacturers.active': true, archived: false })
    .whereNull('game_manufacturers.parentId')
    .orderBy('manufacturerId')
    .orderBy('games.name'); // .where({ brandId });

const getGamesForBrand = (brandId: string): Knex$QueryBuilder<GameWithBlockedCountries[]> =>
  pg('games')
    .select(
      'games.id',
      'games.name',
      'manufacturerId',
      'manufacturerGameId',
      'games.gameId',
      'mobileGame',
      'playForFun',
      'parameters',
      'game_manufacturers.name as manufacturerName',
      'rtp',
      'permalink',
      'blockedCountries',
    )
    .innerJoin('game_manufacturers', 'game_manufacturers.id', 'games.manufacturerId')
    .innerJoin('brand_game_profiles', {
      'brand_game_profiles.brandId': pg.raw('?', brandId),
      'brand_game_profiles.gameId': 'games.id',
    })
    .leftJoin(
      pg
        .from('game_manufacturer_blocked_countries')
        .select(
          'gameManufacturerId',
          pg.raw(`
          coalesce(
            array_agg("countryId") filter (where "countryId" is not null),
            '{}'
          ) as "blockedCountries"`),
        )
        .groupBy('gameManufacturerId')
        .as('t1'),
      't1.gameManufacturerId',
      'games.manufacturerId',
    )
    .where({ 'game_manufacturers.active': true, archived: false })
    .whereNull('game_manufacturers.parentId')
    .orderBy('manufacturerId')
    .orderBy('games.name');

const create = (gameDraft: Game, tx?: Knex$Transaction<any>): any =>
  (tx || pg)('games')
    .insert(gameDraft)
    .returning('*')
    .then(([game]) => game);

const update = (gameId: Id, gameDraft: Game, tx?: Knex$Transaction<any>): any =>
  (tx || pg)('games')
    .update(gameDraft)
    .where({ id: gameId })
    .returning('*')
    .then(([game]) => game);

const getAvailableProfilesByBrand = (): Promise<GetAvailableProfilesByBrand> =>
  pg('brands')
    .select(
      'brands.id as brandId',
      'brands.name as brandName',
      pg.raw('array_agg("game_profiles"."id") as "gameProfileIds"'),
      pg.raw('array_agg("game_profiles"."name") as "gameProfileNames"'),
    )
    .innerJoin('game_profiles', 'brands.id', 'game_profiles.brandId')
    .groupBy('brands.id');

const getBrandGameProfiles = (gameId: Id): Promise<GetBrandGameProfiles> =>
  pg('brand_game_profiles').select('brandId', 'gameProfileId').where({ gameId });

const upsertProfile = (
  gameId: Id,
  brandId: string,
  gameProfileId: Id,
  tx?: Knex$Transaction<any>,
): any =>
  (tx || pg)
    .raw(
      'insert into brand_game_profiles ("gameId", "brandId", "gameProfileId") values (?,?,?)' +
        ' on conflict("gameId", "brandId") do update set "gameProfileId" = excluded."gameProfileId"' +
        ' returning *',
      [gameId, brandId, gameProfileId],
    )
    .then((result) => result.rows[0]);

const launchGame = async (
  playerId: Id,
  gameId: Id,
  sessionId: Id,
  requireActivation: boolean,
  params: GameLaunchOptions,
  playTimeInMinutes: number = 0,
): Promise<any> =>
  pg.transaction(async (tx) => {
    const game = await getWithParameters(gameId).transacting(tx);
    logger.debug('+++ launchGame', {
      playerId,
      gameId,
      sessionId,
      requireActivation,
      params,
      playTimeInMinutes,
      game,
    });
    if (game == null) return Promise.reject({ error: errorCodes.GAME_IS_NOT_AVAILABLE });
    const player = await getPlayerById(playerId);

    await checkGameStart(playerId, sessionId, requireActivation, tx);
    await Jurisdictions.checkGameStart(player);

    const manufacturerSessions = await getManufacturerSessions(game.manufacturerId, sessionId);
    const client = await Player.getClientInfo(playerId);

    const sessions = manufacturerSessions.map(
      ({ manufacturerSessionId, type, parameters, manufacturerId }) => ({
        sessionId: manufacturerSessionId,
        type,
        parameters: parameters || {},
        manufacturerId,
      }),
    );
    const launchGameRequest: LaunchGameRequest = {
      player,
      game,
      // $FlowFixMe[incompatible-type] not sure why it's a problem that manufacturerId is defined
      sessions,
      sessionId,
      parameters: params,
      playTimeInMinutes,
      client,
    };
    logger.debug('>>>>> launchGameRequest', { launchGameRequest });
    const { game: g, session: mSession } = await api.launchGame(
      player.brandId,
      game.manufacturerId,
      launchGameRequest,
    );
    logger.debug('<<<<< launchGameRequest', { g, mSession });
    if (mSession != null && mSession.sessionId != null) {
      await createManufacturerSession(
        mSession.manufacturerId || game.manufacturerId,
        mSession.sessionId,
        sessionId,
        mSession.type,
        mSession.parameters,
      );
    }
    return g;
  });

const launchDemoGame = async (
  brandId: BrandId,
  gameId: Id,
  languageId: string,
  currencyId: string,
  parameters: GameLaunchOptions,
  client: ClientInfo,
): Promise<?LaunchDemoGame> => {
  const game = await getWithParameters(gameId);
  const launchDemoGameRequest: LaunchDemoGameRequest = {
    languageId,
    currencyId,
    game,
    parameters,
    client,
  };
  const { game: g } = await api.launchDemoGame(brandId, game.manufacturerId, launchDemoGameRequest);
  return g;
};

const getGameProfiles = (brandId: string): Promise<Array<$Exact<{}>>> =>
  pg('game_profiles').select('*').where({ brandId }); // $FlowFixMe

const createGameProfile = (gameProfileDraft: GameProfile): any =>
  pg('game_profiles')
    .insert(gameProfileDraft)
    .returning('*')
    .then(([gameProfile]) => gameProfile);

const updateGameProfile = (gameProfileId: Id, gameProfileDraft: GameProfile): any =>
  pg('game_profiles')
    .update(gameProfileDraft)
    .where({ id: gameProfileId })
    .returning('*')
    .then(([gameProfile]) => gameProfile);

const getTopGames = async (playerId: Id, date: Date = moment()): Promise<any> => {
  const query = `SELECT games.permalink, (exp((9650 - coalesce(min(games.rtp), 10000))/120) * sum(bets.count)) as points
    FROM
      (SELECT "gameId", sum(count) AS count
        FROM report_daily_player_game_summary
        WHERE "playerId"=? and type='bet'
        AND day BETWEEN '${moment(date)
          .subtract(2, 'month')
          .startOf('day')
          .toISOString()}' and '${moment(date).startOf('day').toISOString()}'
        GROUP BY "gameId" ORDER BY COUNT DESC) bets
    JOIN games ON games.id=bets."gameId" GROUP BY games.permalink ORDER BY points desc LIMIT 10`;
  const summary = await pg.raw(query, [playerId]);
  return summary.rows.map((row) => row.permalink);
};

module.exports = {
  launchGame,
  launchDemoGame,
  get,
  getByGameId,
  getByPermalink,
  getAllGames,
  getGamesForBrand,
  update,
  create,
  getAvailableProfilesByBrand,
  getBrandGameProfiles,
  upsertProfile,
  getWithProfile,
  getByGameIdWithProfile,
  getGameProfiles,
  updateGameProfile,
  createGameProfile,
  getTopGames,
  getByGameIdWithParameters,
};
