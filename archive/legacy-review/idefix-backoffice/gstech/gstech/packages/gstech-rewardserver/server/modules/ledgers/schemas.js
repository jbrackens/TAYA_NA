/* @flow */
const joi = require('gstech-core/modules/joi');

const getAllPlayerLedgersSchema: any = joi
  .object({
    brandId: joi.string().trim().brandId().optional(),
    pageSize: joi.number().optional(),
    pageIndex: joi.number().optional(),
    rewardType: joi.string().trim().optional(),
    group: joi.string().trim().optional(),
    externalId: joi.string().trim().optional(),
  })
  .and('pageSize', 'pageIndex')
  .and('brandId', 'group');

const getUnusedLedgersSchema: any = joi
  .object({
    playerId: joi.number().integer().required(),
    rewardType: joi.string().trim().optional(),
    group: joi.string().trim().optional(),
  })
  .options({ stripUnknown: true });

const importLedgersSchema: any = joi.object({
  playerId: joi.number().integer().required(),
  ledgers: joi.array().items(
    joi.object({
      id: joi.string().trim().required(),
      rewardid: joi.string().trim().required(),
      used: joi.boolean().default(false),
      usedTime: joi.string().trim().isoDate().allow(null).default(null),
      timestamp: joi.string().trim().isoDate().optional().allow(null),
    }),
  ),
});

const markLedgerUsedSchema: any = joi
  .object({
    groupId: joi.number().integer().required(),
    comment: joi.string().trim().optional(),
  })
  .options({ stripUnknown: true });

const useLedgerSchema: any = joi
  .object({
    playerId: joi.number().integer().required(),
    ledgerId: joi.number().integer().required(),
  })
  .options({ stripUnknown: true });

const useWheelSpinSchema: any = joi
  .object({
    playerId: joi.number().integer().required(),
  })
  .options({ stripUnknown: true });

module.exports = {
  getAllPlayerLedgersSchema,
  getUnusedLedgersSchema,
  importLedgersSchema,
  markLedgerUsedSchema,
  useLedgerSchema,
  useWheelSpinSchema,
};
