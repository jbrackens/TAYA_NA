// @flow
import type { AudienceRuleDraft } from '../../../../types/common';

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');

const repository = require('./repository');
const schemas = require('./schemas');
const { parseCSVList } = require('../../../utils');

const addAudienceRule = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> addAudienceRule', { body: req.body, campaign: req.campaign });
    const rule = validate(req.body, schemas.addAudienceRuleSchema, 'Schema validation failed');
    const [audienceRuleId] = await repository.createAudienceRules(pg, [rule], req.campaign.id);
    // TODO: addCsvAudienceRule returns "ruleId"
    const response: DataResponse<{ audienceRuleId: Id }> = { data: { audienceRuleId } };
    logger.debug('<<< addAudienceRule', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX addAudienceRule', { e });
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const addCsvAudienceRule = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> addCsvAudienceRule', {
      files: Object.keys(req.files),
      campaign: req.campaign,
    });
    const file = req.files[Object.keys(req.files)[0]];
    const filename = file.name;
    if (file.mimetype !== 'text/csv')
      return res.status(400).json({ error: { message: 'Incorrect format type' } });
    const values = parseCSVList(file.data);
    const rules = [{ name: filename, operator: 'csv', values }];
    try {
      const [ruleId] = await repository.createAudienceRules(pg, rules, req.campaign.id);
      const response: DataResponse<{ ruleId: Id }> = { data: { ruleId } };
      logger.debug('<<< addCsvAudienceRule', { response });
      return res.json(response);
    } catch (e) {
      logger.error('XXX addCsvAudienceRule::createAudienceRules', { e });
      return res.status(409).json({ error: { message: 'Failed to insert a rule to database' } });
    }
  } catch (e) {
    logger.error('XXX addCsvAudienceRule', { e });
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const deleteAudienceRule = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> deleteAudienceRule', { params: req.params });
    const audienceRuleId: Id = Number(req.params.audienceRuleId);
    try {
      await repository.deleteAudienceRules(pg, [audienceRuleId]);
    } catch (e) {
      logger.error('XXX deleteAudienceRule::deleteAudienceRules', { e });
      return res.status(409).json({
        error: { message: `Failed to delete reward rule ${audienceRuleId}` },
      });
    }
    const response: DataResponse<OkResult> = { data: { ok: true } };
    logger.debug('<<< deleteAudienceRule', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX deleteAudienceRule', { e });
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const updateAudienceRule = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> updateAudienceRule', { params: req.params, body: req.body });
    const audienceRuleId: Id = Number(req.params.audienceRuleId);
    let audienceRuleDraft = validate<Partial<AudienceRuleDraft>>(
      req.body,
      schemas.addAudienceRuleSchema,
      'Schema validation failed',
    );
    const rule = await repository.getAudienceRule(pg, audienceRuleId);
    if (!rule) return res.status(409).json({ error: { message: '' } });
    // For csv operator update only 'not' property
    if (audienceRuleDraft.operator === 'csv') audienceRuleDraft = { not: audienceRuleDraft.not };
    await repository.updateAudienceRule(pg, audienceRuleId, { ...audienceRuleDraft });
    const response: DataResponse<OkResult> = { data: { ok: true } };
    logger.debug('<<< updateAudienceRule', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX updateAudienceRule', { e });
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  addAudienceRule,
  addCsvAudienceRule,
  deleteAudienceRule,
  updateAudienceRule,
};
