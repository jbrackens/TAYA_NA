/* @flow */
const proxyquire = require('proxyquire');

const pg = require('gstech-core/modules/pg');

const cleanDb = require('../../../jobs/cleanData');
const { insertMarkkaReward } = require('../../../jobs/fakeDataFns');
const { creditProgressReward } = require('../ledgers/Ledgers');
const { createRewardDefinition } = require('../reward-definitions/RewardDefinitions');
const { getPlayerActiveProgresses } = require('../progresses/Progresses');
const { games, rewardDefinitions } = require('../../mockData');

let Rewards = proxyquire('./Rewards', {
  './wheelSpinWeights': [{ id: 'nowin', weight: 1 }],
});

describe('Rewards', () => {
  let CJWheelSpinRD;
  let CJWheelSpinR;
  let reward;
  let rewardDefinitionId;
  let rewardCreateDraft;
  const rewardDefinitionDraft = {
    rewardType: 'wheelSpin',
    promotion: null,
    brandId: 'CJ',
  };

  before(async () => {
    await pg('games').insert(games);
    rewardDefinitionId = (await createRewardDefinition(pg, rewardDefinitionDraft)).id;
    rewardCreateDraft = {
      bonusCode: 'SOME_CODE',
      creditType: 'freeSpins',
      externalId: 'xxx1',
      rewardDefinitionId,
      description: '',
      validity: null,
      cost: 10,
      currency: 'iron',
      gameId: games[0].id,
      order: 1.2,
      price: 10,
      spinValue: 10,
      spinType: null,
      spins: 10,
      removedAt: null,
      metadata: {
        something: 'something',
      },
      active: true,
    };
    CJWheelSpinRD = await createRewardDefinition(pg, {
      rewardType: 'wheelSpin',
      brandId: 'CJ',
      promotion: '',
    });

    CJWheelSpinR = await Rewards.upsertReward(pg, {
      bonusCode: '',
      creditType: 'wheelSpin',
      externalId: 'wheelSpin',
      rewardDefinitionId: CJWheelSpinRD.id,
      order: 3,
      description: '',
    });
    const CJWheelSpinContentRD = await createRewardDefinition(pg, {
      rewardType: 'wheelSpinContent',
      brandId: 'CJ',
      promotion: '',
    });
    await Rewards.upsertReward(pg, {
      bonusCode: '',
      creditType: 'freeSpins',
      externalId: 'w1',
      rewardDefinitionId: CJWheelSpinContentRD.id,
      order: 2,
      description: '',
      gameId: games[0].id,
      spins: 10,
    });
    await Rewards.upsertReward(pg, {
      bonusCode: '',
      creditType: 'freeSpins',
      externalId: 'w2',
      rewardDefinitionId: CJWheelSpinContentRD.id,
      order: 3,
      description: '',
      gameId: games[0].id,
      spins: 20,
    });
  });

  after(cleanDb);

  describe('upsertReward', () => {
    it('can create', async () => {
      reward = await Rewards.upsertReward(pg, rewardCreateDraft);

      expect(reward).to.deep.equal({
        id: reward && reward.id,
        ...rewardCreateDraft,
      });
    });

    it('can create reward with the same "externalId" as deleted one', async () => {
      await pg('rewards').insert({ ...rewardCreateDraft, externalId: 'a1', removedAt: new Date() });

      reward = await Rewards.upsertReward(pg, { ...rewardCreateDraft, externalId: 'a1' });
      expect(reward.externalId).to.equal('a1');
      expect(reward.removedAt).to.equal(null);
    });

    // TODO: upsertReward uses upsert and should not ever fail
    // it('throws an error if violating db unique contraints', async () => {
    //   rewardCreateDraft.rewardDefinitionId = rewardDefinitionId;
    //   try {
    //     await pg.transaction(async (tx) => {
    //       // Create a reward first
    //       await upsertReward(tx, rewardCreateDraft);

    //       // Try to insert the same reward and fail
    //       await upsertReward(tx, rewardCreateDraft);
    //       throw new Error('Failed');
    //     });
    //   } catch (e) {
    //     expect(e.detail).to.include('Key ("externalId", "bonusCode", "rewardDefinitionId")=(xxx1, SOME_CODE');
    //   }
    // });
  });

  describe('getCurrentPlayerProgresses', () => {
    before(async () => {
      await pg('progresses').insert(
        {
          rewardDefinitionId,
          perRewardDefinitionCount: 1,
          playerId: 2,
          betCount: 2,
          contribution: 200,
          target: 10000,
        },
        ['id'],
      );
    });

    it('can get', async () => {
      const progresses = await getPlayerActiveProgresses(pg, 2, 'CJ');
      expect(progresses).to.deep.containSubset([
        {
          progress: 2,
          rewardDefinitionId,
          rewardType: 'wheelSpin',
          multiplier: 1,
          rewards: [],
        },
      ]);
    });
  });

  describe('getRewards', () => {
    before(async () => {
      rewardDefinitionId = (
        await createRewardDefinition(pg, { brandId: 'KK', rewardType: 'shopItem' })
      ).id;
    });

    it('return empty array when no available shopItems', async () => {
      const shopItems = await Rewards.getRewards(pg, 'KK', { rewardType: 'shopItem' });

      expect(shopItems.length).to.equal(0);
    });

    it('return all the available shopItems', async () => {
       
      reward = await Rewards.upsertReward(pg, {
        price: 0,
        currency: 'iron',
        bonusCode: '',
        creditType: 'freeSpins',
        description: '',
        externalId: 'Blabla',
        gameId: games[0].id,
        spins: 10,
        order: 1,
        rewardDefinitionId,
      });

      const shopItems = await Rewards.getRewards(pg, 'KK', { rewardType: 'shopItem' });

      expect(shopItems).to.have.deep.members([
        {
          game: {
            ...games[0],
            tags: ['tag2', 'tag3'],
            thumbnail: null,
          },
          reward: {
            ...reward,
            rewardType: 'shopItem',
          },
        },
      ]);
    });

    it('by default skips freeSpin rewards with disabled games', async () => {
      // Create reward that should be ignored
      const [g] = await pg('games')
        .insert({ ...games[0], active: false, id: 100, permalink: '??' })
        .returning('id');
      expect(g.id).to.exist();
      await pg('rewards').insert({ ...rewardCreateDraft, gameId: g.id, externalId: '??', rewardDefinitionId });

      const rewards = await Rewards.getRewards(pg, 'KK', { rewardType: 'shopItem' });

      expect(rewards.length).to.equal(1);
    });
  });

  describe('creditProgressReward', () => {
    before(async () => {
      const [rDef] = await pg('reward_definitions')
        .insert({
          ...rewardDefinitions[0],
          rewardType: 'markka',
        })
        .returning('id');
      expect(rDef.id).to.be.a('number');
      rewardDefinitionId = rDef.id;
      await insertMarkkaReward();
      [reward] = await pg('rewards')
        .insert({
          rewardDefinitionId,
          creditType: 'progress',
          bonusCode: '',
          description: '',
          externalId: 'markka_progress',
          order: 1,
          metadata: { value: 50 },
        })
        .returning('*');
    });

    it('create new progress if did not find one', async () => {
      await creditProgressReward(pg, 1, reward);

      const result = await pg('progresses').where({ rewardDefinitionId });
      expect(result.length).to.equal(1);
      expect(result[0].contribution / result[0].target).to.equal(0.5);
      expect(result[0].playerId).to.equal(1);
    });

    it('bumps the existing progress', async () => {
      await creditProgressReward(pg, 1, { ...reward, metadata: { value: 99 } });

      const result = await pg('progresses').where({ rewardDefinitionId });
      expect(result.length).to.equal(1);
      expect(result[0].contribution / result[0].target).to.equal(0.99);
      expect(result[0].playerId).to.equal(1);
    });
  });

  describe('duplicateReward', () => {
    it('can create a new reward based on another one', async () => {
      const result = await Rewards.duplicateReward(pg, reward.id);

      expect(result).to.containSubset({
        ...reward,
        externalId: `${reward.externalId}-new`,
        id: reward.id + 1,
        order: reward.order + 1,
      });
    });
  });

  describe('getWheelSpinReward', () => {
    it('returns empty array on "nowin"', async () => {
      await pg('ledgers').update({ useDate: null }).where({ rewardId: CJWheelSpinR.id });

      const result = await Rewards.getWheelSpinReward(pg);

      expect(result).to.equal(null);
    });

    it('returns random reward from the list', async () => {
      await pg('ledgers').update({ useDate: null }).where({ rewardId: CJWheelSpinR.id });
      Rewards = proxyquire('./Rewards', {
        './wheelSpinWeights': [
          { id: 'w1', weight: 0.5 },
          { id: 'w2', weight: 0.5 },
        ],
      });

      const result = await Rewards.getWheelSpinReward(pg);

      expect(result).to.not.equal(null);
      expect(['w1', 'w2']).to.include(result.externalId);
    });
  });
});
