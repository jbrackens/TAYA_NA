/* @flow */
const request = require('supertest');  
const app = require('../../api-server');

describe('Compliance API', () => {
  it('can check blocked player', () =>
    request(app)
      .get('/api/v1/check/SE/182701303378')
      .expect((res) => {
        expect(res.body).to.deep.equal({
          nationalId: '182701303378',
          isBlocked: true,
        });
      }).expect(200));

  it('can check not blocked player', () =>
    request(app)
      .get('/api/v1/check/SE/182701303377')
      .expect((res) => {
        expect(res.body).to.deep.equal({
          nationalId: '182701303377',
          isBlocked: false,
        });
      }).expect(200));

  it('can check not player with wrong id', () =>
    request(app)
      .get('/api/v1/check/SE/1827')
      .expect((res) => {
        expect(res.body).to.deep.equal({
          nationalId: '1827',
          isBlocked: false,
        });
      }).expect(200));
});
