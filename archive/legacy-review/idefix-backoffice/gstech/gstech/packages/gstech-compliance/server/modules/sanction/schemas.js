/* @flow */

const joi = require('gstech-core/modules/joi');

const sanctionCheckHandlerSchema: any = joi.object({
  name: joi.string().trim().required(),
});

module.exports = {
  sanctionCheckHandlerSchema,
};
