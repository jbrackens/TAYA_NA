/* @flow */
const request = require('supertest');
const app = require('../../index');

const { players: { john } } = require('../../../scripts/utils/db-data');

describe('Frauds', () => {
  let headers;
  let username;

  before(async () => {
    const { john: player } = await setup.players();
    username = player.username;
    headers = await setup.login(app, john.email, john.password);
  });

  it('reports player fraud', () =>
    request(app)
      .post('/api/LD/v1/fraud')
      .set(headers)
      .send({
        fraudKey: 'payment_method_owner',
        fraudId: 'John McGormic',
        details: { PaymentMethod: 'Worldpay', Card: '8811********1123' },
      })
      .expect(200));

  it('reports player fraud for username', () =>
    request(app)
      .post('/api/LD/v1/report-fraud')
      .send({
        username,
        fraudKey: 'payment_method_owner',
        fraudId: 'John McGormic',
        details: { PaymentMethod: 'Worldpay', Card: '8811********1123' },
      })
      .expect(200));
});
