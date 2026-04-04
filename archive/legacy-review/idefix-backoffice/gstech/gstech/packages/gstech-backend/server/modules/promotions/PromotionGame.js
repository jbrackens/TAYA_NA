/* @flow */
const pg = require('gstech-core/modules/pg');

export type PromotionGame = {
  gameId: Id,
};

const createPromotionGame = (promotionId: Id, gameId: Id, tx: Knex$Transaction<any>): Promise<PromotionGame> =>
  tx('promotion_games')
    .insert({ promotionId, gameId })
    .returning('*')
    .then(([promotionGame]) => promotionGame);

const getPromotionGames = (promotionId: Id): Knex$QueryBuilder<PromotionGame[]> =>
  pg('promotion_games')
    .select('gameId')
    .where({ promotionId });

const updatePromotionGames = async (promotionId: Id, games: Id[]): Promise<Id[]> =>
  pg.transaction(async (tx) => {
    await tx('promotion_games').where({ promotionId }).delete();

    const promotionGames = await Promise.all(games.map(gameId => createPromotionGame(promotionId, gameId, tx)));
    const promotionGameIds = promotionGames.map(({ gameId }) => gameId);
    return promotionGameIds;
  });

module.exports = { createPromotionGame, getPromotionGames, updatePromotionGames };
