/* @flow */

const request = require('supertest');
const moment = require('moment-timezone');
const _ = require('lodash');
const nock = require('nock');

const pg = require('gstech-core/modules/pg');
const client = require('gstech-core/modules/clients/campaignserver-api');
const config = require('gstech-core/modules/config');
const superClient = require('gstech-core/modules/superClient');
const ports = require('gstech-core/modules/ports');

const {
  campaignsContent,
  contentType,
  content,
  countries,
  players,
  rewardRules,
  subscriptionOptions,
} = require('../../mockData');
const { cleanDb } = require('../../utils');
const app = require('../../app');
const privateApp = require('../../app-private');
const { getCampaign } = require('./repository');
const { init } = require('../../workers');
const { smsQueue } = require('../../queues');

init();

describe('Campaigns routes', () => {
  const campaignName = '123 Campaign';
  let campaignId;
  let campaignId2;
  let noStartTimeCampaignId;

  const campaignDraft = {
    brandId: 'KK',
    creditMultiple: false,
    name: 'Campaign1',
    status: 'draft',
    startTime: moment()
      .add(1, 'day')
      .format(),
    endTime: moment()
      .add(2, 'days')
      .format(),
    audienceType: 'static',
    groupId: 1,
  };

  before(async () => {
    await cleanDb();
    await pg('campaign_groups').insert({ name: 'Campaign1', id: 1 });
    await pg('countries').insert(countries);
    await pg('subscription_options').insert(subscriptionOptions);
    await pg('players').insert(
      players.map((p) => ({ ...p, subscriptionOptionsId: subscriptionOptions[0].id })),
    );
    await pg('content_type').insert(contentType);
    await pg('content').insert(content);
  });

  describe('createCampaign', () => {
    it('can create static campaign', async () => {
      await request(app)
        .post('/api/v1/campaigns')
        .send({ ...campaignDraft, groupId: 1 })
        .expect(res => {
          campaignId = res.body.data.campaignId;
          expect(campaignId).to.be.a('number');
        })
        .expect(200);
    });

    it('can create campaign with no startTime', async () => {
      await request(app)
        .post('/api/v1/campaigns')
        .send({ ...campaignDraft, startTime: null, name: campaignName })
        .expect(res => {
          noStartTimeCampaignId = res.body.data.campaignId;
          expect(noStartTimeCampaignId).to.be.a('number');
        })
        .expect(200);
    });

    it('can create a campaign with groupId', async () => {
      await request(app)
        .post('/api/v1/campaigns')
        .send({ ...campaignDraft, name: 'Campaign2', groupId: 1 })
        .expect(({ body }) => {
          campaignId2 = body.data.campaignId;
        })
    });

    it('returns 409 if campaign of the same name already exists', async () => {
      await request(app)
        .post('/api/v1/campaigns')
        .send(campaignDraft)
        .expect(({ body }) => {
          expect(body.error.message).to.equal(`Campaign with name "${campaignDraft.name}" already exists`);
        })
        .expect(409);
    });
  });

  describe('updateCampaign', () => {
    it('can update campaign', async () => {
      await request(app)
        .put(`/api/v1/campaigns/${campaignId}`)
        .send({ audienceType: 'dynamic' })
        .expect(res => {
          expect(res.body.data).to.deep.equal({
            ...campaignDraft,
            startTime: moment(campaignDraft.startTime).toISOString(),
            endTime: moment(campaignDraft.endTime).toISOString(),
            id: campaignId,
            audienceType: 'dynamic',
            migrated: false,
            previewMode: false,
          });
        })
        .expect(200);

      const campaign: any = await getCampaign(pg, campaignId);
      expect(campaign.audienceType).to.equal('dynamic');
    });

    it('returns 409 if campaign of the same name already exists', async () => {
      await request(app)
        .put(`/api/v1/campaigns/${campaignId}`)
        .send({
          ...campaignDraft,
          name: campaignName,
        })
        .expect(({ body }) => {
          expect(body.error.message).to.equal(`Campaign with name "${campaignName}" already exists`);
        })
        .expect(409);
    });
  });

  describe('activateCampaign', () => {
    it('changes campaign status to active and returns ok if startTime is specified', async () => {
      await request(app)
        .post(`/api/v1/campaigns/${campaignId}/activate`)
        .expect(res => {
          expect(res.body.data.ok).to.equal(true);
        })
        .expect(200);

      const [campaign] = await pg('campaigns').where({ id: campaignId });
      expect(campaign.status).to.equal('active');
    });

    it('returns error if trying to activate campaign with empty rewards', async () => {
      await pg('reward_rules').insert({
        ...rewardRules[1],
        rewardId: null,
        campaignId: noStartTimeCampaignId,
      });

      await request(app)
        .post(`/api/v1/campaigns/${noStartTimeCampaignId}/activate`)
        .expect(async res => {
          expect(res.body.error.message).to.equal('One of the campaign rewards is empty!');

          // Cleanup
          await pg('reward_rules')
            .where({ id: rewardRules[1].id })
            .update({ rewardId: rewardRules[1].rewardId });
        })
        .expect(409);
    });

    it('starts the campaign if no startTime is specified', async () => {
      await request(app)
        .post(`/api/v1/campaigns/${noStartTimeCampaignId}/activate`)
        .expect(res => {
          expect(res.body, JSON.stringify(res.body.error)).to.have.property('data');
          expect(res.body.data.ok).to.equal(true);
        })
        .expect(200);

      expect((await getCampaign(pg, noStartTimeCampaignId)).status).to.equal('running');
    });
  });

  describe('getCampaign', () => {
    it('returns 404 if campaign does not exist', async () => {
      await request(app)
        .get('/api/v1/campaigns/11112222')
        .expect(res => {
          expect(res.body.error.message).to.equal('Campaign 11112222 not found');
        })
        .expect(404);
    });

    it('can get existing campaign with rules', async () => {
      await request(app)
        .get(`/api/v1/campaigns/${campaignId}`)
        .expect(res => {
          const { data } = res.body;
          expect(data.name).to.equal('Campaign1');
          expect(data.audience.rules).to.deep.have.members([]);
          expect(data).to.have.property('banner');
        })
        .expect(200);
    });

    it('can get properly grouped campaign', async () => {
      await request(app)
        .get(`/api/v1/campaigns/${campaignId2}`)
        .expect(({ body }) => {
          expect(body).to.containSubset({
            data: {
              group: {
                name: 'Campaign1',
                campaigns: [
                  { id: campaignId, name: campaignDraft.name },
                  { id: campaignId2, name: 'Campaign2' },
                ],
              },
            },
          });
        });
    });
  });

  describe('getPlayerCampaignsWithRewards', () => {
    before(() => {
      nock(config.api.rewardServer.private, { allowUnmocked: false, encodedQueryParams: true })
        .get(`/rewards/${rewardRules[1].rewardId}`)
        .reply(200, { data: { creditType: 'freeSpins' } });
    });

    it('client', async () => {
      await pg('campaigns_content').insert({ ...campaignsContent[2], campaignId: noStartTimeCampaignId });

      await superClient(privateApp, ports.campaignServer.privatePort, client)
        .call(api => api.getPlayerCampaignsWithRewards(players[0].externalId))
        .expect(200, (result) => {
          expect(result).to.be.a('array');
          expect(result.length).to.equal(1);
          expect(result[0].campaignId).to.not.equal(null);
          expect(result[0].campaignName).to.equal(campaignName);
          expect(result[0].rewards.length).to.equal(1);
          expect(result[0].rewards[0]).to.deep.equal({
            ..._.omit(rewardRules[1], 'rewardId', 'campaignId', 'trigger', 'removedAt'),
            id: rewardRules[1].rewardId,
            creditType: 'freeSpins',
          });
        });
    });
  });

  describe('getPlayerCampaigns', () => {
    it('should ', async () => {
      const [cP] = await pg('campaigns_players')
        .insert({ playerId: players[0].externalId, campaignId })
        .returning('id');
      expect(cP.id).to.be.a('number');

      await superClient(privateApp, ports.campaignServer.privatePort, client)
        .call(api => api.getPlayerCampaigns(players[0].externalId))
        .expect(200, (result) => {
          expect(result.length).to.equal(1);
          expect(result[0]).to.containSubset({
            name: campaignName,
            removedAt: null,
            emailSentAt: null,
            smsSentAt: null,
            complete: false,
          });
        });

      await pg('campaigns_players').where({ id: cP.id }).del();
    });
  });

  describe('sendCampaignSmses', () => {
    it('cannot send smses to players from campaign that is not "running"', async () => {
      await request(app)
        .post(`/api/v1/campaigns/${campaignId}/send-smses`)
        .expect(res =>
          expect(res.body.error.message).to.equal(
            'Cannot send smses to campaign that is not running',
          ))
        .expect(409);
    });

    it('can send smses to players connected with campaign', done => {
      let counter = 0;
      smsQueue.on('global:completed', () => {
        counter += 1;
        if (counter === 1) done();
      });

      (async () => {
        try {
          const campaignPlayers = await pg('campaigns_players').where({ campaignId: noStartTimeCampaignId });
          expect(campaignPlayers.length).to.equal(4);

          await request(app)
            .post(`/api/v1/campaigns/${noStartTimeCampaignId}/send-smses`)
            .expect(res => {
              expect(res.body, JSON.stringify(res.body.error)).to.have.property('data');
              expect(res.body.data.ok).to.equal(true)
            })
            .expect(202);
        } catch (e) {
          done(e);
        }
      })();
    });
  });

  describe('addContentEvent', () => {
    it('can add content event (client)', async () => {
      await pg('campaigns_content').insert({
        contentId: content[0].id,
        contentTypeId: content[0].contentTypeId,
        campaignId,
      });

      await superClient(app, ports.campaignServer.publicPort, client)
        .call(api => api.addContentEvent(campaignId, players[0].externalId, {
            text: 'click',
            contentId: content[0].id,
          }))
        .expect(200, (result) => {
          expect(result.eventId).to.be.a('number');
        });
    });
  });

  describe('addRewardRule', () => {
    it('should add instant reward to a campaign', async () => {
      await request(app)
        .post(`/api/v1/campaigns/${noStartTimeCampaignId}/reward-rules`)
        .send({
          trigger: 'instant',
          rewardId: 1,
          quantity: 1,
        })
        .expect(res => {
          expect(res.body, JSON.stringify(res.body.error)).to.have.property('data');
          expect(res.body.data.rewardRuleId).to.be.a('number');
        })
        .expect(200);
    });
  });

  describe('stopCampaign', () => {
    it('Changes the state of the campaign to "draft"', async () => {
      await request(app)
        .post(`/api/v1/campaigns/${noStartTimeCampaignId}/stop`)
        .expect(200);

      const [campaign] = await pg('campaigns').where({ id: noStartTimeCampaignId });
      expect(campaign.status).to.equal('draft');
    });

    it('can activate campaign after it has been stopped', async () => {
      await request(app)
        .post(`/api/v1/campaigns/${noStartTimeCampaignId}/activate`)
        .expect((res) => {
          expect(res.body, JSON.stringify(res.body.error)).to.have.property('data');
          expect(res.body.data.ok).to.equal(true);
        })
        .expect(200);
    })
  });

  describe('archiveCampaign', () => {
    it('can archive running campaign and remove it from original group', async () => {
      const groupId = await pg('campaigns').where({ id: campaignId }).pluck('groupId');

      await request(app)
        .delete(`/api/v1/campaigns/${campaignId}`)
        .expect(res => {
          expect(res.body.data.ok).to.equal(true);
        })
        .expect(200);

      const [campaign] = await pg('campaigns').where({ id: campaignId });
      expect(campaign.status).to.equal('archived');
      expect(campaign.groupId === groupId).to.equal(false);
    });
  });

  describe('togglePreviewMode', () => {
    it('can toggle previewMode on', async () => {
      await request(app)
        .post(`/api/v1/campaigns/${campaignId}/toggle-preview`)
        .expect(res => {
          expect(res.body.data.previewMode).to.equal(true);
        })

      const campaignPlayers = await pg('campaigns_players').where({ campaignId });
      expect(campaignPlayers.length).to.equal(1);
      expect(campaignPlayers[0].playerId).to.equal(players[3].id);
    });

    it('can toggle previewMode off', async () => {
      await request(app)
        .post(`/api/v1/campaigns/${campaignId}/toggle-preview`)
        .expect(res => {
          expect(res.body.data.previewMode).to.equal(false);
        })

      const campaignPlayers = await pg('campaigns_players').where({ campaignId });
      expect(campaignPlayers.length).to.equal(1);
    });
  });
});
