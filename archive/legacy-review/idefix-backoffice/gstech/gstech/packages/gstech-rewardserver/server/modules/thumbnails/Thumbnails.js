/* @flow */

import type { Thumbnail } from 'gstech-core/modules/types/rewards';

const getThumbnails = async (knex: Knex, brandId: BrandId): Promise<Thumbnail[]> =>
  knex('thumbnails').where({ brandId: brandId === 'LD' ? 'LD' : 'CJ' }).orderBy('key');

module.exports = {
  getThumbnails,
};
