/* @flow */
const nock = require('nock');
const request = require('supertest');
const _ = require('lodash');

const pg = require('gstech-core/modules/pg');
const config = require('gstech-core/modules/config');
const client = require('gstech-core/modules/clients/rewardserver-api');
const superClient = require('gstech-core/modules/superClient');
const ports = require('gstech-core/modules/ports');

const app = require('../../app');
const { upsertReward } = require('./Rewards');
const { createRewardDefinition } = require('../reward-definitions/RewardDefinitions');
const cleanData = require('../../../jobs/cleanData');
const { insertKKLootBoxesRewards } = require('../../../jobs/fakeDataFns');
const { rewardDefinitions, rewards, games, thumbnails } = require('../../mockData');

// nock.recorder.rec();

nock(config.api.backend.url, { allowUnmocked: true, encodedQueryParams: true })
  .post('/api/KK/v1/creditfreespins', (x) => x.bonusCode === 'xxx' && x.permalink === 'bookofdead')
  .times(7)
  .reply(200, { ok: true });

describe('Reward routes', () => {
  let lootBoxRD;
  let markkaReward;
  let freespinsReward;
  let lootBoxReward;
  const player = { id: 1 };

  const markkaRewardDraft = {
    description: '',
    creditType: 'markka',
    bonusCode: '',
    externalId: 'Markka',
    order: 1,
  };

  const shopItemRewardDefinitionDraft = {
    brandId: 'KK',
    rewardType: 'shopItem',
  };

  const freespinsRewardDraft = {
    description: '',
    creditType: 'freeSpins',
    bonusCode: 'xxx',
    externalId: '123',
    currency: 'markka',
    price: 8,
    cost: 10,
    gameId: games[0].id,
    metadata: {},
    order: 1.2,
    spinValue: 10,
    spins: 10,
    validity: null,
  };

  const lootBoxRewardDraft = {
    creditType: 'lootBox',
    bonusCode: 'KKLootBox_10',
    description: 'KKLootBox_10',
    externalId: `KKLootBox_10`,
    price: 10,
    currency: 'markka',
    cost: 10,
    gameId: null,
    metadata: {},
    order: 1.3,
    spinValue: null,
    spins: null,
    validity: null,
  };

  before(async () => {
    lootBoxRD = (await createRewardDefinition(pg, { brandId: 'KK', rewardType: 'lootBoxContent', order: 1 })).id;
    await insertKKLootBoxesRewards();
    await pg('reward_definitions').insert(rewardDefinitions);
    await pg('rewards').insert(rewards);
    await pg('thumbnails').insert(thumbnails);
    await pg('games').update({ thumbnailId: 1 }).where({ id: games[0].id });
    markkaReward = await upsertReward(pg, { rewardDefinitionId: rewardDefinitions[1].id, ...markkaRewardDraft });

      const shopItemRewardDefinition = await createRewardDefinition(pg, shopItemRewardDefinitionDraft);
    freespinsReward = await upsertReward(pg, { rewardDefinitionId: shopItemRewardDefinition.id, ...freespinsRewardDraft });

    const lootBoxRewardDefinition = await createRewardDefinition(pg, { brandId: 'KK', rewardType: 'shopItem' });
    lootBoxReward = await upsertReward(pg, { rewardDefinitionId: lootBoxRewardDefinition.id, ...lootBoxRewardDraft });
  });

  after(cleanData);

  it('credits some markkas to player', async () => {
    await request(app)
      .post(`/api/v1/KK/rewards/${markkaReward.id}/credit`)
      .send({ count: 20, playerId: player.id })
      .expect(200);
  });

  describe('exchangeReward', () => {
    it('exchanges markkas to reward', async () => {
      await request(app)
        .post(`/api/v1/KK/rewards/${freespinsReward.id}/exchange`)
        .send({ playerId: player.id })
        .expect(res => {
          expect(res.body.data.length).to.equal(1);
          expect(res.body.data[0]).to.deep.containSubset({
            reward: freespinsReward,
            game: {
              ...games[0],
              tags: ['tag2', 'tag3'],
              thumbnail: thumbnails[0].key,
              thumbnailId: thumbnails[0].id,
            },
          });
        })
        .expect(200);
    });

    it('can exchange markkas for lootBox (client)', async () => {
      await superClient(app, ports.rewardServer.port, client)
        .call(api => api.exchangeReward('KK', lootBoxReward.id, player.id))
        .expect(200, response => {
          expect(response.length).to.be.greaterThan(0);
        });
    });

    it('has exchanged reward available in ledgers', async () => {
      await superClient(app, ports.rewardServer.port, client)
        .call(api => api.getUnusedLedgers('KK', player.id, { rewardType: 'lootBoxContent' }))
        .expect(200, response => {
          expect(response.ledgers.length).to.be.greaterThan(0);
          // expect(response.data.ledgers[0].externalId).to.include('KKLootBoxReward'); // TODO: should return more meaningful data from getUnusedLedgers
        });
    });

    it('fails on exchange when no longer balance', async () => {
      await request(app)
        .post(`/api/v1/KK/rewards/${freespinsReward.id}/exchange`)
        .send({ playerId: player.id })
        .expect(403);
    });
  })

  describe('getRewardInfo', () => {
    it('get reward info by id', async () => {
      await superClient(app, ports.rewardServer.port, client)
        .call((api) => api.getRewardInfo(freespinsReward.id))
        .expect(200, (response) => {
          expect(response).to.containSubset({ reward: freespinsReward, game: { permalink: 'bookofdead' } });
        });
    });
  });

  describe('getAvailableRewards', () => {
    it('get rewards of given type (client)', async () => {
      await superClient(app, ports.rewardServer.port, client)
        .call((api) => api.getAvailableRewards('KK', { rewardType: 'shopItem', excludeDisabled: false }))
        .expect(200, (response) => {
          expect(response).to.containSubset([
            { reward: { ...freespinsRewardDraft, id: freespinsReward.id } },
            { reward: { ...lootBoxRewardDraft, id: lootBoxReward.id } },
          ]);
        });
    });

    it('returns rewards in correct order (client)', async () => {
      await superClient(app, ports.rewardServer.port, client)
        .call((api) => api.getAvailableRewards('KK', {}))
        .expect(200, (response) => {
          expect(response[0].reward.rewardDefinitionId).to.equal(lootBoxRD);
        });
    });
  });

  describe('creditReward', () => {
    it('credit rewards to user (client)', async () => {
      await superClient(app, ports.rewardServer.port, client)
        .call((api) =>
          api.creditReward('KK', markkaReward.id, {
            count: 5,
            playerId: player.id,
            comment: 'c1',
            userId: 99,
            source: 'marketing',
          }),
        )
        .expect(200, (response) => {
          expect(response.ledgers.map((l) => _.omit(l, 'id'))).to.have.deep.members(
            [...Array(5)].map(() => ({
              rewardId: markkaReward.id,
            })),
          );
        });

      const events = await pg('ledgers_events').whereRaw("parameters ->> 'userId' = ?", [99]);
      expect(events).to.containSubset([...Array(5)].map(() => ({ event: 'reward_credit', comment: 'c1' })));
    });

    it('credit rewards to user and use instantly (client)', async () => {
      let ledgers: Id[] = [];
      await superClient(app, ports.rewardServer.port, client)
        .call((api) =>
          api.creditReward('KK', freespinsReward.id, {
            count: 5,
            playerId: player.id,
            comment: 'c1',
            userId: 99,
            source: 'marketing',
            useOnCredit: true,
          }),
        )
        .expect(200, (response) => {
          expect(response.ledgers.map((l) => _.omit(l, 'id'))).to.have.deep.members(
            [...Array(5)].map(() => ({
              rewardId: freespinsReward.id,
            })),
          );
          ledgers = response.ledgers.map(({ id }) => id);
        });

      const dbLedgers = await pg('ledgers').whereIn('id', ledgers);
      expect(dbLedgers.length).to.equal(5);
      dbLedgers.map(({ useDate }) => expect(useDate).to.not.equal(null));
    });

    it('credit progress reward to user (client)', async () => {
      await superClient(app, ports.rewardServer.port, client)
        .call((api) => api.creditReward('KK', rewards[2].id, { count: 1, playerId: player.id, source: 'marketing' }))
        .expect(200, (response) => {
          expect(response.ledgers.map((l) => _.omit(l, 'id'))).to.have.deep.members([{ rewardId: rewards[2].id }])
        });

      const result = await pg('progresses').where({ playerId: player.id });
      expect(result.length).to.equal(1);
      expect(result[0].contribution / result[0].target).to.equal(0.99);
    });
  });

  describe('creditRewardByExternalId', () => {
    it('credit rewards to player with rewardType', async () => {
      await superClient(app, ports.rewardServer.port, client)
        .call((api) =>
          api.creditRewardByExternalId('KK', {
            count: 5,
            playerId: player.id,
            externalId: markkaReward.externalId,
            rewardType: 'markka',
            comment: 'c',
            userId: 100,
            source: 'manual',
          }),
        )
        .expect(200, (response) => {
          expect(response.ledgers.map((l) => _.omit(l, 'id'))).to.have.deep.members(
            [...Array(5)].map(() => ({
              rewardId: markkaReward.id,
            })),
          );
        });

      const events = await pg('ledgers_events').whereRaw("parameters ->> 'userId' = ?", [100]);
      expect(events).to.containSubset([...Array(5)].map(() => ({ event: 'reward_credit', comment: 'c' })));
    });

    it('credit rewards to player with group', async () => {
      await superClient(app, ports.rewardServer.port, client)
        .call((api) =>
          api.creditRewardByExternalId('KK', {
            count: 5,
            playerId: player.id,
            externalId: markkaReward.externalId,
            group: 'coins',
            source: 'manual',
          }),
        )
        .expect(200, (response) => {
          expect(response.ledgers.map((l) => _.omit(l, 'id'))).to.have.deep.members(
            [...Array(5)].map(() => ({
              rewardId: markkaReward.id,
            })),
          );
        });
    });
  });
});
