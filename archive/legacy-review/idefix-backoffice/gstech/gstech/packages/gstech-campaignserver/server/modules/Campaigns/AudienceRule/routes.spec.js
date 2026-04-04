/* @flow */

const request = require('supertest');

const pg = require('gstech-core/modules/pg');

const app = require('../../../app');
const { campaigns, content, contentType } = require('../../../mockData');
const { cleanDb } = require('../../../utils');

describe('AudienceRule routes', () => {
  const [campaign] = campaigns;
  let ruleId;

  before(async () => {
    await cleanDb();
    await pg('campaigns').insert(campaign);
    await pg('content_type').insert(contentType);
    await pg('content').insert(content);
  });

  describe('addCsvAudienceRule', () => {
    it('can add csv aduiecne rule', async () => {
      await request(app)
        .post(`/api/v1/campaigns/${campaign.id}/audience-rules/csv`)
        .attach(
          'file',
          Buffer.from('p@gmail.com\na@gmail.com'),
          { filename: 'example.csv', contentType: 'text/csv' },
        )
        .expect(res => {
          expect(res.body, JSON.stringify(res.body.error)).to.have.property('data');
          expect(res.body.data.ruleId).to.be.a('number');
          ruleId = res.body.data.ruleId;
        })
        .expect(200);
    });
  });

  describe('addAudienceRule', () => {
    it('can add csv aduiecne rule', async () => {
      await request(app)
        .post(`/api/v1/campaigns/${campaign.id}/audience-rules`)
        .send({ name: 'depositAmount', operator: '>', values: 250 })
        .expect(res => {
          expect(res.body, JSON.stringify(res.body.error)).to.have.property('data');
          expect(res.body.data.audienceRuleId).to.be.a('number');
        })
        .expect(200);
    });
  });

  describe('updateAudienceRule', () => {
    it('can update csv audience rule', async () => {
      await request(app)
        .put(`/api/v1/campaigns/${campaign.id}/audience-rules/${ruleId}`)
        .send({ name: 'x', operator: 'csv', values: [''], not: true })
        .expect(res => {
          expect(res.body).to.deep.equal({ data: { ok: true } });
        })
        .expect(200);

      const rule = await pg('audience_rules').where({ id: ruleId }).first();
      expect(rule.not).to.equal(true);
      expect(rule.name).to.equal('example.csv');
    });
  });
});
