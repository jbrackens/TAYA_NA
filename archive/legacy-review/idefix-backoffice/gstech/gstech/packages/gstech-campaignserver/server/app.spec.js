/* @flow */
const request = require('supertest');

const pg = require("gstech-core/modules/pg");
const { expectedCampaignGroups } = require('./mockData');
const app = require('./app');
const { cleanDb } = require('./utils');
const mockData = require("./mockData");

describe('Routes', () => {
  it('can check status', async () => {
    await request(app)
      .get('/api/v1/status')
      .expect(res => {
        expect(res.body).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);
  });
});

describe('Campaigns', () => {
  before(async () => {
      await cleanDb();
      await pg('campaign_groups').insert(mockData.campaignGroups);
      await pg('campaigns').insert(mockData.campaigns);
  });

  after(() => cleanDb())

  it('Getting active or running campaign groups latest first.', async () => {
    await request(app)
      .get('/api/v1/campaigns/?campaignStatus=active')
      .expect(res => {
        const fetchedCampaigns = res.body.data;

        expect(fetchedCampaigns).to.deep.containSubset({
          groups: [{
            name: null,
            id: null,
            startTime: '2020-02-10T00:00:00.000Z',
            endTime: null,
            campaigns: [expectedCampaignGroups[0], expectedCampaignGroups[1], expectedCampaignGroups[2]],
          }]
        });
      })
      .expect(200);
  });
});


