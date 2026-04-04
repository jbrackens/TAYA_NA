/* @flow */
const request = require('supertest');
const nock = require('nock');

const app = require('../../app');
// nock.recorder.rec();

nock('http://localhost:3012')
  .get('/api/v1/LD/rewards/available', {excludeDisabled: false })
  .query({ excludeDisabled: false })
  .reply(200, { data: [{ reward:{ id: 4932 }}]});

describe('config routes', () => {
  it('fetches rewards configuration', async () => {
    await request(app)
      .get('/api/v1/config/rewards?brandId=LD')
      .expect(res => {
        expect(res.body.data).to.containSubset([ { id: 4932 } ]);
      })
      .expect(200);
  });
});