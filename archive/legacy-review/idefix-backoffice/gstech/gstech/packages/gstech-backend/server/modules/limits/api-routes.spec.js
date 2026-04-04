/* @flow */
const request = require('supertest');
const moment = require('moment-timezone');
const app = require('../../index');

const { players: { john } } = require('../../../scripts/utils/db-data');

describe('session', () => {
  describe('with active session', () => {
    let headers;
    let exclusionKey;

    before(async () => {
      await setup.players();
      headers = await setup.login(app, john.email, john.password);
    });

    it('returns active self exclusions', () =>
      request(app)
        .get('/api/LD/v1/exclusions')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.result.length).to.equal(0);
        }));

    it('requests for 30 day self exclusion', () =>
      request(app)
        .post('/api/LD/v1/exclusions')
        .send({ days: 30, reason: 'Player requested for self exclusion.' })
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            result: [{ permanent: false }],
          });
        }));

    it('disallows login when exclusion is active and returns exclusion key', () =>
      request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(400)
        .expect((res) => {
          exclusionKey = res.body.exclusion.exclusionKey;
          expect(res.body.error.code).to.equal(511);
          expect(res.body.exclusion.permanent).to.equal(false);
          expect(moment(res.body.exclusion.expires).diff(moment(), 'days')).to.equal(29);
        }));

    it('can cancel exclusion of non-loggedin player and creates a new one in 7 days', () =>
      request(app)
        .delete(`/api/LD/v1/exclusions/${exclusionKey}`)
        .expect(200)
        .expect((res) => {
          expect(moment(res.body.exclusion.expires).diff(moment(), 'days')).to.equal(6);
        }));

    it('still blocks the login', () =>
      request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(400)
        .expect((res) => {
          exclusionKey = res.body.exclusion.exclusionKey;
          expect(res.body.error.code).to.equal(511);
          expect(moment(res.body.exclusion.expires).diff(moment(), 'days')).to.equal(6);
        }));

    it('prevents cancellation of exclusion with less than 7 days left', () =>
      request(app)
        .delete(`/api/LD/v1/exclusions/${exclusionKey}`)
        .expect(400)
        .expect((res) => {
          expect(moment(res.body.exclusion.expires).diff(moment(), 'days')).to.equal(6);
        }));
  });

  describe('deposit limit', () => {
    let headers;

    before(async () => {
      await setup.players();
      headers = await setup.login(app, john.email, john.password);
    });

    it('requests permanent deposit limit', () =>
      request(app)
        .post('/api/LD/v1/exclusions')
        .send({ type: 'deposit_amount', days: 30, periodType: 'daily', limitValue: 10000, permanent: true, reason: 'Player requested deposit limit.' })
        .set(headers)
        .expect((res) => {
          expect(res.body).to.containSubset({
            result: [{ permanent: true }],
          });
        })
        .expect(200)
    );

    it('cannot have two active limits of same type to be active on the same time', () =>
      request(app)
        .post('/api/LD/v1/exclusions')
        .send({ type: 'deposit_amount', days: 30, periodType: 'daily', limitValue: 10000, permanent: true, reason: 'Player requested deposit limit.' })
        .set(headers)
        .expect((res) => {
          expect(res.body).to.containSubset({
            error: 'Two active limits of same type on the same time is not allowed',
          });
        })
        .expect(400)
    );

    it('returns active self exclusions', () =>
      request(app)
        .get('/api/LD/v1/exclusions')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.result.length).to.equal(1);
          expect(res.body.result).to.containSubset([{
            permanent: true,
            canBeCancelled: true,
          }])
        }));
  });

  describe('permanent self exclusion', () => {
    let headers;
    let exclusionKey;

    before(async () => {
      await setup.players();
      headers = await setup.login(app, john.email, john.password);
    });

    it('requests permanent self exclusion', () =>
      request(app)
        .post('/api/LD/v1/exclusions')
        .send({ permanent: true, reason: 'Player requested for self exclusion.' })
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            result: [{ permanent: true }],
          });
        }));

    it('disallows login when exclusion is active and returns exclusion key', () =>
      request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(400)
        .expect((res) => {
          exclusionKey = res.body.exclusion.exclusionKey;
          expect(res.body.error.code).to.equal(511);
          expect(res.body.exclusion.permanent).to.equal(true);
          expect(res.body.exclusion.expires).to.equal(null);
        }));

    it('can cancel permanent self exclusion and it will be opened in 7 days', () =>
      request(app)
        .delete(`/api/LD/v1/exclusions/${exclusionKey}`)
        .expect(200)
        .expect((res) => {
          expect(moment(res.body.exclusion.expires).diff(moment(), 'days')).to.equal(6);
        }));

    it('still blocks the login', () =>
      request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(400)
        .expect((res) => {
          exclusionKey = res.body.exclusion.exclusionKey;
          expect(res.body.error.code).to.equal(511);
          expect(res.body.exclusion.permanent).to.equal(true);
          expect(moment(res.body.exclusion.expires).diff(moment(), 'days')).to.equal(6);
        }));

    it('prevents cancellation of exclusion as it was already cancelled', () =>
      request(app)
        .delete(`/api/LD/v1/exclusions/${exclusionKey}`)
        .expect(400)
        .expect((res) => {
          expect(moment(res.body.exclusion.expires).diff(moment(), 'days')).to.equal(6);
        }));
  });

  describe('prevent limit cancellation by player', () => {
    let headers;
    let exclusionKey;
    let playerId;

    before(async () => {
      playerId = (await setup.players()).john.id;
      headers = await setup.login(app, john.email, john.password);
    });

    it('requests for 30 day weekly limit on bets', () =>
      request(app)
        .post('/api/LD/v1/exclusions')
        .send({
          days: 30,
          reason: 'Player requested weekly bet limit.',
          type: 'bet',
          periodType: 'weekly',
        })
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.result.length).to.equal(1);
          expect(res.body).to.containSubset({
            result: [{ permanent: false }],
          });
          exclusionKey = res.body.result[0].exclusionKey;
        }));

    it('sets the preventLimitCancel flag for player', () =>
      request(app)
        .put(`/api/v1/player/${playerId}/account-status`)
        .send({ preventLimitCancel: true })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            preventLimitCancel: true,
          });
        }));

    it('prevents cancelling limit with preventLimitCancel flag set', () =>
      request(app)
        .delete(`/api/LD/v1/exclusions/${exclusionKey}`)
        .expect(500)
        .expect((res) => {
          expect(res.body).to.containSubset({
            error: { message: 'User is prevented from cancelling limits' },
          });
        }));
  });

});
