/* @flow */
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const { checkPlayerFraudSchema, addPlayerFraudSchema } = require('./schemas');
const Fraud = require('./Fraud');

const getPlayerFraudHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerFraudId = Number(req.params.playerFraudId);
    const fraud = await Fraud.getById(playerFraudId);
    return res.json(fraud);
  } catch (err) {
    logger.warn('Get player fraud failed', err);
    return next(err);
  }
};

const checkPlayerFraudHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerFraudId = Number(req.params.playerFraudId);
    const { cleared, resolution } = await validate(req.body, checkPlayerFraudSchema, 'Check player fraud failed');
    const playerFraud = await Fraud.check(playerFraudId, req.userSession.id, cleared, resolution);
    return res.json(playerFraud);
  } catch (err) {
    logger.warn('Check player fraud failed', err);
    return next(err);
  }
};

const createPlayerFraudHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { fraudKey, note, checked, fraudId } = await validate(req.body, addPlayerFraudSchema, 'Fraud validation failed');
    const { playerId }: { playerId: Id } = (req.params: any);
    const id = await pg.transaction(tx =>
      Fraud.addFraud(tx, playerId, fraudKey, note, checked, req.userSession.id, fraudId || Date.now())
    );
    return res.json({ id });
  } catch (e) {
    logger.warn('addPlayerFraud failed', e);
    return next(e);
  }
};

module.exports = {
  getPlayerFraudHandler,
  checkPlayerFraudHandler,
  createPlayerFraudHandler,
};
