// @flow
import type { GetAffiliatePlayersRevenuesAdminRequest, GetAffiliatePlayerActivitiesAdminRequest, UpdateAffiliatePlayerRequest, GetAffiliatePlayersRevenuesResponse, GetAffiliatePlayerActivitiesResponse, UpdateAffiliatePlayerResponse } from '../../../../../types/api/players';

const _ = require('lodash');
const { DateTime } = require('luxon');

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');

const logsRepository = require('../logs/repository');
const affiliatesRepository = require('../repository');
const repository = require('./repository');
const schemas = require('./schemas');
const { groupActivitiesByBrand, sumBrandCommissions, calculateZeroFlooredCommission } = require('../../../../commissionCalculator');
const { generateDifferenceNote } = require('../../../../noteGenerator');
const queue = require('../../../../queue');

const getAffiliatePlayersRevenueHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliatePlayersRevenueHandler request', { session: req.session, params: req.params, body: req.body });

    const { params: {
      affiliateId,
      year,
      month,
    }, query: { brandId } } = validate<GetAffiliatePlayersRevenuesAdminRequest>({ params: req.params, query: req.query }, schemas.getAffiliatePlayersRevenuesSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const revenues = await repository.getAffiliatePlayers(pg, affiliateId, year, month, brandId);

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

    const { params: {
      affiliateId,
      playerId,
      year,
      month,
    } } = validate<GetAffiliatePlayerActivitiesAdminRequest>({ params: req.params }, schemas.getAffiliatePlayerActivitiesSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const player = await repository.getPlayer(pg, affiliateId, playerId);

    if (!player) {
      return res.status(404).json({
        error: { message: 'Player not found' },
      });
    }

    const activities = await repository.getPlayerActivities(pg, affiliateId, playerId, year, month);

    const commissions = groupActivitiesByBrand(activities, a => a.commission);
    const commission = year && month ? calculateZeroFlooredCommission(commissions, affiliate.floorBrandCommission) : _.sumBy(activities, a => a.commission);

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

const updateAffiliatePlayerHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('updateAffiliatePlayerHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params, body } = req;
    const request = validate<UpdateAffiliatePlayerRequest>({ session, params, player: body }, schemas.updateAffiliatePlayerSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, request.params.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const player = await repository.getPlayer(pg, affiliate.id, request.params.playerId);

    if (!player) {
      return res.status(404).json({
        error: { message: 'Player not found' },
      });
    }

    await pg.transaction(async tx => {
      const updatedPlayer = await repository.updatePlayer(tx, request.params.playerId, request.player);

      if (updatedPlayer && player.planId !== updatedPlayer.planId) {
        const today = DateTime.local();
        queue.updatePlayersQueue.add({ affiliate, player: updatedPlayer, year: today.year, month: today.month });
      }

      const note = await generateDifferenceNote(request.player, player, updatedPlayer);
      await logsRepository.createAffiliateLog(tx, { note }, request.params.affiliateId, request.session.user.id);

      // create log for target affiliate too when changing player's affiliate.
      if (request.player.affiliateId && request.params.affiliateId !== request.player.affiliateId) {
        await logsRepository.createAffiliateLog(tx, { note }, request.player.affiliateId, request.session.user.id);
      }
    });

    const response: DataResponse<UpdateAffiliatePlayerResponse> = {
      data: {
        ok: true,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('updateAffiliatePlayerHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  getAffiliatePlayersRevenueHandler,
  getAffiliatePlayerActivitiesHandler,
  updateAffiliatePlayerHandler,
};
