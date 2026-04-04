/* @flow */
const request = require('supertest');  
const nock = require('nock');  

const client = require('gstech-core/modules/clients/backend-wallet-api');

const app = require('../../app');
const appCasino = require('../../app-casino');
const config = require('../../config');
const { updateGamesJob, updateDrawingsJob, updateTicketsJob } = require('../lotto-warehouse-jobs');
const db = require('../../db');

require('../../test-scripts/nock');

describe('Lotto Backend API (Free Tickets)', () => {
  let sessionId;
  let playerId;
  before(async () => {
    await clean.tickets();
    await clean.drawings();
    await clean.gameTypes();

    await updateGamesJob();
    await updateDrawingsJob();

    await db.insertGameId({ gametypeid: 888, gameid: 'testGame1' });
    await db.insertGameId({ gametypeid: 889, gameid: 'testGame2' });
    await db.upsertTicketPrice({ gametypeid: 888, currencycode: 'EUR', priceperrow: 250 });

    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'LW',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = res.body.playerId;
      })
      .expect(200);
  });

  it('can set player free lines', async () => {
    await request(appCasino)
      .post(`/api/v1/lottocasino/freelines/${playerId}/testGame1/3`)
      .expect(200);

    const freeLines = await db.getPlayerFreeLines(playerId, 888);
    expect(freeLines).to.deep.equal({
      freelinescount: 3,
      gametypeid: 888,
      playerid: playerId,
    });
  });

  it('can overbet if enough free lines assigned', () =>
    request(app)
      .post('/api/v1/lottobackend/ticket/buy')
      .set('Cookie', `sessionId=${sessionId}`)
      .send({
        gameid: 'testGame1',
        drawings: 1,
        details: [{
          ordernr: 0,
          betnumbers: [5, 17, 24, 36, 54],
          betbonusnumbers: [13, 5],
        },
        {
          ordernr: 1,
          betnumbers: [6, 20, 43, 51, 55],
          betbonusnumbers: [11, 3],
        },
        {
          ordernr: 2,
          betnumbers: [6, 20, 43, 51, 55],
          betbonusnumbers: [11, 3],
        },
        {
          ordernr: 3,
          betnumbers: [6, 20, 43, 51, 55],
          betbonusnumbers: [11, 3],
        },
        {
          ordernr: 4,
          betnumbers: [6, 20, 43, 51, 55],
          betbonusnumbers: [11, 3],
        }],
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: '',
          data: {
            balances: {
              balance: 500,
              currency: 'EUR',
              freelines: 0,
            },
          },
        });
      })
      .expect(200));

  it('can set player free lines again', async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'LW',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = res.body.playerId;
      })
      .expect(200);

    await request(appCasino)
      .post(`/api/v1/lottocasino/freelines/${playerId}/testGame1/3`)
      .expect(200);

    const freeLines = await db.getPlayerFreeLines(playerId, 888);
    expect(freeLines).to.deep.equal({
      freelinescount: 3,
      gametypeid: 888,
      playerid: playerId,
    });
  });

  it('can fail get game if game is not playable', () =>
    request(app)
      .get('/api/v1/lottobackend/game/testGame2')
      .set('Cookie', `sessionId=${sessionId}`)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: 'general.error',
        });
      })
      .expect(404));

  it('can get game by id', () =>
    request(app)
      .get('/api/v1/lottobackend/game/testGame1')
      .set('Cookie', `sessionId=${sessionId}`)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: '',
          data: {
            game: {
              gametypeid: 888,
              name: 'Test Game 1',
              cutoffhours: 2,
              currency: 'EUR',
              country: 'Europe',
              isplayable: 1,
              numberscount: 5,
              extranumberscount: 0,
              bonusnumberscount: 2,
              refundnumberscount: 0,
              numbermin: 1,
              numbermax: 50,
              bonusnumbermin: 1,
              bonusnumbermax: 12,
              refundnumbermin: 1,
              refundnumbermax: 1,
              currentjackpot: 29000000,
              nextdrawid: 88888,
              numbersperrow: 10,
              bonusnumbersperrow: 9,
              priceperrow: 250,
              symbol: 'EUR',
              locale: 'en',
              drawdateutc: '2018-11-09T20:00:00.000Z',
              cutoff: '2018-11-09T18:00:00.000Z',
              gameid: 'testGame1',
            },
            balances: {
              balance: 1000,
              currency: 'EUR',
              freelines: 3,
            },
          },
        });
      })
      .expect(200));

  it('can fail posting bet for a disabled game', () =>
    request(app)
      .post('/api/v1/lottobackend/ticket/buy')
      .set('Cookie', `sessionId=${sessionId}`)
      .send({
        gameid: 'testGame2',
        drawings: 1,
        details: [{
          ordernr: 0,
          betnumbers: [5, 17, 24, 36, 54],
          betbonusnumbers: [13, 5],
        },
        {
          ordernr: 1,
          betnumbers: [6, 20, 43, 51, 55],
          betbonusnumbers: [11, 3],
        }],
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: 'general.error',
        });
      })
      .expect(404));

  it('can post create free tickets bet', () =>
    request(app)
      .post('/api/v1/lottobackend/ticket/buy')
      .set('Cookie', `sessionId=${sessionId}`)
      .send({
        gameid: 'testGame1',
        drawings: 1,
        details: [{
          ordernr: 0,
          betnumbers: [5, 17, 24, 36, 54],
          betbonusnumbers: [13, 5],
        },
        {
          ordernr: 1,
          betnumbers: [6, 20, 43, 51, 55],
          betbonusnumbers: [11, 3],
        }],
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: '',
          data: {
            balances: {
              balance: 1000,
              currency: 'EUR',
              freelines: 1,
            },
          },
        });
      })
      .expect(200));

  it('can post create free and paid tickets bet', () =>
    request(app)
      .post('/api/v1/lottobackend/ticket/buy')
      .set('Cookie', `sessionId=${sessionId}`)
      .send({
        gameid: 'testGame1',
        drawings: 1,
        details: [{
          ordernr: 0,
          betnumbers: [6, 18, 25, 37, 55],
          betbonusnumbers: [14, 6],
        },
        {
          ordernr: 1,
          betnumbers: [7, 21, 44, 52, 56],
          betbonusnumbers: [12, 4],
        }],
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: '',
          data: {
            balances: {
              balance: 750,
              currency: 'EUR',
              freelines: 0,
            },
          },
        });
      })
      .expect(200));

  it('can post create paid tickets bet', () =>
    request(app)
      .post('/api/v1/lottobackend/ticket/buy')
      .set('Cookie', `sessionId=${sessionId}`)
      .send({
        gameid: 'testGame1',
        drawings: 1,
        details: [{
          ordernr: 0,
          betnumbers: [7, 19, 26, 38, 56],
          betbonusnumbers: [14, 6],
        },
        {
          ordernr: 1,
          betnumbers: [8, 22, 45, 53, 57],
          betbonusnumbers: [12, 4],
        }],
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: '',
          data: {
            balances: {
              balance: 250,
              currency: 'EUR',
              freelines: 0,
            },
          },
        });
      })
      .expect(200));

  it('can fail when overbetting too much', () =>
    request(app)
      .post('/api/v1/lottobackend/ticket/buy')
      .set('Cookie', `sessionId=${sessionId}`)
      .send({
        gameid: 'testGame1',
        drawings: 1,
        details: [{
          ordernr: 0,
          betnumbers: [5, 17, 24, 36, 54],
          betbonusnumbers: [13, 5],
        },
        {
          ordernr: 1,
          betnumbers: [6, 20, 43, 51, 55],
          betbonusnumbers: [11, 3],
        }],
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: 'general.error.nomoney',
        });
      })
      .expect(400));

  it('can get player\'s bets', async () => {
    await request(app)
      .get('/api/v1/lottobackend/tickets/')
      .set('Cookie', `sessionId=${sessionId}`)
      .expect((res) => {
        expect(res.body).to.containSubset({
          message: '',
          data: [{
            gameName: 'Test Game 1',
            gameDate: null,
            price: 500,
            totalwin: 0,
            winningnumbers: null,
            winningbonusnumbers: null,
            currentjackpot: 29000000,
            currency: 'EUR',
            details: [
              {
                numbers: [7, 19, 26, 38, 56],
                bonusnumbers: [14, 6],
                win: null,
              },
              {
                numbers: [8, 22, 45, 53, 57],
                bonusnumbers: [12, 4],
                win: null,
              },
            ],
          },
          {
            gameName: 'Test Game 1',
            gameDate: null,
            price: 250,
            totalwin: 0,
            winningnumbers: null,
            winningbonusnumbers: null,
            currentjackpot: 29000000,
            currency: 'EUR',
            details: [
              {
                numbers: [6, 18, 25, 37, 55],
                bonusnumbers: [14, 6],
                win: null,
              },
              {
                numbers: [7, 21, 44, 52, 56],
                bonusnumbers: [12, 4],
                win: null,
              },
            ],
          },
          {
            gameName: 'Test Game 1',
            gameDate: null,
            price: 0,
            totalwin: 0,
            winningnumbers: null,
            winningbonusnumbers: null,
            currentjackpot: 29000000,
            currency: 'EUR',
            details: [
              {
                numbers: [5, 17, 24, 36, 54],
                bonusnumbers: [13, 5],
                win: null,
              },
              {
                numbers: [6, 20, 43, 51, 55],
                bonusnumbers: [11, 3],
                win: null,
              },
            ],
          }],
        });
      })
      .expect(200);

    const playerBalance = await client.getBalance(playerId);
    expect(playerBalance).to.deep.equal({
      realBalance: 250,
      balance: 250,
      bonusBalance: 0,
      currencyId: 'EUR',
    });
  });

  it('can post drawing-winners', async () => {
    const results = await db.getGameResults(playerId);
    await request(app)
      .post('/api/v1/lottowarehouse')
      .send({
        request_type: 'drawing-winners',
        secret: config.providers.lottoWarehouse.secretKey,
        data: {
          batchnumber: 1,
          drawid: 88888,
          is_last_batch: 1,
          winners: [
            {
              betid: 1108652,
              correctnumbers: 3,
              correctextranumbers: 0,
              correctbonusnumbers: 1,
              correctrefundnumbers: 0,
              payout: 100,
              payoutcurrency: 'USD',
              payoutusercurrency: 89.55,
              usercurrency: 'EUR',
              drawingsremaining: 0,
              externalid: `${playerId}${results[0].lineid}`,
              externaluserid: String(playerId),
            },
            {
              betid: 1108653,
              correctnumbers: 3,
              correctextranumbers: 0,
              correctbonusnumbers: 1,
              correctrefundnumbers: 0,
              payout: 100,
              payoutcurrency: 'USD',
              payoutusercurrency: 89.55,
              usercurrency: 'EUR',
              drawingsremaining: 0,
              externalid: `${playerId}${results[1].lineid}`,
              externaluserid: String(playerId),
            },
            {
              betid: 1108654,
              correctnumbers: 3,
              correctextranumbers: 0,
              correctbonusnumbers: 1,
              correctrefundnumbers: 0,
              payout: 100,
              payoutcurrency: 'USD',
              payoutusercurrency: 89.55,
              usercurrency: 'EUR',
              drawingsremaining: 0,
              externalid: `${playerId}${results[2].lineid}`,
              externaluserid: String(playerId),
            },
            {
              betid: 1108655,
              correctnumbers: 3,
              correctextranumbers: 0,
              correctbonusnumbers: 1,
              correctrefundnumbers: 0,
              payout: 100,
              payoutcurrency: 'USD',
              payoutusercurrency: 89.55,
              usercurrency: 'EUR',
              drawingsremaining: 0,
              externalid: `${playerId}${results[3].lineid}`,
              externaluserid: String(playerId),
            },
            {
              betid: 1108656,
              correctnumbers: 3,
              correctextranumbers: 0,
              correctbonusnumbers: 1,
              correctrefundnumbers: 0,
              payout: 100,
              payoutcurrency: 'USD',
              payoutusercurrency: 89.55,
              usercurrency: 'EUR',
              drawingsremaining: 0,
              externalid: `${playerId}${results[4].lineid}`,
              externaluserid: String(playerId),
            },
            {
              betid: 1108657,
              correctnumbers: 3,
              correctextranumbers: 0,
              correctbonusnumbers: 1,
              correctrefundnumbers: 0,
              payout: 100,
              payoutcurrency: 'USD',
              payoutusercurrency: 89.55,
              usercurrency: 'EUR',
              drawingsremaining: 0,
              externalid: `${playerId}${results[5].lineid}`,
              externaluserid: String(playerId),
            },
          ],
        },
        requestid: 6314,
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          status: 200,
          message: '',
          data: {},
        });
      })
      .expect(200);
  });

  it('can get player\'s bets after winning', async () => {
    const tickets = await db.getTicketLinesWithoutDrawing();
    expect(tickets.length).to.be.equal(11);

    await Promise.all(tickets.map(ticket => nock('https://api-cs.lottowarehouse.com')
      .get(`/api/v2/ticket/${ticket.playerid}${ticket.lineid}`)
      .reply(200, {
        code: 200,
        message: '',
        data: {
          orderstatus: 'ok',
          createdate: '2018-05-16 12:03:08',
          drawings: [{
            drawid: 88888,
            gametypeid: 888,
            winningscalculated: 0,
            accepted: 0,
            verified: 0,
            drawutcdatetime: '2018-11-09T20:00:00.000Z',
          }],
        },
      })));

    await updateTicketsJob();

    await request(app)
      .get('/api/v1/lottobackend/tickets/')
      .set('Cookie', `sessionId=${sessionId}`)
      .expect((res) => {
        expect(res.body).to.containSubset({
          message: '',
          data: [{
            gameName: 'Test Game 1',
            gameDate: '2018-11-09T20:00:00.000Z',
            price: 500,
            totalwin: 17910,
            winningnumbers: [5, 15, 21, 34, 45],
            winningbonusnumbers: [2, 6],
            currentjackpot: 29000000,
            currency: 'EUR',
            details: [
              {
                numbers: [7, 19, 26, 38, 56],
                bonusnumbers: [14, 6],
                win: 8955,
              },
              {
                numbers: [8, 22, 45, 53, 57],
                bonusnumbers: [12, 4],
                win: 8955,
              },
            ],
          },
          {
            gameName: 'Test Game 1',
            gameDate: '2018-11-09T20:00:00.000Z',
            price: 250,
            totalwin: 17910,
            winningnumbers: [5, 15, 21, 34, 45],
            winningbonusnumbers: [2, 6],
            currentjackpot: 29000000,
            currency: 'EUR',
            details: [
              {
                numbers: [6, 18, 25, 37, 55],
                bonusnumbers: [14, 6],
                win: 8955,
              },
              {
                numbers: [7, 21, 44, 52, 56],
                bonusnumbers: [12, 4],
                win: 8955,
              },
            ],
          },
          {
            gameName: 'Test Game 1',
            gameDate: '2018-11-09T20:00:00.000Z',
            price: 0,
            totalwin: 17910,
            winningnumbers: [5, 15, 21, 34, 45],
            winningbonusnumbers: [2, 6],
            currentjackpot: 29000000,
            currency: 'EUR',
            details: [
              {
                numbers: [5, 17, 24, 36, 54],
                bonusnumbers: [13, 5],
                win: 8955,
              },
              {
                numbers: [6, 20, 43, 51, 55],
                bonusnumbers: [11, 3],
                win: 8955,
              },
            ],
          }],
        });
      })
      .expect(200);

    const playerBalance = await client.getBalance(playerId);
    expect(playerBalance).to.deep.equal({
      realBalance: 53980,
      bonusBalance: 0,
      currencyId: 'EUR',
      balance: 53980,
    });
  });

  it('can set player free lines again', async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'LW',
        initialBalance: 0,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = res.body.playerId;
      })
      .expect(200);

    await request(appCasino)
      .post(`/api/v1/lottocasino/freelines/${playerId}/testGame1/2`)
      .expect(200);

    const freeLines = await db.getPlayerFreeLines(playerId, 888);
    expect(freeLines).to.deep.equal({
      freelinescount: 2,
      gametypeid: 888,
      playerid: playerId,
    });
  });

  it('can set additional free lines', async () => {
    await request(appCasino)
      .post(`/api/v1/lottocasino/freelines/${playerId}/testGame1/1`)
      .expect(200);

    const freeLines = await db.getPlayerFreeLines(playerId, 888);
    expect(freeLines).to.deep.equal({
      freelinescount: 3,
      gametypeid: 888,
      playerid: playerId,
    });
  });

  it('can buy free tickets', () =>
    request(app)
      .post('/api/v1/lottobackend/ticket/buy')
      .set('Cookie', `sessionId=${sessionId}`)
      .send({
        gameid: 'testGame1',
        drawings: 1,
        details: [{
          ordernr: 0,
          betnumbers: [7, 19, 26, 38, 56],
          betbonusnumbers: [14, 6],
        },
        {
          ordernr: 1,
          betnumbers: [8, 22, 45, 53, 57],
          betbonusnumbers: [12, 4],
        }],
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: '',
          data: {
            balances: {
              balance: 0,
              currency: 'EUR',
              freelines: 1,
            },
          },
        });
      })
      .expect(200));

  it('can fail to buy more than can', () =>
    request(app)
      .post('/api/v1/lottobackend/ticket/buy')
      .set('Cookie', `sessionId=${sessionId}`)
      .send({
        gameid: 'testGame1',
        drawings: 1,
        details: [{
          ordernr: 0,
          betnumbers: [7, 19, 26, 38, 56],
          betbonusnumbers: [14, 6],
        },
        {
          ordernr: 1,
          betnumbers: [8, 22, 45, 53, 57],
          betbonusnumbers: [12, 4],
        }],
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: 'general.error.nomoney',
        });
      })
      .expect(400));

  it('can keep free lines', () =>
    request(app)
      .get('/api/v1/lottobackend/game/testGame1')
      .set('Cookie', `sessionId=${sessionId}`)
      .expect((res) => {
        expect(res.body).to.containSubset({
          data: {
            balances: {
              balance: 0,
              currency: 'EUR',
              freelines: 1,
            },
          },
        });
      })
      .expect(200));

  it('can set free lines to blocket player', async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'LW',
        initialBalance: 0,
        gamePlayerBlocked: true,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = res.body.playerId;
      })
      .expect(200);

    await request(appCasino)
      .post(`/api/v1/lottocasino/freelines/${playerId}/testGame1/2`)
      .expect(200);

    const freeLines = await db.getPlayerFreeLines(playerId, 888);
    expect(freeLines).to.deep.equal({
      freelinescount: 2,
      gametypeid: 888,
      playerid: playerId,
    });
  });

  it('can fail to buy tickets when player is blocked', () =>
    request(app)
      .post('/api/v1/lottobackend/ticket/buy')
      .set('Cookie', `sessionId=${sessionId}`)
      .send({
        gameid: 'testGame1',
        drawings: 1,
        details: [{
          ordernr: 0,
          betnumbers: [7, 19, 26, 38, 56],
          betbonusnumbers: [14, 6],
        },
        {
          ordernr: 1,
          betnumbers: [8, 22, 45, 53, 57],
          betbonusnumbers: [12, 4],
        }],
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: 'general.error',
        });
      })
      .expect(400));

  it('can keep free lines when failed agains the backend', () =>
    request(app)
      .get('/api/v1/lottobackend/game/testGame1')
      .set('Cookie', `sessionId=${sessionId}`)
      .expect((res) => {
        expect(res.body).to.containSubset({
          data: {
            balances: {
              balance: 0,
              currency: 'EUR',
              freelines: 2,
            },
          },
        });
      })
      .expect(200));
});
