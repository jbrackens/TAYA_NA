/* @flow */
const errorCodes = require('gstech-core/modules/errors/error-codes');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const Bonus = require('./Bonus');
const { getBalance } = require('../players/Player');

const creditBonusHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const givenBonus = await pg.transaction(async (tx) => {
      const bonus = await Bonus.getBonusByCode(Number(req.session.playerId), req.params.bonusCode, tx);
      if (bonus != null) {
        if (bonus.minAmount === bonus.maxAmount) {
          return await Bonus.creditBonus(bonus.id, Number(req.session.playerId), bonus.minAmount, null, null, tx);
        }
      }
      return null;
    });
    if (givenBonus == null) {
      return res.status(400).json({ error: errorCodes.INVALID_BONUS });
    }
    const balance = await getBalance(req.session.playerId);
    return res.json({ bonus: givenBonus, balance });
  } catch (e) {
    return next(e);
  }
};

const giveBonusHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const givenBonus = await pg.transaction(async (tx) => {
      const bonus = await Bonus.getBonusByCode(Number(req.session.playerId), req.params.bonusCode, tx);
      if (bonus != null) {
        logger.debug('Give bonus', req.session.playerId, req.params.bonusCode);
        return await Bonus.giveBonus(Number(req.session.playerId), bonus.id);
      }
      logger.debug('Unable to give bonus, bonus not found', req.session.playerId, req.params);
      return null;
    });
    const balance = await getBalance(req.session.playerId);
    return res.json({ bonus: givenBonus, balance });
  } catch (e) {
    return next(e);
  }
};

module.exports = { creditBonusHandler, giveBonusHandler };
