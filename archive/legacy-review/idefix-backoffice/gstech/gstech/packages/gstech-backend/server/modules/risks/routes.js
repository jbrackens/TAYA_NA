/* @flow */
import type { RiskType } from './Risk';

const validate = require ('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');
const Risk = require('./Risk');
const schemas = require('./schemas');

const getPlayerRiskLevelHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const risk = await Risk.getRiskLevel(playerId);
    return res.json(risk);
  } catch (err) {
    logger.warn('getPlayerRiskLevelHandler failed', err);
    return next(err);
  }
};

const getPlayerRiskStatusHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const { riskType }: { riskType: RiskType } = (req.params: any);
    const risk = await Risk.getRiskStatus(playerId, riskType);
    return res.json(risk);
  } catch (err) {
    logger.warn('getPlayerRiskStatusHandler failed', err);
    return next(err);
  }
};

const getPlayerRiskLogHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const { riskType }: { riskType: RiskType } = (req.params: any);
    const risk = await Risk.getRiskLog(playerId, riskType);
    return res.json(risk);
  } catch (err) {
    logger.warn('getPlayerRiskLogHandler failed', err);
    return next(err);
  }
};

const getRisksHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { manualTrigger }: { manualTrigger: boolean } = (req.query: any);
    const risks = await Risk.getRisks({ manualTrigger });
    return res.json(risks);
  } catch (err) {
    logger.error('getRisksHandler failed', err);
    return next(err);
  }
}

const createRiskHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const riskDraft = validate(req.body, schemas.createRiskSchema);
    const risk = await Risk.createRisk(riskDraft);
    return res.json(risk);
  } catch (err) {
    logger.error('createRiskHandler failed', err);
    return next(err);
  }
}
const updateRiskHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const riskUpdate = validate(req.body, schemas.createRiskSchema);
    const riskId = Number(req.params.riskId);
    const risk = await Risk.updateRisk(riskId, riskUpdate);
    return res.json(risk);
  } catch (err) {
    logger.error('updateRiskHandler failed', err);
    return next(err);
  }
}

module.exports = {
  getPlayerRiskLevelHandler,
  getPlayerRiskStatusHandler,
  getPlayerRiskLogHandler,
  getRisksHandler,
  createRiskHandler,
  updateRiskHandler,
};
