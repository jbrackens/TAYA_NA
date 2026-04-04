/* @flow */
const request = require('supertest');
const app = require('../common/app');

describe('LuckyDino router', () => {
  it('returns status', () =>
    request(app)
      .get('/api/status')
      .expect(200));
});
