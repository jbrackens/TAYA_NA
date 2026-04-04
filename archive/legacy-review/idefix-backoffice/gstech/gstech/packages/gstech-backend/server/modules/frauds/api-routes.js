/* @flow */
const joi = require('gstech-core/modules/joi');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const Fraud = require('./Fraud');
const Player = require('../players/Player');

const addPlayerFraudSchema = joi.object({
  fraudKey: joi.string().trim().required(),
  fraudId: joi.string().trim().required(),
  details: joi.object(),
}).required();

const addPlayerFraudHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const value = await validate(req.body, addPlayerFraudSchema, 'Fraud validation failed');
    const fraud = await Fraud.addPlayerFraud(req.session.playerId, value.fraudKey, value.fraudId, value.details);
    return res.json({ fraud });
  } catch (e) {
    logger.warn('addPlayerFraud failed', e);
    return next(e);
  }
};

const addPlayerFraudByUsernameSchema = joi.object({
  fraudKey: joi.string().trim().required(),
  fraudId: joi.string().trim().required(),
  details: joi.object(),
  username: joi.string().trim().required(),
}).required();

const addPlayerFraudByUsernameHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const value = await validate(req.body, addPlayerFraudByUsernameSchema, 'Fraud validation failed');
    const { brandId }: { brandId: BrandId } = (req.params: any);
    const player = await Player.findByUsername(brandId, value.username);
    if (player == null) {
      return res.status(404).send({ error: errorCodes.INVALID_USERNAME });
    }
    const fraud = await Fraud.addPlayerFraud(player.id, value.fraudKey, value.fraudId, value.details);
    return res.json({ fraud });
  } catch (e) {
    logger.warn('addPlayerFraud failed', e);
    return next(e);
  }
};

module.exports = { addPlayerFraudHandler, addPlayerFraudByUsernameHandler };
