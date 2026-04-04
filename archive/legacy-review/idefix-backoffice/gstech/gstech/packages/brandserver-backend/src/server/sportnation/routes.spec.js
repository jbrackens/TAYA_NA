/* @flow */
const request = require('supertest');
const app = require('../common/app');

describe('Sportnation router', () => {
  it('returns status', async () =>
    request(app)
      .get('/api/status')
      .expect(200));
});
