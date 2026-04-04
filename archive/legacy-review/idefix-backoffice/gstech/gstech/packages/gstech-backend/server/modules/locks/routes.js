/* @flow */
const Boom = require('@hapi/boom');
const logger = require('gstech-core/modules/logger');
const Lock = require('./Lock');

const get = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { id, sessionId } = req.userSession;
    const lockedPlayerIds = await Lock.get(id, sessionId);

    return res.status(200).json(lockedPlayerIds);
  } catch (err) {
    logger.error('Get failed', err);
    return next(err);
  }
};

const lock = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const {
      params: { playerId },
      userSession: { id, sessionId },
    } = req;

    await Lock.lock(Number(playerId), id, sessionId);
    return res.status(200).json({ playerId });
  } catch (err) {
    logger.warn('Lock failed');

    return next(Boom.locked('Player is already locked'));
  }
};

const release = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const {
      params: { playerId },
      userSession: { id, sessionId },
    } = req;

    await Lock.release(Number(playerId), id, sessionId);
    return res.status(200).json({ playerId });
  } catch (err) {
    logger.warn('Release failed');
    return next(err);
  }
};

const steal = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const {
      params: { playerId },
      userSession: { id, sessionId },
    } = req;

    await Lock.steal(Number(playerId), id, sessionId);
    return res.status(200).json({ playerId });
  } catch (err) {
    logger.warn('Steal failed');
    return next(err);
  }
};

module.exports = {
  get,
  lock,
  release,
  steal,
};
