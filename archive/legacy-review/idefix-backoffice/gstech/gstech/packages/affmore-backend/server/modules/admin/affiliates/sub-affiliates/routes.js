// @flow
import type { GetSubAffiliatesAdminRequest } from '../../../../../types/api/affiliates-admin';
import type { GetSubAffiliatesResponse } from '../../../../../types/api/affiliates';
import type { CreateSubAffiliateRequest, UpdateSubAffiliateRequest, DeleteSubAffiliateRequest, CreateSubAffiliateResponse, UpdateSubAffiliateResponse, DeleteSubAffiliateResponse } from '../../../../../types/api/sub-affiliates';

const _ = require('lodash');

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');

const { calculateZeroFlooredCommission } = require('../../../../commissionCalculator');
const affiliatesRepository = require('../repository');
const repository = require('./repository');
const schemas = require('./schemas');

const getSubAffiliatesHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getSubAffiliatesHandler request', { session: req.session, params: req.params, body: req.body });

    const { params: {
      affiliateId,
      year,
      month,
    } } = validate<GetSubAffiliatesAdminRequest>({ params: req.params }, schemas.getSubAffiliatesSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const subAffiliates = await affiliatesRepository.getSubAffiliates(pg, affiliateId);
    logger.warn('getSubAffiliatesHandler', { subAffiliates });

    const subAffiliatesWithDetails = await Promise.all(subAffiliates.map(async a => {
      const subAffiliate = await affiliatesRepository.getAffiliateOverview(pg, a.id, year, month);
      const commission = calculateZeroFlooredCommission(subAffiliate.commissions, subAffiliate.floorBrandCommission);
      logger.warn('getSubAffiliatesHandler', { subAffiliate,  commission, a });

      const result = {
        affiliateId: subAffiliate.id,
        affiliateName: a.name,
        commissionShare: a.commissionShare,
        nrc: subAffiliate.newDepositingPlayers,
        ndc: subAffiliate.depositingPlayers,
        registeredCustomers: subAffiliate.registeredPlayers,
        depositingCustomers: subAffiliate.depositingPlayers,
        netRevenue: subAffiliate.netRevenue,
        commission: Math.round(commission * (a.commissionShare / 100)),
      };

      return result;
    }))

    const response: DataResponse<GetSubAffiliatesResponse> = {
      data: {
        affiliates: {
          items: subAffiliatesWithDetails,
          totals: {
            nrc: _.sumBy(subAffiliatesWithDetails, s => s.nrc),
            ndc: _.sumBy(subAffiliatesWithDetails, s => s.ndc),
            registeredCustomers: _.sumBy(subAffiliatesWithDetails, s => s.registeredCustomers),
            depositingCustomers: _.sumBy(subAffiliatesWithDetails, s => s.depositingCustomers),
            netRevenue: _.sumBy(subAffiliatesWithDetails, s => s.netRevenue),
            commission: _.sumBy(subAffiliatesWithDetails, s => s.commission),
          },
          total: _.sumBy(subAffiliatesWithDetails, a => _.sum([a.commission])),
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getSubAffiliatesHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const createSubAffiliateHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('createSubAffiliateHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params, body } = req;
    const request = validate<CreateSubAffiliateRequest>({ session, params, ...body }, schemas.createSubAffiliateSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, request.params.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const subAffiliateDraft = {
      parentId: request.params.affiliateId,
      affiliateId: request.params.subAffiliateId,
      commissionShare: request.commissionShare,
    };
    await repository.createSubAffiliate(pg, subAffiliateDraft);

    const response: DataResponse<CreateSubAffiliateResponse> = {
      data: {
        ok: true,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('createSubAffiliateHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const updateSubAffiliateHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('updateSubAffiliateHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params, body } = req;
    const request = validate<UpdateSubAffiliateRequest>({ session, params, ...body }, schemas.updateSubAffiliateSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, request.params.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const subAffiliateDraft = {
      parentId: request.params.affiliateId,
      affiliateId: request.params.subAffiliateId,
      commissionShare: request.commissionShare,
    };
    await repository.updateSubAffiliate(pg, subAffiliateDraft);

    const response: DataResponse<UpdateSubAffiliateResponse> = {
      data: {
        ok: true,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('updateSubAffiliateHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const deleteSubAffiliateHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('deleteSubAffiliateHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params } = req;
    const request = validate<DeleteSubAffiliateRequest>({ session, params }, schemas.deleteSubAffiliateSchema);

    const count = await repository.deleteSubAffiliate(pg, request.params.affiliateId, request.params.subAffiliateId);
    if (!count) {
      return res.status(404).json({
        error: { message: 'SubAffiliate not found' },
      });
    }

    const response: DataResponse<DeleteSubAffiliateResponse> = {
      data: {
        ok: true,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('deleteSubAffiliateHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  getSubAffiliatesHandler,
  createSubAffiliateHandler,
  updateSubAffiliateHandler,
  deleteSubAffiliateHandler,
};
