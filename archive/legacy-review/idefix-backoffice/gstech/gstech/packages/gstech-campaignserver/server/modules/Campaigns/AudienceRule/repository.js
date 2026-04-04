// @flow
import type { AudienceRuleDraft, AudienceRule, AudienceRuleDraftUpdate } from '../../../../types/common';

const { mapMinutesFrom } = require('./utils');

const createAudienceRules = async (
  knex: Knex,
  audienceRules: AudienceRuleDraft[],
  campaignId: Id,
): Promise<Id[]> =>
  knex('audience_rules')
    .insert(
      audienceRules.map(rule => ({
        ...rule,
        values: JSON.stringify(rule.values),
        campaignId,
      })),
    )
    .returning('id')
    .then((rows) => rows.map(({ id }) => id));

const deleteAudienceRules = async (knex: Knex, audienceRulesIds: Id[]): Promise<mixed> =>
  knex('audience_rules')
    .whereIn('id', audienceRulesIds)
    .del();

const getAudienceRule = async (knex: Knex, audienceRuleId: Id): Promise<AudienceRule> =>
  knex('audience_rules')
    .where({ id: audienceRuleId })
    .first()
    .then((rule) => rule && mapMinutesFrom(rule));

const updateAudienceRule = async (
  knex: Knex,
  audienceRuleId: Id,
  { values, ...rest }: AudienceRuleDraftUpdate,
): Promise<AudienceRule> => {
  const [updatedRule] = await knex('audience_rules')
    .update({ values: JSON.stringify(values), ...rest }, ['*'])
    .where({ id: audienceRuleId });

  return updatedRule;
};

module.exports = {
  createAudienceRules,
  deleteAudienceRules,
  getAudienceRule,
  updateAudienceRule,
};
