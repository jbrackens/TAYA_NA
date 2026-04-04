// @flow
import type { CampaignsList } from '../../../types/repository';

const _ = require('lodash');
const moment = require('moment-timezone');
const proxyquire = require('proxyquire');

const pg = require('gstech-core/modules/pg');
const { hstoreFromArray } = require('gstech-core/modules/utils');

const { cleanDb } = require('../../utils');
const repository = require('./repository');
const {
  audienceRules,
  campaignGroups,
  campaigns,
  countries,
  deposits,
  players,
  rewardRules,
  creditedRewards,
  contentType,
  campaignsDeposits,
  campaignsPlayers,
  content,
  campaignsContent,
  events,
  expectedCampaigns,
  subscriptionOptions,
} = require('../../mockData');

const proxyRepo = proxyquire('./repository', {
  '../../event-handlers/rewardHandlers': proxyquire('../../event-handlers/rewardHandlers', {
    'gstech-core/modules/clients/rewardserver-api': {
      creditReward: () => true,
    },
  }),
});

describe('Campaigns repository', () => {
  const campaignName = 'Licc campaign';
  let campaignId;

  before(async () => {
    await cleanDb();
    await pg('campaign_groups').insert(campaignGroups);
    await pg('campaigns').insert(campaigns.map(c => ({ ...c, groupId: c.id % 2 + 1 })).slice(0, 3));
    await pg('countries').insert(countries);
    await pg('subscription_options').insert(subscriptionOptions);
    await pg('players').insert(
      players.slice(0, 3).map((p) => ({ ...p, subscriptionOptionsId: 1 })),
    );
    await pg('reward_rules').insert(rewardRules);
    await pg('reward_rules').insert({
      ...rewardRules[0],
      id: 4,
      campaignId: campaigns[2].id,
      trigger: 'instant',
    });
    await pg.raw("select setval('reward_rules_id_seq', 5)");
    await pg('content_type').insert(contentType);
    await pg('campaigns_players').insert(campaignsPlayers.slice(0, 3));
    await pg('content').insert(content);
    await pg('campaigns_content').insert(campaignsContent.slice(0, 4));
    await pg('events').insert(events);
    await pg('deposits').insert(deposits);
    await pg('campaigns_deposits').insert(campaignsDeposits);
    await pg('credited_rewards').insert(creditedRewards);
  });

  describe('createCampaign', () => {
    it('can create campaign', async () => {
      const { id, ...campaignDraft } = campaigns[0];
      campaignId = await repository.createCampaign(pg, { ...campaignDraft, name: campaignName });

      expect(campaignId).to.be.a('number');
    });
  });

  describe('duplicateCampaign', () => {
    let duplicatedCampaignId;

    after(async () => {
      await pg('campaigns_content').where({ campaignId: duplicatedCampaignId }).del();
      await pg('audience_rules').where({ campaignId: duplicatedCampaignId }).del();
      await pg('reward_rules').where({ campaignId: duplicatedCampaignId }).del();
      await pg('campaigns').where({ id: duplicatedCampaignId }).del();
    });

    it('can duplicate campaign', async () => {
      await pg('audience_rules').insert(
        audienceRules.map((ar) => ({ ...ar, campaignId: campaigns[0].id })),
      );

      duplicatedCampaignId = await repository.duplicateCampaign(pg, campaigns[0].id);

      expect(duplicatedCampaignId).to.be.a('number');
      const newCampaign = await pg('campaigns').where({ id: duplicatedCampaignId }).first();
      expect(newCampaign).to.deep.equal({
        ...campaigns[0],
        id: duplicatedCampaignId,
        status: 'draft',
        name: `Copy of ${campaigns[0].name}`,
        groupId: newCampaign.groupId,
      });

      const newAudienceRules = await pg('audience_rules').where({
        campaignId: duplicatedCampaignId,
      });
      expect(
        newAudienceRules.map(({ id, values, ...ar }) => ({
          ...ar,
          values: JSON.stringify(values),
        })),
      ).to.deep.have.members(
        audienceRules.map(({ id, ...ar }) => ({ ...ar, campaignId: duplicatedCampaignId })),
      );

      const newRewardRules = await pg('reward_rules').where({ campaignId: duplicatedCampaignId });
      expect(newRewardRules.length).to.equal(1);
      expect(newRewardRules[0]).to.deep.equal({
        ...rewardRules[0],
        id: newRewardRules[0].id,
        campaignId: duplicatedCampaignId,
      });

      const newCampaignContent = await pg('campaigns_content').where({
        campaignId: duplicatedCampaignId,
      });
      expect(newCampaignContent.length).to.equal(1);
      expect(newCampaignContent[0]).to.deep.equal({
        ...campaignsContent[0],
        id: newCampaignContent[0].id,
        campaignId: duplicatedCampaignId,
      });
    });
  });

  describe('getCampaignWithAudienceRules', () => {
    it('can get campaign with audience rules', async () => {
      await pg('audience_rules').insert(
        audienceRules.map(({ id, ...rule }) => ({ ...rule, campaignId })),
      );

      const { audienceRules: rules, ...campaign } = await repository.getCampaignWithAudienceRules(
        pg,
        campaignId,
      );

      expect(rules.length).to.equal(2);
      expect(rules.map(({ id, ...r }) => r)).to.have.deep.members(
        audienceRules.map(({ id, ...r }) => ({
          ...r,
          not: false,
          values: JSON.parse((r.values: any)),
        })),
      );
      expect(campaign).to.deep.equal({
        ...campaigns[0],
        id: campaignId,
        endTime: null,
        name: campaignName,
        groupId: campaign.groupId,
      });
    });
  });

  describe('getCampaigns', () => {
    before(async () => {
      await pg('audience_rules').del();
      await pg('campaigns').where({ id: campaignId }).del();
    });

    it('return empty array if campaign status is wrong', async () => {
      const fetchedCampaigns: CampaignsList = await repository.getCampaigns(pg, (['test']: any));

      expect(fetchedCampaigns).to.deep.equal({ groups: [] });
    });

    it('return all campaigns with audience, reaction and pagination if campaign status is unset', async () => {
      const fetchedCampaigns: CampaignsList = await repository.getCampaigns(pg, undefined, 'KK', { pageSize: 3, pageIndex: 1 });

      expect(fetchedCampaigns).to.deep.containSubset({
        groups: [{
          name: campaignGroups[1].name,
          campaigns: [expectedCampaigns[2], expectedCampaigns[0]],
        }, {
          name: campaignGroups[0].name,
          campaigns: [expectedCampaigns[1]],
        }],
        pagination: { pageSize: 3, pageIndex: 1, total: 2 },
      });
    });

    it('return all campaigns with audience and reaction which has campaign status "running"', async () => {
      const fetchedCampaigns: CampaignsList = await repository.getCampaigns(pg, ['running']);

      expect(fetchedCampaigns).to.deep.containSubset({
        groups: [{
          ...campaignGroups[1],
          campaigns: expectedCampaigns.filter((campaign) => campaign.status === 'running' && campaign.groupId === 2),
        }, {
          ...campaignGroups[0],
          campaigns: expectedCampaigns.filter((campaign) => campaign.status === 'running' && campaign.groupId === 1),
        }],
      });
    });

    it('return all campaigns with audience and reaction which has campaign status "draft"', async () => {
      const fetchedCampaigns: CampaignsList = await repository.getCampaigns(pg, ['draft']);

      expect(fetchedCampaigns).to.deep.containSubset({
        groups: [{
          name: campaignGroups[1].name,
          campaigns: expectedCampaigns.filter((campaign) => campaign.status === 'draft'),
        }],
      });
    });
  });

  describe('getCampaignsWithRewards', () => {
    it('returns data according to contract', async () => {
      const result = await repository.getCampaignsWithRewards(pg);

      expect(result.length).to.equal(3);
      expect(result[0].rewardIds.length).to.equal(1);
      expect(result[0].rewardIds[0]).to.equal(rewardRules[0].rewardId);
      expect(result[1].rewardIds.length).to.equal(0);
      expect(result[2].name).to.equal(campaigns[2].name);
    });
  });

  describe('getPlayerCampaignsWithRewards', () => {
    it('returns campaigns with rewards', async () => {
      const result = await repository.getPlayerCampaignsWithRewards(pg, 2);

      expect(result.length).to.equal(1);
      expect(result[0].campaignName).to.equal(campaigns[2].name);
      expect(result[0].rewards.length).to.equal(1);
      expect(result[0].rewards[0]).to.deep.equal(
        _.omit(
          {
            ...rewardRules[1],
            id: rewardRules[1].rewardId,
            minDeposit: null,
            maxDeposit: null,
          },
          'rewardId',
          'campaignId',
          'trigger',
          'removedAt',
        ),
      );
    });

    it('returns campaigns for test user in preview mode', async () => {
      const campaignDraft = { ...campaigns[0], name: 'asd', id: 100, previewMode: false };
      await pg('campaigns').insert(campaignDraft);
      await pg('players').insert({ ...players[0], id: 100, externalId: 100, testPlayer: true });
      await pg('reward_rules').insert({ ...rewardRules[1], id: 100, campaignId: 100 });
      await repository.togglePreviewMode(pg, campaignDraft);

      const result = await repository.getPlayerCampaignsWithRewards(pg, 100);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal({
        campaignName: campaignDraft.name,
        creditMultiple: campaignDraft.creditMultiple,
        campaignId: campaignDraft.id,
        rewards: [_.omit(rewardRules[1], 'campaignId', 'rewardId', 'trigger', 'removedAt')],
      });
    });
  });

  describe('updatePlayersCampaignsMembership', () => {
    it('leaves player membership intact if player still belongs to the campaign', async () => {
      await pg('audience_rules').insert({ ...audienceRules[1], campaignId: campaigns[2].id });

      const result = await repository.updatePlayersCampaignsMembership(pg, players[1].id, players[1].brandId);

      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal({ campaignId: campaigns[2].id, added: 0, removed: 0 });
    });

    it('removes player from campaign if player no longer matches audience rules', async () => {
      await pg('audience_rules').insert({ ...audienceRules[0], campaignId: campaigns[2].id });

      const result = await repository.updatePlayersCampaignsMembership(pg, players[1].id, players[1].brandId);

      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal({ campaignId: campaigns[2].id, added: 0, removed: 1 });
    });

    it('adds player to campaign if player matches audience rules, credits instant reward, mark as complete and remove from campaign', async () => {
      await pg('audience_rules').del();
      await pg('audience_rules').insert({
        name: 'numDeposits',
        operator: '=',
        values: 12,
        campaignId: campaigns[2].id,
      });
      await pg('reward_rules').insert({
        ...rewardRules[0],
        id: 5,
        campaignId: campaigns[2].id,
        trigger: 'instant',
      });
      await pg('credited_rewards').where({ campaignId: campaigns[2].id }).del();

      const result = await proxyRepo.updatePlayersCampaignsMembership(pg, players[2].id);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal({ campaignId: campaigns[2].id, added: 1, removed: 0 });
      const cr = await pg('credited_rewards').where({
        playerId: players[2].id,
        campaignId: campaigns[2].id,
      });
      expect(cr.length).to.equal(2);
      const cp = await pg('campaigns_players').where({
        campaignId: campaigns[2].id,
        playerId: players[2].id,
      });
      expect(cp.length).to.equal(1);
      expect(cp[0].removedAt).to.be.a('date');
      expect(cp[0].complete).to.equal(true);

      const result2 = await proxyRepo.updatePlayersCampaignsMembership(pg, players[2].id);
      expect(result2.length).to.equal(1);
      expect(result2[0]).to.deep.equal({ campaignId: campaigns[2].id, added: 0, removed: 0 });
    });

    // it('Mark campaigns_players as complete if there is "addedToCampaign" rule', async () => {
      // const result = await repository.updatePlayersCampaignsMembership(pg, players[2].id);
      //
      // expect(result.length).to.equal(1);
      // expect(result[0]).to.deep.equal({ campaignId: campaigns[2].id, added: 0, removed: 1 });
      //
      // const cp = await pg('campaigns_players').where({
      //   playerId: players[2].id,
      //   campaignId: campaigns[2].id,
      // });
      // expect(cp.length).to.equal(1);
      // expect(cp[0].complete).to.equal(true);
    // });

    it('updates all players belonging to campaigns if player not specified', async () => {
      await pg('campaigns_players')
        .where({ campaignId: campaigns[2].id })
        .update({ addedAt: moment().subtract(10, 'minutes') });
      await pg('audience_rules').insert({
        name: 'addedToCampaign',
        operator: 'minutesFrom',
        values: 11,
        not: false,
        campaignId: campaigns[2].id,
      });
      await pg('audience_rules').insert({
        name: 'addedToCampaign',
        operator: 'withinMinutes',
        values: 11,
        not: true,
        campaignId: campaigns[2].id,
      });
      await pg('campaigns_players')
        .where({ campaignId: campaigns[2].id })
        .update({ removedAt: null, complete: false });

      const result = await repository.updatePlayersCampaignsMembership(pg);

      expect(result[0]).to.deep.equal({ campaignId: campaigns[2].id, added: 0, removed: 2 });
    });
  });

  describe('getCampaignPlayersForSendingCorrespondenceStream', () => {
    it('return proper result for "emails" "all"', (done) => {
      const stream = repository.getCampaignPlayersForSendingCorrespondence(
        pg,
        2,
        { type: 'email', subtype: 'campaign', sendToAll: false },
      ).stream();

      const result = [];
      stream
        .on('data', (data) => {
          result.push(data);
        })
        .on('error', done)
        .on('end', () => {
          expect(result.length).to.equal(1);
          expect(result[0].id).to.equal(1);
          done();
        });
    });

    it('return proper result for "emails" "new_games"', (done) => {
      pg('subscription_options')
        .update({ emails: 'new_games' })
        .then(() => {
          const stream = repository.getCampaignPlayersForSendingCorrespondence(
            pg,
            2,
            { type: 'email', subtype: 'new_game', sendToAll: false },
          ).stream();

          const result = [];
          stream
            .on('data', (data) => {
              result.push(data);
            })
            .on('error', done)
            .on('end', () => {
              expect(result.length).to.equal(1);
              expect(result[0].id).to.equal(1);
              done();
            });
        });
    });

    it('return proper result for "snoozeEmailsUntil" in the future', (done) => {
      pg('subscription_options')
        .update({ snoozeEmailsUntil: moment().add(2, 'days') })
        .then(() => {
          const stream = repository.getCampaignPlayersForSendingCorrespondence(
            pg,
            2,
            { type: 'email', subtype: 'new_game', sendToAll: false },
          ).stream();

          const result = [];
          stream
            .on('data', (data) => {
              result.push(data);
            })
            .on('error', done)
            .on('end', () => {
              expect(result.length).to.equal(0);
              done();
            });
        });
    });

    it('return proper result for "snoozeEmailsUntil" in the past', (done) => {
      pg('subscription_options')
        .update({ snoozeEmailsUntil: moment().subtract(2, 'days') })
        .then(() => {
          const stream = repository.getCampaignPlayersForSendingCorrespondence(
            pg,
            2,
            { type: 'email', subtype: 'new_game', sendToAll: false },
          ).stream();

          const result = [];
          stream
            .on('data', (data) => {
              result.push(data);
            })
            .on('error', done)
            .on('end', () => {
              expect(result.length).to.equal(1);
              expect(result[0].id).to.equal(1);
              done();
            });
        });
    });

    it('returns nothing for "emails" "best_offers"', (done) => {
      const stream = repository.getCampaignPlayersForSendingCorrespondence(
        pg,
        2,
        { type: 'email', subtype: 'campaigns', sendToAll: false },
      ).stream();

      const result = [];
      stream
        .on('data', (data) => {
          result.push(data);
        })
        .on('error', done)
        .on('end', () => {
          expect(result.length).to.equal(0);
          done();
        });
    });

    it('ignore user subscription options with "sendToAll" = true', (done) => {
      const stream = repository.getCampaignPlayersForSendingCorrespondence(
        pg,
        2,
        { type: 'email', subtype: 'campaigns', sendToAll: true },
      ).stream();

      const result = [];
      stream
        .on('data', (data) => {
          result.push(data);
        })
        .on('error', done)
        .on('end', () => {
          expect(result.length).to.equal(2);
          done();
        });
    });

    it('skips players in "selfexcluded" segment', (done) => {
      pg('players')
        .update({ segments: hstoreFromArray(['selfexcluded']) })
        .where({ id: 1 })
        .then(() => {
          const stream = repository.getCampaignPlayersForSendingCorrespondence(
            pg,
            2,
            { type: 'email', subtype: 'new_game', sendToAll: false },
          ).stream();

          const result = [];
          stream
            .on('data', (data) => {
              result.push(data);
            })
            .on('error', done)
            .on('end', () => {
              expect(result.length).to.equal(0);
              done();
            });
        });
    });

    it('does not allow to send more than 1 email to a person a day (unless it is "sendToAll")', (done) => {
      pg('campaigns_players')
        .update({ emailSentAt: new Date() })
        .where({ playerId: 3, campaignId: 3 })
        .then(async () => {
            await pg('subscription_options').update({ snoozeEmailsUntil: null });
            await pg('players').update({ allowEmailPromotions: true });

            const stream = repository.getCampaignPlayersForSendingCorrespondence(
              pg,
              3, // TODO: This must be some other campaign e.g. "2". currently limiting email to 1 within campaign
              { type: 'email', subtype: 'new_game', sendToAll: false },
            ).stream();

            const result = [];
            stream
              .on('data', (data) => {
                result.push(data);
              })
              .on('error', done)
              .on('end', () => {
                expect(result.length).to.equal(0);
                done();
              });
        });
    });

    it('do not send SMSes to players that already deposited on the campaign', (done) => {
      pg('campaigns_players')
        .insert({ campaignId: 3, playerId: 1, addedAt: new Date() })
        .then(async () => {
          await pg('players').update({ segments: hstoreFromArray(['segment']), allowSMSPromotions: true }).where({ id: 1 });

          const stream = repository.getCampaignPlayersForSendingCorrespondence(
            pg,
            3,
            { type: 'sms', subtype: 'new_game', sendToAll: false },
          ).stream();

          const result = [];
          stream
            .on('data', (data) => {
              result.push(data);
            })
            .on('error', done)
            .on('end', () => {
              expect(result.length).to.equal(0);
              done();
            });
        }).catch(done);
    });
  });

  describe('getCampaignStats', () => {
    it('returns campaign stats', async () => {
      await pg('audience_rules').insert({ name: 'segments', operator: 'in', values: JSON.stringify([]), not: false, campaignId: 2 });
      await pg('campaigns_players').update({ removedAt: new Date() }).where({ id: 2 });

      const result = await repository.getCampaignStats(pg, 2);

      expect(result.audience).to.have.deep.members([
        { id: 'audience', name: 'Audience', value: 3 },
        { id: 'emailAudience', name: 'Email audience', value: 0 },
        { id: 'smsAudience', name: 'Sms audience', value: 2 },
        { id: 'logins', name: 'Logins', value: 0 },
      ]);
      expect(result.notification).to.have.deep.members([
        { id: 'view', name: 'View', value: 0 },
        { id: 'click', name: 'Click', value: 0 },
      ]);
      expect(result.email).to.have.deep.members([
        { id: 'open', name: 'Open', value: 1 },
        { id: 'click', name: 'Click', value: 1 },
        { id: 'sent', name: 'Sent', value: 0 },
      ]);
      expect(result.sms).to.have.deep.members([{ id: 'sent', name: 'Sent', value: 0 }]);
      expect(result.reward.general).to.have.deep.members([
        { id: 'deposits', name: 'Deposit count', value: 0 },
        { id: 'total', name: 'Deposit amount', value: 0 },
        { id: 'players', name: 'Unique depositing players', value: 0 },
      ]);
    });

    it('handles rewards correctly', async () => {
      await pg('deposits').insert([
        { id: 101, externalPlayerId: players[1].externalId, paymentId: 1, amount: 10, convertedAmount: 1000, perPlayerCount: 1, timestamp: new Date() },
        { id: 102, externalPlayerId: players[1].externalId, paymentId: 2, amount: 20, convertedAmount: 2000, perPlayerCount: 2, timestamp: new Date() },
        { id: 103, externalPlayerId: players[2].externalId, paymentId: 3, amount: 30, convertedAmount: 3000, perPlayerCount: 1, timestamp: new Date() },
        { id: 104, externalPlayerId: players[2].externalId, paymentId: 4, amount: 50, convertedAmount: 5000, perPlayerCount: 2, timestamp: new Date() },
        { id: 105, externalPlayerId: players[2].externalId, paymentId: 5, amount: 10, convertedAmount: 1000, perPlayerCount: 3, timestamp: new Date() },
      ]);
      await pg('campaigns_deposits').insert([
        { campaignId: 3, depositId: 101, playerConsent: true },
        { campaignId: 3, depositId: 102, playerConsent: true },
        { campaignId: 3, depositId: 103, playerConsent: true },
        { campaignId: 3, depositId: 104, playerConsent: true },
        { campaignId: 3, depositId: 105, playerConsent: true },
      ]);

      const result = await repository.getCampaignStats(pg, 3);

      expect(result.notification).to.have.deep.members([
        { id: 'view', name: 'View', value: 1 },
        { id: 'click', name: 'Click', value: 0 },
      ]);
      expect(result.reward.general).to.have.deep.members([
        { id: 'deposits', name: 'Deposit count', value: 6 },
        { id: 'total', name: 'Deposit amount', value: 220 },
        { id: 'players', name: 'Unique depositing players', value: 3 },
      ]);
      expect(result.reward.rewards).to.deep.equal({
        '4': [{ id: 'players', name: 'Player count', value: 1 }],
        '5': [{ id: 'players', name: 'Player count', value: 1 }],
      });
    });
  });

  describe('getCsvAudience', () => {
    const player1string = `${players[0].id},${players[0].firstName},${players[0].username},${players[0].email}`;
    const player2string = `${players[1].id},${players[1].firstName},${players[1].username},${players[1].email}`;
    const player3string = `${players[2].id},${players[2].firstName},${players[2].username},${players[2].email}`;

    it('gets the audience from campaigns_players instead of querying audience again if campaign is running or archived', async () => {
      await pg('campaigns_players').update({ removedAt: null }).where({ campaignId: 3 });

      const result = await repository.getCsvAudience(pg, 3);

      expect(result).to.equal(`Player ID,First name,Username,Email\r\n${player1string}\r\n${player2string}\r\n${player3string}`);
    });

    it('filters out sms eligible players properly', async () => {
      await pg('players').update({ subscriptionOptionsId: null }).where({ id: 2 });
      await pg('players').update({ allowSMSPromotions: true }).where({ id: 3 });

      const result = await repository.getCsvAudience(pg, 3, 'sms');

      expect(result).to.equal(
        `Player ID,First name,Username,Email,Mobile phone\r\n${player1string},${players[0].mobilePhone}\r\n${player3string},${players[2].mobilePhone}`,
      );
    });
  });
});
