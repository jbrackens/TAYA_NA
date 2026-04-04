/* eslint-disable no-unused-expressions */
 
/* eslint-disable no-continue */
// @flow

import type { RegistrationReportResponse, ActivitiesReportResponse } from 'gstech-core/modules/clients/backend-payment-api';
import type { Activity } from '../types/repository/activities';
import type { Affiliate } from '../types/repository/affiliates';
import type { LinkWithDetails } from '../types/repository/links';
import type { Payment } from '../types/repository/payments';
import type { Plan, RuleOrPlan } from '../types/repository/plans';
import type { Player } from './modules/admin/affiliates/players/repository';

const { DateTime } = require('luxon');
const promiseLimit = require('promise-limit');
const { v1: uuid } = require('uuid');
const _ = require('lodash');

const logger = require('gstech-core/modules/logger');
const { getDefaultDeals } = require("./deals");
const config = require('./config');

const affiliatesRepository = require('./modules/admin/affiliates/repository');
const plansRepository = require('./modules/admin/plans/repository');
const playersRepository = require('./modules/admin/affiliates/players/repository');
const paymentsRepository = require('./modules/admin/payments/repository');
const linksRepository = require('./modules/admin/affiliates/links/repository');
const dealsRepository = require('./modules/admin/affiliates/deals/repository');
const { getApplicableAffiliateAdminFee } = require('./modules/admin/affiliates/fees/repository');
const plans = require('./modules/admin/plans/repository');
const webHook = require('./webHook')
const { groupActivitiesByBrand, calculateZeroFlooredCommission } = require('./commissionCalculator');

const limit = promiseLimit(20);

const taxRates = {
  GB: 15,
  DE: 19,
};

const defaultCommission = config.isTest ? 0 : undefined;
// TODO: In production we do not overwrite existing value in db.
// In test it's needed, otherwise test consistency is broken.
// Maybe in future we don't need to keep existing values and default commission can be always 0

const updatePlayerRegistration = async (pg: Knex, registration: RegistrationReportResponse, link: LinkWithDetails, plan: Plan, brandId: BrandId, affiliateId: Id, clickId: ?Id = null): Promise<Player> => {
  logger.debug('updatePlayerRegistration', registration);
  const item = {
    id: registration.playerId,
    affiliateId,
    planId: plan.id,
    linkId: link.id,
    clickId,
    brandId,
    countryId: registration.countryCode,
    registrationDate: registration.registrationDate,
  };

  const player = await playersRepository.upsertPlayerRegistration(pg, item);
  await webHook.handleCallback(pg, player, 'NRC');
  return player;
};

const updatePlayerActivity = async (pg: Knex, activity: {
  playerId: Id,
  activityDate: string,
  deposits: Money,
  turnover: Money,
  grossRevenue: Money,
  bonuses: Money,
  adjustments: Money,
  ...
}, ruleOrPlan: RuleOrPlan, player: Player, allowNegativeFee: boolean, year: number, month: number, day: number): Promise<Activity> => {
  logger.debug('updatePlayerActivity', activity.playerId, activity.activityDate);
  const cumulativeDeposit = await affiliatesRepository.getCumulativeDeposit(pg, activity.playerId, year, month, day);

    const feePercent = await getApplicableAffiliateAdminFee(
      pg,
      player.affiliateId,
      player.brandId,
      player.countryId,
      year,
      month,
      day,
    );
    const realFee = (activity.grossRevenue * feePercent) / 100;
    // $FlowFixMe[invalid-computed-prop]
    const taxRate = taxRates[player.countryId] || 0;

  const hasReachedDepositCpa =
    ruleOrPlan.deposit &&
    cumulativeDeposit < ruleOrPlan.deposit &&
    cumulativeDeposit + activity.deposits >= ruleOrPlan.deposit;

    const fees = allowNegativeFee ? realFee : Math.max(0, realFee);
    const tax = (activity.grossRevenue * taxRate) / 100;
    const netRevenue = Math.round(activity.grossRevenue - fees - tax - activity.bonuses - activity.adjustments);
    const commission = ruleOrPlan.nrs != null ? netRevenue * (ruleOrPlan.nrs / 100) : defaultCommission; // here we do update commission for fixed plans only
    const initialCpa = activity.deposits > 0 && cumulativeDeposit === 0 ? ruleOrPlan.cpa : 0;
    const depositCpa = ruleOrPlan.deposit && ruleOrPlan.deposit_cpa && hasReachedDepositCpa ? ruleOrPlan.deposit_cpa : 0;

    if (cumulativeDeposit === 0 && activity.deposits > 0) {
      await webHook.handleCallback(pg, player, 'NDC');
    }

    const item = {
      playerId: activity.playerId,
      activityDate: activity.activityDate,
      deposits: activity.deposits,
      turnover: activity.turnover,
      grossRevenue: activity.grossRevenue,
      bonuses: activity.bonuses,
      adjustments: activity.adjustments,
      fees,
      tax,
      netRevenue,
      commission,
      cpa: initialCpa + depositCpa,
    };

    return playersRepository.upsertPlayerActivity(pg, item);
};

const updateAffiliateCommission = async (pg: Knex, affiliateId: Id, year: number, month: number): Promise<Activity[]> => {
  const { depositingPlayers: ndc } = await playersRepository.getAffiliateDepositingPlayersCount(pg, affiliateId, year, month, true);
  const players = await playersRepository.getActivePlayers(pg, affiliateId, year, month);

  let nrs = 25;
  if (ndc >= 6) nrs = 30;
  if (ndc >= 16) nrs = 35;
  if (ndc >= 25) nrs = 40;

  logger.debug(`Affiliate: '${affiliateId}'. Active players: ${players.length}`);

  const closed = await affiliatesRepository.isMonthClosed(pg, year, month);
  if (closed) {
    throw Error(`Updating commissions for closed periods is forbidden. AffiliateId: ${affiliateId}`);
  }

  const result = await pg.transaction(tx => Promise.all(players.map(player => limit(async () => {
    const plan = await plansRepository.getRuleOrPlan(pg, player.planId, player.countryId);
    if (plan && plan.nrs === null) { // here we do update commission for ladder plans only
      return affiliatesRepository.calculateCommissions(tx, player.id, year, month, nrs);
    }
    return Promise.resolve();
  }))));

  const sortedResult = _.orderBy(_.flatten(result), 'id');
  return sortedResult;
};

const createAffiliatePayments = async (
  pg: Knex,
  affiliateId: Id,
  floorBrandCommission: boolean,
  year: number,
  month: number,
  commissions: { [BrandId]: Money },
  cpas: { [BrandId]: Money },
  subCommission: Money,
  userId: Id,
  childAffiliateId: Id,
): Promise<Payment[]> => {
  // FIXME: .toJsDate() fails with sql error.
  const transactionDate: any = DateTime.utc();

  const payments = [];

  const extraDesc = affiliateId !== childAffiliateId ? ` (child: #${childAffiliateId})` : '';

  subCommission && payments.push(await paymentsRepository.upsertAffiliatePayment(pg, {
    affiliateId,
    transactionId: uuid(),
    transactionDate,
    month,
    year,
    type: `Commission`,
    description: `Affiliate #${affiliateId}${extraDesc} commission for ${month}.${year} (sub affiliates)`,
    amount: subCommission,
  }, userId));

  if (floorBrandCommission) {
    for (const [brandId, amount] of Object.entries(commissions)) {
      amount && payments.push(await paymentsRepository.upsertAffiliatePayment(pg, {
        affiliateId,
        transactionId: uuid(),
        transactionDate,
        month,
        year,
        type: `Commission`,
        description: `Affiliate #${affiliateId}${extraDesc} commission for ${month}.${year} (brand: ${brandId})`,
        amount: Math.max(0, (amount: any)),
      }, userId));
    }
    for (const [brandId, amount] of Object.entries(cpas)) {
      amount && payments.push(await paymentsRepository.upsertAffiliatePayment(pg, {
        affiliateId,
        transactionId: uuid(),
        transactionDate,
        month,
        year,
        type: `CPA`,
        description: `Affiliate #${affiliateId}${extraDesc} CPA for ${month}.${year} (brand: ${brandId})`,
        amount: Math.max(0, (amount: any)),
      }, userId));
    }
  } else {
    const commission = calculateZeroFlooredCommission(commissions, floorBrandCommission);
    commission && payments.push(await paymentsRepository.upsertAffiliatePayment(pg, {
      affiliateId,
      transactionId: uuid(),
      transactionDate,
      month,
      year,
      type: 'Commission',
      description: `Affiliate #${affiliateId}${extraDesc} commission for ${month}.${year}`,
      amount: commission,
    }, userId));
    const cpa = _.sum(Object.values(cpas));
    cpa && payments.push(await paymentsRepository.upsertAffiliatePayment(pg, {
      affiliateId,
      transactionId: uuid(),
      transactionDate,
      month,
      year,
      type: 'CPA',
      description: `Affiliate #${affiliateId}${extraDesc} CPA for ${month}.${year}`,
      amount: cpa,
    }, userId));
  }

  return _.flatten(payments);
};

const updatePlayersCommission = async (pg: Knex, affiliate: Affiliate, player: Player, year: number, month: number): Promise<void> => {
  const activities = await playersRepository.getPlayerActivities(pg, affiliate.id, player.id, year, month);
  const ruleOrPlan = await plansRepository.getRuleOrPlan(pg, player.planId, player.countryId);

  if (!ruleOrPlan) return;

  for (const activity of activities) {
    const [y, m, d] = activity.activityDate.split('-').map(i => Number(i));
    logger.debug(`Updating playerId '${player.id}'. Activities for ${d}.${m}.${y}`);
    await updatePlayerActivity(pg, activity, ruleOrPlan, player, affiliate.allowNegativeFee, y, m, d);
  }
};

const closeAffiliateMonth = async (pg: Knex, affiliateId: Id, floorBrandCommission: boolean, year: number, month: number, userId: Id): Promise<Payment[]> => {
  const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);
  if (!affiliate) throw Error(`Affiliate not found: ${affiliateId}`);

  const { id, masterId } = affiliate;
  let targetAffiliateId = id;
  if (masterId) {
    const masterAffiliate = await affiliatesRepository.getAffiliate(pg, masterId);
    if (!masterAffiliate) throw Error(`Affiliate not found: ${masterId}`);

    targetAffiliateId = masterAffiliate.id;
  }

  const activities = await affiliatesRepository.getAffiliateActivities(pg, affiliateId, year, month);
  const commissions = groupActivitiesByBrand(activities, a => a.commission);
  const cpas = groupActivitiesByBrand(activities, a => a.cpa);

  const subAffiliates = await affiliatesRepository.getSubAffiliates(pg, affiliateId);
  const subCommissions = await Promise.all(subAffiliates.map(async a => {
    const subActivities = await affiliatesRepository.getAffiliateActivities(pg, a.id, year, month);
    const subCommissions2 = groupActivitiesByBrand(subActivities, aa => aa.commission);
    const subCommission = calculateZeroFlooredCommission(subCommissions2, a.floorBrandCommission);

    return Math.round(subCommission * (a.commissionShare / 100));
  }));

  const subCommission = _.sum(subCommissions);
  const payments = await createAffiliatePayments(pg, targetAffiliateId, floorBrandCommission, year, month, commissions, cpas, subCommission, userId, id);

  return payments;
};

const updateRegistrations = async (pg: Knex, registrations: RegistrationReportResponse[], brandId: BrandId, parseBannerTag: Function) => {
  logger.debug(`Brand '${brandId}' UpdateBrand '${registrations.length}' registrations`);
  for (const registration of registrations) {
    const tagInfo = parseBannerTag(registration.bannerTag);
    if (tagInfo === null){
      logger.debug('updateRegistrations: wrong format for registrations btag ',registration.bannerTag, brandId);
      continue
    }
    const affiliateId = Number(tagInfo.a);
    const mediaId = tagInfo.b;
    const clickId = Number(tagInfo.c) || null;

    if (!affiliateId) {
      logger.error(`Brand '${brandId}' AffiliateId is not recognized as id`, { affiliateId, tagInfo, bannerTag: registration.bannerTag });
      continue;
    }

    const link = await linksRepository.getAffiliateLinkByCode(pg, mediaId);
    if (!link) {
      logger.error(`Brand '${brandId}' Link '${mediaId}' is not found in the database`, { registration });
      continue;
    }

    const deals = await dealsRepository.getAffiliateDeals(pg, affiliateId);
    const deal = deals.find(d => d.brandId === brandId);
    const defaultDeals = await getDefaultDeals(pg);
    const defaultDeal = defaultDeals[brandId];

    const planId = link.planId || (deal && deal.planId) || (defaultDeal && defaultDeal.planId);

    if (!planId) {
      logger.error(`Brand '${brandId}' PlanId is not found neither in link nor in deal`, { link, deals });
      continue;
    }

    const plan = await plans.getPlan(pg, planId);
    if (!plan) {
      logger.error(`Brand '${brandId}' Plan '${planId}' is not found in the database`);
      continue;
    }

    // logger.debug('updatePlayerRegistration', registration, { link, plan, brandId, affiliateId, clickId });
    await updatePlayerRegistration(pg, registration, link, plan, brandId, affiliateId, clickId);
  }
};

const moveClicksToPartitions = async (pg: Knex) => {
  logger.debug(`Moving clicks to partitions has started!`);

  await pg.raw(`CALL partman.partition_data_proc('public.clicks', p_batch := 110, p_source_table := 'public.old_nonpartitioned_clicks')`);
  await pg.raw(`DROP TABLE old_nonpartitioned_clicks;`);
  await pg.raw(`ALTER SEQUENCE IF EXISTS clicks_id_seq1 RENAME TO clicks_id_seq;`);
};

const updateActivities = async (pg: Knex, activities: ActivitiesReportResponse[], date: DateTime) => {
  for (const activity of activities) {
    const player = await playersRepository.getPlayerById(pg, activity.playerId);
    if (!player) {
      logger.warn(`Brand '${activity.brandId}' Player '${activity.playerId}' is not found in the database`);
      continue;
    }

    const affiliate = await affiliatesRepository.getAffiliate(pg, player.affiliateId);
    if (!affiliate) {
      logger.error(`Brand '${activity.brandId}' Affiliate '${player.affiliateId}' is not found in the database`);
      continue;
    }

    const ruleOrPlan = await plans.getRuleOrPlan(pg, player.planId, player.countryId);
    if (!ruleOrPlan) {
      logger.error(`Brand '${activity.brandId}' Plan '${player.planId}' is not found in the database`);
      continue;
    }

    await updatePlayerActivity(pg, activity, ruleOrPlan, player, affiliate.allowNegativeFee, date.year, date.month, date.day);
  }
};

module.exports = {
  updatePlayerRegistration,
  updatePlayerActivity,
  updateAffiliateCommission,
  updatePlayersCommission,
  closeAffiliateMonth,
  updateRegistrations,
  updateActivities,
  moveClicksToPartitions
};
