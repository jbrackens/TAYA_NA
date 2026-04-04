/* @flow */

const proxyquire = require('proxyquire');

const pg = require('gstech-core/modules/pg');

const { countries, campaigns, rewardRules } = require('../mockData');
const { cleanDb } = require('../utils');

const { handlePlayerUpdateEvent } = proxyquire('./handleUpdateEvent', {
  './rewardHandlers': proxyquire('./rewardHandlers', {
    'gstech-core/modules/clients/rewardserver-api': {
      creditReward: () => true,
    },
  }),
});

describe('handleUpdateEvent', () => {
  let countryId;
  let playerId;

  let playerUpdateEvent: any = {
    player: {
      id: 3001548,
      brandId: 'LD',
      username: 'username',
      email: 'email@gmail.com',
      firstName: 'Jack',
      mobilePhone: '4903950077831',
      countryId: 'FI',
      languageId: 'de',
      currencyId: 'EUR',
      allowEmailPromotions: true,
      allowSMSPromotions: true,
      createdAt: new Date('2019-06-01T07:27:58.422Z'),
      numDeposits: 0,
      gamblingProblem: false,
      potentialGamblingProblem: false,
      tags: [],
      registrationSource: 'landing-0',
    },
    segments: ['zero_deposit'],
    updateType: 'Default',
  };

  before(async () => {
    await cleanDb();
    [{ id: countryId }] = await pg('countries').insert(countries, ['id']);
  });

  it('can insert new record', async () => {
    const player = await handlePlayerUpdateEvent(pg, playerUpdateEvent);

    const { registrationSource, ...eventPlayer } = playerUpdateEvent.player;
    playerId = player.id;
    expect(player).to.deep.equal({
      ...eventPlayer,
      segments: playerUpdateEvent.segments,
      id: player.id,
      externalId: playerUpdateEvent.player.id,
      countryId,
      invalidEmail: false,
      invalidMobilePhone: false,
      testPlayer: false,
      subscriptionOptionsId: player.subscriptionOptionsId,
      subscriptionToken: player.subscriptionToken,
      lastSeen: null,
      registrationLandingPage: playerUpdateEvent.player.registrationSource,
    });

    // Before the update player's email was marked as invalid
    await pg('players')
      .where({ externalId: player.externalId })
      .update({ invalidEmail: true }, ['*']);
  });

  it('can update users information', async () => {
    playerUpdateEvent = {
      ...playerUpdateEvent,
      player: {
        ...playerUpdateEvent.player,
        gamblingProblem: true,
        tags: ['A tag'],
        email: 'different@gmail.com',
      },
      segments: ['full_deposit'],
    };

    const player = await handlePlayerUpdateEvent(pg, playerUpdateEvent);

    expect(player.tags).to.have.members(['A tag']);
    expect(player.segments).to.have.members(['full_deposit']);
    expect(player.gamblingProblem).to.equal(true);
    expect(player.invalidEmail).to.equal(false);
  });

  it('credit rewards for login event', async () => {
    await pg('campaigns').insert(campaigns);
    await pg('campaigns').update({ status: 'running' }).where({ id: 1 });
    await pg('reward_rules').insert(rewardRules);
    await pg('campaigns_players').insert({ campaignId: 1, playerId, addedAt: new Date() });

    const player = await handlePlayerUpdateEvent(pg, { ...playerUpdateEvent, updateType: 'Login' });

    expect(player.lastSeen).to.not.equal(null);

    const creditedRewards = await pg('credited_rewards');
    expect(creditedRewards.length).to.equal(1);
    expect(creditedRewards[0]).to.containSubset({
      id: creditedRewards[0].id,
      playerId,
      rewardRulesId: rewardRules[0].id,
      creditMultiple: campaigns[0].creditMultiple,
      campaignId: campaigns[0].id,
    });
  });
});
