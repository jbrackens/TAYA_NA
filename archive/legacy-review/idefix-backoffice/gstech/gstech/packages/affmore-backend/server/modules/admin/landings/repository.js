// @flow
import type { LandingDraft, Landing, LandingWithStatistics } from '../../../../types/repository/landings';

const { DateTime } = require('luxon');

const createLanding = async (knex: Knex, landingDraft: LandingDraft, userId: Id): Promise<Landing> => {
  const now = DateTime.utc();
  const [landing] = await knex('landings')
    .insert({ ...landingDraft, createdBy: userId, createdAt: now, updatedAt: now })
    .returning('*');

  return landing;
};

const getLanding = async (knex: Knex, landingId: Id): Promise<?Landing> => {
  const [landing] = await knex('landings')
    .select('landings.id', 'landings.brandId', 'landings.landingPage', 'landings.createdBy', 'landings.createdAt', 'landings.updatedAt')
    .where({ id: landingId });

  return landing;
};

const getLandings = async (knex: Knex, brandId?: BrandId): Promise<Landing[]> => {
  const landings = await knex('landings')
    .select('landings.id', 'landings.brandId', 'landings.landingPage', 'landings.createdBy', 'landings.createdAt', 'landings.updatedAt')
    .where((qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
      if (brandId) qb.where({ brandId });

      return qb;
    })
    .orderBy('landings.id');

  return landings;
};

const getLandingsWithStatistics = async (knex: Knex, brandId?: BrandId): Promise<LandingWithStatistics[]> => {
  const landings = await knex('landings')
    .select('landings.id', 'landings.brandId', 'landings.landingPage', 'landings.createdBy', 'landings.createdAt', 'landings.updatedAt', knex.raw('sum(coalesce(links.count, 0))::INT AS "usages"'))
    .leftJoin(knex.raw('(SELECT "id", "landingPage", count(*) AS count FROM links GROUP BY "id") as links'), 'landings.landingPage', 'links.landingPage')
    .groupByRaw('landings.id, landings."brandId", landings."landingPage"')
    .where((qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
      if (brandId) qb.where({ brandId });

      return qb;
    })
    .orderBy('landings.id');

  return landings;
};

const updateLanding = async (knex: Knex, landingId: Id, landingDraft: LandingDraft): Promise<Landing> => {
  const now = DateTime.utc();
  const [landing] = await knex('landings')
    .update({ ...landingDraft, updatedAt: now })
    .where({ id: landingId })
    .returning('*');

  return landing;
};

const deleteLanding = async (knex: Knex, landingId: Id): Promise<number> => {
  const count = await knex('landings')
    .delete()
    .where({ id: landingId });

  return count;
};

module.exports = {
  createLanding,
  getLanding,
  getLandings,
  getLandingsWithStatistics,
  updateLanding,
  deleteLanding,
};
