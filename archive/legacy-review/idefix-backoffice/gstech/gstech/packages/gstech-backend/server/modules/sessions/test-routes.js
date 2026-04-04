/* @flow */
const { v1: uuid } = require('uuid');
const joi = require('gstech-core/modules/joi');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const { addTransaction } = require('../payments/Payment');
const { players: { testPlayer } } = require('../../../scripts/utils/db-data');
const { createSession } = require('./Session');
const { createManufacturerSession } = require('./ManufacturerSession');
const Player = require('../players/Player');
const Limit = require('../limits/Limit');
const { creditBonus } = require('../bonuses');

const testSessionSchema = joi.object({
  manufacturer: joi.string().trim().allow(null),
  initialBalance: joi.number().min(0).default(0),
  initialBonusBalance: joi.number().min(0).default(0),
  betLimit: joi.number().min(0).default(0),
  gamePlayerBlocked: joi.boolean().default(false),
  parameters: joi.object(),
  type: joi.string().trim().default('desktop'),
  currencyId: joi.string().trim().default('EUR'),
  languageId: joi.string().trim().default('en'),
  countryId: joi.string().trim().default('DE'),
});

const initTestSessionHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  const validationResult = testSessionSchema.validate(req.body);
  if (validationResult.error) {
    const { error } = validationResult;
    const errorMsgs = error.details.map((d) => d.message);
    logger.error('init-session failed', { errors: errorMsgs });
    return res.status(400).json({ error: { message: errorMsgs.join(', ') } });
  }
  const {
    currencyId,
    countryId,
    languageId,
    manufacturer,
    initialBalance,
    initialBonusBalance,
    betLimit,
    type,
    parameters,
    gamePlayerBlocked,
  } = validationResult.value;

  const player = await Player.create(testPlayer({ languageId, currencyId, countryId, brandId: 'LD' }));
  if (gamePlayerBlocked) {
    await Player.updateAccountStatus(player.id, { allowGameplay: !gamePlayerBlocked }, 1);
  }
  await pg.transaction(tx => addTransaction(player.id, req.session && req.session.id, 'compensation', initialBalance, 'Play money', 1, tx));
  if (initialBonusBalance > 0) {
    await creditBonus(1001, player.id, initialBonusBalance);
  }
  if (betLimit > 0) {
    await Limit.create({
      playerId: player.id,
      permanent: true,
      expires: null,
      reason: `Player requested for weekly ${betLimit / 100}€ bet limit`,
      type: 'bet',
      limitValue: betLimit,
      periodType: 'weekly',
      userId: 1,
    });
  }
  const session = await createSession(player, '6.5.43.2');
  const sessionId = uuid();
  if (manufacturer != null) {
    await createManufacturerSession(manufacturer, sessionId, session.id, type, parameters);
  }
  return res.json({ token: session.token, sessionId, playerId: player.id, player });
};

module.exports = {
  initTestSessionHandler,
};
