/* @flow */

import type { CampaignGroup } from '../../../types/common';

const { duplicateCampaign } = require('../Campaigns/repository');

const archiveGroup = async (pg: Knex, groupId: Id): Promise<any> =>
  pg('campaigns')
    .update({ status: 'archived' })
    .whereIn('id', (qb) => qb.select('id').from('campaigns').where({ groupId }));

const createGroup = async (pg: Knex, name: string): Promise<Id> =>
  pg('campaign_groups')
    .insert({ name })
    .returning('id')
    .then(([row]) => row?.id);

const duplicateGroup = async (
  pg: Knex,
  group: CampaignGroup,
): Promise<{ id: Id, firstCampaignId: Id }> =>
  pg.transaction(async (tx) => {
    const campaigns = await tx('campaigns')
      .select('id', 'name')
      .where({ groupId: group.id })
      .orderBy('id');

    const newGroupId = await createGroup(tx, `Copy of ${group.name}`);

    const result: { id: Id, firstCampaignId: ?Id } = { id: newGroupId, firstCampaignId: undefined };
    for (const { id: campaignId } of campaigns) {
      const newCampaignId = await duplicateCampaign(tx, campaignId, newGroupId);
      if (campaignId === campaigns[0].id) {
        result.firstCampaignId = newCampaignId;
      }
    }

    return result;
  });

const getGroup = async (knex: Knex, groupId: Id): Promise<CampaignGroup> =>
  knex('campaign_groups').where({ id: groupId }).first();

const updateGroup = async (knex: Knex, id: Id, name: string): Promise<any> =>
  knex('campaign_groups').update({ name }).where({ id });

module.exports = {
  archiveGroup,
  createGroup,
  duplicateGroup,
  getGroup,
  updateGroup,
};
