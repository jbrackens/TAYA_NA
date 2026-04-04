/* @flow */
const request = require('supertest');
const app = require('../../wallet-server');

describe('Tickets wallet routes', () => {
  const externalTicketId = new Date().getTime().toString();

  it('create ticket for a game round', async () =>
    request(app)
      .put(`/api/v1/wallet/ticket`)
      .send({
        externalTicketId,
        content: {
          abc: 1,
          cba: 'abc',
        },
      })
      .expect(200)
      .expect(res => expect(res.body).to.containSubset({
        ticket: {
          externalTicketId,
          content: {
            abc: 1,
            cba: 'abc',
          },
        }})));
});
