/* @flow */
const request = require('supertest');  
const nock = require('nock');  

const client = require('gstech-core/modules/clients/backend-wallet-api');
const app = require('../../app');
const config = require('../../config');
const { updateGamesJob, updateDrawingsJob, updateTicketsJob, updatePayoutsJob } = require('../lotto-warehouse-jobs');
const db = require('../../db');

require('../../test-scripts/nock');

describe('Lotto Backend API (blocked user)', () => {
  let sessionId;

  before(async () => {
    await clean.tickets();
    await clean.drawings();
    await clean.gameTypes();

    await updateGamesJob();
    await updateDrawingsJob();

    await db.insertGameId({ gametypeid: 888, gameid: 'testGame1' });
    await db.upsertTicketPrice({ gametypeid: 888, currencycode: 'EUR', priceperrow: 250 });

    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'LW',
        initialBalance: 1000,
        gamePlayerBlocked: true,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
      })
      .expect(200);
  });

  it('can fail when bet too much', () =>
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
          message: 'general.error',
        });
      })
      .expect(400));
});

describe('Lotto Backend API', () => {
  let sessionId;
  let playerId;
  before(async () => {
    await clean.tickets();
    await clean.drawings();
    await clean.gameTypes();

    await updateGamesJob();
    await updateDrawingsJob();

    await updatePayoutsJob();
    await updatePayoutsJob();

    await db.insertGameId({ gametypeid: 888, gameid: 'testGame1' });
    await db.upsertTicketPrice({ gametypeid: 888, currencycode: 'EUR', priceperrow: 250 });

    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'LW',
        initialBalance: 1000,
        initialBonusBalance: 2000,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = res.body.playerId;
      })
      .expect(200);
  });

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
              balance: 3000,
              currency: 'EUR',
              freelines: 0,
            },
          },
        });
      })
      .expect(200));

  it('can get not found game', () =>
    request(app)
      .get('/api/v1/lottobackend/game/999999')
      .set('Cookie', `sessionId=${sessionId}`)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: 'general.error',
        });
      })
      .expect(404));

  it('can get not found game (non-number)', () =>
    request(app)
      .get('/api/v1/lottobackend/game/nonmumeric')
      .set('Cookie', `sessionId=${sessionId}`)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: 'general.error',
        });
      })
      .expect(404));


  it('can get no payout for not found game', () =>
    request(app)
      .get('/api/v1/lottobackend/payout/norealgame')
      .set('Cookie', `sessionId=${sessionId}`)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: 'general.error',
        });
      })
      .expect(404));

  it('can get payout table', () =>
    request(app)
      .get('/api/v1/lottobackend/payout/testGame1')
      .set('Cookie', `sessionId=${sessionId}`)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: '',
          data: {
            payoutTable: [{
              sortOrder: 1,
              match: '5+2',
              winningOdds: '1:139838160',
            }, {
              sortOrder: 2,
              match: '5+1',
              winningOdds: '1:6991908',
            }],
          },
        });
      })
      .expect(200));

  it('can get player\'s bets', () =>
    request(app)
      .get('/api/v1/lottobackend/tickets/')
      .set('Cookie', `sessionId=${sessionId}`)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: '',
          data: [],
        });
      })
      .expect(200));

  it('can post create bet', async () => {
    await request(app)
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
          betnumbers: [5, 22, 45, 47, 54],
          betbonusnumbers: [5, 10],
        },
        {
          ordernr: 2,
          betnumbers: [6, 20, 43, 51, 55],
          betbonusnumbers: [11, 3],
        }],
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: '',
          data: {
            balances: {
              balance: 2250,
              currency: 'EUR',
              freelines: 0,
            },
          },
        });
      })
      .expect(200);

    const tickets = await db.getTicketLinesWithoutDrawing();
    expect(tickets.length).to.be.equal(3);
    expect(tickets[0].username).to.be.equal(`LD_Jack.Sparrow_${playerId}`);

    await Promise.all(tickets.map(ticket => nock('https://api-cs.lottowarehouse.com')
      .get(`/api/v2/ticket/${playerId}${ticket.lineid}`)
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
            drawutcdatetime: '2018-05-22T20:00:00+00:00',
          }],
        },
      })));

    await updateTicketsJob();
  });

  it('can fail when bet too much', () =>
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

  it('can get player\'s bets', () =>
    request(app)
      .get('/api/v1/lottobackend/tickets/')
      .set('Cookie', `sessionId=${sessionId}`)
      .expect((res) => {
        expect(res.body).to.containSubset({
          message: '',
          data: [{
            gameName: 'Test Game 1',
            gameDate: '2018-05-22T20:00:00.000Z',
            price: 750,
            totalwin: 0,
            winningnumbers: [5, 15, 21, 34, 45],
            winningbonusnumbers: [2, 6],
            currentjackpot: 29000000,
            currency: 'EUR',
            details: [{
              numbers: [5, 17, 24, 36, 54],
              bonusnumbers: [13, 5],
              win: null,
            },
            {
              numbers: [5, 22, 45, 47, 54],
              bonusnumbers: [5, 10],
              win: null,
            },
            {
              numbers: [6, 20, 43, 51, 55],
              bonusnumbers: [11, 3],
              win: null,
            }],
          }],
        });
      })
      .expect(200));

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
              payout: 0,
              payoutcurrency: 'USD',
              payoutusercurrency: 0,
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
              payout: 100.00,
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
              payout: 0,
              payoutcurrency: 'USD',
              payoutusercurrency: 0,
              usercurrency: 'EUR',
              drawingsremaining: 0,
              externalid: `${playerId}${results[2].lineid}`,
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

  it('can get player\'s bets', async () => {
    await request(app)
      .get('/api/v1/lottobackend/tickets/')
      .set('Cookie', `sessionId=${sessionId}`)
      .expect((res) => {
        expect(res.body).to.containSubset({
          message: '',
          data: [{
            gameName: 'Test Game 1',
            gameDate: '2018-05-22T20:00:00.000Z',
            price: 750,
            totalwin: 8955,
            winningnumbers: [5, 15, 21, 34, 45],
            winningbonusnumbers: [2, 6],
            currentjackpot: 29000000,
            currency: 'EUR',
            details: [{
              numbers: [5, 17, 24, 36, 54],
              bonusnumbers: [13, 5],
              win: 0,
            },
            {
              numbers: [5, 22, 45, 47, 54],
              bonusnumbers: [5, 10],
              win: 8955,
            },
            {
              numbers: [6, 20, 43, 51, 55],
              bonusnumbers: [11, 3],
              win: 0,
            }],
          }],
        });
      })
      .expect(200);

    const playerBalance = await client.getBalance(playerId);
    expect(playerBalance).to.deep.equal({
      balance: 11205,
      realBalance: 250,
      bonusBalance: 10955,
      currencyId: 'EUR',
    });
  });

  it('can post last create bet', () =>
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
        }],
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: '',
          data: {
            balances: {
              balance: 10955,
              currency: 'EUR',
              freelines: 0,
            },
          },
        });
      })
      .expect(200));
});
