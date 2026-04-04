// @flow
import type { GetAffiliateActivitiesAdminRequest, GetAffiliateActivitiesResponse } from '../../../../../types/api/activities';

const _ = require('lodash');
const { DateTime } = require('luxon');

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');

const affiliatesRepository = require('../repository');
const repository = require('./repository');
const schemas = require('./schemas');

const getAffiliateActivitiesHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliateActivitiesHandler request', { session: req.session, params: req.params, body: req.body });

    const {
      params: { affiliateId },
      query,
    } = validate<GetAffiliateActivitiesAdminRequest>(
      { params: req.params, query: req.query },
      schemas.getAffiliateActivitiesSchema,
    );

    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const from = DateTime.fromFormat(query.from, 'yyyy-MM-dd');
    const to = DateTime.fromFormat(query.to, 'yyyy-MM-dd');
    const { brandId } = query;

    const activities = await repository.getAffiliateActivities(pg, affiliateId, from, to, brandId);

    const response: DataResponse<GetAffiliateActivitiesResponse> = {
      data: {
        activities: {
          items: activities.map(activity => ({
            link: activity.link,
            linkId: activity.linkId,
            segment: activity.segment,
            brandId: activity.brandId,
            clicks: activity.clicks,
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
            clicks: _.sumBy(activities, a => a.clicks),
            nrc: _.sumBy(activities, a => a.nrc),
            ndc: _.sumBy(activities, a => a.ndc),
            deposits: _.sumBy(activities, a => a.deposits),
            turnover: _.sumBy(activities, a => a.turnover),
            grossRevenue: _.sumBy(activities, a => a.grossRevenue),
            netRevenue: _.sumBy(activities, a => a.netRevenue),
            commission: _.sumBy(activities, a => a.commission),
            cpa: _.sumBy(activities, a => a.cpa),
          },
          total: _.sumBy(activities, a => _.sum([a.commission, a.cpa])),
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliateActivitiesHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  getAffiliateActivitiesHandler,
};
