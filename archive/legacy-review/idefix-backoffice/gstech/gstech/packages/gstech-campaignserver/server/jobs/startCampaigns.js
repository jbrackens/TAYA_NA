/* @flow */

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const { addCampaignTimeAndStatusCheck, asyncForEach } = require('../utils');
const { startCampaign } = require('../modules/Campaigns/repository');

const filterAsync = async <T>(arr: T[], func: (el: T) => Promise<boolean>): Promise<T[]> => {
  const results = await asyncForEach(arr, func);

  return arr.filter((_, index) => results[index]);
}

const startCampaigns = async (recurringCampaigns?: Id[]): Promise<number> => {
  logger.info('startCampaigns: starting...');

  const campaigns = await pg('campaigns')
    .leftJoin('audience_rules', 'audience_rules.campaignId', 'campaigns.id')
    .select(
      'campaigns.id',
      pg.raw(
        'coalesce(json_agg(audience_rules) filter (where audience_rules.id is not null), \'{}\') as "audienceRules"',
      ),
    )
    .where({ migrated: false })
    .modify((qb) => addCampaignTimeAndStatusCheck(qb, { status: 'active' }))
    .groupBy('campaigns.id');

  const dependencyCampaigns: Id[] = [];
  // Check if dependencies are running
  const campaignsToProcess = await filterAsync(campaigns, async ({ id, audienceRules }) => {
    if (!audienceRules.length) return true;
    const cIds = [];
    audienceRules.forEach(({ operator, values }) => {
      if (operator === 'otherCampaignReward') {
        cIds.push(values.campaignId);
      } else if (operator === 'otherCampaignsMember') {
        cIds.push(...values.campaignIds);
      }
    });

    const { count } = await pg('campaigns')
      .first(pg.raw('cast(count(*) as integer) as count'))
      .whereIn('id', cIds)
      .where({ status: 'running' });
    if (count !== cIds.length) {
      logger.info(`Dependencies does not allow to start campaign ${id}`);
      dependencyCampaigns.push(...cIds)
      return false;
    }
    return true;
  });

  logger.info(
    `Found ${campaignsToProcess.length} campaigns to process: ${campaignsToProcess.map(({ id }) => id).join(', ')}`,
  );

  let counter = 0;
  await asyncForEach(campaignsToProcess, ({ id }) =>
    startCampaign(pg, id)
      .then(() => {
        counter += 1;
      })
      .catch((e) => {
        logger.error(`startCampaign id ${id} failed`, e);
        return null;
      }),
  );

  logger.info('startCampaigns: completed.', counter);

  if (recurringCampaigns && JSON.stringify(dependencyCampaigns.sort()) === JSON.stringify(recurringCampaigns.sort())) {
    logger.warn(`startCampaigns: detected potential cyclic dependency for campaigns: ${dependencyCampaigns.join(', ')}`);
    return 0;
  }
  if (dependencyCampaigns.length) {
    logger.info('startCampaigns: repeating process due to dependencies', JSON.stringify(dependencyCampaigns, null, 2));
    return counter + await startCampaigns(dependencyCampaigns);
  }
  return counter;
};

module.exports = startCampaigns;
