/* @flow */

const pg = require('gstech-core/modules/pg');
const request = require('supertest');

const { campaigns, campaignGroups } = require('../../mockData');
const app = require('../../app');
const { cleanDb } = require('../../utils');

describe('CampaignGroups', () => {
  before(async () => {
    await cleanDb();
    await pg('campaign_groups').insert(campaignGroups);
    await pg('campaigns').insert({ ...campaigns[0], groupId: campaignGroups[0].id });
    await pg('campaigns').insert(campaigns.slice(1).map(c => ({ ...c, groupId: campaignGroups[1].id })));
  });

  describe('duplicateGroup', () => {
    it('can duplicate a group with 1 campaign', async () => {
      await request(app)
        .post(`/api/v1/campaign-groups/${campaignGroups[0].id}/duplicate`)
        .expect(({ body }) => {
          expect(body).to.have.property('data');
          expect(body.data).to.have.property('id');
          expect(body.data).to.have.property('firstCampaignId');
        })
        .expect(200);

      const groups = await pg('campaign_groups').where({ name: `Copy of ${campaignGroups[0].name}` });
      expect(groups.length).to.equal(1);

      const newCampaigns = await pg('campaigns').where({ groupId: groups[0].id });
      expect(newCampaigns).to.containSubset([{ name: `Copy of ${campaigns[0].name}` }]);
    });

    it('can duplicate a group with multiple campaigns', async () => {
      await request(app)
        .post(`/api/v1/campaign-groups/${campaignGroups[1].id}/duplicate`)
        .expect(200);

      const groups = await pg('campaign_groups').where({ name: `Copy of ${campaignGroups[1].name}` });
      expect(groups.length).to.equal(1);

      const newCampaigns = await pg('campaigns').where({ groupId: groups[0].id  });
      expect(newCampaigns.length).to.equal(campaigns.length - 1);
      expect(newCampaigns).to.containSubset([
        { name: `Copy of ${campaigns[1].name}` },
        { name: `Copy of ${campaigns[2].name}` },
      ]);
    });
  });

  describe('updateGroupName', () => {
    it('can update group name', async () => {
      await request(app)
        .put(`/api/v1/campaign-groups/${campaignGroups[0].id}`)
        .send({ name: 'new name' })
        .expect(({ body }) => {
          expect(body).to.deep.equal({
            data: {
              ok: true,
            },
          });
        })
        .expect(200);

      const dbGroup = await pg('campaign_groups').where({ id: campaignGroups[0].id }).first();
      expect(dbGroup).to.deep.equal({ ...campaignGroups[0], name: 'new name' });
    });
  });

  describe('archiveGroup', () => {
    it('archives all group campaigns', async () => {
      const groupId = campaignGroups[0].id;

      await request(app)
        .delete(`/api/v1/campaign-groups/${groupId}`)
        .expect(({ body }) => {
          expect(body).to.deep.equal(({ data: { ok: true }}));
        });

      const dbCampaigns = await pg('campaigns').pluck('status').where({ groupId });
      expect(dbCampaigns.length).to.equal(1);
      expect(dbCampaigns.every(s => s === 'archived')).to.equal(true);
    });
  });
});
