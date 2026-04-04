/* @flow */

const joi = require('gstech-core/modules/joi');

const connectPlayersWithPersonHandlerSchema: any = joi
  .object({
    playerIds: joi.array().items(joi.number()).required(),
  })
  .options({ stripUnknown: true });

module.exports = {
  connectPlayersWithPersonHandlerSchema,
};
