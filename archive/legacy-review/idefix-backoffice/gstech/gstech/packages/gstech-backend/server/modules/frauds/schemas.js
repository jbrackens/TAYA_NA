// @flow
const joi = require('gstech-core/modules/joi');

module.exports = {
  checkPlayerFraudSchema: (joi.object({
    cleared: joi.boolean().required(),
    resolution: joi.string().trim(),
  }): any),
  addPlayerFraudSchema: (joi.object({
    fraudKey: joi.string().trim().required(),
    fraudId: joi.string().trim().optional(),
    note: joi.string().trim().optional(),
    checked: joi.boolean().default(false),
  }).required(): any),
};
