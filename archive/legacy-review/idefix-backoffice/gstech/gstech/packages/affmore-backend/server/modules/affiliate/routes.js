// @flow
import type { GetAffiliateActivitiesRequest, GetAffiliateActivitiesResponse } from '../../../types/api/activities';
import type { GetAffiliateRequest, UpdateAffiliateRequest, GetAffiliateOverviewRequest, GetAffiliatePlayersRevenuesRequest, GetAffiliateDealsRequest, CreateAffiliateLinkRequest, GetAffiliateLinksRequest, GetAffiliateLinkClicksRequest, UpdateAffiliateLinkRequest, DeleteAffiliateLinkRequest, GetAffiliatePlayerActivitiesRequest, GetAffiliatePaymentsRequest, GetSubAffiliatesRequest, GetAffiliateAPITokenRequest, RefreshAffiliateAPITokenRequest, GetAffiliateResponse, UpdateAffiliateResponse, GetAffiliateOverviewResponse, GetSubAffiliatesResponse, GetAffiliateAPITokenResponse, RefreshAffiliateAPITokenResponse } from '../../../types/api/affiliates';
import type { GetChildrenAffiliatesRequest, GetChildrenAffiliatesResponse, CreateChildAffiliateRequest, CreateChildAffiliateResponse } from '../../../types/api/children';
import type { GetAffiliateDealsResponse, DeleteAffiliateDealResponse } from '../../../types/api/deals';
import type { GetAffiliateLandingsRequest, GetAffiliateLandingsResponse } from '../../../types/api/landings';
import type { CreateAffiliateLinkResponse, GetAffiliateLinksResponse, GetAffiliateLinkClicksResponse, UpdateAffiliateLinkResponse } from '../../../types/api/links';
import type { GetAffiliatePaymentsResponse } from '../../../types/api/payments';
import type { GetAffiliatePlayersRevenuesResponse, GetAffiliatePlayerActivitiesResponse } from '../../../types/api/players';
import type { InsertAffiliateDraft } from '../../../types/repository/affiliates';
import type { GetAffiliateViewAdminFeesResponse } from '../../../types/api/affiliate-admin-fees';

const { DateTime } = require('luxon');
const { Router } = require('express');
const { v1: uuid } = require('uuid');
const _ = require('lodash');

const { isTestEmail } = require('gstech-core/modules/utils');
const validate = require('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const { affmoreBrands } = require('../../../types/constants');

const config = require('../../config');
const schemas = require('./schemas');
const repository = require('../admin/affiliates/repository');
const activitiesRepository = require('../admin/affiliates/activities/repository');
const adminFeesRepository = require('../admin/affiliates/fees/repository');
const dealsRepository = require('../admin/affiliates/deals/repository');
const linksRepository = require('../admin/affiliates/links/repository');
const plansRepository = require('../admin/plans/repository');
const playersRepository = require('../admin/affiliates/players/repository');
const paymentsRepository = require('../admin/payments/repository');
const logsRepository = require('../admin/affiliates/logs/repository');
const landingsRepository = require('../admin/landings/repository');
const childrenAffiliateRepository = require('../admin/affiliates/children/repository');
const { groupActivitiesByBrand, sumBrandCommissions, calculateZeroFlooredCommission } = require('../../commissionCalculator');
const { generateDifferenceNote } = require('../../noteGenerator');
const { getDefaultDeals } = require('../../deals');

const router: express$Router<> = Router(); // eslint-disable-line

const formatClicks = (date: ?DateTime, count: number) => {
  if (date && date.valueOf() < DateTime.local(2020, 10, 1).valueOf()) {
    return 'N/A';
  }
  return count;
}

const getAffiliateHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliateHandler request', { session: req.session, params: req.params, body: req.body });

    const request = validate<GetAffiliateRequest>({ session: req.session }, schemas.getAffiliateSchema);

    const affiliate = await repository.getAffiliate(pg, request.session.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const response: DataResponse<GetAffiliateResponse> = {
      data: {
        affiliateId: affiliate.id,
        affiliateName: affiliate.name,

        contactName: affiliate.contactName,
        email: affiliate.email,
        countryId: affiliate.countryId,
        address: affiliate.address,
        phone: affiliate.phone,
        skype: affiliate.skype,
        vatNumber: affiliate.vatNumber,
        info: affiliate.info,
        allowEmails: affiliate.allowEmails,
        allowPayments: affiliate.allowPayments,

        paymentMinAmount: affiliate.paymentMinAmount,
        paymentMethod: affiliate.paymentMethod,
        paymentMethodDetails: affiliate.paymentMethodDetails,
        accountBalance: affiliate.accountBalance,

        createdAt: affiliate.createdAt,
        updatedAt: affiliate.updatedAt,
        lastLoginDate: affiliate.lastLoginDate,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliateHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const updateAffiliateHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('updateAffiliateHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, body } = req;
    const request = validate<UpdateAffiliateRequest>({ session, affiliate: body }, schemas.updateAffiliateSchema);

    const affiliate = await repository.getAffiliate(pg, request.session.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const updatedAffiliate = await repository.updateAffiliate(pg, request.session.affiliateId, request.affiliate);

    const note = await generateDifferenceNote(request.affiliate, affiliate, updatedAffiliate);
    await logsRepository.createAffiliateLog(pg, { note }, request.session.affiliateId, 1);

    const accountBalance = await paymentsRepository.getAffiliateBalance(pg, updatedAffiliate.id);

    const response: DataResponse<UpdateAffiliateResponse> = {
      data: {
        affiliateId: updatedAffiliate.id,
        affiliateName: updatedAffiliate.name,

        contactName: updatedAffiliate.contactName,
        email: updatedAffiliate.email,
        countryId: updatedAffiliate.countryId,
        address: updatedAffiliate.address,
        phone: updatedAffiliate.phone,
        skype: updatedAffiliate.skype,
        vatNumber: updatedAffiliate.vatNumber,
        info: updatedAffiliate.info,
        allowEmails: updatedAffiliate.allowEmails,

        paymentMinAmount: updatedAffiliate.paymentMinAmount,
        paymentMethod: updatedAffiliate.paymentMethod,
        paymentMethodDetails: updatedAffiliate.paymentMethodDetails,
        accountBalance: accountBalance ? accountBalance.balance : 0,

        createdAt: updatedAffiliate.createdAt,
        updatedAt: updatedAffiliate.updatedAt,

        lastLoginDate: updatedAffiliate.lastLoginDate,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('updateAffiliateHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliateOverviewHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliateOverviewHandler request', { session: req.session, params: req.params, body: req.body });

    const { session: {
      affiliateId,
    },
    params: {
      year,
      month,
    } } = validate<GetAffiliateOverviewRequest>({ session: req.session, params: req.params }, schemas.getAffiliateOverviewSchema);

    const thisMonth = DateTime.local(year, month, 1);

    const thisOverview = await repository.getAffiliateOverview(pg, affiliateId, thisMonth.year, thisMonth.month);

    if (!thisOverview) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const thisCommission = calculateZeroFlooredCommission(thisOverview.commissions, thisOverview.floorBrandCommission);

    const nrc = {
      current: thisOverview.newRegisteredPlayers,
    };

    const ndc = {
      current: thisOverview.newDepositingPlayers,
    };

    const conversionRate = {
      current: thisOverview.conversionRate,
    };

    const monthlyCommission = {
      current: thisOverview.cpa + thisCommission,
    };

    const response: DataResponse<GetAffiliateOverviewResponse> = {
      data: {
        nrc: {
          current: nrc.current,
        },
        ndc: {
          current: ndc.current,
        },
        conversionRate: {
          current: conversionRate.current,
        },
        monthlyCommission: {
          current: monthlyCommission.current,
        },

        registeredCustomers: thisOverview.registeredPlayers,
        depositingCustomers: thisOverview.depositingPlayers,
        activePlayers: thisOverview.activePlayers,

        netRevenue: thisOverview.netRevenue,
        cpa: thisOverview.cpa,
        commission: thisCommission,

        accountBalance: thisOverview.balance,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliateOverviewHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliateRevenuesHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliateRevenuesHandler request', { session: req.session, params: req.params, body: req.body });

    const { session: {
      affiliateId,
    }, params: {
      year,
      month,
    }, query: { brandId } } = validate<GetAffiliatePlayersRevenuesRequest>({ session: req.session, params: req.params, query: req.query }, schemas.getAffiliatePlayersRevenuesSchema);

    const affiliate = await repository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const revenues = await repository.getAffiliateRevenues(pg, affiliateId, year, month, brandId);

    const commissions = sumBrandCommissions(revenues);
    const commission = year && month ? calculateZeroFlooredCommission(commissions, affiliate.floorBrandCommission) : _.sumBy(revenues, r => r.commission);

    const response: DataResponse<GetAffiliatePlayersRevenuesResponse> = {
      data: {
        revenues: {
          items: revenues.map(revenue => ({
            playerId: revenue.playerId,
            planId: revenue.planId,
            countryId: revenue.countryId,
            brandId: revenue.brandId,
            deal: revenue.deal,
            link: revenue.link,
            clickDate: revenue.clickDate,
            referralId: revenue.referralId,
            segment: revenue.segment,
            registrationDate: revenue.registrationDate,
            deposits: revenue.deposits,
            turnover: revenue.turnover,
            grossRevenue: revenue.grossRevenue,
            bonuses: revenue.bonuses * -1,
            adjustments: revenue.adjustments * -1,
            fees: revenue.fees * -1,
            tax: revenue.tax * -1,
            netRevenue: revenue.netRevenue,
            commission: revenue.commission,
            cpa: revenue.cpa,
          })),
          totals: {
            deposits: _.sumBy(revenues, r => r.deposits),
            turnover: _.sumBy(revenues, r => r.turnover),
            grossRevenue: _.sumBy(revenues, r => r.grossRevenue),
            bonuses: _.sumBy(revenues, r => r.bonuses) * -1,
            adjustments: _.sumBy(revenues, r => r.adjustments) * -1,
            fees: _.sumBy(revenues, r => r.fees) * -1,
            tax: _.sumBy(revenues, r => r.tax) * -1,
            netRevenue: _.sumBy(revenues, r => r.netRevenue),
            commission,
            cpa: _.sumBy(revenues, r => r.cpa),
          },
          total: _.sumBy(revenues, r => r.cpa) + commission,
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliateRevenuesHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliateDealsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliateDealsHandler request', { session: req.session, params: req.params, body: req.body });

    const request = validate<GetAffiliateDealsRequest>({ session: req.session }, schemas.getAffiliateDealsSchema);

    const affiliate = await repository.getAffiliate(pg, request.session.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const affiliateDeals = await dealsRepository.getAffiliateDeals(pg, request.session.affiliateId);
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

          name: sd.deal.name,
          brandId: sd.brandId,
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

const getAffiliateAdminFeesHandler = async (
  { session, params, body }: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> getAffiliateAdminFeesHandler', { session, params, body });
    const {
      session: { affiliateId },
    } = validate<GetAffiliateDealsRequest>({ session }, schemas.getAffiliateAdminFeesSchema);
    const affiliate = await repository.getAffiliate(pg, affiliateId);
    if (!affiliate) return res.status(404).json({ error: { message: 'Affiliate not found' } });

    const affiliateAdminFees = await adminFeesRepository.getAffiliateViewAdminFees(pg, affiliateId);
    const response: DataResponse<GetAffiliateViewAdminFeesResponse> = { data: { fees: affiliateAdminFees } }
    logger.debug('<<< getAffiliateAdminFeesHandler', { response })

    return res.json(response);
  } catch (e) {
    logger.error('XXX getAffiliateAdminFeesHandler', { error: e, message: e.message });
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const createAffiliateLinkHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('createAffiliateLinkHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, body } = req;
    const request = validate<CreateAffiliateLinkRequest>({ session, link: body }, schemas.createAffiliateLinkSchema);

    const affiliate = await repository.getAffiliate(pg, request.session.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const link = await linksRepository.createAffiliateLink(pg, request.link, request.session.affiliateId);

    let plan;
    if (link.planId) plan = await plansRepository.getPlan(pg, link.planId);

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

    const { session: { affiliateId }, query: { brandId } } = validate<GetAffiliateLinksRequest>({ session: req.session, query: req.query }, schemas.getAffiliateLinksSchema);

    const affiliate = await repository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const links = await linksRepository.getAffiliateLinks(pg, affiliateId, brandId);
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

    const { session, params, query } = req;
    const request = validate<GetAffiliateLinkClicksRequest>({ session, params, query }, schemas.getAffiliateLinkClicksSchema);

    const affiliate = await repository.getAffiliate(pg, request.session.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const link = await linksRepository.getAffiliateLink(pg, request.session.affiliateId, request.params.linkId);

    if (!link) {
      return res.status(404).json({
        error: { message: 'Link not found' },
      });
    }

    const from = DateTime.fromFormat(request.query.from, 'yyyy-MM-dd');
    const to = DateTime.fromFormat(request.query.to, 'yyyy-MM-dd');

    const clicks = await linksRepository.getAffiliateLinkClicksWithStatistics(pg, request.session.affiliateId, request.params.linkId, { from, to });
    const response: DataResponse<GetAffiliateLinkClicksResponse> = {
      data: {
        clicks: {
          items: clicks.map(click => ({
            date: click.clickDate,
            segment: click.segment,
            clicks: formatClicks(to, click.clicks),
            nrc: click.nrc,
            ndc: click.ndc,
            deposits: click.deposits,
            turnover: click.turnover,
            grossRevenue: click.grossRevenue,
            netRevenue: click.netRevenue,
            cpa: click.cpa,
            commission: click.commission,
          })),
          totals: {
            clicks: formatClicks(to, _.sumBy(clicks, c => c.clicks)),
            nrc: _.sumBy(clicks, c => c.nrc),
            ndc: _.sumBy(clicks, c => c.ndc),
            deposits: _.sumBy(clicks, c => c.deposits),
            turnover: _.sumBy(clicks, c => c.turnover),
            grossRevenue: _.sumBy(clicks, c => c.grossRevenue),
            netRevenue: _.sumBy(clicks, c => c.netRevenue),
            cpa: _.sumBy(clicks, c => c.cpa),
            commission: _.sumBy(clicks, c => c.commission),
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
    const request = validate<UpdateAffiliateLinkRequest>({ session, params, link: body }, schemas.updateAffiliateLinkSchema);

    const affiliate = await repository.getAffiliate(pg, request.session.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const existingLing = await linksRepository.getAffiliateLinkById(pg, request.params.linkId);
    if (existingLing && request.link.brandId && existingLing.brandId !== request.link.brandId) {
      return res.status(403).json({
        error: { message: 'Changing brand for links is not possible' },
      });
    }

    const link = await linksRepository.updateAffiliateLink(pg, request.params.linkId, request.link);

    if (!link) {
      return res.status(404).json({
        error: { message: 'Link not found' },
      });
    }

    let plan;
    if (link.planId) plan = await plansRepository.getPlan(pg, link.planId);

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
    const request = validate<DeleteAffiliateLinkRequest>({ session, params }, schemas.deleteAffiliateLinkSchema);

    const count = await linksRepository.deleteAffiliateLink(pg, request.params.linkId);
    if (!count) {
      return res.status(404).json({
        error: { message: 'Link not found' },
      });
    }

    const response: DataResponse<DeleteAffiliateDealResponse> = {
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

const getLandingsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getLandingsHandler request', { session: req.session, params: req.params, body: req.body });

    const request = validate<GetAffiliateLandingsRequest>({ session: req.session, params: req.params }, schemas.getLandingsSchema);

    const landings = await landingsRepository.getLandings(pg, request.params.brandId);
    const response: DataResponse<GetAffiliateLandingsResponse> = {
      data: {
        landings: landings.map(landing => ({
          brandId: landing.brandId,
          landingPage: landing.landingPage,
        })),
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getLandingsHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliatePlayersRevenueHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliatePlayersRevenueHandler request', { session: req.session, params: req.params, body: req.body });

    const { session: {
      affiliateId,
    }, params: {
      year,
      month,
    }, query: { brandId } } = validate<GetAffiliatePlayersRevenuesRequest>({ session: req.session, params: req.params, query: req.query }, schemas.getAffiliatePlayersRevenuesSchema);

    const affiliate = await repository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const revenues = await playersRepository.getAffiliatePlayers(pg, affiliateId, year, month, brandId);

    const commissions = sumBrandCommissions(revenues);
    const commission = year && month ? calculateZeroFlooredCommission(commissions, affiliate.floorBrandCommission) : _.sumBy(revenues, r => r.commission);

    const response: DataResponse<GetAffiliatePlayersRevenuesResponse> = {
      data: {
        revenues: {
          items: revenues.map(revenue => ({
            playerId: revenue.playerId,
            planId: revenue.planId,
            countryId: revenue.countryId,
            brandId: revenue.brandId,
            deal: revenue.deal,
            link: revenue.link,
            clickDate: revenue.clickDate,
            referralId: revenue.referralId,
            segment: revenue.segment,
            registrationDate: revenue.registrationDate,
            deposits: revenue.deposits,
            turnover: revenue.turnover,
            grossRevenue: revenue.grossRevenue,
            bonuses: revenue.bonuses * -1,
            adjustments: revenue.adjustments * -1,
            fees: revenue.fees * -1,
            tax: revenue.tax * -1,
            netRevenue: revenue.netRevenue,
            commission: revenue.commission,
            cpa: revenue.cpa,
          })),
          totals: {
            deposits: _.sumBy(revenues, r => r.deposits),
            turnover: _.sumBy(revenues, r => r.turnover),
            grossRevenue: _.sumBy(revenues, r => r.grossRevenue),
            bonuses: _.sumBy(revenues, r => r.bonuses) * -1,
            adjustments: _.sumBy(revenues, r => r.adjustments) * -1,
            fees: _.sumBy(revenues, r => r.fees) * -1,
            tax: _.sumBy(revenues, r => r.tax) * -1,
            netRevenue: _.sumBy(revenues, r => r.netRevenue),
            commission,
            cpa: _.sumBy(revenues, r => r.cpa),
          },
          total: _.sumBy(revenues, r => r.cpa) + commission,
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliatePlayersRevenueHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliatePlayerActivitiesHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliatePlayerActivitiesHandler request', { session: req.session, params: req.params, body: req.body });

    const { session: {
      affiliateId,
    }, params: {
      playerId,
      year,
      month,
    } } = validate<GetAffiliatePlayerActivitiesRequest>({ session: req.session, params: req.params }, schemas.getAffiliatePlayerActivitiesSchema);

    const affiliate = await repository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const player = await playersRepository.getPlayer(pg, affiliateId, playerId);

    if (!player) {
      return res.status(404).json({
        error: { message: 'Player not found' },
      });
    }

    const activities = await playersRepository.getPlayerActivities(pg, affiliateId, playerId, year, month);

    const commissions = groupActivitiesByBrand(activities, a => a.commission);
    const commission = calculateZeroFlooredCommission(commissions, affiliate.floorBrandCommission);

    const response: DataResponse<GetAffiliatePlayerActivitiesResponse> = {
      data: {
        activities: {
          items: activities.map(activity => ({
            activityId: activity.id,
            activityDate: activity.activityDate,
            deposits: activity.deposits,
            turnover: activity.turnover,
            grossRevenue: activity.grossRevenue,
            bonuses: activity.bonuses * -1,
            adjustments: activity.adjustments * -1,
            fees: activity.fees * -1,
            tax: activity.tax * -1,
            netRevenue: activity.netRevenue,
            commission: activity.commission,
            cpa: activity.cpa,
          })),
          totals: {
            deposits: _.sumBy(activities, a => a.deposits),
            turnover: _.sumBy(activities, a => a.turnover),
            grossRevenue: _.sumBy(activities, a => a.grossRevenue),
            bonuses: _.sumBy(activities, a => a.bonuses) * -1,
            adjustments: _.sumBy(activities, a => a.adjustments) * -1,
            fees: _.sumBy(activities, a => a.fees) * -1,
            tax: _.sumBy(activities, a => a.tax) * -1,
            netRevenue: _.sumBy(activities, a => a.netRevenue),
            commission,
            cpa: _.sumBy(activities, a => a.cpa),
          },
          total: _.sumBy(activities, a => a.cpa) + commission,
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliatePlayerActivitiesHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliatePaymentsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliatePaymentsHandler request', { session: req.session, params: req.params, body: req.body });

    const request = validate<GetAffiliatePaymentsRequest>({ session: req.session }, schemas.getAffiliatePaymentsSchema);

    const affiliate = await repository.getAffiliate(pg, request.session.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const payments = await paymentsRepository.getAffiliatePayments(pg, request.session.affiliateId);
    const response: DataResponse<GetAffiliatePaymentsResponse> = {
      data: {
        payments: {
          items: payments.map(payment => ({
            paymentId: payment.id,
            transactionDate: payment.transactionDate,
            type: payment.type,
            description: payment.description,
            amount: payment.amount,
          })),
          totals: {
            amount: _.sumBy(payments, p => p.amount),
          },
          total: _.sumBy(payments, p => p.amount),
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliatePaymentsHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};


const getSubAffiliatesHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getSubAffiliatesHandler request', { session: req.session, params: req.params, body: req.body });

    const { session: {
      affiliateId,
    }, params: {
      year,
      month,
    } } = validate<GetSubAffiliatesRequest>({ session: req.session, params: req.params }, schemas.getSubAffiliatesSchema);

    const affiliate = await repository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const subAffiliates = await repository.getSubAffiliates(pg, affiliateId);
    const subAffiliatesWithDetails = await Promise.all(subAffiliates.map(async a => {
      const subAffiliate = await repository.getAffiliateOverview(pg, a.id, year, month);

      const result = {
        affiliateId: subAffiliate.id,
        affiliateName: a.name,
        commissionShare: a.commissionShare,
        nrc: subAffiliate.newDepositingPlayers,
        ndc: subAffiliate.depositingPlayers,
        registeredCustomers: subAffiliate.registeredPlayers,
        depositingCustomers: subAffiliate.depositingPlayers,
        netRevenue: subAffiliate.netRevenue,
        commission: Math.max(0, subAffiliate.commission * (a.commissionShare / 100)),
      };

      return result;
    }));

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
        }
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getSubAffiliatesHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const createChildAffiliateHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('createChildAffiliateHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, body } = req;
    const request = validate<CreateChildAffiliateRequest>({ session, affiliate: body }, schemas.createChildAffiliateSchema);
    const { affiliate: affiliateData } = request;

    const masterAffiliate = await repository.getAffiliate(pg, request.session.affiliateId);

    if (!masterAffiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const existingAffiliate = await repository.findAffiliateByEmail(pg, affiliateData.email);
    if (existingAffiliate) return res.status(409).json({ error: { message: 'Affiliate with this email address is already registered' } });

    const affiliateDraft: InsertAffiliateDraft = {
      ...affiliateData,

      hash: masterAffiliate.hash,
      salt: masterAffiliate.salt,

      contactName: masterAffiliate.contactName,
      countryId: masterAffiliate.countryId,
      address: masterAffiliate.address,
      phone: masterAffiliate.phone,
      skype: masterAffiliate.skype,
      vatNumber: masterAffiliate.vatNumber,
      paymentMinAmount: masterAffiliate.paymentMinAmount,
      paymentMethod: masterAffiliate.paymentMethod,
      paymentMethodDetails: masterAffiliate.paymentMethodDetails,
      floorBrandCommission: masterAffiliate.floorBrandCommission,
      allowNegativeFee: masterAffiliate.allowNegativeFee,
      allowPayments: false,
      allowEmails: false,
      isInternal: isTestEmail(affiliateData.email),
      isClosed: false,
      userId: masterAffiliate.userId,
      masterId: masterAffiliate.id,
      tcVersion: config.tcVersion,
    };

    await repository.createAffiliate(pg, affiliateDraft);

    const response: DataResponse<CreateChildAffiliateResponse> = {
      data: {
        ok: true,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('createChildAffiliateHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getChildrenAffiliatesHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getChildrenAffiliatesHandler request', { session: req.session, params: req.params, body: req.body });

    const { session: { affiliateId } } = validate<GetChildrenAffiliatesRequest>({ session: req.session, params: req.params }, schemas.getChildrenAffiliatesSchema);

    const affiliate = await repository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const affiliates = await childrenAffiliateRepository.getChildrenAffiliates(pg, affiliateId);

    const response: DataResponse<GetChildrenAffiliatesResponse> = {
      data: {
        affiliates: affiliates.map(a => ({
          affiliateId: a.id,
          affiliateName: a.name,
          affiliateEmail: a.email,
        })),
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getChildrenAffiliatesHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliateActivitiesHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliateActivitiesHandler request', { session: req.session, params: req.params, body: req.body });

    const { session: { affiliateId }, query } = validate<GetAffiliateActivitiesRequest>({ session: req.session, query: req.query }, schemas.getAffiliateActivitiesSchema);

    const affiliate = await repository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const from = DateTime.fromFormat(query.from, 'yyyy-MM-dd');
    const to = DateTime.fromFormat(query.to, 'yyyy-MM-dd');
    const { brandId } = query;

    const activities = await activitiesRepository.getAffiliateActivities(pg, affiliateId, from, to, brandId);

    const response: DataResponse<GetAffiliateActivitiesResponse> = {
      data: {
        activities: {
          items: activities.map(activity => ({
            link: activity.link,
            linkId: activity.linkId,
            segment: activity.segment,
            brandId: activity.brandId,
            clicks: formatClicks(to, activity.clicks),
            nrc: activity.nrc,
            ndc: activity.ndc,
            deposits: activity.deposits,
            turnover: activity.turnover,
            grossRevenue: activity.grossRevenue,
            netRevenue: activity.netRevenue,
            commission: activity.commission,
            cpa: activity.cpa,
          })),
          totals: {
            clicks: formatClicks(to, _.sumBy(activities, a => a.clicks)),
            nrc: _.sumBy(activities, a => a.nrc),
            ndc: _.sumBy(activities, a => a.ndc),
            deposits: _.sumBy(activities, a => a.deposits),
            turnover: _.sumBy(activities, a => a.turnover),
            grossRevenue: _.sumBy(activities, a => a.grossRevenue),
            netRevenue: _.sumBy(activities, a => a.netRevenue),
            commission: _.sumBy(activities, a => a.commission),
            cpa: _.sumBy(activities, a => a.cpa),
          },
          total:  _.sumBy(activities, a => _.sum([a.commission, a.cpa])),
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliateActivitiesHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliateAPITokenHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliateAPITokenHandler request', { session: req.session, params: req.params, body: req.body });

    const { session: { affiliateId } } = validate<GetAffiliateAPITokenRequest>({ session: req.session }, schemas.getAffiliateAPITokenSchema);

    const affiliate = await repository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const response: DataResponse<GetAffiliateAPITokenResponse> = {
      data: {
        apiToken: affiliate.apiToken,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliateAPITokenHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const refreshAffiliateAPITokenHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('refreshAffiliateAPITokenHandler request', { session: req.session, params: req.params, body: req.body });

    const { session: { affiliateId } } = validate<RefreshAffiliateAPITokenRequest>({ session: req.session }, schemas.refreshAffiliateAPITokenSchema);

    const affiliate = await repository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const apiToken = uuid();
    await repository.updateAffiliateAPIToken(pg, affiliateId, apiToken);

    const response: DataResponse<RefreshAffiliateAPITokenResponse> = {
      data: {
        apiToken,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('refreshAffiliateAPITokenHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  getAffiliateHandler,
  updateAffiliateHandler,
  getAffiliateOverviewHandler,
  getAffiliateRevenuesHandler,
  getAffiliateDealsHandler,
  getAffiliateAdminFeesHandler,
  createAffiliateLinkHandler,
  getAffiliateLinksHandler,
  getAffiliateLinkClicksHandler,
  updateAffiliateLinkHandler,
  deleteAffiliateLinkHandler,
  getLandingsHandler,
  getAffiliatePlayersRevenueHandler,
  getAffiliatePlayerActivitiesHandler,
  getAffiliatePaymentsHandler,
  getSubAffiliatesHandler,
  createChildAffiliateHandler,
  getChildrenAffiliatesHandler,
  getAffiliateActivitiesHandler,
  getAffiliateAPITokenHandler,
  refreshAffiliateAPITokenHandler,
};
