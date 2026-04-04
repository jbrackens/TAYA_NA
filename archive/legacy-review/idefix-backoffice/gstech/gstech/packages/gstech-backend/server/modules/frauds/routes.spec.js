// @flow
const request = require('supertest');
const app = require('../../index');
const { players: { john: john0 } } = require('../../../scripts/utils/db-data');

describe('Player with unprocessed fraud', () => {
  let headers;
  let john;
  let fraud;
  before(async () => {
    const { john: player } = await setup.players();
    john = player;
    headers = await setup.login(app, john0.email, john0.password);
    await request(app)
      .post('/api/LD/v1/fraud')
      .set(headers)
      .send({
        fraudKey: 'payment_method_owner',
        fraudId: 'John McGormic',
        details: { owner: 'John McGormic', paymentMethod: 'CreditCard/Worldpay', account: '881155******1123' },
      })
      .expect((res) => {
        fraud = res.body.fraud;
      });
  });

  it('gets fraud for player', async () =>
    request(app)
      .get(`/api/v1/player/${john.id}/frauds/${fraud}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({
          fraudId: 'John McGormic',
          title: 'Payment method owner and registered player name mismatch',
          details: [
            { key: 'Payment method owner', value: 'John McGormic' },
            { key: 'Payment method', value: 'CreditCard/Worldpay' },
            { key: 'Account', value: '881155******1123' },
          ],
        });
      }));

  it('marks fraud as checked', async () =>
    request(app)
      .put(`/api/v1/player/${john.id}/frauds/${fraud}`)
      .send({ cleared: true })
      .expect((res) => {
        expect(res.body.ok).to.equal(true);
      })
      .expect(200));

  it('creates manual task', async () => {
    let id;
    await request(app)
      .post(`/api/v1/player/${john.id}/frauds`)
      .send({
        fraudKey: 'registration_ip_country_mismatch',
        note: 'foo',
        checked: false,
      })
      .expect((res) => {
        id = res.body.id;
      })
      .expect(200);

    await request(app)
      .get(`/api/v1/player/${john.id}/frauds/${String(id)}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({
          fraudKey: 'registration_ip_country_mismatch',
          points: 10,
        })
      });
    });
});
