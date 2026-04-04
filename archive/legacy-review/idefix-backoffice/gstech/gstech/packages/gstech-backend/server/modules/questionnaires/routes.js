/* @flow */
const logger = require('gstech-core/modules/logger');
const Questionnaire = require('./Questionnaire');

const getPlayerAnswersHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId } = req.params;
    const result = await Questionnaire.getQuestionnaires(Number(playerId));
    return res.json(result);
  } catch (err) {
    logger.warn('Get player answers failed', err);
    return next(err);
  }
};

module.exports = { getPlayerAnswersHandler };
