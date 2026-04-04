/* @flow */

const pg = require('gstech-core/modules/pg');

const { cleanDb } = require('../../../utils');
const { campaigns, audienceRules } = require('../../../mockData');
const repository = require('./repository');

describe('AudienceRule repository', () => {
  const { id, ...audienceRulesDraft } = audienceRules[0];
  let audienceRuleId;

  before(async () => {
    await cleanDb();
    await pg('campaigns').insert(campaigns[0]);
  });

  describe('createAudienceRules', () => {
    it('can create audience rules', async () => {
      const result = await repository.createAudienceRules(pg, [audienceRulesDraft], 1);

      expect(result.length).to.equal(1);
      expect(result[0]).to.be.a('number');
      [audienceRuleId] = result;
    });
  });

  describe('getAudienceRule', () => {
    it('can get audience rule', async () => {
      const result = await repository.getAudienceRule(pg, audienceRuleId);

      expect(result).to.deep.equal({
        not: false,
        id: audienceRuleId,
        campaignId: campaigns[0].id,
        ...audienceRulesDraft,
      });
    });
  });

  describe('updateAudienceRule', () => {
    it('can update audience rule', async () => {
      const result = await repository.updateAudienceRule(pg, audienceRuleId, {
        ...audienceRulesDraft,
        operator: 'in',
        values: [1, 2, 3],
      });

      expect(result.values).to.have.members([1, 2, 3]);
      expect(result.operator).to.equal('in');
    });
  });

  describe('deleteAudienceRules', () => {
    it('can delete audience rule', async () => {
      const result = await repository.deleteAudienceRules(pg, [audienceRuleId]);

      expect(result).to.equal(1);
    });
  });
});
