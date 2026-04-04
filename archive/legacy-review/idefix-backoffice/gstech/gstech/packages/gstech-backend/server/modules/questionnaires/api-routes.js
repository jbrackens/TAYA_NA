/* @flow */

const _ = require('lodash');
const includes = require('lodash/includes');
const validate = require('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');
const Questionnaire = require('./Questionnaire');
const Player = require('../players');
const { addPlayerFraud } = require('../frauds');

const getUnansweredQuestionnairesHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const result = await Questionnaire.getUnansweredQuestionnaires(req.session.playerId);
    return res.json({ result });
  } catch (err) {
    logger.warn('getMissingQuestionnaireHandler failed', err);
    return next(err);
  }
};

const getRequiredQuestionnairesHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const result = await Questionnaire.getRequiredQuestionnaires(req.session.playerId);
    return res.json({ result });
  } catch (err) {
    logger.warn('getMissingQuestionnaireHandler failed', err);
    return next(err);
  }
};

const processQuestionnaire = async (
  playerId: Id,
  id: string,
  answers: { [key: string]: string },
) => {
  if (id === 'PEP' && answers.pep === 'true') {
    await Player.raiseRiskProfile(
      playerId,
      'high',
      'Risk profile changed to high because answered "yes" to PEP questionnaire.',
    );
    await addPlayerFraud(playerId, 'politically_exposed_person', '');
  }

  if (id === 'SOW' && includes(answers.source_of_wealth.split(','), 'other')) {
    await addPlayerFraud(playerId, 'other_source_of_wealth', '', {
      explanation: answers.explanation,
    });
  }

  if (id === 'Lifetime_Deposit_75k') {
    await addPlayerFraud(
      playerId,
      'lifetime_deposit_75k',
      '',
      _.omitBy<string, typeof answers>(answers, _.isEmpty),
    );
  }

  if (id === 'Lifetime_Deposit_2k') {
    await addPlayerFraud(
      playerId,
      'lifetime_deposit_2k_answered',
      '',
      _.omitBy<string, typeof answers>(answers, _.isEmpty),
    );
  }
};

const answerQuestionnaireHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('answerQuestionnaireHandler', { body: req.body, params: req.params });
    const schema = await Questionnaire.getQuestionnaireValidator(req.session.playerId, req.params.id);
    const answers = await validate(req.body, schema, 'Questionnaire answer validation failed');
    const mappedAnswers: any = [];
    for (const [key, value] of Object.entries(answers)) {
      mappedAnswers.push({ key, value });
    }
    await Questionnaire.answerQuestionnaire(req.session.playerId, req.params.id, mappedAnswers);
    await processQuestionnaire(req.session.playerId, req.params.id, answers);
    const result = await Questionnaire.getRequiredQuestionnaires(req.session.playerId);
    return res.json({ result });
  } catch (err) {
    logger.warn('answerQuestionnaireHandler failed', err);
    return next(err);
  }
};

module.exports = { getUnansweredQuestionnairesHandler, answerQuestionnaireHandler, getRequiredQuestionnairesHandler };
