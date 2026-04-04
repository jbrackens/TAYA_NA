/* @flow */
const joi = require('joi');

const authRequestSchema: any = joi.object({
  token: joi.string().trim().required(),
  casino: joi.string().trim().required(),
  userId: joi.string().trim().allow(null).optional(),
  currency: joi.string().trim().allow(null).optional(),
  ip: joi.string().trim().optional(),
  channel: joi.string().trim().required(),
  affiliate: joi.string().trim().allow('').required(),
}).options({ stripUnknown: true });

const stakeRequestSchema: any = joi.object({
  token: joi.string().trim().required(),
  casino: joi.string().trim().required(),
  userId: joi.string().trim().allow(null).required(),
  currency: joi.string().trim().allow(null).required(),
  ip: joi.string().trim().optional(),
  transaction: joi.object({
    id: joi.string().trim().required(),
    stake: joi.string().trim().required(),
    stakePromo: joi.string().trim().required(),
    details: joi.object({
      game: joi.string().trim().required(),
      jackpot: joi.string().trim().required(),
    }).required(),
  }).required(),
  round: joi.object({
    id: joi.string().trim().required(),
    starts: joi.boolean().required(),
    ends: joi.boolean().required(),
  }).required(),
  promo: joi.object({
    type: joi.string().trim().required(),
    instanceCode: joi.string().trim().allow('').required(),
    instanceId: joi.number().required(),
    campaignCode: joi.string().trim().allow('').optional(),
    campaignId: joi.number().required(),
  }).allow(null).optional(),
  game: joi.object({
    type: joi.string().trim().required(),
    key: joi.string().trim().required(),
    version: joi.string().trim().required(),
  }).required(),
}).options({ stripUnknown: true });

const payoutRequestSchema: any = joi.object({
  token: joi.string().trim().required(),
  casino: joi.string().trim().required(),
  userId: joi.string().trim().allow(null).required(),
  currency: joi.string().trim().allow(null).required(),
  ip: joi.string().trim().optional(),
  transaction: joi.object({
    id: joi.string().trim().required(),
    payout: joi.string().trim().required(),
    payoutPromo: joi.string().trim().required(),
    details: joi.object({
      game: joi.string().trim().required(),
      jackpot: joi.string().trim().required(),
    }).required(),
  }).required(),
  round: joi.object({
    id: joi.string().trim().required(),
    starts: joi.boolean().required(),
    ends: joi.boolean().required(),
  }).required(),
  promo: joi.object({
    type: joi.string().trim().required(),
    instanceCode: joi.string().trim().allow('').required(),
    instanceId: joi.number().required(),
    campaignCode: joi.string().trim().allow('').optional(),
    campaignId: joi.number().required(),
  }).allow(null).optional(),
  game: joi.object({
    type: joi.string().trim().required(),
    key: joi.string().trim().required(),
    version: joi.string().trim().required(),
  }).required(),
}).options({ stripUnknown: true });

const refundRequestSchema: any = joi.object({
  token: joi.string().trim().required(),
  casino: joi.string().trim().required(),
  userId: joi.string().trim().allow(null).required(),
  currency: joi.string().trim().allow(null).required(),
  ip: joi.string().trim().optional(),
  transaction: joi.object({
    id: joi.string().trim().required(),
    stake: joi.string().trim().required(),
    stakePromo: joi.string().trim().required(),
    details: joi.object({
      game: joi.string().trim().required(),
      jackpot: joi.string().trim().required(),
    }).required(),
  }).required(),
  round: joi.object({
    id: joi.string().trim().required(),
    starts: joi.boolean().required(),
    ends: joi.boolean().required(),
  }).required(),
  game: joi.object({
    type: joi.string().trim().required(),
    key: joi.string().trim().required(),
    version: joi.string().trim().required(),
  }).required(),
}).options({ stripUnknown: true });

module.exports = {
  authRequestSchema,
  stakeRequestSchema,
  payoutRequestSchema,
  refundRequestSchema,
};
