/* @flow */

const request = require('supertest');
const nock = require('nock');

const superClient = require('gstech-core/modules/superClient');
const client = require('gstech-core/modules/clients/complianceserver-api');
const ports = require('gstech-core/modules/ports');

const app = require('../../api-server');

// nock.recorder.rec();

nock('https://api.sendgrid.com:443', { encodedQueryParams: true })
  .get('/v3/validations/email', { email: 'aaaa@gmail.com' })
  .reply(200, {
    result: {
      email: 'aaaa@gmail.com',
      verdict: 'Invalid',
      score: 0,
      local: 'aaaa',
      host: 'gmail.com',
      checks: {
        domain: {
          has_valid_address_syntax: true,
          has_mx_or_a_record: true,
          is_suspected_disposable_address: false,
        },
        local_part: { is_suspected_role_address: false },
        additional: { has_known_bounces: true, has_suspected_bounces: false },
      },
      ip_address: '188.226.186.81',
    },
  });

nock('https://api.sendgrid.com:443', { encodedQueryParams: true })
  .get('/v3/validations/email', { email: 'aaaa@gamil.com' })
  .reply(200, {
    result: {
      email: 'aaaa@gamil.com',
      verdict: 'Risky',
      score: 0.18537,
      local: 'aaaa',
      host: 'gamil.com',
      suggestion: 'gmail.com',
      checks: {
        domain: {
          has_valid_address_syntax: true,
          has_mx_or_a_record: true,
          is_suspected_disposable_address: false,
        },
        local_part: { is_suspected_role_address: false },
        additional: { has_known_bounces: false, has_suspected_bounces: true },
      },
      ip_address: '188.226.186.81',
    },
  });

nock('https://api.sendgrid.com:443', { encodedQueryParams: true })
  .get('/v3/validations/email', { email: 'patt.kudla@gamil.com' })
  .reply(200, {
    result: {
      email: 'patt.kudla@gamil.com',
      verdict: 'Valid',
      score: 0.86646,
      local: 'patt.kudla',
      host: 'gamil.com',
      suggestion: 'gmail.com',
      checks: {
        domain: {
          has_valid_address_syntax: true,
          has_mx_or_a_record: true,
          is_suspected_disposable_address: false,
        },
        local_part: { is_suspected_role_address: false },
        additional: { has_known_bounces: false, has_suspected_bounces: false },
      },
      ip_address: '188.226.186.81',
    },
  });

nock('https://api.sendgrid.com:443', { encodedQueryParams: true })
  .get('/v3/validations/email', { email: 'patt.kudla@gmail.com' })
  .reply(200, {
    result: {
      email: 'patt.kudla@gmail.com',
      verdict: 'Valid',
      score: 0.86646,
      local: 'patt.kudla',
      host: 'gmail.com',
      checks: {
        domain: {
          has_valid_address_syntax: true,
          has_mx_or_a_record: true,
          is_suspected_disposable_address: false,
        },
        local_part: { is_suspected_role_address: false },
        additional: { has_known_bounces: false, has_suspected_bounces: false },
      },
      ip_address: '188.226.186.81',
    },
  });

nock('https://api.sendgrid.com:443', { encodedQueryParams: true })
  .get('/v3/validations/email', { email: 'spambot123xyz@yahoo.com' })
  .reply(200, {
    result: {
      email: 'spambot123xyz@yahoo.com',
      verdict: 'Valid',
      score: 0.9337,
      local: 'spambot123xyz',
      host: 'yahoo.com',
      checks: {
        domain: {
          has_valid_address_syntax: true,
          has_mx_or_a_record: true,
          is_suspected_disposable_address: false,
        },
        local_part: { is_suspected_role_address: false },
        additional: { has_known_bounces: false, has_suspected_bounces: false },
      },
      ip_address: '188.226.186.81',
    },
  });

describe('Email routes', () => {
  describe('email check ', () => {
    it('returns false for "Invalid" emails with correct domain', async () => {
      await request(app)
        .post('/api/v1/check/email')
        .send({ email: 'aaaa@gmail.com' })
        .expect(({ body }) => {
          expect(body).to.deep.equal({ data: { ok: false } });
        })
        .expect(200);
    });

    it('returns true and suggestion for "Risky" emails with suspicious domain', async () => {
      await request(app)
        .post('/api/v1/check/email')
        .send({ email: 'aaaa@gamil.com' })
        .expect(({ body }) => {
          expect(body).to.deep.equal({ data: { ok: true, suggestion: 'aaaa@gmail.com' } });
        })
        .expect(200);
    });

    it('returns true and suggestion for "Valid" emails with suspicious domain', async () => {
      await request(app)
        .post('/api/v1/check/email')
        .send({ email: 'patt.kudla@gamil.com' })
        .expect(({ body }) => {
          expect(body).to.deep.equal({ data: { ok: true, suggestion: 'patt.kudla@gmail.com' } });
        })
        .expect(200);
    });

    it('returns just true for legit email', async () => {
      await request(app)
        .post('/api/v1/check/email')
        .send({ email: 'patt.kudla@gmail.com' })
        .expect(({ body }) => {
          expect(body).to.deep.equal({ data: { ok: true } });
        })
        .expect(200);
    });
  });

  describe('client', () => {
    it('is able to verify email', async () => {
      await superClient(app, ports.complianceServer.port, client)
        .call((api) => api.emailCheck('spambot123xyz@yahoo.com'))
        .expect(200, (res) => {
          expect(res).to.deep.equal({ ok: true });
        });
    });
  });
});
