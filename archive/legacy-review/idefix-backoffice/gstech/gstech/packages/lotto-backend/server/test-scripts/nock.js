/* @flow */
const nock = require('nock');  
// nock.recorder.rec();

nock('https://api-cs.lottowarehouse.com')
  .get('/api/v2/gametypes/list')
  .times(7)
  .reply(200, {
    code: 200,
    message: '',
    data: {
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
    },
  });

nock('https://api-cs.lottowarehouse.com')
  .get('/api/v2/drawings/details/88888')
  .times(7)
  .reply(200, {
    code: 200,
    message: '',
    data: {
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
    },
  });

nock('https://api-cs.lottowarehouse.com')
  .get('/api/v2/drawings/details/88889')
  .times(10)
  .reply(200, {
    code: 200,
    message: '',
    data: {
      drawid: 88889,
      gametypeid: 889,
      jackpotsize: 90000000,
      jackpotcurrency: 'USD',
      winningscalculated: 0,
      drawdatelocal: '2018-11-09T19:00:00-01:00',
      drawdateutc: '2018-11-09T20:00:00+00:00',
      numbers: {
        numbers: [],
        extranumbers: [],
        bonusnumbers: [],
        refundnumbers: [],
      },
      jackpotBooster1: 0,
      jackpotBooster2: 0,
      acceptingbets: 1,
      cutoff: '2018-11-09T18:00:00+00:00',
    },
  });

nock('https://api-cs.lottowarehouse.com')
  .get('/api/v2/drawings/details/88889')
  .reply(200, {
    code: 200,
    message: '',
    data: {
      drawid: 88889,
      gametypeid: 889,
      jackpotsize: 90000000,
      jackpotcurrency: 'USD',
      winningscalculated: 0,
      drawdatelocal: '2018-11-09T19:00:00-01:00',
      drawdateutc: '2018-11-09T20:00:00+00:00',
      numbers: {
        numbers: [],
        extranumbers: [],
        bonusnumbers: [],
        refundnumbers: [],
      },
      jackpotBooster1: 0,
      jackpotBooster2: 0,
      acceptingbets: 1,
      cutoff: '2018-11-09T18:00:00+00:00',
    },
  });

nock('https://api-cs.lottowarehouse.com')
  .get('/api/v2/drawing-schedules/list', () => true)
  .times(2)
  .reply(200, {
    code: 200,
    message: '',
    data: {
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
    },
  });

nock('https://api-cs.lottowarehouse.com')
  .get('/api/v2/drawings/payout-table/88888', () => true)
  .times(8)
  .reply(200, {
    code: 200,
    message: '',
    data: {
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
    },
  });

nock('https://api-cs.lottowarehouse.com')
  .get('/api/v2/drawings/payout-table/88889', () => true)
  .times(2)
  .reply(200, {
    code: 110,
    message: 'This drawid has not yet been resolved',
    data: null,
  });

nock('https://api-cs.lottowarehouse.com')
  .post('/api/v2/bets/create', () => true)
  .times(10)
  .reply(200, {
    code: 200,
    message: '',
    data: {
      statuses: [
        { externalid: '12345678', status: 'ok' },
        { externalid: '12345679', status: 'ok' },
        { externalid: '12345179', status: 'ok' },
      ],
    },
  });

nock('https://api-cs.lottowarehouse.com')
  .get('/api/v2/ticket/123456789')
  .times(8)
  .reply(200, {
    code: 200,
    message: '',
    data: {
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
    },
  });
