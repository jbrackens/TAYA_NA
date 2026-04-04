/* @flow */

const logger = require('gstech-core/modules/logger');
const Segment = require('./Segment');

const getSegmentsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const segments = await Segment.getPlayerSegments(playerId);
    return res.json(segments);
  } catch (err) {
    logger.error('XXX getSegmentsHandler', { err });
    return next(err);
  }
}

module.exports = {
  getSegmentsHandler,
};
