// @flow
import type { CombinedReportRequest, MediaReportRequest, MediaReportResponse, CombinedReportResponse } from '../../../types/api/reports';
import type { LinkWithDetails, ClickWithStatistics } from '../../../types/repository/links';

const { DateTime } = require('luxon');
const { Router } = require('express');
const _ = require('lodash');

const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const money = require('gstech-core/modules/money');
const validate = require('gstech-core/modules/validate');

const schemas = require('./schemas');
const linksRepository = require('../admin/affiliates/links/repository');
const repository = require('./repository');

const router: express$Router<> = Router(); // eslint-disable-line

const brandMapping: BrandId[] = ['LD', 'CJ', 'KK', 'OS', 'FK', 'SN', 'VB'];

const combinedReportsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('combinedReportsHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params } = req;
    const { session: {
      affiliateId,
    }, params: {
      brandNumber,
      year,
      month,
    } } = validate<CombinedReportRequest>({ params, session }, schemas.combinedReportSchema);

    const brandId = brandMapping[brandNumber];
    const from = DateTime.local(year, month, 1);
    const to = DateTime.local(year, month, 1).plus({ month: 1 }).minus({ day: 1 });

    const links: LinkWithDetails[] = await linksRepository.getAffiliateLinks(pg, affiliateId).where('brandId', brandId);
    const response: CombinedReportResponse = await Promise.all(links.map(async (link) => {
      const activities: ClickWithStatistics[]  = await repository.getCombinedReport(pg, affiliateId, link.id, { brandId, from, to });

      const commission = _.sumBy(activities, c => c.commission);
      const total = _.sumBy(activities, c => c.cpa) + Math.max(0, commission);

      const totalFees = _.sumBy(activities, c => c.fees);
      const totalTax = _.sumBy(activities, c => c.tax);
      const totalNetRevenue = _.sumBy(activities, c => c.netRevenue);

      return {
        id: link.code,
        name: link.name,
        tags: ([]: string[]),
        report: {
          dates: activities.map(c => ({
            activityDate: c.clickDate.replace(/-/g, ''),
            clicks: c.clicks,
            registrations: c.nrc,
            firstDeposits: c.ndc,
            tags: ([]: string[]),
            deposits: money.asFloat(c.deposits),
            turnover: money.asFloat(c.turnover),
            grossRevenue: money.asFloat(c.grossRevenue),
            bonuses: money.asFloat(c.bonuses),
            adjustments: money.asFloat(c.adjustments),
            fees: money.asFloat(c.fees),
            tax: money.asFloat(c.tax),
            taxRate: '0.00',
            netRevenue: money.asFloat(c.netRevenue),
            commission: money.asFloat(c.commission),
            cpa: money.asFloat(c.cpa),
            cpaCount: c.cpaCount,
          })),
          totals: {
            clicks: _.sumBy(activities, c => c.clicks),
            registrations: _.sumBy(activities, c => c.nrc),
            firstDeposits: _.sumBy(activities, c => c.ndc),
            fees: money.asFloat(totalFees),
            tax: money.asFloat(totalTax),
            netRevenue: money.asFloat(totalNetRevenue),
            commission: money.asFloat(commission),
            commissionAfterTax: money.asFloat(commission - totalTax),
            cpa: money.asFloat(_.sumBy(activities, c => c.cpa)),
            cpaCount: _.sumBy(activities, c => c.cpaCount),
            total: money.asFloat(total),
          },
        },
      };
    }));

    return res.json(response);
  } catch (e) {
    logger.error('combinedReportsHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const combinedSegmentsReportsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('combinedSegmentsReportsHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params } = req;
    const { session: {
      affiliateId,
    }, params: {
      brandNumber,
      year,
      month,
    } } = validate<CombinedReportRequest>({ params, session }, schemas.combinedReportSchema);

    const brandId = brandMapping[brandNumber];
    const from = DateTime.local(year, month, 1);
    const to = DateTime.local(year, month, 1).plus({ month: 1 }).minus({ day: 1 });

    const links = await linksRepository.getAffiliateLinks(pg, affiliateId).where('brandId', brandId);
    const response: any = await Promise.all(links.map(async (link) => {
      const activities = await repository.getCombinedSegmentsReport(pg, affiliateId, link.id, { brandId, from, to });

      const result = activities.map(c =>
        ({
          id: link.code,
          name: link.name,
          segment: c.segment,
          report: {
            dates: ([]: string[]),
            totals: {
              clicks: c.clicks,
              registrations: c.nrc,
              firstDeposits: c.ndc,
              fees: money.asFloat(c.fees),
              tax: money.asFloat(c.tax),
              netRevenue: money.asFloat(c.netRevenue),
              commission: money.asFloat(c.commission),
              commissionAfterTax: money.asFloat(c.commission - c.tax),
              cpa: money.asFloat(c.cpa),
              cpaCount: c.cpaCount,
              total: money.asFloat(c.cpa + c.commission),
            },
          },
        })
      );

      return result;
    }));

    return res.json(response.flat());
  } catch (e) {
    logger.error('combinedSegmentsReportsHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const mediaReportsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('mediaReportsHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params } = req;
    const { session: {
      affiliateId,
    }, params: {
      brandNumber,
      code,
      year,
      month,
    } } = validate<MediaReportRequest>({ params, session }, schemas.mediaReportSchema);

    const brandId = brandMapping[brandNumber];
    const from = DateTime.local(year, month, 1);
    const to = DateTime.local(year, month, 1).plus({ month: 1 }).minus({ day: 1 });

    const link = await linksRepository.getAffiliateLinkByCode(pg, code);

    if (!link) {
      return res.status(404).json({ error: { message: `link ${code} not found` } });
    }

    const activities = await repository.getCombinedReport(pg, affiliateId, link.id, { brandId, from, to });

    const commission = _.sumBy(activities, c => c.commission);
    const total = _.sumBy(activities, c => c.cpa) + Math.max(0, commission);

    const totalFees = _.sumBy(activities, c => c.fees);
    const totalTax = _.sumBy(activities, c => c.tax);
    const totalNetRevenue = _.sumBy(activities, c => c.netRevenue);

    const response: MediaReportResponse = {
      dates: activities.map((c) => ({
        activityDate: c.clickDate.replace(/-/g, ''),
        clicks: c.clicks,
        registrations: c.nrc,
        firstDeposits: c.ndc,
        tags: [],
        deposits: money.asFloat(c.deposits),
        turnover: money.asFloat(c.turnover),
        grossRevenue: money.asFloat(c.grossRevenue),
        bonuses: money.asFloat(c.bonuses),
        adjustments: money.asFloat(c.adjustments),
        fees: money.asFloat(c.fees),
        tax: money.asFloat(c.tax),
        taxRate: '0.00',
        netRevenue: money.asFloat(c.netRevenue),
        commission: money.asFloat(c.commission),
        cpa: money.asFloat(c.cpa),
        cpaCount: c.cpaCount,
      })),
      totals: {
        clicks: _.sumBy(activities, (c) => c.clicks),
        registrations: _.sumBy(activities, (c) => c.nrc),
        firstDeposits: _.sumBy(activities, (c) => c.ndc),
        fees: money.asFloat(totalFees),
        tax: money.asFloat(totalTax),
        netRevenue: money.asFloat(totalNetRevenue),
        commission: money.asFloat(commission),
        commissionAfterTax: money.asFloat(commission - totalTax),
        cpa: money.asFloat(_.sumBy(activities, (c) => c.cpa)),
        cpaCount: _.sumBy(activities, (c) => c.cpaCount),
        total: money.asFloat(total),
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('mediaReportsHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  combinedReportsHandler,
  combinedSegmentsReportsHandler,
  mediaReportsHandler,
};
