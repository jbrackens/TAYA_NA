/* @flow */

const pg = require('gstech-core/modules/pg');

type UpdateGameManufacturerDraft = {
  name?: string,
  parentId?: string,
  active?: boolean,
  license?: string,
  blockedCountries?: string[],
};

const getGameManufacturer = async (id: string): Promise<any> =>
  pg('game_manufacturers')
    .select(
      'game_manufacturers.*',
      pg.raw(`
        coalesce(
          array_agg("countryId") filter (where game_manufacturer_blocked_countries."countryId" is not null),
          '{}'
        ) as "blockedCountries"`),
    )
    .leftJoin(
      'game_manufacturer_blocked_countries',
      'game_manufacturer_blocked_countries.gameManufacturerId',
      'game_manufacturers.id',
    )
    .where({ 'game_manufacturers.id': id })
    .groupBy('game_manufacturers.id')
    .first();

const getGameManufacturers = (
  countryId?: CountryId,
): Promise<Array<{ id: string, name: string, parentId: ?Id, license: string, active: boolean }>> =>
  pg('game_manufacturers')
    .select('*')
    .where({ active: true })
    .whereNull('parentId')
    .modify((qb) =>
      countryId
        ? qb.whereRaw(
            `? not in (select "countryId" from game_manufacturer_blocked_countries where "gameManufacturerId" = game_manufacturers.id)`,
            [countryId],
          )
        : qb,
    );

const updateGameManufacturer = async (
  gameManufacturerId: string,
  { blockedCountries, ...update }: UpdateGameManufacturerDraft,
): Promise<any> => {
  await pg.transaction(async (tx) => {
    if (blockedCountries && blockedCountries.length) {
      await tx('game_manufacturer_blocked_countries').where({ gameManufacturerId }).del();
      await Promise.all(
        blockedCountries.map((countryId) =>
          tx('game_manufacturer_blocked_countries').insert({ gameManufacturerId, countryId }),
        ),
      );
    }

    if (Object.keys(update).length) {
      await tx('game_manufacturers').update(update).where({ id: gameManufacturerId });
    }
  });

  return getGameManufacturer(gameManufacturerId);
};
module.exports = {
  getGameManufacturer,
  getGameManufacturers,
  updateGameManufacturer,
};
