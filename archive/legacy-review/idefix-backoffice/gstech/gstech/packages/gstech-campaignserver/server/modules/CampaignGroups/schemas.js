/* @flow */

const joi = require('gstech-core/modules/joi');

const updateGroupNameSchema: any = joi
  .object({
    name: joi.string().trim().required(),
  })
  .options({ stripUnknown: true });

module.exports = {
  updateGroupNameSchema,
};
