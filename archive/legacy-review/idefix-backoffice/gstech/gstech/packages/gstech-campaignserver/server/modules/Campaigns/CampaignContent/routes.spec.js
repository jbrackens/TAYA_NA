/* @flow */

const request = require('supertest');

const client = require('gstech-core/modules/clients/campaignserver-api');
const superClient = require('gstech-core/modules/superClient');
const ports = require('gstech-core/modules/ports');
const pg = require('gstech-core/modules/pg');

const app = require('../../../app');
const privateApp = require('../../../app-private');
const { campaigns, countries, content, contentType, players } = require('../../../mockData');
const { cleanDb } = require('../../../utils');
const { startCampaign } = require('../repository');
const { createEvent } = require('../../Events/repository');

describe('CampaignContent routes', () => {
  const campaignId = campaigns[0].id;
  let emailId;
  let smsId;
  let notificationId;

  before(async () => {
    await cleanDb();
    await pg('campaigns').insert({ ...campaigns[0], startTime: null });
    await pg('content_type').insert(contentType);
    await pg('content').insert(content);
  });

  describe('addCampaignContent', () => {
    it('can add email campaignContent', async () => {
      await request(app)
        .post(`/api/v1/campaigns/${campaignId}/content`)
        .send({ contentId: content[0].id, sendingTime: '14:00:00+02' })
        .expect(({ body }) => {
          expect(body.data.campaignContentId).to.be.a('number');
          emailId = body.data.campaignContentId;
        })
        .expect(200);
    });

    it('can add sms campaignContent', async () => {
      await request(app)
        .post(`/api/v1/campaigns/${campaignId}/content`)
        .send({ contentId: content[2].id })
        .expect(({ body }) => {
          expect(body.data.campaignContentId).to.be.a('number');
          smsId = body.data.campaignContentId;
        })
        .expect(200);
    });

    it('can add notification campaignContent', async () => {
      await request(app)
        .post(`/api/v1/campaigns/${campaignId}/content`)
        .send({ contentId: content[4].id })
        .expect(({ body }) => {
          expect(body.data.campaignContentId).to.be.a('number');
          notificationId = body.data.campaignContentId;
        });
    });
  });

  describe('updateCampaignContent', () => {
    it('can update email campaignContent', async () => {
      await request(app)
        .put(`/api/v1/campaigns/${campaignId}/content/${emailId}`)
        .send({ contentId: content[1].id })
        .expect((res) => {
          expect(res.body.data.ok).to.equal(true);
        })
        .expect(200);
    });

    it('can update sms campaignContent', async () => {
      await request(app)
        .put(`/api/v1/campaigns/${campaignId}/content/${smsId}`)
        .send({ contentId: content[3].id })
        .expect((res) => {
          expect(res.body.data.ok).to.equal(true);
        })
        .expect(200);
    });

    it('can update notification campaignContent', async () => {
      await request(app)
        .put(`/api/v1/campaigns/${campaignId}/content/${notificationId}`)
        .send({ contentId: content[5].id })
        .expect((res) => {
          expect(res.body.data.ok).to.equal(true);
        })
        .expect(200);
    });
  });

  describe('getPlayerNotifications', () => {
    before(async () => {
      await pg('countries').insert(countries);
      await pg('players').insert(players);
      await startCampaign(pg, campaignId);
      await createEvent(pg, {
        text: 'click',
        campaignId,
        contentId: content[5].id,
        externalPlayerId: players[0].externalId,
      });
    });

    it('returns player notifications with events', async () => {
      await superClient(privateApp, ports.campaignServer.privatePort, client)
        .call((api) => api.getPlayerNotifications(players[0].externalId))
        .expect(200, (response) => {
          expect(response.length).to.equal(1);
          expect(response[0].campaignId).to.equal(campaignId);
          expect(response[0].contentId).to.equal(content[5].id);
          expect(response[0].content).to.deep.equal(JSON.parse(content[5].content));
          expect(response[0].events.length).to.equal(1);
          expect(response[0].events[0].text).to.equal('click');
        });
    });
  });

  describe('deleteCampaignContent', () => {
    it('can delete email campaignContent', async () => {
      await request(app)
        .delete(`/api/v1/campaigns/${campaignId}/content/${emailId}`)
        .expect((res) => {
          expect(res.body.data.ok).to.equal(true);
        })
        .expect(200);
    });

    it('can delete sms campaignContent', async () => {
      await request(app)
        .delete(`/api/v1/campaigns/${campaignId}/content/${emailId}`)
        .expect((res) => {
          expect(res.body.data.ok).to.equal(true);
        })
        .expect(200);
    });

    it('can delete notification campaignContent', async () => {
      await request(app)
        .delete(`/api/v1/campaigns/${campaignId}/content/${notificationId}`)
        .expect((res) => {
          expect(res.body.data.ok).to.equal(true);
        })
        .expect(200);
    });
  });
});
