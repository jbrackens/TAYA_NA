// @flow
import type { CreateAffiliateLinkAdminRequest, GetAffiliateLinksAdminRequest, GetAffiliateLinkClicksAdminRequest, UpdateAffiliateLinkAdminRequest, DeleteAffiliateLinkAdminRequest, CreateAffiliateLinkResponse, GetAffiliateLinksResponse, GetAffiliateLinkClicksResponse, UpdateAffiliateLinkResponse, DeleteAffiliateLinkResponse } from '../../../../../types/api/links';

const { DateTime } = require('luxon');
const _ = require('lodash');

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');

const affiliatesRepository = require('../repository');
const repository = require('./repository');
const logsRepository = require('../logs/repository');
const plansRepository = require('../../plans/repository');
const schemas = require('./schemas');

const createAffiliateLinkHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('createAffiliateLinkHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params, body } = req;
    const request = validate<CreateAffiliateLinkAdminRequest>({ session, params, link: body }, schemas.createAffiliateLinkSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, request.params.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const link = await repository.createAffiliateLink(pg, request.link, request.params.affiliateId);

    let plan;
    if (link.planId) plan = await plansRepository.getPlan(pg, link.planId);

    await logsRepository.createAffiliateLog(pg, {
      note: 'Affiliate link created',
    }, request.params.affiliateId, request.session.user.id);

    const response: DataResponse<CreateAffiliateLinkResponse> = {
      data: {
        link: {
          linkId: link.id,
          planId: link.planId,
          brandId: link.brandId,
          code: link.code,
          name: link.name,
          landingPage: link.landingPage,
          deal: (plan && plan.name) || null,
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('createAffiliateLinkHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliateLinksHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliateLinksHandler request', { session: req.session, params: req.params, body: req.body });

    const { params: { affiliateId }, query: { brandId } } = validate<GetAffiliateLinksAdminRequest>({ params: req.params, query: req.query }, schemas.getAffiliateLinksSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const links = await repository.getAffiliateLinks(pg, affiliateId, brandId);
    const response: DataResponse<GetAffiliateLinksResponse> = {
      data: {
        links: links.map(link => ({
          linkId: link.id,
          planId: link.planId,
          brandId: link.brandId,
          code: link.code,
          name: link.name,
          landingPage: link.landingPage,
          deal: link.deal,
        })),
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliateLinksHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliateLinkClicksHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliateLinkClicksHandler request', { session: req.session, params: req.params, body: req.body });

    const { params, query } = req;
    const request = validate<GetAffiliateLinkClicksAdminRequest>({ params, query }, schemas.getAffiliateLinkClicksSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, request.params.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const link = await repository.getAffiliateLink(pg, request.params.affiliateId, request.params.linkId);

    if (!link) {
      return res.status(404).json({
        error: { message: 'Link not found' },
      });
    }

    const from = DateTime.fromFormat(request.query.from, 'yyyy-MM-dd');
    const to = DateTime.fromFormat(request.query.to, 'yyyy-MM-dd');

    const clicks = await repository.getAffiliateLinkClicksWithStatistics(pg, request.params.affiliateId, request.params.linkId, { from, to });
    const response: DataResponse<GetAffiliateLinkClicksResponse> = {
      data: {
        clicks: {
          items: clicks.map(click => ({
            date: click.clickDate,
            segment: click.segment,
            clicks: click.clicks,
            nrc: click.nrc,
            ndc: click.ndc,
            deposits: click.deposits,
            turnover: click.turnover,
            grossRevenue: click.grossRevenue,
            netRevenue: click.netRevenue,
            commission: click.commission,
            cpa: click.cpa,
          })),
          totals: {
            clicks: _.sumBy(clicks, c => c.clicks),
            nrc: _.sumBy(clicks, c => c.nrc),
            ndc: _.sumBy(clicks, c => c.ndc),
            deposits: _.sumBy(clicks, c => c.deposits),
            turnover: _.sumBy(clicks, c => c.turnover),
            grossRevenue: _.sumBy(clicks, c => c.grossRevenue),
            netRevenue: _.sumBy(clicks, c => c.netRevenue),
            commission: _.sumBy(clicks, c => c.commission),
            cpa: _.sumBy(clicks, c => c.cpa),
          },
          total: _.sumBy(clicks, c => _.sum([c.commission, c.cpa])),
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliateLinkClicksHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const updateAffiliateLinkHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('updateAffiliateLinkHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params, body } = req;
    const request = validate<UpdateAffiliateLinkAdminRequest>({ session, params, link: body }, schemas.updateAffiliateLinkSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, request.params.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }
    const existingLing = await repository.getAffiliateLinkById(pg, request.params.linkId);
    if (existingLing && request.link.brandId && existingLing.brandId !== request.link.brandId) {
      return res.status(403).json({
        error: { message: 'Changing brand for links is not possible' },
      });
    }

    const link = await repository.updateAffiliateLink(pg, request.params.linkId, request.link);

    if (!link) {
      return res.status(404).json({
        error: { message: 'Link not found' },
      });
    }

    let plan;
    if (link.planId) plan = await plansRepository.getPlan(pg, link.planId);

    await logsRepository.createAffiliateLog(pg, {
      note: 'Affiliate link updated',
    }, request.params.affiliateId, request.session.user.id);

    const response: DataResponse<UpdateAffiliateLinkResponse> = {
      data: {
        link: {
          linkId: link.id,
          planId: link.planId,
          brandId: link.brandId,
          code: link.code,
          name: link.name,
          landingPage: link.landingPage,
          deal: (plan && plan.name) || null,
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('updateAffiliateLinkHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const deleteAffiliateLinkHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('deleteAffiliateLinkHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params } = req;
    const request = validate<DeleteAffiliateLinkAdminRequest>({ session, params }, schemas.deleteAffiliateLinkSchema);

    const count = await repository.deleteAffiliateLink(pg, request.params.linkId);
    if (!count) {
      return res.status(404).json({
        error: { message: 'Link not found' },
      });
    }

    await logsRepository.createAffiliateLog(pg, {
      note: 'Affiliate link deleted',
    }, request.params.affiliateId, request.session.user.id);

    const response: DataResponse<DeleteAffiliateLinkResponse> = {
      data: {
        ok: true,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('deleteAffiliateLinkHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  createAffiliateLinkHandler,
  getAffiliateLinksHandler,
  getAffiliateLinkClicksHandler,
  updateAffiliateLinkHandler,
  deleteAffiliateLinkHandler,
};
