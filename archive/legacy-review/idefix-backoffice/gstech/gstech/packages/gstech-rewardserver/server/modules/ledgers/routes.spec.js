/* @flow */
import type { LedgerWithRewardAndGame } from 'gstech-core/modules/types/rewards';

const request = require('supertest');
const nock = require('nock');

const pg = require('gstech-core/modules/pg');
const config = require('gstech-core/modules/config');
const client = require('gstech-core/modules/clients/rewardserver-api');
const superClient = require('gstech-core/modules/superClient');
const ports = require('gstech-core/modules/ports');

const app = require('../../app');
const Rewards = require('../rewards/Rewards');
const { createLedger } = require('./Ledgers');
const { createRewardDefinition } = require('../reward-definitions/RewardDefinitions');
const cleanData = require('../../../jobs/cleanData');
const { games, thumbnails } = require('../../mockData');

// nock.recorder.rec();
describe('Ledgers routes', () => {
  let rewardDefinition;
  let reward;
  let reward2;
  const player = { id: 1 };
  let ledgers: LedgerWithRewardAndGame[] = [];

  const rewardDefinitionDraft = {
    brandId: 'KK',
    rewardType: 'lootBoxContent',
  };

  const rewardDraft = {
    description: '',
    bonusCode: '123',
    creditType: 'freeSpins',
    gameId: games[0].id,
    spins: 10,
    externalId: 'id',
    order: 1,
    metadata: {},
  };

  const gameWithThumbnail = { ...games[0], tags: ['tag2', 'tag3'], thumbnail: thumbnails[0].key, thumbnailId: thumbnails[0].id };

  before(async () => {
    await pg('thumbnails').insert(thumbnails);
    await pg('games').insert(games.map(g => ({ ...g, thumbnailId: thumbnails[0].id })));
  })
  beforeEach(async () => {
    rewardDefinition = await createRewardDefinition(pg, rewardDefinitionDraft);
    reward = await Rewards.upsertReward(pg, { rewardDefinitionId: rewardDefinition.id, ...rewardDraft });
    reward2 = await Rewards.upsertReward(pg, {
      rewardDefinitionId: rewardDefinition.id,
      ...rewardDraft,
      bonusCode: '321',
      externalId: 'id2',
    });
  });

  after(cleanData);

  describe('public', () => {
    nock(config.api.backend.url, { allowUnmocked: true, encodedQueryParams: true })
      .post('/api/KK/v1/creditfreespins', ({ bonusCode, permalink }) => bonusCode === '123' && permalink === 'bookofdead')
      .times(2)
      .reply(200, { ok: true });

    nock(config.api.backend.url, { allowUnmocked: true, encodedQueryParams: true })
      .post('/api/KK/v1/creditfreespins', ({ bonusCode, permalink }) => bonusCode === '321' && permalink === 'bookofdead')
      .times(2)
      .reply(200, { ok: true });

    afterEach(async () => {
      await cleanData();
      await pg('thumbnails').insert(thumbnails);
      await pg('games').insert(games.map(g => ({ ...g, thumbnailId: thumbnails[0].id })));
    });

    it('credits freespins reward', async () => {
      await request(app)
        .get('/api/v1/KK/rewards/available?rewardType=lootBoxContent')
        .expect(res => {
          expect(res.body.data).to.containSubset([
            {
              reward: { ...rewardDraft, id: reward.id },
              game: gameWithThumbnail
            },
          ]);
        })
        .expect(200);

      await request(app)
        .post(`/api/v1/KK/rewards/${reward.id}/credit`)
        .send({ playerId: player.id })
        .expect((res) => {
          expect(res.body, JSON.stringify(res.body.error)).to.have.property('data');
          expect(res.body.data).to.containSubset({
            ledgers: [{ rewardId: reward.id }],
          });
        })
        .expect(200);

      await request(app)
        .post(`/api/v1/KK/rewards/${reward2.id}/credit`)
        .send({ playerId: player.id })
        .expect((res) => {
          expect(res.body, JSON.stringify(res.body.error)).to.have.property('data');
          expect(res.body.data).to.containSubset({
            ledgers: [{ rewardId: reward2.id }],
          });
        })
        .expect(200);

      await request(app)
        .get(`/api/v1/KK/ledgers?playerId=${player.id}&rewardType=lootBoxContent`)
        .expect((res) => {
          expect(res.body.data).to.containSubset({
            ledgers: [
              {
                id: res.body.data.ledgers[1].id,
                reward,
                game: gameWithThumbnail,
              },
              {
                id: res.body.data.ledgers[0].id,
                reward: reward2,
                game: gameWithThumbnail,
              },
            ],
          });
          ledgers = res.body.data.ledgers;
        })
        .expect(200);

      await request(app)
        .get(`/api/v1/players/${player.id}/ledgers-with-events`)
        .expect((res) => {
          expect(res.body.data).to.containSubset({
            ledgers: [
              {
                id: res.body.data.ledgers[1].id,
                reward,
                game: gameWithThumbnail,
                events: [{ ledgerId: Number(res.body.data.ledgers[1].id), event: 'reward_credit' }],
              },
              {
                id: res.body.data.ledgers[0].id,
                reward: reward2,
                game: gameWithThumbnail,
                events: [{ ledgerId: Number(res.body.data.ledgers[0].id), event: 'reward_credit' }],
              },
            ],
          });
          ledgers = res.body.data.ledgers;
        })
        .expect(200);

      await superClient(app, ports.rewardServer.port, client)
        .call((api) => api.getUnusedLedgers('KK', player.id, { rewardType: 'lootBoxContent' }))
        .expect(200, (response) => {
          expect(response.ledgers.length).to.equal(2);
          expect(response).to.containSubset({
            ledgers: [
              {
                id: response.ledgers[1].id,
                reward,
                game: gameWithThumbnail,
              },
            ],
          });
        });

      await pg('rewards').where({ id: reward2.id }).update({ active: false });
      await superClient(app, ports.rewardServer.port, client)
        .call((api) => api.getUnusedLedgers('KK', player.id, { rewardType: 'lootBoxContent' }))
        .expect(200, (response) => {
          expect(response.ledgers.length).to.equal(1);
        });

      await request(app)
        .post(`/api/v1/KK/ledgers/${ledgers[1].id}/use`)
        .send({ playerId: player.id })
        .expect((res) => {
          expect(res.body).to.deep.containSubset({
            data: [{ game: { id: 1, thumbnail: thumbnails[0].key }, reward: { id: reward.id } }]
          });
        })
        .expect(200);

      await superClient(app, ports.rewardServer.port, client)
        .call((api) => api.useLedger('KK', ledgers[0].id, player.id))
        .expect(200, (res) => {
          expect(res).to.deep.containSubset([
            { game: { id: 1, thumbnail: thumbnails[0].key }, reward: { id: reward2.id } },
          ]);
        });

      await request(app)
        .get(`/api/v1/KK/ledgers?playerId=${player.id}&rewardType=lootBoxContent`)
        .expect((res) => {
          expect(res.body.data).to.deep.equal({
            ledgers: [],
          });
        })
        .expect(200);
    });
  });

  describe('getPlayerAllLedgers', () => {
    beforeEach(async () => {
      await createLedger(pg, { playerId: 2, rewardId: reward.id, creditDate: new Date(), rewardDefinitionId: rewardDefinition.id, source: 'wagering' });
      await createLedger(pg, { playerId: 2, rewardId: reward.id, creditDate: new Date(), useDate: new Date(), rewardDefinitionId: rewardDefinition.id, source: 'wagering' });

      await request(app)
        .get(`/api/v1/players/${player.id}/ledgers?rewardType=lootBoxContent`)
        .expect((res) => {
          ledgers = res.body.data.ledgers;
        })
        .expect(200);
    })

    it('returns all players ledgers', async () => {
      await request(app)
        .get('/api/v1/players/2/ledgers')
        .expect(({ body: { data } }) => {
          expect(data.ledgers.map(l => l.ledgerId)).to.containSubset(ledgers.map(l => l.id));
        })
        .expect(200);
    });

    it('returns group ledgers', async () => {
      await request(app)
        .get('/api/v1/players/2/ledgers?group=shopItems&brandId=KK')
        .expect(({ body: { data } }) => {
          expect(data.ledgers.map(l => l.ledgerId)).to.containSubset(ledgers.map(l => l.id));
        })
        .expect(200);
    });

    it('returns ledgers by externalId', async () => {
      await request(app)
        .get('/api/v1/players/2/ledgers?group=shopItems&brandId=KK&externalId=foo')
        .expect(({ body: { data }}) => {
          expect(data.ledgers).to.deep.equal([]);
        })
        .expect(200);
    });
  });

  describe('markLedgerUsed', () => {
    before(async () => {
      await createLedger(pg, { playerId: 2, rewardId: reward.id, creditDate: new Date(), rewardDefinitionId: rewardDefinition.id, source: 'wagering' });
      await createLedger(pg, { playerId: 2, rewardId: reward.id, creditDate: new Date(), useDate: new Date(), rewardDefinitionId: rewardDefinition.id, source: 'wagering' });
      await request(app)
        .get(`/api/v1/players/2/ledgers?rewardType=lootBoxContent`)
        .expect((res) => {
          ledgers = res.body.data.ledgers.filter(l => !l.useDate);
        })
        .expect(200);
    })

    it('can mark ledger as used and create event', async () => {
      await request(app)
        .put(`/api/v1/players/2/ledgers/mark-used`)
        .send({ comment: 'comment', groupId: ledgers[0].groupId })
        .set({ 'x-userid': 1 })
        .expect(res => expect(res.body).to.deep.equal({ data: { ok: true } }))
        .expect(200);

      const events = await pg('ledgers_events');
      expect(events.length).to.equal(1);
      expect(events[0]).to.containSubset({
        ledgerId: Number(ledgers[0].id),
        event: 'mark_used',
        comment: 'comment',
        parameters: { userId: 1 },
      });
    });

    it('returns an error if a ledger is already used', async () => {
      await request(app)
        .put(`/api/v1/players/2/ledgers/mark-used`)
        .send({ groupId: ledgers[0].groupId })
        .expect(res => expect(res.body).to.have.property('error'))
        .expect(409);
    });
  });

  describe('importLedgers', () => {
    before(async () => {
      await pg('ledgers_events').del();
      await pg('ledgers').del()
    });

    it('imports ledgers for existing rewards and ignore unknown rewards', async () => {
      const ledgersDraft = [
        { id: 'ida', rewardid: 'id', used: true, usedTime: '2020-12-02T16:02:34.628Z', timestamp: null },
        { id: 'id2', rewardid: 'id2', used: false, usedTime: null, timestamp: null },
        { id: 'id3', rewardid: 'id3', used: false, usedTime: null, timestamp: null },
      ];

      await superClient(app, ports.rewardServer.port, client)
        .call((api) => api.importLedgers('KK', 1, ledgersDraft))
        .expect(200, (data) => { expect(data).to.deep.equal({ ok: true }) });

      ledgers = await pg('ledgers');
      expect(
        ledgers.map(({ id, creditDate, useDate, groupId, ...r }) => ({
          ...r,
          useDate: useDate && useDate.toISOString(),
        })),
      ).to.have.deep.members([
        {
          expires: null,
          externalId: 'ida',
          playerId: 1,
          rewardDefinitionId: rewardDefinition.id,
          rewardId: reward.id,
          useDate: ledgersDraft[0].usedTime,
          source: 'manual',
        },
        {
          expires: null,
          externalId: 'id2',
          playerId: 1,
          rewardDefinitionId: rewardDefinition.id,
          rewardId: reward2.id,
          useDate: ledgersDraft[2].usedTime,
          source: 'manual',
        },
      ]);
    });

    it('ignores inserts ', async () => {
      const ledgersDraft = [
        { id: 'ida', rewardid: 'id', used: false, usedTime: null },
        { id: 'id4', rewardid: 'id2', used: false, usedTime: null },
      ];

      await request(app)
        .post('/api/v1/KK/ledgers/import')
        .send({ playerId: 1, ledgers: ledgersDraft })
        .expect((res) => expect(res.body).to.deep.equal({ data: { ok: true } }))
        .expect(200);

      ledgers = await pg('ledgers');
      expect(
        ledgers.map(({ id, creditDate, useDate, groupId, ...r }) => ({
          ...r,
        })),
      ).to.have.deep.members([
        {
          expires: null,
          externalId: 'ida',
          playerId: 1,
          rewardDefinitionId: rewardDefinition.id,
          rewardId: reward.id,
          source: 'manual',
        },
        {
          expires: null,
          externalId: 'id2',
          playerId: 1,
          rewardDefinitionId: rewardDefinition.id,
          rewardId: reward2.id,
          source: 'manual',
        },
        {
          rewardId: reward2.id,
          playerId: 1,
          externalId: 'id4',
          rewardDefinitionId: rewardDefinition.id,
          expires: null,
          source: 'manual',
        },
      ]);
    });
  });
});
