/* @flow */
require('../../test-scripts/nock');
const nock = require('nock');  
const request = require('supertest');  

const app = require('../../app');
const db = require('../../db');
const config = require('../../config');
const { updateGamesJob, updateDrawingsJob, updatePayoutsJob, updateSchedulesJob, updateTicketsJob } = require('./index');

describe('Lotto Warehouse Jobs', () => {
  let sessionId;
  let playerId;
  before(async () => {
    await clean.tickets();
    await clean.drawings();
    await clean.gameTypes();
  });

  it('can do update games job', async () => {
    await updateGamesJob();

    const testGame1 = await db.getGameType(888);
    const testGame2 = await db.getGameType(889);

    expect(testGame1).to.deep.equal({
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
      gameid: null,
      drawdatelocal: new Date('2018-11-09T20:00:00.000Z'),
      numbersperrow: 10,
      bonusnumbersperrow: 9,
    });

    expect(testGame2).to.deep.equal({
      gametypeid: 889,
      name: 'Test Game 2',
      cutoffhours: 2,
      currency: 'USD',
      country: 'USA',
      isplayable: 0,
      numberscount: 5,
      extranumberscount: 0,
      bonusnumberscount: 1,
      refundnumberscount: 0,
      numbermin: 1,
      numbermax: 70,
      bonusnumbermin: 1,
      bonusnumbermax: 25,
      refundnumbermin: 1,
      refundnumbermax: 1,
      currentjackpot: 90000000,
      nextdrawid: 88889,
      gameid: null,
      drawdatelocal: new Date('2018-11-09T20:00:00.000Z'),
      numbersperrow: 10,
      bonusnumbersperrow: 9,
    });
  });

  it('can do update drawings job', async () => {
    await updateDrawingsJob();

    const drawing1 = await db.getDrawing(88888);
    const drawing2 = await db.getDrawing(88889);

    expect(drawing1).to.deep.equal({
      drawid: 88888,
      gametypeid: 888,
      jackpotsize: 29000000,
      jackpotcurrency: 'EUR',
      winningscalculated: 1,
      drawdatelocal: new Date('2018-11-09T19:00:00-01:00'),
      drawdateutc: new Date('2018-11-09T20:00:00+00:00'),
      numbers: [5, 15, 21, 34, 45],
      extranumbers: [],
      bonusnumbers: [2, 6],
      refundnumbers: [],
      jackpotBooster1: 0,
      jackpotBooster2: 0,
      acceptingbets: 0,
      cutoff: new Date('2018-11-09T18:00:00+00:00'),
    });

    expect(drawing2).to.deep.equal({
      drawid: 88889,
      gametypeid: 889,
      jackpotsize: 90000000,
      jackpotcurrency: 'USD',
      winningscalculated: 0,
      drawdatelocal: new Date('2018-11-09T19:00:00-01:00'),
      drawdateutc: new Date('2018-11-09T20:00:00+00:00'),
      numbers: [],
      extranumbers: [],
      bonusnumbers: [],
      refundnumbers: [],
      jackpotBooster1: 0,
      jackpotBooster2: 0,
      acceptingbets: 1,
      cutoff: new Date('2018-11-09T18:00:00+00:00'),
    });
  });

  it('can do update payouts job', async () => {
    await updatePayoutsJob();
    await updatePayoutsJob();

    const payoutTable = await db.getPayoutTable(88888);
    expect(payoutTable.length).to.be.equal(2);
    expect(payoutTable).containSubset([
      {
        drawid: 88888,
        numbers: 5,
        extranumbers: 0,
        bonusnumbers: 2,
        refundnumbers: 0,
        probability: 139838160,
        payout: 0.00,
        payoutcurrency: 'EUR',
        sortorder: 1,
      },
      {
        drawid: 88888,
        numbers: 5,
        extranumbers: 0,
        bonusnumbers: 1,
        refundnumbers: 0,
        probability: 6991908,
        payout: 283168, // should be 283167.50
        payoutcurrency: 'EUR',
        sortorder: 2,
      },
    ]);
  });

  it('can do update schedule job', async () => {
    await updateSchedulesJob();

    const schedule1 = await db.getDrawingSchedule(888);
    const schedule2 = await db.getDrawingSchedule(889);

    expect(schedule1).to.deep.equal(
      {
        gametypeid: 888,
        dayofweek: 2,
        drawingtimeutc: '20:00:00',
        localtimeoffset: '01:00:00',
        drawingtimelocal: '21:00:00',
        drawingtimezone: 'Europe/Paris',
      },
    );

    expect(schedule2).to.deep.equal(
      {
        gametypeid: 889,
        dayofweek: 5,
        drawingtimeutc: '20:00:00',
        localtimeoffset: '01:00:00',
        drawingtimelocal: '21:00:00',
        drawingtimezone: 'Europe/Paris',
      },
    );
  });

  it('can do update tickets job', async () => {
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

    await db.insertGameId({ gametypeid: 888, gameid: 'testGame1' });
    await db.insertGameId({ gametypeid: 889, gameid: 'testGame2' });
    await db.upsertTicketPrice({ gametypeid: 888, currencycode: 'EUR', priceperrow: 250 });

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
      .expect(200);

    const tickets = await db.getTicketLinesWithoutDrawing();
    expect(tickets.length).to.be.equal(2);

    await Promise.all(tickets.map(ticket => nock('https://api-cs.lottowarehouse.com')
      .get(`/api/v2/ticket/${playerId}${ticket.lineid}`)
      .reply(200, {
        code: 200,
        message: '',
        data: {
          orderstatus: 'ok',
          createdate: '2018-05-16 12:03:08',
          drawings: [{
            drawid: 66666,
            gametypeid: 888,
            winningscalculated: 0,
            accepted: 0,
            verified: 0,
            drawutcdatetime: '2018-05-22T20:00:00+00:00',
          }],
        },
      })));

    await updateTicketsJob();

    const notickets = await db.getTicketLinesWithoutDrawing();
    expect(notickets.length).to.be.equal(0);
  });
});
