/* @flow */
const logger = require('gstech-core/modules/logger');
const GameRound = require('./GameRound');

const refund = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { roundId } = req.params;
    await GameRound.refund(Number(roundId));
    const round = await GameRound.close(Number(roundId));
    return res.status(200).json(round);
  } catch (err) {
    logger.warn('Game round refund failed');
    return next(err);
  }
};

const close = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { roundId } = req.params;
    const round = await GameRound.close(Number(roundId));
    return res.status(200).json(round);
  } catch (err) {
    logger.warn('Game round close failed');
    return next(err);
  }
};

module.exports = {
  refund,
  close,
};
