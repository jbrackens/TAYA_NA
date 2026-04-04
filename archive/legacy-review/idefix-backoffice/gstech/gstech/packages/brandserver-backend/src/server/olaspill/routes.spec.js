/* @flow */
const request = require('supertest');
const app = require('../common/app');

describe('Olaspill router', () => {
  it('returns status', () =>
    request(app)
      .get('/api/status')
      .expect(200));
});
