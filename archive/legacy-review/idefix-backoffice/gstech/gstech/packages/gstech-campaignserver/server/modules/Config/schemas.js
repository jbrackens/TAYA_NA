/* @flow */

const joi = require('gstech-core/modules/joi');

const getTagsSchema: any = joi
  .object({
    brandId: joi.string().trim().brandId(),
  })
  .options({ stripUnknown: true });

module.exports = {
  getTagsSchema,
};
