/* @flow */
const joi = require('gstech-core/modules/joi');

const sessionSchema: any = joi.object({
  sessionId: joi.string().trim().required(),
  type: joi.string().trim().allow(null),
  parameters: joi.object(),
  manufacturerId: joi.string().trim().required(),
});

const launchGameSchema: any = joi.object({
  player: joi.object().required(),
  game: joi.object().required(),
  sessions: joi.array().items(sessionSchema),
  sessionId: joi.number().required(),
  parameters: joi.object(),
  playTimeInMinutes: joi.number().required(),
  client: joi.object({
    ipAddress: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }).optional(),
    userAgent: joi.string().trim().required(),
    isMobile: joi.boolean().required(),
  }).optional(),
}).options({ stripUnknown: true });

const launchDemoGameSchema: any = joi.object({
  currencyId: joi.string().trim().required(),
  languageId: joi.string().trim().required(),
  game: joi.object().required(),
  parameters: joi.object(),
  client: joi.object({
    ipAddress: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }).optional(),
    userAgent: joi.string().trim().required(),
    isMobile: joi.boolean().required(),
  }).optional(),
}).options({ stripUnknown: true });

const creditFreeSpinsSchema: any = joi.object({
  player: joi.object().required(), // TODO: more strict validation needed
  sessionId: joi.number().required(),
  bonusCode: joi.string().trim().required(),
  metadata: joi.object().optional(),
  spinValue: joi.number().optional().allow(null),
  spinType: joi.string().trim().optional().allow(null),
  spinCount: joi.number().optional().allow(null),
  id: joi.string().trim().optional(),
  client: joi.object({
    ipAddress: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }).optional(),
    userAgent: joi.string().trim().required(),
    isMobile: joi.boolean().required(),
  }).optional(),
  games: joi.array().items(joi.object({
    manufacturerGameId: joi.string().trim().required(),
    mobileGame: joi.boolean().required(),
  }).options({ stripUnknown: true })),
}).options({ stripUnknown: true });

const createFreeSpinsSchema: any = joi.object({
  bonusCode: joi.string().trim().required(),
  tableId: joi.string().trim().required(),
}).options({ stripUnknown: true });

const getJackpotsSchema: any = joi.object({
  games: joi.array().items({
    manufacturerGameId: joi.string().trim().required(),
    gameId: joi.string().trim().required(),
  }),
  currencies: joi.array().items(joi.string().trim()).required(),
}).options({ stripUnknown: true });

module.exports = {
  sessionSchema,
  launchGameSchema,
  launchDemoGameSchema,
  creditFreeSpinsSchema,
  createFreeSpinsSchema,
  getJackpotsSchema,
};
