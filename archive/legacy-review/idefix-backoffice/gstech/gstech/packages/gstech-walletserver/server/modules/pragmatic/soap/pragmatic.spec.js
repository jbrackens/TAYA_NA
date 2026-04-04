/* @flow */
const request = require('supertest');  
const app = require('../../../api-server');
const config = require('../../../../config');

const nock = require('nock'); // eslint-disable-line
// nock.recorder.rec();

describe('Pragmatic API', () => {
  describe('with active session', () => {
    let player;
    before(async () => {
      await request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'PP',
          initialBalance: 1000,
        })
        .expect((res) => {
          player = res.body.player;
        })
        .expect(200);

      await nock('https://api.prerelease-env.biz:443', { encodedQueryParams: true })
        .filteringPath(path => '/IntegrationService/v3/http/FreeRoundsBonusAPI/v2/bonus/create') // eslint-disable-line no-unused-vars
        .post('/IntegrationService/v3/http/FreeRoundsBonusAPI/v2/bonus/create', { gameList: [{ gameId: 'vs7pigs', betValues: [{ betPerLine: 0.50, currency: 'EUR' }] }] })
        .times(2)
        .reply(200, { error: '0', description: 'OK' });


      await nock('https://api.prerelease-env.biz:443', { encodedQueryParams: true })
        .filteringPath(path => '/IntegrationService/v3/http/FreeRoundsBonusAPI/v2/players/add') // eslint-disable-line no-unused-vars
        .post('/IntegrationService/v3/http/FreeRoundsBonusAPI/v2/players/add', { playerList: [player.username] })
        .times(2)
        .reply(200, { error: '0', description: 'OK' });

      await nock('https://api.prerelease-env.biz:443', { encodedQueryParams: true })
        .post('/IntegrationService/v3/http/FreeRoundsBonusAPI/createFRB', `secureLogin=jrscvnt_luckydino&playerId=${player.username}&currency=EUR&gameIDList=WRONG_BONUS_CODE&bonusCode=WRONG_BONUS_CODE-WRONG_BONUS_CODE-tiHy5uuUuL&expirationDate=1549445001&hash=b3c877013f46fbfe8fabe8ff79847790`)
        .reply(200, { error: '2', description: 'Empty mandatory field \'rounds\'.' });
    });

    it('can post creditfreespins without id', () =>
      request(app)
        .post('/api/v1/LD/creditfreespins/PP')
        .send({
          player,
          bonusCode: 'vs7pigs,5,50',
          sessionId: 123,
          games: [],
        })
        .expect((res) => {
          expect(res.body).to.containSubset({ ok: true });
        })
        .expect(200));

    it('can post creditfreespins with id', () =>
      request(app)
        .post('/api/v1/LD/creditfreespins/PP')
        .send({
          player,
          bonusCode: 'vs7pigs,5,50',
          id: '123',
          sessionId: 123,
          games: [],
        })
        .expect((res) => {
          expect(res.body).to.containSubset({ ok: true });
        })
        .expect(200));

    it('can fail creditfreespins when giving wrong bonus code', () =>
      request(app)
        .post('/api/v1/LD/creditfreespins/PP')
        .send({
          player,
          bonusCode: 'WRONG_BONUS_CODE',
          sessionId: 123,
          games: [],
        })
        .expect((res) => {
          expect(res.body.error.code).to.equal(201);
        })
        .expect(500));
  });
});
