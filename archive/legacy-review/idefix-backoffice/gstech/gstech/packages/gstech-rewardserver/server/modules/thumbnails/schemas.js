/* @flow */

const joi = require('gstech-core/modules/joi');

const getThumbnailsSchema: any = joi
  .object({ brandId: joi.string().trim().brandId().required() })
  .options({ stripUnknown: true });

module.exports = {
  getThumbnailsSchema,
};
