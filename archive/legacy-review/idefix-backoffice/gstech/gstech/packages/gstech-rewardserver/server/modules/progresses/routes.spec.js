/* @flow */
const request = require('supertest');

const pg = require('gstech-core/modules/pg');
const client = require('gstech-core/modules/clients/rewardserver-api');
const superClient = require('gstech-core/modules/superClient');
const ports = require('gstech-core/modules/ports');

const app = require('../../app');
const cleanData = require('../../../jobs/cleanData');
const { createRewardDefinition } = require('../reward-definitions/RewardDefinitions');
const { upsertReward } = require('../rewards/Rewards');
const { games, rewardDefinitions, rewards } = require('../../mockData');
const { createLedger } = require('../ledgers/Ledgers');

describe('Progresses routes', () => {
  let markkaReward;
  before(async () => {
    await pg('games').insert(games);
    await pg('reward_definitions').insert(rewardDefinitions[6]);
    await pg('rewards').insert(rewards[5]);
    
    const markkaRewardDefinitionId = (
      await createRewardDefinition(pg, { brandId: 'KK', rewardType: 'markka', followUpdates: true })
    ).id;
    const ironCoinRewardDefinitionId = (
      await createRewardDefinition(pg, { brandId: 'KK', rewardType: 'iron', followUpdates: false })
    ).id;
    markkaReward = await upsertReward(pg, {
      rewardDefinitionId: markkaRewardDefinitionId,
      description: '',
      bonusCode: '',
      creditType: 'markka',
      externalId: 'Markka',
      order: 2,
    });
    const ironReward = await upsertReward(pg, {
      rewardDefinitionId: ironCoinRewardDefinitionId,
      description: '',
      bonusCode: '',
      creditType: 'iron',
      externalId: 'Iron',
      order: 2,
    });
    await createLedger(pg, { playerId: 2, rewardId: ironReward.id, creditDate: new Date(), rewardDefinitionId: ironCoinRewardDefinitionId, source: 'wagering' });
  });

  after(cleanData);

  describe('getPlayerProgress', () => {
    it('returns all players ledgers and create markka progress', async () => {
      await request(app)
        .get('/api/v1/KK/progresses?playerId=2')
        .expect(({ body }) => {
          expect(body, JSON.stringify(body.error)).to.have.property('data');
          expect(body.data.progresses).to.containSubset([
            {
              rewardType: 'markka',
              ledgers: 0,
              progress: 50,
              multiplier: 1,
              rewards: [{ quantity: 5, reward: markkaReward, game: null }],
            },
          ]);
        })
        .expect(200);
    });

    it('returns all players ledgers and create wheelSpin progress', async () => {
      await request(app)
        .get('/api/v1/CJ/progresses?playerId=3')
        .expect(({ body }) => {
          expect(body, JSON.stringify(body.error)).to.have.property('data');
          expect(body.data.progresses).to.containSubset([
            { rewardType: 'wheelSpin', ledgers: 0, progress: 0, multiplier: 1, rewards: [] },
          ]);
        })
        .expect(200);
    });

    it('returns only markka progress (client)', async () => {
      await superClient(app, ports.rewardServer.port, client)
        .call((api) => api.getPlayerProgresses('KK', 2))
        .expect(200, (res) => {
          expect(res.progresses).to.containSubset([
            { rewardType: 'markka', ledgers: 0, progress: 50, groupId: 'coins' },
            { ledgers: 1, groupId: 'coins', rewardType: 'iron' }
          ]);
        });
    });
  });
});
