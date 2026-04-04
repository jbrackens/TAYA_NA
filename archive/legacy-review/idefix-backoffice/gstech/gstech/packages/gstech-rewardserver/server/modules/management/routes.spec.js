/* @flow */

const request = require('supertest');

const pg = require('gstech-core/modules/pg');
const { insertRewardDefinitions } = require('../../../jobs/fakeDataFns');
const cleanData = require('../../../jobs/cleanData');
const managementApp = require('../../app-management');
const app = require('../../app');
const { games } = require('../../mockData');

describe('Reward management routes', () => {
  let rewardDefinition;
  let rewardId;
  const rewardDraft = {
    rewardDefinitionId: null,
    creditType: 'freeSpins',
    bonusCode: '123',
    externalId: 'a1',
    cost: 10,
    currency: null,
    description: 'description',
    gameId: games[0].id,
    metadata: { a: 'b' },
    order: 1,
    price: 10,
    spinType: 'normal',
    spinValue: 10,
    spins: 5,
    validity: null,
    removedAt: null,
    active: false,
  };

  before(async () => {
    await pg('games').insert(games);
    await insertRewardDefinitions();
    rewardDefinition = await pg('reward_definitions').first();
    rewardDraft.rewardDefinitionId = rewardDefinition.id;
  });

  after(cleanData);

  describe('createReward', () => {
    it('can create a reward', async () => {
      await request(managementApp)
        .post('/api/v1/rewards')
        .send(rewardDraft)
        .expect((res) => {
          expect(res.body, JSON.stringify(res.body.error)).to.have.property('data');
          expect(res.body.data.id).to.be.a('number');
          rewardId = res.body.data.id;
        })
        .expect(201);
    });

    it('cannot create two identical rewards', async () => {
      await request(managementApp)
        .post('/api/v1/rewards')
        .send(rewardDraft)
        .expect((res) => {
          expect(res.body).to.have.property('error');
          expect(res.body.error.message).to.equal(`Reward ${rewardDraft.externalId} already exists`);
        })
        .expect(409);
    });
  });

  describe('getRewards', () => {
    it('returns only active rewards (app)', async () => {
      await request(app)
        .get(`/api/v1/rewards?brandId=${rewardDefinition.brandId}&type=${rewardDefinition.type}`)
        .expect(({ body }) => {
          expect(body.data.length).to.equal(0);
        });
    });

    it('can get rewards', async () => {
      await request(managementApp)
        .get(
          `/api/v1/rewards?brandId=${rewardDefinition.brandId}&type=${rewardDefinition.rewardType}`,
        )
        .expect((res) => {
          expect(res.body.data.length).to.equal(1);
          expect(res.body.data[0]).to.containSubset({
            reward: { ...rewardDraft, id: res.body.data[0].reward.id },
            game: { ...games[0], tags: ['tag2', 'tag3'] },
          });
        })
        .expect(200);
    });
  });

  describe('updateReward', () => {
    it('returns error on non existant reward', async () => {
      await request(managementApp)
        .put('/api/v1/rewards/1234')
        .send({ ...rewardDraft, currency: 'gold' })
        .expect((res) => {
          expect(res.body).to.have.property('error');
          expect(res.body.error.message).to.equal('Reward 1234 not found or removed');
        })
        .expect(404);
    });

    it('can update existing reward', async () => {
      await request(managementApp)
        .put(`/api/v1/rewards/${rewardId}`)
        .send({ ...rewardDraft, currency: 'gold' })
        .expect((res) => {
          expect(res.body, JSON.stringify(res.body.error, null, 2)).to.have.property('data');
          expect(res.body.data.id).to.equal(rewardId);
        })
        .expect(200);

      const reward = await pg('rewards').first();
      expect(reward.currency).to.equal('gold');
    });

    it('can partially update reward', async () => {
      await request(managementApp)
        .put(`/api/v1/rewards/${rewardId}`)
        .send({ order: 100000 })
        .expect((res) => {
          expect(res.body, JSON.stringify(res.body.error, null, 2)).to.have.property('data');
          expect(res.body.data.id).to.equal(rewardId);
        })
        .expect(200);

      const reward = await pg('rewards').first();
      expect(reward.order).to.equal(100000);
    });
  });

  describe('getReward', () => {
    it('can get a reward', async () => {
      await request(managementApp)
        .get(`/api/v1/rewards/${rewardId}`)
        .expect(({ body }) => {
          expect(body.data.reward.id).to.equal(rewardId);
          expect(body.data.game.id).to.equal(games[0].id);
        })
        .expect(200);
    });
  });

  describe('deleteReward', () => {
    it('can delete a reward', async () => {
      await request(managementApp)
        .delete(`/api/v1/rewards/${rewardId}`)
        .expect((res) => {
          expect(res.body).to.have.property('data');
          expect(res.body.data.ok).to.equal(true);
        })
        .expect(200);
    });

    it('cannot delete reward twice', async () => {
      await request(managementApp)
        .delete(`/api/v1/rewards/${rewardId}`)
        .expect((res) => {
          expect(res.body).to.have.property('error');
          expect(res.body.error.message).to.equal('Reward has already been removed');
        })
        .expect(409);
    });
  });
});
