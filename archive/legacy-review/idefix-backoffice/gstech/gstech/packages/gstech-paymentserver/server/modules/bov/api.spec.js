/* @flow */
const request = require('supertest');  

const api = require('../../api-server');
const config = require('../../../config');

// nock.recorder.rec();
describe('BOV API', () => {
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
  });

  it('can execute withdrawal', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player,
        brand: {
          name: 'LuckyDino',
        },
        withdrawal: {
          paymentId: 101086349,
          transactionKey: '5ba0f811-4f98-11e9-82db-311c7f522372',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: { },
          accountParameters: { bic: '12345' },
          paymentMethodName: 'Manual',
          paymentProvider: 'BOV',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          complete: true,
          id: '101086349',
          message: 'Manual withdrawal initiated',
          ok: true,
          reject: false,
        });
      }));
});
