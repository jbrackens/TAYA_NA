/* @flow */


const limitsClient = require('gstech-core/modules/clients/backend-limits-api');
const validate = require('gstech-core/modules/validate');
const _ = require('lodash');
const joi = require('joi');
const api = require('../api');
const logger = require('../logger');
const { handleError } = require('../extensions');
const { hasDefaultLimit } = require('./limits');
const { completePartialRegistration } = require('./player');
const configuration = require('../configuration');

const extraQuestionnaires = async (req: express$Request) => {
  const extras = [];
  if (req.context.countryISO === 'DE') {
    const defaultLimit = await hasDefaultLimit(req);
    if (!defaultLimit) {
      extras.push('GNRS_limits');
    }
  }
  return extras;
}

const getRequiredQuestionnaires = async (req: express$Request): Promise<any> => {
  const q = await api.getRequiredQuestionnaires(req);
  const extras = await extraQuestionnaires(req);
  const result = [...q, ...extras];
  if (result.length > 0) {
    logger.debug('getRequiredQuestionnaires', req.user.username, result);
  }
  return result;
};

const gnrsLimitSchema = joi.object().keys({
  limit: joi.number().integer().positive().required(),
}).options({ stripUnknown: true });

const answerQuestionnaireHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  logger.debug('answerQuestionnaire', req.user.username, req.params.id, req.body);
  try {
    let ok = true;
    if (req.params.id === 'GNRS_limits') {
      const { limit } = validate(req.body, gnrsLimitSchema, 'GNRS_limits questionnaire');
      const body = {
        type: 'deposit_amount',
        permanent: true,
        reason: 'German GNRS',
        periodType: 'monthly',
        limitValue: limit * 100,
        days: 1,
        isInternal: true,
      };

      logger.debug('GNRS Limit', req.user.username, limit, req.body, body);

      await limitsClient.setLimit(configuration.shortBrandId(), req.user.username, body);
    } else {
      logger.debug('answerQuestionnaire', req.user.username, req.params.id, req.body);
      if (!_.isEmpty(req.body)) {
        if (req.params.id === 'PNP_Complete') {
          await completePartialRegistration(req, res, req.body);
        }
        await api.answerQuestionnaire(req, req.params.id, req.body);
      } else {
        ok = false;
        logger.warn('answerQuestionnaire not saved - empty content!', req.user.username, req.params.id, req.body);
      }
    }
    const requiredQuestionnaires = await getRequiredQuestionnaires(req);
    const r = { ok, requiredQuestionnaires };
    logger.debug('Answer questionnaire result', r);
    return res.json(r);
  } catch (e) {
    return handleError(req, res, e);
  }
}

module.exports = { getRequiredQuestionnaires, answerQuestionnaireHandler };
