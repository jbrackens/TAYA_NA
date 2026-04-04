/* @flow */
const { brands } = require('gstech-core/modules/constants');

const affmoreBrands: { id: BrandId, name: string, url: string }[] = brands.map((b) => ({
  id: b.id,
  name: b.name,
  url: b.url,
}));

const affmoreBrandIds: BrandId[] = affmoreBrands.map((b) => b.id);

const DEFAULT_FEE_PERCENT = 25;

module.exports = {
  affmoreBrands,
  affmoreBrandIds,
  DEFAULT_FEE_PERCENT,
};
