/* @flow */
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

export type PromotionDraft = {
  brandId: string,
  name: string,
  multiplier: number,
  autoStart: boolean,
  active: boolean,
  allGames?: boolean,
  calculateRounds?: boolean,
  calculateWins?: boolean,
  minimumContribution: number,
}

export type Promotion = {
  id: Id,
} & PromotionDraft

export type PlayerPromotion = {
  amount: Money,
  target: ?Money,
  promotion: string,
  active: boolean,
  points: number,
  id: Id,
  type: 'promotion' | 'promotion_wins',
}

const createPromotionCounter = async (playerId: Id, promotionId: Id, type: 'promotion' | 'promotion_wins' | 'promotion_wins_ratio', tx: Knex$Transaction<any>): Promise<boolean> => {
  const row = await tx.raw(
    'insert into player_counters ("playerId", "promotionId", "type", "limit") values (?, ?, ?, NULL) on conflict do nothing', [
      playerId,
      promotionId,
      type,
    ],
  );
  return row.count === 1;
};

const getPlayerPromotions = (playerId: Id): Knex$QueryBuilder<PlayerPromotion[]> =>
  pg('players')
    .select(
      'promotions.name as promotion',
      'player_counters.active',
      'player_counters.amount',
      'player_counters.limit as target',
      'promotions.id',
      pg.raw('case when promotions."calculateRounds" then floor(player_counters.amount / 100) else floor(player_counters.amount / (100 * base_currencies."defaultConversion")) end as points'),
      pg.raw(`case
        when promotions."calculateWins"
          then 'promotion_wins'
        when promotions."calculateWinsRatio"
          then 'promotion_wins_ratio'
        else 'promotion'
        end as type`)
    )
    .innerJoin('base_currencies', {
      'base_currencies.id': 'players.currencyId',
    })
    .innerJoin('promotions', {
      'promotions.brandId': pg.raw('players."brandId"'),
    })
    .leftJoin('player_counters', {
      'player_counters.promotionId': pg.raw('promotions.id'),
      'player_counters.playerId': pg.raw('players.id'),
    })
    .where({ 'players.id': playerId, 'promotions.archived': false })
    .orderBy('promotion');

const getActivePromotions = (knex: Knex, playerId: Id): Knex$QueryBuilder<{ name: string, progress: Money }[]> =>
  knex('players')
    .select(
      'promotions.name as name',
      pg.raw('case when promotions."calculateRounds" then player_counters.amount else player_counters.amount / base_currencies."defaultConversion" end as progress'),
    )
    .innerJoin('base_currencies', {
      'base_currencies.id': 'players.currencyId',
    })
    .innerJoin('promotions', {
      'promotions.brandId': pg.raw('players."brandId"'),
    })
    .innerJoin('player_counters', {
      'player_counters.promotionId': pg.raw('promotions.id'),
      'player_counters.playerId': pg.raw('players.id'),
    })
    .where({
      'players.id': playerId,
      'promotions.active': true,
      'promotions.archived': false,
      'player_counters.active': true,
    })
    .orderBy('promotions.name');


const activatePromotion = (playerId: Id, promotion: string): any =>
  pg.transaction(async (tx) => {
    const p = await pg('players')
      .first('promotions.id', 'promotions.calculateWins', 'promotions.calculateWinsRatio')
      .innerJoin('promotions', {
        'promotions.brandId': 'players.brandId',
        'promotions.name': pg.raw('?', promotion),
      })
      .leftOuterJoin('player_counters', {
        'player_counters.promotionId': pg.raw('promotions.id'),
        'player_counters.playerId': pg.raw('players.id'),
      })
      .where({ 'players.id': playerId })
      .whereNull('player_counters.id');
    if (p != null) {
      let type = 'promotion';
      if (p.calculateWins) type = 'promotion_wins';
      else if (p.calculateWinsRatio) type = 'promotion_wins_ratio';

      await createPromotionCounter(playerId, p.id, type, tx);
      return true;
    }
    return false;
  });

const getLeaderboard = async (brands: BrandId[], promotion: string, items: number): Promise<any> => {
  const result = await pg.raw(`
    SELECT "player_counters"."amount" AS "amount", "players"."username", "players"."firstName", "players"."lastName",
    CASE
      WHEN (promotions."calculateRounds" or promotions."calculateWinsRatio")
        THEN floor(player_counters.amount / 100)
        ELSE floor(player_counters.amount / (100 * base_currencies."defaultConversion"))
      END AS points
    FROM "promotions"
    INNER JOIN "player_counters" ON "player_counters"."promotionId" = promotions.id AND player_counters.amount > 0
    INNER JOIN "players" ON "player_counters"."playerId" = players.id
    INNER JOIN "base_currencies" ON "base_currencies"."id" = "players"."currencyId"
    WHERE "promotions"."name" = ? AND "promotions"."archived" = FALSE AND "promotions"."brandId" = ANY(?)
    ORDER BY points DESC
    LIMIT ?`, [promotion, brands, items]);
  return result.rows;
};

const setupPromotions = (playerId: Id): any =>
  pg.transaction(async (tx) => {
    const promotions = await getPlayerPromotions(playerId)
      .where({ 'promotions.autoStart': true })
      .whereNull('player_counters.id');
    const ops = promotions.map(({ id, type }) => createPromotionCounter(playerId, id, type, tx));
    return Promise.all(ops);
  });

const getPromotions = (brandId: string): Knex$QueryBuilder<Promotion[]> =>
  pg('promotions')
    .select('promotions.id', 'name', 'multiplier', 'autoStart', 'active', 'allGames', 'calculateRounds', 'calculateWins', 'calculateWinsRatio', 'archived', 'minimumContribution')
    .where({ brandId });

const createPromotion = (promotionDraft: Promotion): any =>
  pg('promotions')
    .insert(promotionDraft)
    .returning('*')
    .then(([promotion]) => promotion);

const updatePromotion = (promotionId: Id, promotionDraft: Promotion): any =>
  pg('promotions')
    .update(promotionDraft)
    .where({ id: promotionId })
    .returning('*')
    .then(([promotion]) => promotion);

const archivePromotion = (promotionId: Id): Knex$QueryBuilder<Promotion> =>
  pg('promotions').where({ id: promotionId }).update({ archived: true, active: false });

const mapPromotion = ({ id, promotion, amount, target, active, points }: PlayerPromotion): {
  complete: boolean,
  id: Id,
  points: number,
  progress: number | void,
  promotion: string,
  target: ?Money,
  wagered: Money,
} =>
  ({
    id,
    promotion,
    target,
    progress: target != null ? Math.round(100 * amount / target) : undefined,  
    wagered: amount,
    points,
    complete: !active,
  });

const refreshTournamentStandings = async (): Promise<any> => {
  logger.info('+++ PROMO:refreshTournamentStandings')
  return await pg.raw(`refresh materialized view tournament_standings`);
}

module.exports = {
  activatePromotion,
  getActivePromotions,
  createPromotionCounter,
  getPlayerPromotions,
  setupPromotions,
  getPromotions,
  createPromotion,
  updatePromotion,
  archivePromotion,
  getLeaderboard,
  mapPromotion,
  refreshTournamentStandings
};
