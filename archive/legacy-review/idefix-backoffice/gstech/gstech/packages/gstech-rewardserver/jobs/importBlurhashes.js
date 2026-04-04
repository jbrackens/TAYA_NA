/* @flow */

const { axios } = require('gstech-core/modules/axios');

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const blurhashesUrls = {
  LD: 'https://static.luckydino.com/',
  CJ: 'https://static.casinojefe.com/',
};

type Blurhashes = { [key: string]: { [viewMode: string]: { hash: string } } };

const importBlurhashes = async (brandId: BrandId, errors: any[]): Promise<any> => {
  const url = blurhashesUrls[brandId === 'LD' ? 'LD' : 'CJ'];
  const { data: blurhashesObj } = await axios.get<Blurhashes>(`${url}blurhashes.json`);
  return pg.transaction(async (tx) =>
    Promise.all(
      Object.keys(blurhashesObj).map(async (key) => {
        const blurhashObj = blurhashesObj[key];
        const viewModes = Object.keys(blurhashObj);
        const blurhashes = viewModes.reduce(
          (acc, viewMode: string) => ({ ...acc, [viewMode]: blurhashObj[viewMode].hash }),
          {},
        );

        const thumbnail = { brandId, key, viewModes, blurhashes };
        try {
          const count = await tx('thumbnails').update(thumbnail).where({ key, brandId });
          if (count === 0) {
            return await tx('thumbnails').insert(thumbnail);
          }
        } catch (e) {
          errors.push(e.detail || e);
        }

        return true;
      }),
    ),
  );
};

module.exports = async () => {
  logger.info('importBlurhashes started...');
  const errors: any[] = [];

  await importBlurhashes('LD', errors);
  await importBlurhashes('CJ', errors);

  if (errors.length) {
    logger.error(JSON.stringify(errors, null, 2));
  } else {
    logger.info('importBlurhashes finished.');
  }
};
