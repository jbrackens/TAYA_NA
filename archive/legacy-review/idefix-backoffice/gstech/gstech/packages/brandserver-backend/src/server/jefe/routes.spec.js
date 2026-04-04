/* @flow */
const request = require('supertest');
const app = require('../common/app');

describe('Jefe router', () => {
  it('returns status', async () => request(app).get('/api/status').expect(200));

  let session;

  before(async () => {
    session = await setup.player();
  });

  it('fetches initial deposit state', async () => session.get('/api/deposit').expect(200));
});
