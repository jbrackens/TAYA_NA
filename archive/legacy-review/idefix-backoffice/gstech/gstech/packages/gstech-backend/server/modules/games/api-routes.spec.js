/* @flow */
const request = require('supertest');
const app = require('../../index');
const Player = require('../players/Player');
const Session = require('../sessions/Session');
const { players: { john } } = require('../../../scripts/utils/db-data');
const nock = require('nock'); // eslint-disable-line

// nock.recorder.rec();
describe('Game play disabled', () => {
  let headers;

  before(async () => {
    const { john: player } = await setup.players();
    await Player.updateAccountStatus(player.id, { allowGameplay: false }, 1);
    headers = await setup.login(app, john.email, john.password);
    const client = await Player.getClientInfo(player.id);
    const session: any = await Session.getPlayerSession('LD', player.id);
    const sessionId = session.d.id;

    await nock('http://localhost:3004', { encodedQueryParams: true })
      .post('/api/v1/LD/creditfreespins/PNG', {
        player: {
          id: player.id,
          brandId: 'LD',
          username: player.username,
          email: 'john.doe@hotmail.com',
          firstName: 'John',
          lastName: 'Doe',
          address: 'Knesebeckstraße 98',
          postCode: '48317',
          city: 'Drensteinfurt',
          mobilePhone: '493944433231',
          countryId: 'DE',
          dateOfBirth: '1985-12-14',
          languageId: 'de',
          nationalId: null,
          currencyId: 'EUR',
          allowEmailPromotions: true,
          allowSMSPromotions: true,
          gamblingProblem: false,
          accountClosed: false,
          accountSuspended: false,
          testPlayer: false,
          createdAt: player.createdAt,
          activated: true,
          verified: false,
          tcVersion: 4,
          placeOfBirth: null,
          nationality: null,
          additionalFields: null,
          affiliateRegistrationCode: null,
        },
        sessionId,
        bonusCode: '4770,310',
        client,
        games: [
          {
            manufacturerGameId: '287',
            mobileGame: true,
          },
        ],
      })
      .reply(200, { ok: true });

    await nock('http://localhost:3004', { encodedQueryParams: true })
      .post('/api/v1/LD/creditfreespins/PNG', {
        player: {
          id: player.id,
          brandId: 'LD',
          username: player.username,
          email: 'john.doe@hotmail.com',
          firstName: 'John',
          lastName: 'Doe',
          address: 'Knesebeckstraße 98',
          postCode: '48317',
          city: 'Drensteinfurt',
          mobilePhone: '493944433231',
          countryId: 'DE',
          dateOfBirth: '1985-12-14',
          languageId: 'de',
          nationalId: null,
          currencyId: 'EUR',
          allowEmailPromotions: true,
          allowSMSPromotions: true,
          gamblingProblem: false,
          accountClosed: false,
          accountSuspended: false,
          testPlayer: false,
          createdAt: player.createdAt,
          activated: true,
          verified: false,
          tcVersion: 4,
          placeOfBirth: null,
          nationality: null,
          additionalFields: null,
          affiliateRegistrationCode: null,
        },
        sessionId,
        bonusCode: '123,456',
        id: '123',
        client,
        games: [
          {
            manufacturerGameId: '287',
            mobileGame: true,
          },
        ],
      })
      .times(2)
      .reply(200, { ok: true });

    await nock('http://localhost:3004', { encodedQueryParams: true })
      .post('/api/v1/LD/creditfreespins/PNG', {
        player: {
          id: player.id,
          brandId: 'LD',
          username: player.username,
          email: 'john.doe@hotmail.com',
          firstName: 'John',
          lastName: 'Doe',
          address: 'Knesebeckstraße 98',
          postCode: '48317',
          city: 'Drensteinfurt',
          mobilePhone: '493944433231',
          countryId: 'DE',
          dateOfBirth: '1985-12-14',
          languageId: 'de',
          nationalId: null,
          currencyId: 'EUR',
          allowEmailPromotions: true,
          allowSMSPromotions: true,
          gamblingProblem: false,
          accountClosed: false,
          accountSuspended: false,
          testPlayer: false,
          createdAt: player.createdAt,
          activated: true,
          verified: false,
          tcVersion: 4,
          placeOfBirth: null,
          nationality: null,
          additionalFields: null,
        },
        sessionId,
        bonusCode: '123456',
        client,
        games: [{ mobileGame: false, manufacturerGameId: 287 }],
      })  
      .reply(500, {
        error: {
          code: 201,
          message: 'Could not establish connection with a game provider, please try again later',
        },
      });

    await nock('http://localhost:3004', { encodedQueryParams: true })
      .post('/api/v1/LD/getjackpots/LW', {
        currencies: ['EUR', 'USD', 'SEK', 'NOK', 'GBP', 'CAD', 'BRL', 'CLP', 'PEN'],
        games: [
          { manufacturerGameId: 'powerball', gameId: 'LW_powerball' },
          { manufacturerGameId: 'testGame1', gameId: 'LW_testgame1' },
        ],
      })
      .reply(200, [
        {
          game: 'LW_testgame1',
          currencies: [
            { amount: '29000000', currency: 'EUR' },
            { amount: '0', currency: 'USD' },
            { amount: '285186000', currency: 'SEK' },
            { amount: '279046700', currency: 'NOK' },
            { amount: '25544650', currency: 'GBP' },
          ],
        },
      ]);

    await nock('http://localhost:3004', { encodedQueryParams: true })
      .post('/api/v1/LD/getjackpots/NE', {
        currencies: ['EUR', 'USD', 'SEK', 'NOK', 'GBP', 'CAD', 'BRL', 'CLP', 'PEN'],
        games: [
          { manufacturerGameId: 'baccarat2_sw', gameId: 'NTE_baccarat2_sw' },
          {
            manufacturerGameId: 'bloodsuckers_not_mobile_sw',
            gameId: 'NTE_bloodsuckers_not_mobile_sw',
          },
          { manufacturerGameId: 'eldorado_not_mobile_sw', gameId: 'NTE_eldorado_not_mobile_sw' },
          { manufacturerGameId: 'jokerpro_not_mobile_sw', gameId: 'NTE_jokerpro_not_mobile_sw' },
          {
            manufacturerGameId: 'junglespirit_not_mobile_sw',
            gameId: 'NTE_junglespirit_not_mobile_sw',
          },
          {
            manufacturerGameId: 'megafortune_not_mobile_sw',
            gameId: 'NTE_megafortune_not_mobile_sw',
          },
          { manufacturerGameId: 'starburst_not_mobile_sw', gameId: 'NTE_starburst_not_mobile_sw' },
          {
            manufacturerGameId: 'wildwildwest_not_mobile_sw',
            gameId: 'NTE_wildwildwest_not_mobile_sw',
          },
        ],
      })  
      .reply(200, [
        {
          game: 'NTE_megafortune_not_mobile_sw',
          currencies: [
            { amount: '150000.000000', currency: 'EUR' },
            { amount: '171663.996338', currency: 'USD' },
            { amount: '1553695.724229', currency: 'SEK' },
            { amount: '1447946.329456', currency: 'NOK' },
            { amount: '130924.325740', currency: 'GBP' },
          ],
        },
      ]);

    await nock('http://localhost:3004', { encodedQueryParams: true })
      .post(/api\/v1\/LD\/getjackpots.+/, () => true)
      .times(Infinity)
      .reply(200, []);

    await nock('http://localhost:3004', { encodedQueryParams: true })
      .post('/api/v1/LD/ping/NE')
      .reply(200, { ok: true });

    await nock('http://localhost:3004', { encodedQueryParams: true })
      .post('/api/v1/LD/getleaderboard/NE/1224')
      .reply(200, [{
        bet: { amount: '20.000000', amountCurrencyISOCode: 'EUR' },
        qualified: false,
        rounds: 19,
        score: '19.0',
        userName: 'Filip',
        win: { amount: '22.500000', amountCurrencyISOCode: 'EUR' },
      }, {
        bet: { amount: '21.000000', amountCurrencyISOCode: 'EUR' },
        qualified: false,
        rounds: 19,
        score: '19.0',
        userName: 'Kevin',
        win: { amount: '16.000000', amountCurrencyISOCode: 'EUR' },
      }, {
        bet: { amount: '21.000000', amountCurrencyISOCode: 'EUR' },
        qualified: false,
        rounds: 19,
        score: '19.0',
        userName: 'Normund',
        win: { amount: '22.500000', amountCurrencyISOCode: 'EUR' },
      }, {
        bet: { amount: '3.900000', amountCurrencyISOCode: 'EUR' },
        displayName: 'Gimli U.',
        qualified: true,
        rounds: 26,
        score: '26.0',
        userName: 'LD_66423',
        win: { amount: '2.310000', amountCurrencyISOCode: 'EUR' },
      }, {
        bet: { amount: '4.200000', amountCurrencyISOCode: 'EUR' },
        displayName: 'Harold B.',
        qualified: true,
        rounds: 28,
        score: '28.0',
        userName: 'LD_5',
        win: { amount: '3.920000', amountCurrencyISOCode: 'EUR' },
      }]);
  });

  it('returns an error when trying to launch a game', () =>
    request(app)
      .post('/api/LD/v1/game/1')
      .set(headers)
      .send({})
      .expect(res => expect(res.body.error.code).to.equal(903)));

  it('can credit free spins with id', () =>
    request(app)
      .post('/api/LD/v1/creditfreespins')
      .set(headers)
      .send({
        permalink: 'towersquest',
        bonusCode: '123,456',
        id: '123',
      })
      .expect(res => expect(res.body).to.containSubset({ ok: true }))
      .expect(200));


  it('can credit free spins with redundant whitespace', () =>
    request(app)
      .post('/api/LD/v1/creditfreespins')
      .set(headers)
      .send({
        permalink: 'towersquest ',
        bonusCode: ' 123,456',
        id: ' 123 ',
      })
      .expect(res => expect(res.body).to.containSubset({ ok: true }))
      .expect(200));


  it('can credit free spins without id', () =>
    request(app)
      .post('/api/LD/v1/creditfreespins')
      .set(headers)
      .send({
        permalink: 'towersquest',
        bonusCode: '4770,310',
      })
      .expect(res => expect(res.body).to.containSubset({ ok: true }))
      .expect(200));

  it('can fail creditfreespins when giving wrong bonus code', () =>
    request(app)
      .post('/api/LD/v1/creditfreespins')
      .set(headers)
      .send({
        permalink: 'towersquest',
        bonusCode: '123456',
      })
      .expect(res => expect(res.body.error.code).to.equal(201))
      .expect(500));

  it('can get jackpot', () =>
    request(app)
      .get('/api/LD/v1/getjackpots')
      .set(headers)
      .send({})
      .expect((res) => {
        expect(res.body).to.deep.equal([{
          currencies: [
            {
              amount: '29000000',
              currency: 'EUR',
            },
            {
              amount: '285186000',
              currency: 'SEK',
            },
            {
              amount: '279046700',
              currency: 'NOK',
            },
            {
              amount: '25544650',
              currency: 'GBP',
            },
          ],
          game: 'LW_testgame1',
          permalink: 'testgame1',
        }, {
          currencies: [
            {
              amount: '150000.000000',
              currency: 'EUR',
            },
            {
              amount: '171663.996338',
              currency: 'USD',
            },
            {
              amount: '1553695.724229',
              currency: 'SEK',
            },
            {
              amount: '1447946.329456',
              currency: 'NOK',
            },
            {
              amount: '130924.325740',
              currency: 'GBP',
            },
          ],
          game: 'NTE_megafortune_not_mobile_sw',
          permalink: 'megafortune',
        }]);
      })
      .expect(200));

  it('can get leader board', () =>
    request(app)
      .get('/api/LD/v1/getleaderboard/NE/1224')
      .set(headers)
      .send({})
      .expect((res) => {
        expect(res.body).to.containSubset([{
          bet: { amount: '20.000000', amountCurrencyISOCode: 'EUR' },
          qualified: false,
          rounds: 19,
          score: '19.0',
          userName: 'Filip',
          win: { amount: '22.500000', amountCurrencyISOCode: 'EUR' },
        }, {
          bet: { amount: '21.000000', amountCurrencyISOCode: 'EUR' },
          qualified: false,
          rounds: 19,
          score: '19.0',
          userName: 'Kevin',
          win: { amount: '16.000000', amountCurrencyISOCode: 'EUR' },
        }, {
          bet: { amount: '21.000000', amountCurrencyISOCode: 'EUR' },
          qualified: false,
          rounds: 19,
          score: '19.0',
          userName: 'Normund',
          win: { amount: '22.500000', amountCurrencyISOCode: 'EUR' },
        }, {
          bet: { amount: '3.900000', amountCurrencyISOCode: 'EUR' },
          displayName: 'Gimli U.',
          qualified: true,
          rounds: 26,
          score: '26.0',
          userName: 'LD_66423',
          win: { amount: '2.310000', amountCurrencyISOCode: 'EUR' },
        }, {
          bet: { amount: '4.200000', amountCurrencyISOCode: 'EUR' },
          displayName: 'Harold B.',
          qualified: true,
          rounds: 28,
          score: '28.0',
          userName: 'LD_5',
          win: { amount: '3.920000', amountCurrencyISOCode: 'EUR' },
        }]);
      })
      .expect(200));

  it('can ping PNG server', () =>
    request(app)
      .post('/api/LD/v1/ping/NE')
      .set(headers)
      .send({})
      .expect(res => expect(res.body).to.containSubset({ ok: true }))
      .expect(200));
});
