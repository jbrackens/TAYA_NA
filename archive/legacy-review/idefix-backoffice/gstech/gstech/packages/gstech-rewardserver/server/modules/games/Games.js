/* @flow */
import type {
  Game,
  GameDraft,
  GameUpdate,
  GameWithThumbnail,
  GameWithThumbnailData,
} from 'gstech-core/modules/types/rewards';

const { hstoreFromArray } = require('gstech-core/modules/utils');
const { upsert2 } = require('gstech-core/modules/knex');

const createGame = async (knex: Knex, { tags, order, ...gameDraft }: GameDraft): Promise<Game> => {
  const [game] = await knex('games')
    .insert({
      ...gameDraft,
      tags: hstoreFromArray(tags || []),
      order: order || 0,
    })
    .returning('*');

  // Reorder games
  await knex.raw(`update games g
    set "order" = g2.seqnum
    from (select g2.*, row_number() over (order by "order" asc) as seqnum
      from games g2
    ) g2
    where g2.id = g.id and g."brandId" = ?`, [gameDraft.brandId]);

  return game;
};

const deleteGame = async (knex: Knex, gameId: Id): Promise<void> =>
  knex('games').update({ removedAt: new Date() }).where({ removedAt: null, id: gameId });

const getGameByPermalink = async (
  knex: Knex,
  permalink: string,
  brandId: BrandId,
  excludeRemoved: boolean = true,
): Promise<?Game> =>
  knex('games')
    .where({ permalink, brandId })
    .modify((qb) => (excludeRemoved ? qb.where({ removedAt: null }) : qb))
    .first();

const getGameById = async (
  knex: Knex,
  gameId: Id,
  excludeRemoved: boolean = true,
): Promise<?GameWithThumbnail> =>
  knex('games')
    .select('games.*', 'thumbnails.key as thumbnail')
    .leftJoin('thumbnails', 'thumbnails.id', 'games.thumbnailId')
    .where({ 'games.id': gameId })
    .modify((qb) => (excludeRemoved ? qb.where({ removedAt: null }) : qb))
    .first();

const getGames = async (
  knex: Knex,
  brandId?: BrandId,
  excludeRemoved: boolean = true,
): Promise<Game[]> =>
  knex('games')
    .modify((qb) => (brandId ? qb.where({ brandId }) : qb))
    .modify((qb) => (excludeRemoved ? qb.where({ removedAt: null }) : qb))
    .orderBy('order');

const getPlayerGames = async (
  knex: Knex,
  brandId: Id,
  // playerId: Id,
): Promise<GameWithThumbnailData[]> =>
  knex('games')
    .select(
      knex.raw('row_to_json(games) as game'),
      knex.raw(`case
        when thumbnails.id is null then null
        else row_to_json(thumbnails) end as thumbnail`),
    )
    .leftJoin('thumbnails', 'thumbnails.id', 'games.thumbnailId')
    .where({ active: true, 'games.brandId': brandId, removedAt: null })
    .orderBy('order');

const updateGame = async (
  knex: Knex,
  gameId: Id,
  { tags, ...gameUpdate }: GameUpdate,
): Promise<Game> => {
  const updateObject = tags ? { ...gameUpdate, tags: hstoreFromArray(tags) } : gameUpdate;

  return knex('games').update(updateObject, ['*']).where({ id: gameId, removedAt: null });
};

const upsertGame = async (knex: Knex, { tags, ...gameDraft }: GameDraft): Promise<Game> =>
  upsert2(knex, 'games', { ...gameDraft, tags: tags ? hstoreFromArray(tags) : [] }, [
    'brandId',
    'permalink',
  ], [], 'where "removedAt" is null');

module.exports = {
  createGame,
  deleteGame,
  getGameById,
  getGameByPermalink,
  getGames,
  getPlayerGames,
  updateGame,
  upsertGame,
};
