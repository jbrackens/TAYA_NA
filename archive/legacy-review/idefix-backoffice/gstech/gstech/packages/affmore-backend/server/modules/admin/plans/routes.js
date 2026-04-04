// @flow
import type { CreatePlanRequest, GetPlanRequest, UpdatePlanRequest, DeletePlanRequest, CreatePlanResponse, GetPlansResponse, GetPlanResponse, UpdatePlanResponse } from '../../../../types/api/plans';

const HttpError = require('gstech-core/modules/HttpError');

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');

const repository = require('./repository');
const schemas = require('./schemas');

const createPlanHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('createPlanHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, body } = req;
    const request = validate<CreatePlanRequest>({ session, ...body }, schemas.createPlanSchema);

    const existingPlan = await repository.getPlanByName(pg, request.plan.name);
    if (existingPlan) {
      return res.status(409).json({
        error: { message: 'Plan with this name already exists' },
      });
    }

    const { plan, rules } = await pg.transaction(async tx => {
      const createdPlan = await repository.createPlan(tx, request.plan, request.session.user.id);
      if (request.rules.length > 0) {
        const createdRules = await repository.createRules(tx, request.rules, createdPlan.id);
        return { plan: createdPlan, rules: createdRules };
      }
      return { plan: createdPlan, rules: [] };
    });

    const response: DataResponse<CreatePlanResponse> = {
      data: {
        plan: {
          planId: plan.id,
          name: plan.name,
          nrs: plan.nrs,
          isLadder: plan.nrs === null,
          cpa: plan.cpa,
          archived: plan.archived,
          createdBy: plan.createdBy,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
        },
        rules: rules.map(rule => ({
          ruleId: rule.id,
          countryId: rule.countryId,
          nrs: rule.nrs,
          cpa: rule.cpa,
          deposit: rule.deposit,
          deposit_cpa: rule.deposit_cpa,
        })),
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('createPlanHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getPlansHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getPlansHandler request', { session: req.session, params: req.params, body: req.body });

    const plans = await repository.getPlansWithStatistics(pg);
    const response: DataResponse<GetPlansResponse> = {
      data: {
        plans: plans.map(plan => ({
          planId: plan.id,
          name: plan.name,
          nrs: plan.nrs,
          isLadder: plan.nrs === null,
          cpa: plan.cpa,
          archived: plan.archived,
          createdBy: plan.createdBy,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
          rules: plan.rules,
          usages: plan.usages,
        })),
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getPlansHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getPlanHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getPlanHandler request', { session: req.session, params: req.params, body: req.body });

    const { params } = req;
    const request = validate<GetPlanRequest>({ params }, schemas.getPlanSchema);

    const plan = await repository.getPlan(pg, request.params.planId);
    if (!plan) {
      return res.status(404).json({
        error: { message: 'Plan not found' },
      });
    }

    const rules = await repository.getRules(pg, request.params.planId);
    const affiliates = await repository.getRelatedAffiliates(pg, request.params.planId);
    const response: DataResponse<GetPlanResponse> = {
      data: {
        plan: {
          planId: plan.id,
          name: plan.name,
          nrs: plan.nrs,
          isLadder: plan.nrs === null,
          cpa: plan.cpa,
          archived: plan.archived,
          createdBy: plan.createdBy,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
        },
        rules: rules.map(rule => ({
          ruleId: rule.id,
          countryId: rule.countryId,
          nrs: rule.nrs,
          cpa: rule.cpa,
          deposit: rule.deposit,
          deposit_cpa: rule.deposit_cpa,
        })),
        affiliates: affiliates.map(affiliate => ({
          affiliateId: affiliate.id,
          affiliateName: affiliate.name,
          affiliateEmail: affiliate.email,
        })),
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getPlanHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const updatePlanHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('updatePlanHandler request', { session: req.session, params: req.params, body: req.body });

    const { params, body } = req;
    const request = validate<UpdatePlanRequest>({ params, ...body }, schemas.updatePlanSchema);

    const existingPlan = await repository.getPlanByName(pg, request.plan.name);
    if (existingPlan && existingPlan.id !== request.params.planId) {
      return res.status(409).json({
        error: { message: 'Plan with this name already exists' },
      });
    }

    const planWithStat = await repository.getPlanWithStatistics(pg, request.params.planId);
    if (request.plan.archived && planWithStat && planWithStat.usages > 0) {
      return res.status(409).json({
        error: { message: 'Plan is in use by deals or links' },
      });
    }

    const { plan, rules } = await pg.transaction(async tx => {
      const updatedPlan = await repository.updatePlan(tx, request.params.planId, request.plan);
      if (!updatedPlan) {
        throw new HttpError(404, 'Plan not found');
      }

      await repository.deleteRules(tx, updatedPlan.id);
      if (request.rules.length > 0) {
        const updatedRules = await repository.createRules(tx, request.rules, updatedPlan.id);
        return { plan: updatedPlan, rules: updatedRules };
      }
      return { plan: updatedPlan, rules: [] };
    });

    const response: DataResponse<UpdatePlanResponse> = {
      data: {
        plan: {
          planId: plan.id,
          name: plan.name,
          nrs: plan.nrs,
          isLadder: plan.nrs === null,
          cpa: plan.cpa,
          archived: plan.archived,
          createdBy: plan.createdBy,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
        },
        rules: rules.map(rule => ({
          ruleId: rule.id,
          countryId: rule.countryId,
          nrs: rule.nrs,
          cpa: rule.cpa,
          deposit: rule.deposit,
          deposit_cpa: rule.deposit_cpa,
        })),
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('updatePlanHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const deletePlanHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('deletePlanHandler request', { session: req.session, params: req.params, body: req.body });

    const { params } = req;
    const request = validate<DeletePlanRequest>({ params }, schemas.deletePlanSchema);

    try {
      const count = await repository.deletePlan(pg, request.params.planId);
      if (!count) {
        return res.status(404).json({
          error: { message: 'Plan not found' },
        });
      }

      const response: DataResponse<OkResult> = {
        data: {
          ok: true,
        },
      };

      return res.json(response);
    } catch (e) {
      if (e.constraint && e.constraint.includes('planId_fkey')) {
        return res.status(409).json({ error: { message: 'Plan is in use' } });
      }
      throw e;
    }
  } catch (e) {
    logger.error('deletePlanHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  createPlanHandler,
  getPlansHandler,
  getPlanHandler,
  updatePlanHandler,
  deletePlanHandler,
};
