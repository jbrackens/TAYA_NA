/* @flow */
const request = require('supertest');  
const app = require('../../api-server');
const config = require('../../../config');

const nock = require('nock'); // eslint-disable-line
// nock.recorder.rec();

describe('Lotto API', () => {
  describe('with active session', () => {
    let player;
    before(async () => {
      await request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'NE',
          initialBalance: 1000,
        })
        .expect((res) => {
          player = res.body.player;
        })
        .expect(200);

      await nock('http://localhost:3040', { encodedQueryParams: true })
        .get('/api/v1/lottocasino/jackpot/testGame2/EUR')
        .reply(200, { message: '', data: { amount: '67471325', currency: 'EUR' } }, ['Content-Type',
          'application/json; charset=utf-8',
          'Content-Length',
          '60',
          'ETag',
          'W/"3c-q/T/DSBuBfdnnM99YK5HpPCX6RA"',
          'Date',
          'Thu, 31 Jan 2019 10:59:13 GMT',
          'Connection',
          'close']);


      await nock('http://localhost:3040', { encodedQueryParams: true })
        .get('/api/v1/lottocasino/jackpot/testGame1/SEK')
        .reply(200, { message: '', data: { amount: '285186000', currency: 'SEK' } }, ['Content-Type',
          'application/json; charset=utf-8',
          'Content-Length',
          '61',
          'ETag',
          'W/"3d-ERvgExAU48BCn/IykqKFEOr4YL4"',
          'Date',
          'Thu, 31 Jan 2019 10:59:13 GMT',
          'Connection',
          'close']);

      await nock('http://localhost:3040', { encodedQueryParams: true })
        .get('/api/v1/lottocasino/jackpot/testGame2/SEK')
        .reply(200, { message: '', data: { amount: '663513007', currency: 'SEK' } }, ['Content-Type',
          'application/json; charset=utf-8',
          'Content-Length',
          '61',
          'ETag',
          'W/"3d-WWjXzxxnX3au4s/qwRw/BhFL7MI"',
          'Date',
          'Thu, 31 Jan 2019 10:59:13 GMT',
          'Connection',
          'close']);

      await nock('http://localhost:3040', { encodedQueryParams: true })
        .get('/api/v1/lottocasino/jackpot/testGame1/EUR')
        .reply(200, { message: '', data: { amount: '29000000', currency: 'EUR' } }, ['Content-Type',
          'application/json; charset=utf-8',
          'Content-Length',
          '60',
          'ETag',
          'W/"3c-y1dwrKg/pwrmcdEtmULeoWSCG3Q"',
          'Date',
          'Thu, 31 Jan 2019 10:59:13 GMT',
          'Connection',
          'close']);

      await nock('http://localhost:3040', { encodedQueryParams: true })
        .post(`/api/v1/lottocasino/freelines/${player.id}/testGame1/2`)
        .reply(200, { message: 'Ok', data: { } }, ['Content-Type',
          'application/json; charset=utf-8',
          'Content-Length',
          '60',
          'ETag',
          'W/"3c-y1dwrKg/pwrmcdEtmULeoWSCG3Q"',
          'Date',
          'Thu, 31 Jan 2019 10:59:13 GMT',
          'Connection',
          'close']);

      await nock('http://lotto-backend:3040', { encodedQueryParams: true })
        .get('/api/v1/lottocasino/jackpot/testGame2/EUR')
        .reply(200, { message: '', data: { amount: '67471325', currency: 'EUR' } }, ['Content-Type',
          'application/json; charset=utf-8',
          'Content-Length',
          '60',
          'ETag',
          'W/"3c-q/T/DSBuBfdnnM99YK5HpPCX6RA"',
          'Date',
          'Thu, 31 Jan 2019 10:59:13 GMT',
          'Connection',
          'close']);

      await nock('http://lotto-backend:3040', { encodedQueryParams: true })
        .get('/api/v1/lottocasino/jackpot/testGame1/SEK')
        .reply(200, { message: '', data: { amount: '285186000', currency: 'SEK' } }, ['Content-Type',
          'application/json; charset=utf-8',
          'Content-Length',
          '61',
          'ETag',
          'W/"3d-ERvgExAU48BCn/IykqKFEOr4YL4"',
          'Date',
          'Thu, 31 Jan 2019 10:59:13 GMT',
          'Connection',
          'close']);

      await nock('http://lotto-backend:3040', { encodedQueryParams: true })
        .get('/api/v1/lottocasino/jackpot/testGame2/SEK')
        .reply(200, { message: '', data: { amount: '663513007', currency: 'SEK' } }, ['Content-Type',
          'application/json; charset=utf-8',
          'Content-Length',
          '61',
          'ETag',
          'W/"3d-WWjXzxxnX3au4s/qwRw/BhFL7MI"',
          'Date',
          'Thu, 31 Jan 2019 10:59:13 GMT',
          'Connection',
          'close']);

      await nock('http://lotto-backend:3040', { encodedQueryParams: true })
        .get('/api/v1/lottocasino/jackpot/testGame1/EUR')
        .reply(200, { message: '', data: { amount: '29000000', currency: 'EUR' } }, ['Content-Type',
          'application/json; charset=utf-8',
          'Content-Length',
          '60',
          'ETag',
          'W/"3c-y1dwrKg/pwrmcdEtmULeoWSCG3Q"',
          'Date',
          'Thu, 31 Jan 2019 10:59:13 GMT',
          'Connection',
          'close']);

      await nock('http://lotto-backend:3040', { encodedQueryParams: true })
        .post(`/api/v1/lottocasino/freelines/${player.id}/testGame1/2`)
        .reply(200, { message: 'Ok', data: { } }, ['Content-Type',
          'application/json; charset=utf-8',
          'Content-Length',
          '60',
          'ETag',
          'W/"3c-y1dwrKg/pwrmcdEtmULeoWSCG3Q"',
          'Date',
          'Thu, 31 Jan 2019 10:59:13 GMT',
          'Connection',
          'close']);
    });

    it('can credit free spins', () =>
      request(app)
        .post('/api/v1/LD/creditfreespins/LW')
        .send({
          player,
          bonusCode: 'testGame1:2',
          id: '123',
          sessionId: 123,
          games: [],
        })
        .expect((res) => {
          expect(res.body).to.containSubset({ ok: true });
        })
        .expect(200));

    it('can get jackpots', () =>
      request(app)
        .post('/api/v1/LD/getjackpots/LW')
        .send({
          games: [{ manufacturerGameId: 'testGame1', gameId: 'testGame1' }, { manufacturerGameId: 'testGame2', gameId: 'testGame2' }],
          currencies: ['EUR', 'SEK'],
        })
        .expect((res) => {
          expect(res.body).to.containSubset([{
            game: 'testGame1',
            currencies: [
              {
                amount: '29000000',
                currency: 'EUR',
              }, {
                amount: '285186000',
                currency: 'SEK',
              },
            ],
          }, {
            game: 'testGame2',
            currencies: [
              {
                amount: '67471325',
                currency: 'EUR',
              }, {
                amount: '663513007',
                currency: 'SEK',
              },
            ],
          }]);
        })
        .expect(200));
  });
});
