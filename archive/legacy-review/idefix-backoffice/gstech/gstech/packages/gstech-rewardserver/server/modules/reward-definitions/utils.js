/* @flow */
const _ = require('lodash');
const { groupDefinitions } = require('./groupDefinitions');

const addGroupDefinitionCheck = (qb: Knex$QueryBuilder<any>, group?: string, brandId: BrandId): Knex$QueryBuilder<any> => {
  const groupDefinition =
    group && brandId && (groupDefinitions[brandId] || []).find(({ groupId }) => groupId === group);

  if (groupDefinition == null && group != null) {
    throw new Error(`Unknown reward group ${group}. Available: ${(groupDefinitions[brandId] || []).map(({ groupId }) => groupId).join()}`);
  }
  return groupDefinition ? qb.whereIn('rewardType', groupDefinition.rewardTypes) : qb;
};

const getRewardTypeGroup = (brandId: BrandId, rewardType: string): ?string => {
  const group = groupDefinitions[brandId].find(x => _.includes(x.rewardTypes, rewardType));
  if (group) {
    return group.groupId;
  }
  return null;
};
module.exports = {
  addGroupDefinitionCheck,
  getRewardTypeGroup,
};
