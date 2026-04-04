 
/* @flow */

import type { BannerTag } from '../types/common';

const { DateTime } = require('luxon');

const client = require('gstech-core/modules/clients/backend-payment-api');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const { brands } = require('gstech-core/modules/constants');

const operations = require('../server/operations');
const affiliatesRepository = require('../server/modules/admin/affiliates/repository');

const parseBannerTag = (tag: string) => {
  const crumbs = tag.split('_').map(x => x.trim());

  const tagInfo: BannerTag = {
    a: crumbs[0],
    b: crumbs[1],
    c: crumbs[2],
  };

  return tagInfo;
};

const updateAdminFees = async () => {
  logger.info('+++ updateAdminFees: started.');
  await pg.transaction(async (tx) => {
    const updatedRules = [];
    const draftFeeRules = await tx('admin_fee_rules').select('*').whereNot({ draftId: null });
    for (const { draftId, country, percent, updatedAt, removedAt } of draftFeeRules) {
      const updatedRule = await tx('admin_fee_rules')
        .update({ country, percent, updatedAt, removedAt })
        .where({ id: draftId })
        .returning('*');
      updatedRules.push(updatedRule);
    }
    logger.debug('+++++ updateAdminFees', { updatedRules });

    const updatedFees = [];
    const draftFees = await tx('admin_fees').select('*').whereNot({ draftId: null });
    for (const { draftId, name, percent, active, updatedAt, removedAt } of draftFees) {
      const updatedFee = await tx('admin_fees')
        .update({ name, percent, active, updatedAt, removedAt })
        .where({ id: draftId })
        .returning('*');
      updatedFees.push(updatedFee);
    }
    logger.debug('+++++ updateAdminFees', { updatedFees });

    const applyDraftDeletes = await tx('admin_fee_affiliates')
      .select('*')
      .whereNot({ draftId: null, removedAt: null });
    for (const { id, draftId, removedAt } of applyDraftDeletes) {
      await tx('admin_fee_affiliates').update({ removedAt }).where({ id: draftId });
      await tx('admin_fee_affiliates').where({ id }).del();
    }
  });
  logger.info('+++ updateAdminFees: completed.');
};

const updateBrand = async (brandId: BrandId, date: DateTime) => {
  logger.debug('updateBrand', brandId);

  const [registrations, activities] = await Promise.all([
    client.affiliateRegistrationsReport(brandId, { date: date.toJSDate() }),
    client.affiliateActivitiesReport(brandId, { date: date.toJSDate() }),
  ]);

  await pg.transaction(async tx => {
    await operations.updateRegistrations(tx, registrations, brandId, parseBannerTag);
    await operations.updateActivities(tx, activities, date);
  });
};

const updateData = async (date: DateTime = DateTime.local()) => {
  logger.info('updateData: started...');
  for (const brand of brands) {
    try {
      await updateBrand(brand.id, date);
    } catch (e) {
      logger.error(`updateData > updateBrand: failed for brand '${brand.id}'`, e);
    }
  }

  const affiliates = await affiliatesRepository.getActiveAffiliates(pg, date.year, date.month);
  logger.debug('updateData affiliates', affiliates.length);
  for (const affiliate of affiliates) {
    await pg.transaction(async (tx) => {
      logger.debug('updateData affiliate', affiliate.id);
      try {
        await operations.updateAffiliateCommission(tx, affiliate.id, date.year, date.month);
      } catch (e) {
        logger.error(`updateData > updateAffiliateCommission: failed for affiliateId '${affiliate.id}'`, e);
      }
    });
  }
  logger.info('updateData: completed.');

  if (!date.hasSame(DateTime.local(), 'month')) await updateAdminFees();
}

module.exports = {
  updateData,
  updateAdminFees,
}
