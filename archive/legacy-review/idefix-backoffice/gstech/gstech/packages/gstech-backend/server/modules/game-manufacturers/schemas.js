/* @flow */

const joi = require('gstech-core/modules/joi');

const updateGameManufacturerSchema: any = joi.object({
  name: joi.string().trim().optional(),
  parentId: joi.string().trim().min(2).max(3).optional(),
  active: joi.boolean().optional(),
  license: joi.string().trim().optional(),
  blockedCountries: joi.array().items(joi.string().trim()).optional(),
});

const getGameManufacturersSchema: any = joi.object({
  countryId: joi.string().trim().length(2).uppercase().optional(),
});

module.exports = {
  getGameManufacturersSchema,
  updateGameManufacturerSchema,
};
