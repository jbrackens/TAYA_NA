/* @flow */
const request = require('supertest');  
const app = require('../../app-casino');
const config = require('../../config');
const { updateGamesJob, updateDrawingsJob } = require('../lotto-warehouse-jobs');
const db = require('../../db');

require('../../test-scripts/nock');

describe('Lotto Casino API', () => {
  let playerId;
  before(async () => {
    await clean.tickets();
    await clean.drawings();
    await clean.gameTypes();

    await updateGamesJob();
    await updateDrawingsJob();

    await db.insertGameId({ gametypeid: 888, gameid: 'testGame1' });
    await db.insertGameId({ gametypeid: 889, gameid: 'testGame2' });

    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'LW',
        initialBalance: 1000,
        gamePlayerBlocked: true,
      })
      .expect((res) => {
        playerId = res.body.playerId;
      })
      .expect(200);
  });

  it('can set player free lines', async () => {
    await request(app)
      .post(`/api/v1/lottocasino/freelines/${playerId}/testGame1/3`)
      .expect(200);

    const freeLines = await db.getPlayerFreeLines(playerId, 888);
    expect(freeLines).to.deep.equal({
      freelinescount: 3,
      gametypeid: 888,
      playerid: playerId,
    });
  });

  it('can add free lines', async () => {
    await request(app)
      .post(`/api/v1/lottocasino/freelines/${playerId}/testGame1/2`)
      .expect(200);

    const freeLines = await db.getPlayerFreeLines(playerId, 888);
    expect(freeLines).to.deep.equal({
      freelinescount: 5,
      gametypeid: 888,
      playerid: playerId,
    });
  });

  it('can add free lines', async () => {
    await request(app)
      .post(`/api/v1/lottocasino/freelines/${playerId}/testGame1/6`)
      .expect(200);

    const freeLines = await db.getPlayerFreeLines(playerId, 888);
    expect(freeLines).to.deep.equal({
      freelinescount: 11,
      gametypeid: 888,
      playerid: playerId,
    });
  });

  it('can get jackpots', () =>
    request(app)
      .get('/api/v1/lottocasino/jackpot/testGame1/EUR')
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: '',
          data: { currency: 'EUR', amount: '29000000' },
        });
      })
      .expect(200));
});
