/* @flow */

const request = require('supertest');

const pg = require('gstech-core/modules/pg');

const app = require('../../app-management');
const { games } = require('../../mockData');
const cleanDb = require('../../../jobs/cleanData');

describe('Games routes', () => {
  let gameId;
  const { id, ...gameWithoutId } = games[0];
  const gameDraft = {
    ...gameWithoutId,
    tags: ['asd', 'tag1'],
  };

  after(cleanDb);

  describe('createGame', () => {
    it('can create a game', async () => {
      await request(app)
        .post('/api/v1/games')
        .send(gameDraft)
        .expect(({ body }) => {
          gameId = body.data.gameId;
          expect(body.data.gameId).to.be.a('number');
        })
        .expect(200);
    });

    it('new game should have order 1', async () => {
      const { order, ...gameWithoutOrder } = gameDraft;
      await request(app)
        .post('/api/v1/games')
        .send({ ...gameWithoutOrder, permalink: 'asd1' })
        .expect(({ body }) => {
          expect(body.data.gameId).to.be.a('number');
        })
        .expect(200);

      const game = await pg('games').where({ permalink: 'asd1' }).first();
      expect(game.order).to.equal(1);
    });

    it('can create new game with the same permalink as removed one', async () => {
      await pg('games').where({ id: gameId }).update({ removedAt: new Date() });

      await request(app)
        .post('/api/v1/games')
        .send(gameDraft)
        .expect(({ body }) => {
          expect(body.data.game).to.not.equal(gameId);
          gameId = body.data.gameId;
          expect(gameId).to.be.a('number');
        })
        .expect(200);
    });
  });

  describe('getGames', () => {
    it('can get games of brand', async () => {
      await request(app)
        .get(`/api/v1/games?brandId=${gameDraft.brandId}`)
        .expect(({ body }) => {
          expect(body.data.length).to.equal(3);
          expect(body.data).to.containSubset([
            { order: 1, permalink: 'asd1' },
            { order: 2, permalink: 'bookofdead' },
          ]);
        })
        .expect(200);
    });
  });

  describe('updateGame', () => {
    it('returns 404 when game does not exist', async () => {
      await request(app)
        .put('/api/v1/games/12345')
        .send(gameDraft)
        .expect(({ body }) => {
          expect(body.error.message).to.equal(`Game 12345 not found`);
        })
        .expect(404);
    });

    it('can update game', async () => {
      const newName = 'Some other name';

      await request(app)
        .put(`/api/v1/games/${gameId}`)
        .send({ ...gameDraft, name: newName })
        .expect(({ body }) => {
          expect(body.data.ok).to.equal(true);
        })
        .expect(200);

      const game = await pg('games').where({ id: gameId }).first();
      expect(game.name).to.equal(newName);
    });

    it('can partially update game', async () => {
      await request(app)
        .put(`/api/v1/games/${gameId}`)
        .send({ order: 1500 })
        .expect(({ body }) => {
          expect(body.data.ok).to.equal(true);
        })
        .expect(200);

      const game = await pg('games').where({ id: gameId }).first();
      expect(game.order).to.equal(1500);
    });
  });

  describe('deleteGame', () => {
    it('returns 404 when game does not exist', async () => {
      await request(app)
        .delete('/api/v1/games/12345')
        .expect(({ body }) => {
          expect(body.error.message).to.equal('Game 12345 not found');
        })
        .expect(404);
    });

    it('can delete a game', async () => {
      await request(app)
        .delete(`/api/v1/games/${gameId}`)
        .expect(({ body }) => {
          expect(body.data.ok).to.equal(true);
        })
        .expect(200);
    });
  });
});
