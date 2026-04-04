/* @flow */
require('../test-scripts/nock');

const client = require('.');

const betRequest = {
  userid: 123,
  birthdate: '1990-04-03',
  countrycode: 'DE',
  ipaddress: '83.112.98.115',
  currency: 'EUR',
  lines: [{
    id: 12345678,
    gametypeid: 1,
    drawings: 7,
    numbers: [
      {
        type: 'number',
        number: 23,
      },
      {
        type: 'number',
        number: 24,
      },
      {
        type: 'number',
        number: 25,
      },
      {
        type: 'number',
        number: 21,
      },
      {
        type: 'number',
        number: 50,
      },
      {
        type: 'bonusnumber',
        number: 2,
      },
      {
        type: 'bonusnumber',
        number: 3,
      }],
  },
  {
    id: 12345679,
    gametypeid: 1,
    drawings: 7,
    numbers: [
      {
        type: 'number',
        number: 11,
      },
      {
        type: 'number',
        number: 12,
      },
      {
        type: 'number',
        number: 13,
      },
      {
        type: 'number',
        number: 14,
      }, {
        type: 'number',
        number: 14,
      },
      {
        type: 'bonusnumber',
        number: 2,
      },
      {
        type: 'bonusnumber',
        number: 3,
      }],
  }],
};

describe('Lotto Warehouse Client', () => {
  it('can get gametypes', async () => {
    const response = await client.getGametypes();
    expect(response).to.deep.equal({
      gametypes: [
        {
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
        },
        {
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
        },
      ],
    });
    expect(200);
  });

  it('can get drawing details', async () => {
    const response = await client.getDrawingDetails(88888);
    expect(response).to.deep.equal({
      drawid: 88888,
      gametypeid: 888,
      jackpotsize: 29000000,
      jackpotcurrency: 'EUR',
      winningscalculated: 1,
      drawdatelocal: '2018-11-09T19:00:00-01:00',
      drawdateutc: '2018-11-09T20:00:00+00:00',
      numbers: {
        numbers: [5, 15, 21, 34, 45],
        extranumbers: [],
        bonusnumbers: [2, 6],
        refundnumbers: [],
      },
      jackpotBooster1: 0,
      jackpotBooster2: 0,
      acceptingbets: 0,
      cutoff: '2018-11-09T18:00:00+00:00',
    });
    expect(200);
  });

  it('can get drawing schedule', async () => {
    const response = await client.getDrawingSchedules();
    expect(response).to.deep.equal({
      schedules: [
        {
          gametypeid: 888,
          dayofweek: 2,
          drawingtimeutc: '20:00:00',
          localtimeoffset: '01:00:00',
          drawingtimelocal: '21:00:00',
          drawingtimezone: 'Europe/Paris',
        },
        {
          gametypeid: 889,
          dayofweek: 5,
          drawingtimeutc: '20:00:00',
          localtimeoffset: '01:00:00',
          drawingtimelocal: '21:00:00',
          drawingtimezone: 'Europe/Paris',
        },
      ],
    });
    expect(200);
  });

  it('can get payout table', async () => {
    const response = await client.getPayoutTable(88888);
    expect(response).to.deep.equal({
      payouttable: [
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
          payout: 283167.50,
          payoutcurrency: 'EUR',
          sortorder: 2,
        },
      ],
    });
    expect(200);
  });

  it('can create bet', async () => {
    const response = await client.createBet(betRequest);
    expect(response).to.deep.equal({
      statuses: [
        { externalid: '12345678', status: 'ok' },
        { externalid: '12345679', status: 'ok' },
        { externalid: '12345179', status: 'ok' },
      ],
    });
    expect(200);
  });

  it('can get ticket details', async () => {
    const response = await client.getTicketDetails('123456789');
    expect(response).to.deep.equal({
      orderstatus: 'ok',
      createdate: '2018-05-16 12:03:08',
      drawings: {
        drawid: 77777,
        gametypeid: 888,
        winningscalculated: 0,
        accepted: 0,
        verified: 0,
        drawutcdatetime: '2018-05-22T20:00:00+00:00',
      },
    });
    expect(200);
  });
});
