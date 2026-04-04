/* @flow */
const joi = require('gstech-core/modules/joi');

const winSchema: any = joi.object({
  type: joi.string().trim().allow('win', 'freespins', 'pooled_jackpot', 'jackpot'),
  amount: joi.number().min(0).required(),
  transactionId: joi.string().trim(),
});

const processWinSchema: any = joi.object({
  brandId: joi.string().trim().required(),
  manufacturer: joi.string().trim().required(),
  game: joi.string().trim().required(),
  useGameId: joi.boolean().default(false),
  closeRound: joi.boolean().required(),
  sessionId: joi.string().trim(),
  wins: joi.array().items(winSchema).required(),
  gameRoundId: joi.string().trim().required(),
  transactionId: joi.string().trim().required(),
  currencyId: joi.string().trim(),
  timestamp: joi
    .date()
    .iso()
    .default(() => new Date())
    .description('time stamp when game round was started. default is current time.'),
  createGameRound: joi.boolean().default(true),
});

const betAndWinSchema: any = joi.object({
  brandId: joi.string().trim().required(),
  manufacturer: joi.string().trim().required(),
  game: joi.string().trim().required(),
  useGameId: joi.boolean().default(false),
  closeRound: joi.boolean().required(),
  sessionId: joi.string().trim(),
  amount: joi.number().min(0).required(),
  wins: joi
    .array()
    .items(winSchema)
    .default(() => [])
    .description('Optional wins'),
  gameRoundId: joi.string().trim().required(),
  transactionId: joi.string().trim().required(),
  currencyId: joi.string().trim(),
  timestamp: joi
    .date()
    .iso()
    .default(() => new Date())
    .description('time stamp when game round was started. default is current time.'),
});

const getTransactionSchema: any = joi.object({
  brandId: joi.string().trim().required(),
  manufacturer: joi.string().trim().required(),
  transactionId: joi.string().trim().required(),
  gameRoundId: joi.string().trim(),
  timestamp: joi
    .date()
    .iso()
    .default(Date.now)
    .description('time stamp when game round was started. default is current time.'),
});

const cancelTransactionSchema: any = joi.object({
  brandId: joi.string().trim().required(),
  manufacturer: joi.string().trim().required(),
  transactionId: joi.string().trim().required(),
  cancelTransactionId: joi.string().trim(),
  gameRoundId: joi.string().trim(),
  amount: joi.number(),
  timestamp: joi
    .date()
    .iso()
    .default(Date.now)
    .description('time stamp when game round was started. default is current time.'),
  currencyId: joi.string().trim().optional(),
});

const closeRoundSchema: any = joi.object({
  brandId: joi.string().trim().required(),
  manufacturer: joi.string().trim().required(),
  gameRoundId: joi.string().trim().required(),
  timestamp: joi
    .date()
    .iso()
    .default(() => new Date())
    .description('time stamp when game round was started. default is current time.'),
});

const getRoundTransactionsSchema: any = joi.object({
  manufacturer: joi.string().trim().required(),
  gameRoundId: joi.string().trim().required(),
  timestamp: joi
    .date()
    .iso()
    .default(() => new Date())
    .description('time stamp when game round was started. default is current time.'),
});

module.exports = {
  winSchema,
  processWinSchema,
  betAndWinSchema,
  getTransactionSchema,
  cancelTransactionSchema,
  closeRoundSchema,
  getRoundTransactionsSchema,
};
