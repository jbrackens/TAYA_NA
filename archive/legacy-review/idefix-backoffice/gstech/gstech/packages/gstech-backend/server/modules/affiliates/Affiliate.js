/* @flow */
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

export type Affiliate = {
  id: string,
  name: string,
};

const parseAffiliateId = (btag: ?string): null | string => (btag != null ? btag.split('_')[0] : null);

const find = async (btag: ?string): Promise<?Affiliate> => {
  const id = parseAffiliateId(btag);
  if (id == null) {
    return null;
  }

  const aff = await pg('affiliates').first('name', 'id').where({ id });
  if (aff == null) {
    return null;
  }
  return aff;
};

const update = (affiliates: Affiliate[]): any =>
  pg.raw('? on conflict("id") do update set name=excluded.name', pg('affiliates').insert(affiliates));

const updateAffiliateTagging = async (): Promise<any> => pg.transaction(async (tx) => {
  const players = await tx('players').select('id', 'affiliateRegistrationCode').whereNull('affiliateId').whereNotNull('affiliateRegistrationCode');
  await Promise.all(players.map(async (player) => {
    const aff = await find(player.affiliateRegistrationCode);
    if (aff != null) {
      return tx('players').update({ affiliateId: aff.id }).where({ id: player.id });
    }
    logger.warn('Affiliate not found for btag', player.affiliateRegistrationCode);
    return null;
  }));
});

const get = (): Knex$QueryBuilder<Affiliate[]> =>
  pg('affiliates')
    .select('affiliates.id', 'affiliates.name')
    .orderBy('affiliates.name');

module.exports = {
  parseAffiliateId,
  find,
  update,
  updateAffiliateTagging,
  get,
};
