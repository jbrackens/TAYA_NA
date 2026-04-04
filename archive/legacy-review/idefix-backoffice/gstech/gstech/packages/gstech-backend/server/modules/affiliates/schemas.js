// @flow
const joi = require('gstech-core/modules/joi');

const reportRequestSchema: any = joi.object().keys({
  date: joi.date().iso().required(),
});

module.exports = {
  reportRequestSchema,
};
