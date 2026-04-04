// @flow
const joi = require('gstech-core/modules/joi');

module.exports = {
  gameDraftSchema: (joi
    .object()
    .keys({
      gameId: joi.string().trim().required(),
      name: joi.string().trim().required(),
      manufacturerId: joi.string().trim().required(),
      manufacturerGameId: joi.string().trim().required(),
      mobileGame: joi.boolean().required(),
      playForFun: joi.boolean().required(),
      rtp: joi.number().max(9999).min(0).allow(null),
      permalink: joi.string().trim().required(),
      archived: joi.boolean().required(),
    })
    .required(): any),
  profileDraftsSchema: (joi
    .array()
    .items(joi.object({
      brandId: joi.string().trim().required(),
      gameProfileId: joi.number(),
    }))
    .required(): any),
  gameProfileDraftSchema: (joi
    .object()
    .keys({
      name: joi.string().trim().required(),
      brandId: joi.string().trim().required(),
      wageringMultiplier: joi.number().required(),
      riskProfile: joi.string().trim().valid('low', 'medium', 'high'),
    }): any),
};
