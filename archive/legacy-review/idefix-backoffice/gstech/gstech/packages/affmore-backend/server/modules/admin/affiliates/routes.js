// @flow
import type { GetAffiliatesOverviewAdminRequest, GetAffiliateAdminRequest, UpdateAffiliateAdminRequest, GetAffiliateOverviewAdminRequest, GetAffiliatesResponse, GetAffiliateAdminResponse, UpdateAffiliateAdminResponse } from '../../../../types/api/affiliates-admin';
import type { GetAffiliateOverviewResponse, GetAffiliatesOverviewResponse } from '../../../../types/api/affiliates';
import type { GetAffiliatePlayersRevenuesAdminRequest, GetAffiliatePlayersRevenuesResponse } from '../../../../types/api/players';

const { DateTime } = require('luxon');
const _ = require('lodash');

const validate = require('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const { affmoreBrands } = require('../../../../types/constants');

const schemas = require('./schemas');
const logsRepository = require('./logs/repository');
const repository = require('./repository');
const paymentsRepository = require('../payments/repository');
const dealsRepository = require('./deals/repository');
const playersRepository = require('./players/repository');
const queue = require('../../../queue');
const { sumBrandCommissions, calculateZeroFlooredCommission } = require('../../../commissionCalculator');
const { generateDifferenceNote } = require('../../../noteGenerator');

const getAffiliatesHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliatesHandler request', { session: req.session, params: req.params, body: req.body });

    const affiliates = await repository.getAffiliates(pg);

    const response: DataResponse<GetAffiliatesResponse> = {
      data: {
        affiliates: affiliates.map(affiliate => ({
          affiliateId: affiliate.id,
          affiliateName: affiliate.name,
          affiliateEmail: affiliate.email,
        })),
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliatesHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliatesOverviewHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliatesOverviewHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params, query } = req;
    const request = validate<GetAffiliatesOverviewAdminRequest>({ session, params, query }, schemas.getAffiliatesOverviewSchema);

    const { year, month } = request.params;
    const { brandId, includeInternals } = request.query;
    const affiliates = await repository.getAffiliatesOverview(pg, year, month, { brandId, excludeInternals: !includeInternals });

    const affiliatesWithCommission = affiliates
      .map(({ id, commission, commissions, floorBrandCommission, ...affiliate }) => ({
        affiliateId: id,
        ...affiliate,
        commission:
          brandId && floorBrandCommission === false
            ? commission
            : calculateZeroFlooredCommission(commissions, floorBrandCommission)
      }))
      .filter( // FIXME: dirty way to sort our zeros
        ({
          activePlayers,
          registeredPlayers,
          depositingPlayers,
          newRegisteredPlayers,
          newDepositingPlayers,
          netRevenue,
          deposits,
          commission,
          cpa,
          balance,
        }) =>
          [
            activePlayers,
            registeredPlayers,
            depositingPlayers,
            newRegisteredPlayers,
            newDepositingPlayers,
            netRevenue,
            deposits,
            commission,
            cpa,
            balance,
          ].some((e) => e !== 0),
      );

    const commission =  _.sumBy(affiliatesWithCommission, r => r.commission);

    const response: DataResponse<GetAffiliatesOverviewResponse> = {
      data: {
        affiliates: affiliatesWithCommission,
        totals: {
          activePlayers: _.sumBy(affiliatesWithCommission, r => r.activePlayers),
          registeredPlayers: _.sumBy(affiliatesWithCommission, r => r.registeredPlayers),
          depositingPlayers: _.sumBy(affiliatesWithCommission, r => r.depositingPlayers),
          newRegisteredPlayers: _.sumBy(affiliatesWithCommission, r => r.newRegisteredPlayers),
          newDepositingPlayers: _.sumBy(affiliatesWithCommission, r => r.newDepositingPlayers),
          netRevenue: _.sumBy(affiliatesWithCommission, r => r.netRevenue),
          deposits: _.sumBy(affiliatesWithCommission, r => r.deposits),
          commission,
          cpa: _.sumBy(affiliatesWithCommission, r => r.cpa),
          balance: _.sumBy(affiliatesWithCommission, r => r.balance),
        },
        total: _.sumBy(affiliatesWithCommission, r => r.cpa) + commission,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliatesOverviewHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliateHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliateHandler request', { session: req.session, params: req.params, body: req.body });

    const request = validate<GetAffiliateAdminRequest>({ params: req.params }, schemas.getAffiliateSchema);

    const affiliate = await repository.getAffiliate(pg, request.params.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const response: DataResponse<GetAffiliateAdminResponse> = {
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

        paymentMinAmount: affiliate.paymentMinAmount,
        paymentMethod: affiliate.paymentMethod,
        paymentMethodDetails: affiliate.paymentMethodDetails,
        accountBalance: affiliate.accountBalance,

        floorBrandCommission: affiliate.floorBrandCommission,
        allowNegativeFee: affiliate.allowNegativeFee,
        allowPayments: affiliate.allowPayments,
        isInternal: affiliate.isInternal,
        isClosed: affiliate.isClosed,
        userId: affiliate.userId,
        masterId: affiliate.masterId,

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

    const { session, params, body } = req;
    const request = validate<UpdateAffiliateAdminRequest>({ session, params, affiliate: body }, schemas.updateAffiliateSchema);

    const affiliate = await repository.getAffiliate(pg, request.params.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const updatedAffiliate = await pg.transaction(async tx => {
      const aff = await repository.updateAffiliate(tx, request.params.affiliateId, request.affiliate);

      if (aff.isClosed) {
        await Promise.all(affmoreBrands.map(({ id: brandId }) =>
          dealsRepository.deleteDeal(tx, affiliate.id, brandId)
        ));

        // TODO: need to figure what deal must be set to affiliate players when it is closed
        const zeroDeal = await dealsRepository.findDeal(tx, 0, 0);

        if (zeroDeal) {
          await playersRepository.updateAffiliatePlayersPlan(tx, request.params.affiliateId, zeroDeal.planId);
        } else {
          logger.warn('updatedAffiliate error', "Missing zero deal when updating closed affiliate.");
        }
      }

      const note = await generateDifferenceNote(request.affiliate, affiliate, aff);
      await logsRepository.createAffiliateLog(tx, { note }, request.params.affiliateId, request.session.user.id);

      return aff;
    });

    const accountBalance = await paymentsRepository.getAffiliateBalance(pg, updatedAffiliate.id);

    const response: DataResponse<UpdateAffiliateAdminResponse> = {
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

        floorBrandCommission: updatedAffiliate.floorBrandCommission,
        allowNegativeFee: updatedAffiliate.allowNegativeFee,
        allowPayments: updatedAffiliate.allowPayments,
        isInternal: updatedAffiliate.isInternal,
        isClosed: updatedAffiliate.isClosed,
        userId: updatedAffiliate.userId,
        masterId: updatedAffiliate.masterId,

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

    const { params: {
      affiliateId,
      year,
      month,
    } } = validate<GetAffiliateOverviewAdminRequest>({ params: req.params }, schemas.getAffiliateOverviewSchema);

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

    const { params: {
      affiliateId,
      year,
      month,
    }, query: { brandId } } = validate<GetAffiliatePlayersRevenuesAdminRequest>({ params: req.params, query: req.query }, schemas.getAffiliatePlayersRevenuesSchema);

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

const canCloseMonthHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('canCloseMonthHandler request', { session: req.session, params: req.params, body: req.body });

    // TODO: request validation needed!
    const today = DateTime.local();
    const { year, month } = DateTime.utc(today.year, today.month, 1).plus({ month: -1 });

    const closed = await repository.isMonthClosed(pg, year, month);
    const isAdmin = req.session.user.roles.includes('admin');

    const response: DataResponse<OkResult> = {
      data: { ok: isAdmin && !closed },
    };

    return res.json(response);
  } catch (e) {
    logger.error('canCloseMonthHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const closeMonthHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('closeMonthHandler request', { session: req.session, params: req.params, body: req.body });

    // TODO: request validation needed!
    const { user } = req.session;

    const today = DateTime.utc();
    const { year, month } = DateTime.utc(today.year, today.month, 1).plus({ month: -1 });

    const affiliates = await repository.getActiveAffiliates(pg, year, month);
    affiliates.map(({ id: affiliateId, floorBrandCommission }) => queue.closeMonthQueue.add({ affiliateId, floorBrandCommission, year, month, userId: user.id }));

    await pg.transaction(async tx => {
      const closed = await repository.isMonthClosed(tx, year, month);
      if (!closed) await repository.closeMonth(tx, year, month, user.id);
    });

    const response: DataResponse<OkResult> = {
      data: { ok: true },
    };

    return res.json(response);
  } catch (e) {
    logger.error('closeMonthHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  getAffiliatesHandler,
  getAffiliatesOverviewHandler,
  getAffiliateHandler,
  getAffiliateOverviewHandler,
  getAffiliateRevenuesHandler,
  updateAffiliateHandler,
  canCloseMonthHandler,
  closeMonthHandler,
};
