/* @flow */
require('../../test-scripts/nock');

const request = require('supertest');  

const app = require('../../app');
const config = require('../../config');
const db = require('../../db');
const { updateGamesJob, updatePayoutsJob } = require('../lotto-warehouse-jobs');

describe('Lotto Warehouse API', () => {
  before(async () => {
    await clean.tickets();
    await clean.drawings();
    await clean.gameTypes();

    await updateGamesJob();

    await updatePayoutsJob();
    await updatePayoutsJob();
  });

  it('can fail posting with wrong secretKey', async () => {
    await request(app)
      .post('/api/v1/lottowarehouse')
      .send({
        request_type: 'fx-update',
        secret: 'wrong_key',
        data: {
          currencies: [{
            currency_code: 'USD',
            fx_rate: '1.333900000000',
          },
          {
            currency_code: 'EUR',
            fx_rate: '1.000000000000',
          },
          {
            currency_code: 'BTC',
            fx_rate: '0.000094419900',
          },
          ],
        },
        requestid: 6314,
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          message: 'general.error',
        });
      })
      .expect(401);
  });

  it('can post fx-update', async () => {
    await request(app)
      .post('/api/v1/lottowarehouse')
      .send({
        request_type: 'fx-update',
        secret: config.providers.lottoWarehouse.secretKey,
        data: {
          currencies: [{
            currency_code: 'USD',
            fx_rate: '1.333900000000',
          },
          {
            currency_code: 'EUR',
            fx_rate: '1.000000000000',
          },
          {
            currency_code: 'BTC',
            fx_rate: '0.000094419900',
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

    const usd = await db.getCurrency('USD');
    expect(usd.fx_rate).to.be.equal('1.333900000000');

    const btc = await db.getCurrency('BTC');
    expect(btc.fx_rate).to.be.equal('0.000094419900');
  });

  it('can post gametype-update', async () => {
    await request(app)
      .post('/api/v1/lottowarehouse')
      .send({
        request_type: 'gametype-update',
        secret: config.providers.lottoWarehouse.secretKey,
        data: {
          gametypeid: '888',
          name: 'Test Game 1',
          currency: 'EUR',
          cutoffhours: '2',
          isplayable: '1',
          country: 'Europe',
          continent: 'Europe',
          numbers: '5',
          numbermin: '1',
          numbermax: '50',
          extranumbers: '0',
          bonusnumbers: '2',
          bonusnumbermin: '1',
          bonusnumbermax: '12',
          refundnumbers: '0',
          refundnumbermin: '1',
          refundnumbermax: '1',
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

    await request(app)
      .post('/api/v1/lottowarehouse')
      .send({
        request_type: 'gametype-update',
        secret: config.providers.lottoWarehouse.secretKey,
        data: {
          gametypeid: '889',
          name: 'Test Game 2',
          currency: 'USD',
          cutoffhours: '2',
          isplayable: '0',
          country: 'USA',
          continent: 'North America',
          numbers: '5',
          numbermin: '1',
          numbermax: '70',
          extranumbers: '0',
          bonusnumbers: '1',
          bonusnumbermin: '1',
          bonusnumbermax: '25',
          refundnumbers: '0',
          refundnumbermin: '1',
          refundnumbermax: '1',
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
      bonusnumbersperrow: 9,
      numbersperrow: 10,
      drawdatelocal: new Date('2018-11-09T20:00:00.000Z'),
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
      bonusnumbersperrow: 9,
      numbersperrow: 10,
      drawdatelocal: new Date('2018-11-09T20:00:00.000Z'),
    });
  });

  it('can post not played drawing-update', async () => {
    await request(app)
      .post('/api/v1/lottowarehouse')
      .send({
        request_type: 'drawing-update',
        secret: config.providers.lottoWarehouse.secretKey,
        data: {
          drawid: 88888,
          gametypeid: 888,
          drawdateutc: '2018-11-09T20:00:00+00:00',
          drawdatelocal: '2018-11-09T19:00:00-01:00',
          jackpotsize: 29000000,
          jackpotcurrency: 'EUR',
          numbers: [],
          extranumbers: [],
          bonusnumbers: [],
          refundnumbers: [],
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

    const drawing = await db.getDrawing(88888);

    expect(drawing).to.deep.equal({
      drawid: 88888,
      gametypeid: 888,
      jackpotsize: 29000000,
      jackpotcurrency: 'EUR',
      drawdatelocal: new Date('2018-11-09T19:00:00-01:00'),
      drawdateutc: new Date('2018-11-09T20:00:00+00:00'),
      numbers: [],
      extranumbers: [],
      bonusnumbers: [],
      refundnumbers: [],
      acceptingbets: 0,
      cutoff: new Date('2018-11-09T18:00:00.000Z'),
      jackpotBooster1: 0,
      jackpotBooster2: 0,
      winningscalculated: 1,
    });
  });

  it('can post played drawing-update', async () => {
    await request(app)
      .post('/api/v1/lottowarehouse')
      .send({
        request_type: 'drawing-update',
        secret: config.providers.lottoWarehouse.secretKey,
        data: {
          drawid: 88888,
          gametypeid: 888,
          drawdateutc: '2018-11-09T20:00:00+00:00',
          drawdatelocal: '2018-11-09T19:00:00-01:00',
          jackpotsize: 29000000,
          jackpotcurrency: 'EUR',
          numbers: [5, 22, 45, 47, 54],
          extranumbers: [],
          bonusnumbers: [5, 10],
          refundnumbers: [],
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

    const drawing = await db.getDrawing(88888);

    expect(drawing).to.deep.equal({
      drawid: 88888,
      gametypeid: 888,
      jackpotsize: 29000000,
      jackpotcurrency: 'EUR',
      drawdatelocal: new Date('2018-11-09T19:00:00-01:00'),
      drawdateutc: new Date('2018-11-09T20:00:00+00:00'),
      numbers: [5, 22, 45, 47, 54],
      extranumbers: [],
      bonusnumbers: [5, 10],
      refundnumbers: [],
      acceptingbets: 0,
      cutoff: new Date('2018-11-09T18:00:00.000Z'),
      jackpotBooster1: 0,
      jackpotBooster2: 0,
      winningscalculated: 1,
    });
  });

  it('can post drawing-payout-table', async () => {
    await request(app)
      .post('/api/v1/lottowarehouse')
      .send({
        request_type: 'drawing-payout-table',
        secret: config.providers.lottoWarehouse.secretKey,
        data: {
          drawid: 88888,
          payout_table: [{
            numbers: 5,
            extranumbers: 0,
            bonusnumbers: 2,
            refundnumbers: 0,
            probability: 139838160,
            payout: '0.00',
            payoutcurrency: 'EUR',
            sortorder: 1,
            id: 123,
          },
          {
            numbers: 5,
            extranumbers: 0,
            bonusnumbers: 1,
            refundnumbers: 0,
            probability: 6991908,
            payout: '283168.00',
            payoutcurrency: 'EUR',
            sortorder: 2,
            id: 124,
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

    const payoutTable = await db.getPayoutTable(88888);
    expect(payoutTable.length).to.be.equal(2);
    expect(payoutTable).to.containSubset([{
      drawid: 88888,
      numbers: 5,
      extranumbers: 0,
      bonusnumbers: 2,
      refundnumbers: 0,
      probability: 139838160,
      payout: 0.00,
      payoutcurrency: 'EUR',
      sortorder: 1,
      id: 123,
    },
    {
      drawid: 88888,
      numbers: 5,
      extranumbers: 0,
      bonusnumbers: 1,
      refundnumbers: 0,
      probability: 6991908,
      payout: 283168,
      payoutcurrency: 'EUR',
      sortorder: 2,
      id: 124,
    }]);
  });

  // it('can post drawing-winners', async () => {
  //   await request(app)
  //     .post('/api/v1/lottowarehouse')
  //     .send({
  //       request_type: 'drawing-winners',
  //       secret: config.providers.lottoWarehouse.secretKey,
  //       data: {
  //         batchnumber: 10,
  //         drawid: 88888,
  //         is_last_batch: 1,
  //         winners: [{
  //           betid: 1108652,
  //           correctnumbers: 3,
  //           correctextranumbers: 0,
  //           correctbonusnumbers: 1,
  //           correctrefundnumbers: 0,
  //           payout: 100.00,
  //           payoutcurrency: 'USD',
  //           payoutusercurrency: 89.55,
  //           usercurrency: 'EUR',
  //           drawingsremaining: 0,
  //           externalid: '7806677',
  //           externaluserid: '1001',
  //         },
  //         {
  //           betid: 1108653,
  //           correctnumbers: 0,
  //           correctextranumbers: 0,
  //           correctbonusnumbers: 0,
  //           correctrefundnumbers: 0,
  //           payout: 0,
  //           payoutcurrency: 'USD',
  //           payoutusercurrency: 0,
  //           usercurrency: 'EUR',
  //           drawingsremaining: 2,
  //           externalid: '7806679',
  //           externaluserid: '1001',
  //         },
  //         {
  //           betid: 1108654,
  //           correctnumbers: 1,
  //           correctextranumbers: 0,
  //           correctbonusnumbers: 0,
  //           correctrefundnumbers: 0,
  //           payout: 0,
  //           payoutcurrency: 'USD',
  //           payoutusercurrency: 0,
  //           usercurrency: 'EUR',
  //           drawingsremaining: 0,
  //           externalid: '7806694',
  //           externaluserid: '1002',
  //         },
  //         ],
  //       },
  //       requestid: 6314,
  //     })
  //     .expect((res) => {
  //       expect(res.body).to.deep.equal({
  //         status: 200,
  //         message: '',
  //         data: {},
  //       });
  //     })
  //     .expect(200);
  //
  //   const winnings = await db.getWinnings();
  //   expect(winnings.length).to.be.equal(3);
  //   expect(winnings).to.deep.equal([{
  //     betid: 1108652,
  //     drawid: 88888,
  //     correctnumbers: 3,
  //     correctextranumbers: 0,
  //     correctbonusnumbers: 1,
  //     correctrefundnumbers: 0,
  //     payout: 10000,
  //     payoutcurrency: 'USD',
  //     payoutusercurrency: 8955,
  //     usercurrency: 'EUR',
  //     drawingsremaining: 0,
  //     externalid: '7806677',
  //     externaluserid: '1001',
  //   },
  //   {
  //     betid: 1108653,
  //     drawid: 88888,
  //     correctnumbers: 0,
  //     correctextranumbers: 0,
  //     correctbonusnumbers: 0,
  //     correctrefundnumbers: 0,
  //     payout: 0,
  //     payoutcurrency: 'USD',
  //     payoutusercurrency: 0,
  //     usercurrency: 'EUR',
  //     drawingsremaining: 2,
  //     externalid: '7806679',
  //     externaluserid: '1001',
  //   },
  //   {
  //     betid: 1108654,
  //     drawid: 88888,
  //     correctnumbers: 1,
  //     correctextranumbers: 0,
  //     correctbonusnumbers: 0,
  //     correctrefundnumbers: 0,
  //     payout: 0,
  //     payoutcurrency: 'USD',
  //     payoutusercurrency: 0,
  //     usercurrency: 'EUR',
  //     drawingsremaining: 0,
  //     externalid: '7806694',
  //     externaluserid: '1002',
  //   },
  //   ]);
  // });
});
