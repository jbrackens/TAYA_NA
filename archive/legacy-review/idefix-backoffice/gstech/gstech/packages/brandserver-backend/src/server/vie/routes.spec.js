/* @flow */
const request = require('supertest');
const app = require('../common/app');

describe('Vie router', () => {
  it('returns status', async () =>
    request(app)
      .get('/api/status')
      .expect(200));
});
