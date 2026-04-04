// @flow
import type { GetAffiliateDealsAdminRequest, UpsertAffiliateDealRequest, DeleteAffiliateDealRequest, GetAffiliateDealsResponse, UpsertAffiliateDealResponse, DeleteAffiliateDealResponse } from '../../../../../types/api/deals';

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');
const { affmoreBrands } = require('../../../../../types/constants');

const affiliatesRepository = require('../repository');
const logsRepository = require('../logs/repository');
const plansRepository = require('../../plans/repository');
const repository = require('./repository');
const schemas = require('./schemas');
const { generateDifferenceNote } = require('../../../../noteGenerator');
const { getDefaultDeals } = require('../../../../deals');

const getAffiliateDealsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliateDealsHandler request', { session: req.session, params: req.params, body: req.body });

    const { params } = req;
    const request = validate<GetAffiliateDealsAdminRequest>({ params }, schemas.getAffiliateDealsSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, request.params.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const affiliateDeals = await repository.getAffiliateDeals(pg, request.params.affiliateId);
    const defaultDeals = await getDefaultDeals(pg);

    const deals = affmoreBrands.map(({ id: brandId }) => (
      { brandId, deal: affiliateDeals.find(d => d.brandId === brandId) || defaultDeals[brandId] }
    ));

    const response: DataResponse<GetAffiliateDealsResponse> = {
      data: {
        deals: await Promise.all(deals.map(async sd => ({
          planId: sd.deal.planId,

          createdBy: sd.deal.createdBy,
          createdAt: sd.deal.createdAt,
          updatedAt: sd.deal.updatedAt,

          brandId: sd.brandId,
          name: sd.deal.name,
          nrs: sd.deal.nrs,
          isLadder: sd.deal.nrs === null,
          cpa: sd.deal.cpa,

          rules: (await plansRepository.getRules(pg, sd.deal.planId)).map(r => ({
            ruleId: r.id,
            countryId: r.countryId,
            nrs: r.nrs,
            cpa: r.cpa,
            deposit: r.deposit,
            deposit_cpa: r.deposit_cpa,
          })),
        }))),
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliateDealsHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const upsertAffiliateDealHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('upsertAffiliateDealHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params, body } = req;
    const request = validate<UpsertAffiliateDealRequest>({ session, params, deal: body }, schemas.upsertAffiliateDealSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, request.params.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const plan = await plansRepository.getPlan(pg, request.deal.planId);

    if (!plan) {
      return res.status(404).json({
        error: { message: 'Plan not found' },
      });
    }

    const affiliateDeals = await repository.getAffiliateDeals(pg, request.params.affiliateId);
    const defaultDeals = await getDefaultDeals(pg);
    const oldDeal = affiliateDeals.find(a => a.brandId === request.deal.brandId) || defaultDeals[request.deal.brandId];

    const deal = await repository.upsertDeal(pg, request.deal, request.session.user.id);
    const rules = await plansRepository.getRules(pg, deal.planId);

    const note = await generateDifferenceNote(request.deal, oldDeal, deal);
    await logsRepository.createAffiliateLog(pg, { note }, request.params.affiliateId, request.session.user.id);

    const response: DataResponse<UpsertAffiliateDealResponse> = {
      data: {
        deal: {
          planId: plan.id,

          createdBy: deal.createdBy,
          createdAt: deal.createdAt,
          updatedAt: deal.updatedAt,

          brandId: deal.brandId,
          name: plan.name,
          nrs: plan.nrs,
          isLadder: (plan.nrs === null),
          cpa: plan.cpa,

          rules: rules.map(r => ({
            ruleId: r.id,
            countryId: r.countryId,
            nrs: r.nrs,
            cpa: r.cpa,
            deposit: r.deposit,
            deposit_cpa: r.deposit_cpa,
          })),
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('upsertAffiliateDealHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const deleteAffiliateDealHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('deleteAffiliateDealHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params } = req;
    const request = validate<DeleteAffiliateDealRequest>({ session, params }, schemas.deleteAffiliateDealSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, request.params.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const count = await repository.deleteDeal(pg, request.params.affiliateId, request.params.brandId);
    if (!count) {
      return res.status(404).json({
        error: { message: 'Deal not found' },
      });
    }

    await logsRepository.createAffiliateLog(pg, {
      note: 'Affiliate deal deleted',
    }, request.params.affiliateId, request.session.user.id);

    const response: DataResponse<DeleteAffiliateDealResponse> = {
      data: {
        ok: true,
      },
    };
    return res.json(response);
  } catch (e) {
    logger.error('deleteAffiliateDealHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  getAffiliateDealsHandler,
  upsertAffiliateDealHandler,
  deleteAffiliateDealHandler,
};
