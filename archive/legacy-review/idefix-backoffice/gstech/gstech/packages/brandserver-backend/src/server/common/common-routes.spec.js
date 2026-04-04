/* @flow */
/* eslint-disable no-promise-executor-return */
const _ = require('lodash');
const request = require('supertest');
const phoneNumber = require('gstech-core/modules/phoneNumber');
const phoneEmu = require('gstech-core/modules/sms/phoneEmu');
const mailEmu = require('gstech-core/modules/mailer/mailEmu');
const moment = require('moment-timezone');
const app = require('./app');
const config = require('./config');

let counter = 407000000 + (Date.now() % 1000000);

describe('Common routes', () => {
  const player = {
    pinCode: '0000',
    firstName: 'Foo',
    lastName: 'Foo',
    address: `Foobar ${counter++}`,
    postCode: '123123',
    city: 'Foobar123',
    dateOfBirth: '1985-01-01',
    countryISO: 'FI',
    currencyISO: 'EUR',
    languageISO: 'en',
    phone: `+358-${counter++}`,
    receivePromotional: '1',
    accept: '1',
    lang: 'en',
    email: `tech123${counter++}@luckydino.com`,
    password: 'Foobar123',
  };
  let cookies;
  let pinCode1 = null;
  const limitIds = [];

  beforeEach(() => {
    phoneEmu.registerReceiver((v) => {
      const matches = v.message.match(/\d+/);
      pinCode1 = matches ? matches[0] : '';
    });

    mailEmu.registerReceiver((v) => {
      const matches = v.text.match(/\d+/);
      pinCode1 = matches ? matches[0] : '';
    });
  });

  it('can validate phone number', () =>
    request(app)
      .post('/api/validate/phone')
      .send({
        countryISO: 'FI',
        phone: '+358-407703660',
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          needsCaptcha: false,
          number: '+358407703660',
          valid: true,
        });
      })
      .expect(200));

  it('reports invalid phonenumber', () =>
    request(app)
      .post('/api/validate/phone')
      .send({
        countryISO: 'FI',
        phone: '+355-407703660',
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({ valid: false });
      })
      .expect(200));

  it('can request registration', () =>
    request(app)
      .post('/api/activate/phone')
      .send(player)
      .expect((res) => {
        expect(res.body).to.deep.equal({ ok: true, valid: true });
      })
      .expect(200));

  it('can retry request registration', () =>
    request(app)
      .post('/api/activate/phone?retry=true')
      .send(player)
      .expect((res) => {
        // TODO: does not really test much
        expect(res.body).to.deep.equal({ ok: true, valid: true });
      })
      .expect(200));

  it('can complete register', async () => {
    while (!pinCode1) await new Promise((resolve) => setTimeout(resolve, 1000));
    await request(app)
      .post('/api/register')
      .send({ ...player, pinCode: pinCode1 })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          nextUrl: '/loggedin/inbox/2/',
          ok: true,
          activated: true,
          register: true,
        });
        pinCode1 = null;
      })
      .expect(200);
  });

  it('can request login (mobilePhone)', () =>
    request(app)
      .post('/api/login/request')
      .send({ mobilePhone: player.phone })
      .expect((res) => {
        // TODO: does not really test much
        expect(res.body).to.containSubset({ ok: true });
      })
      .expect(200));

  it('can retry request login (mobilePhone)', () =>
    request(app)
      .post('/api/login/request?retry=true')
      .send({ mobilePhone: player.phone })
      .expect((res) => {
        // TODO: does not really test much
        expect(res.body).to.containSubset({ ok: true });
      })
      .expect(200));

  it('can complete login (mobilePhone)', async () => {
    while (!pinCode1) await new Promise((resolve) => setTimeout(resolve, 1000));
    await request(app)
      .post('/api/login/complete')
      .send({ mobilePhone: player.phone, pinCode: pinCode1 })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          deposits: false,
          nextUrl: '/loggedin/inbox/2/',
          ok: true,
        });
        pinCode1 = null;
      })
      .expect(200);
  });

  it('can request login (email)', () =>
    request(app)
      .post('/api/login/request')
      .send({ email: player.email })
      .expect((res) => {
        expect(res.body).to.containSubset({ ok: true });
      })
      .expect(200));

  it('can complete login (email)', async () => {
    while (!pinCode1) await new Promise((resolve) => setTimeout(resolve, 1000));
    await request(app)
      .post('/api/login/complete')
      .send({ email: player.email, pinCode: pinCode1 })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          deposits: false,
          nextUrl: '/loggedin/inbox/2/',
          ok: true,
        });
        pinCode1 = null;
      })
      .expect(200);
  });

  it('can request reset password (mobilePhone)', () =>
    request(app)
      .post('/api/password/reset/request')
      .send({ mobilePhone: player.phone, dateOfBirth: player.dateOfBirth })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          channel: 'email',
          ok: true,
          number: phoneNumber.formatMasked(player.phone, player.countryISO),
          requireCaptcha: false,
        });
      })
      .expect(200));

  it('can retry request reset password (mobilePhone)', () =>
    request(app)
      .post('/api/password/reset/request?retry=true')
      .send({ mobilePhone: player.phone, dateOfBirth: player.dateOfBirth })
      .expect((res) => {
        // TODO: does not really test much
        expect(res.body).to.deep.equal({
          channel: 'email',
          ok: true,
          number: phoneNumber.formatMasked(player.phone, player.countryISO),
          requireCaptcha: false,
        });
      })
      .expect(200));

  it('can complete reset password (mobilePhone)', async () => {
    while (!pinCode1) await new Promise((resolve) => setTimeout(resolve, 1000));
    await request(app)
      .post('/api/password/reset/complete')
      .send({ mobilePhone: player.phone, pinCode: pinCode1, newPassword: '123456' })
      .expect((res) => {
        expect(res.body).to.deep.equal({ deposits: false, ok: true });
        pinCode1 = null;
      })
      .expect(200);
  });

  it('returns an error when querying for password reset with invalid password', () =>
    request(app)
      .post('/api/password/reset/request')
      .send({ email: '123123123312@asdasdfdas.com', dateOfBirth: player.dateOfBirth })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          ok: false,
          code: 'INVALID_LOGIN_DETAILS',
          result: 'Invalid log-in details',
        });
      })
      .expect(200));

  it('can request reset password (email)', () =>
    request(app)
      .post('/api/password/reset/request')
      .send({ email: player.email, dateOfBirth: player.dateOfBirth })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          channel: 'email',
          ok: true,
          email: player.email,
          number: phoneNumber.formatMasked(player.phone, player.countryISO),
          requireCaptcha: false,
        });
      })
      .expect(200));

  it('can complete reset password (email)', async () => {
    while (!pinCode1) await new Promise((resolve) => setTimeout(resolve, 1000));
    await request(app)
      .post('/api/password/reset/complete')
      .send({ email: player.email, pinCode: pinCode1, newPassword: '123456' })
      .expect((res) => {
        expect(res.body).to.deep.equal({ deposits: false, ok: true });
        pinCode1 = null;
      })
      .expect(200);
  });

  it('check limits api is protected from not logged in players', async () => {
    await request(app).get('/api/limits').expect(401);
    await request(app).post('/api/limits').expect(401);
    await request(app).delete('/api/limits/dummy').expect(401);
  });

  it('can get limits', async () => {
    await request(app).post('/api/login/request').send({ email: player.email }).expect(200);
    while (!pinCode1) await new Promise((resolve) => setTimeout(resolve, 1000));
    await request(app)
      .post('/api/login/complete')
      .send({ email: player.email, pinCode: pinCode1 })
      .expect((res) => {
        cookies = _.flatten<any, string>(
          res.headers['set-cookie'].map((h: string) => h.split('; ')),
        );
        pinCode1 = null;
      })
      .expect(200);

    await request(app)
      .get('/api/limits')
      .set('Cookie', cookies)
      .expect((res) => {
        expect(res.body).to.deep.equal({ minDepositLimit: 0, limits: [] });
      })
      .expect(200);
  });

  it('can set loss limit', () =>
    request(app)
      .post('/api/limits')
      .set('Cookie', cookies)
      .send({
        limitLength: 5,
        limitType: 'loss',
        limitPeriodType: 'daily',
        limitValue: 10000,
      })
      .expect((res) => {
        limitIds.push(res.body);
        expect(res.body).to.deep.equal({
          limitId: res.body.limitId,
          expires: res.body.expires,
          limitType: 'loss',
          isInternal: false,
          limitPeriodType: 'daily',
          limitValue: 10000,
          limitLeft: 10000,
          limitDate: res.body.limitDate,
          isPermanent: false,
          canBeCancelled: true,
        });
      })
      .expect(200));

  it('fail set loss limit with incomplete input', () =>
    request(app)
      .post('/api/limits')
      .set('Cookie', cookies)
      .send({
        limitLength: 5,
        limitType: 'loss',
        limitPeriodType: 'daily',
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          ok: false,
          result: 'An unknown error occurred, please try again or reload the page',
        });
      })
      .expect(200));

  it('can set deposit limit', () =>
    request(app)
      .post('/api/limits')
      .set('Cookie', cookies)
      .send({
        limitLength: 5,
        limitType: 'deposit',
        limitPeriodType: 'daily',
        limitValue: 10000,
      })
      .expect((res) => {
        limitIds.push(res.body);
        expect(res.body).to.deep.equal({
          limitId: res.body.limitId,
          expires: res.body.expires,
          limitType: 'deposit',
          limitPeriodType: 'daily',
          limitValue: 10000,
          limitLeft: 10000,
          limitDate: res.body.limitDate,
          isPermanent: false,
          isInternal: false,
          canBeCancelled: true,
        });
      })
      .expect(200));

  it('fail set deposit limit with incomplete data', () =>
    request(app)
      .post('/api/limits')
      .set('Cookie', cookies)
      .send({
        limitLength: 5,
        limitType: 'deposit',
        limitValue: 10000,
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          ok: false,
          result: 'An unknown error occurred, please try again or reload the page',
        });
      })
      .expect(200));

  it('can set play limit', () =>
    request(app)
      .post('/api/limits')
      .set('Cookie', cookies)
      .send({
        limitLength: 5,
        limitType: 'play',
        limitValue: 5,
      })
      .expect((res) => {
        limitIds.push(res.body);
        expect(res.body).to.deep.equal({
          limitId: res.body.limitId,
          expires: res.body.expires,
          limitType: 'play',
          limitPeriodType: null,
          limitValue: 5,
          limitLeft: 5,
          limitDate: res.body.limitDate,
          isPermanent: false,
          isInternal: false,
          canBeCancelled: true,
        });
      })
      .expect(200));

  it('fail set play limit with incomplete data', () =>
    request(app)
      .post('/api/limits')
      .set('Cookie', cookies)
      .send({ limitLength: 5, limitType: 'play' })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          ok: false,
          result: 'An unknown error occurred, please try again or reload the page',
        });
      })
      .expect(200));

  it('can set timeout limit', () =>
    request(app)
      .post('/api/limits')
      .set('Cookie', cookies)
      .send({ limitLength: 5, limitType: 'timeout' })
      .expect((res) => {
        limitIds.push(res.body);
        expect(res.body).to.deep.equal({
          limitId: res.body.limitId,
          expires: res.body.expires,
          limitType: 'timeout',
          limitPeriodType: null,
          limitValue: null,
          limitLeft: null,
          limitDate: res.body.limitDate,
          isPermanent: false,
          isInternal: false,
          canBeCancelled: true,
        });
      })
      .expect(200));

  it('fail set timeout limit redundant data', () =>
    request(app)
      .post('/api/limits')
      .set('Cookie', cookies)
      .send({
        limitLength: 5,
        limitType: 'play',
        limitPeriodType: 'daily',
        limitValue: 10000,
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          ok: false,
          result: 'An unknown error occurred, please try again or reload the page',
        });
      })
      .expect(200));

  it('can set bet limit', () =>
    request(app)
      .post('/api/limits')
      .set('Cookie', cookies)
      .send({
        limitLength: 5,
        limitType: 'bet',
        limitPeriodType: 'monthly',
        limitValue: 100000,
      })
      .expect((res) => {
        limitIds.push(res.body);
        expect(res.body).to.deep.equal({
          limitId: res.body.limitId,
          expires: res.body.expires,
          limitType: 'bet',
          limitPeriodType: 'monthly',
          limitValue: 100000,
          limitLeft: 100000,
          limitDate: res.body.limitDate,
          isPermanent: false,
          isInternal: false,
          canBeCancelled: true,
        });
      })
      .expect(200));

  it('can get active limits', async () => {
    await request(app)
      .get('/api/limits')
      .set('Cookie', cookies)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          minDepositLimit: 0,
          limits: [
            {
              limitId: res.body.limits[0].limitId,
              expires: res.body.limits[0].expires,
              limitType: 'bet',
              limitPeriodType: 'monthly',
              limitValue: 100000,
              limitLeft: 100000,
              limitDate: null,
              isPermanent: false,
              canBeCancelled: true,
              isInternal: false,
            },
            {
              limitId: res.body.limits[1].limitId,
              expires: res.body.limits[1].expires,
              limitType: 'timeout',
              limitPeriodType: null,
              limitValue: null,
              limitLeft: null,
              limitDate: null,
              isPermanent: false,
              canBeCancelled: true,
              isInternal: false,
            },
            {
              limitId: res.body.limits[2].limitId,
              expires: res.body.limits[2].expires,
              limitType: 'play',
              limitPeriodType: null,
              limitValue: 5,
              limitLeft: 5,
              limitDate: res.body.limits[2].limitDate,
              isPermanent: false,
              canBeCancelled: true,
              isInternal: false,
            },
            {
              limitId: res.body.limits[3].limitId,
              expires: res.body.limits[3].expires,
              limitType: 'deposit',
              limitPeriodType: 'daily',
              limitValue: 10000,
              limitLeft: 10000,
              limitDate: null,
              isPermanent: false,
              canBeCancelled: true,
              isInternal: false,
            },
            {
              limitId: res.body.limits[4].limitId,
              expires: res.body.limits[4].expires,
              limitType: 'loss',
              limitPeriodType: 'daily',
              limitValue: 10000,
              limitLeft: 10000,
              limitDate: null,
              isPermanent: false,
              canBeCancelled: true,
              isInternal: false,
            },
          ],
        });
      })
      .expect(200);
  });

  it('can remove limits by notloggedin player', async () => {
    const limit = limitIds.pop();
    if (!limit) {
      expect(true).to.equal(false);
    } else {
      await request(app)
        .delete(`/api/limits/${limit.limitId}/anonym`)
        .expect((res) => {
          expect(res.body).to.deep.equal({ ok: true });
        })
        .expect(200);
    }
  });

  it('can remove limits', async () => {
    for (const limit of limitIds) {
      await request(app)
        .delete(`/api/limits/${limit.limitId}`)
        .set('Cookie', cookies)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            limitId: limit.limitId,
            expires: res.body.expires,
            limitType: limit.limitType,
            limitPeriodType: limit.limitPeriodType,
            limitValue: limit.limitValue,
            limitLeft: limit.limitLeft,
            limitDate: limit.limitDate,
            isPermanent: false,
            isInternal: false,
            canBeCancelled: false,
          });
        })
        .expect(200);
    }
  });

  it('fail removing non existed limit', () =>
    request(app)
      .delete(`/api/limits/123`)
      .set('Cookie', cookies)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          ok: false,
          result: 'An unknown error occurred, please try again or reload the page',
        });
      })
      .expect(200));
});

describe('Common routes indefinite self exclusion', () => {
  const player = {
    pinCode: '0000',
    firstName: 'Foofoo',
    lastName: 'Foo',
    address: `Malibu`,
    postCode: '123123',
    city: 'Miami',
    dateOfBirth: '1985-01-01',
    countryISO: 'FI',
    currencyISO: 'EUR',
    languageISO: 'en',
    phone: `+358-407703777`,
    receivePromotional: '1',
    accept: '1',
    lang: 'en',
    email: `tech123ABC@luckydino.com`,
    password: 'Foobar123',
  };

  let cookies;
  let exclusionKey;
  let pinCode2 = null;

  beforeEach(() => {
    phoneEmu.registerReceiver((v) => {
      const matches = v.message.match(/\d+/);
      pinCode2 = matches ? matches[0] : '';
    });

    mailEmu.registerReceiver((v) => {
      const matches = v.text.match(/\d+/);
      pinCode2 = matches ? matches[0] : '';
    });
  });

  it('can request registration', () =>
    request(app)
      .post('/api/activate/phone')
      .send(player)
      .expect((res) => {
        expect(res.body).to.deep.equal({ ok: true, valid: true });
      })
      .expect(200));

  it('can complete register', async () => {
    while (!pinCode2) await new Promise((resolve) => setTimeout(resolve, 1000));
    await request(app)
      .post('/api/register')
      .send({ ...player, pinCode: pinCode2 })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          nextUrl: '/loggedin/inbox/2/',
          ok: true,
          activated: true,
          register: true,
        });
        pinCode2 = null;
      })
      .expect(200);
  });

  it('can get limits', async () => {
    await request(app).post('/api/login/request').send({ email: player.email }).expect(200);
    while (!pinCode2) await new Promise((resolve) => setTimeout(resolve, 1000));
    await request(app)
      .post('/api/login/complete')
      .send({ email: player.email, pinCode: pinCode2 })
      .expect((res) => {
        cookies = _.flatten<any, string>(res.headers['set-cookie'].map((h) => h.split('; ')));
        pinCode2 = null;
      })
      .expect(200);

    await request(app)
      .get('/api/limits')
      .set('Cookie', cookies)
      .expect((res) => {
        expect(res.body).to.deep.equal({ minDepositLimit: 0, limits: [] });
      })
      .expect(200);
  });

  it('can set infinite self exclusion limit', () =>
    request(app)
      .post('/api/limits')
      .set('Cookie', cookies)
      .send({ limitLength: 9999, limitType: 'pause' })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          limitId: res.body.limitId,
          expires: null,
          limitType: 'pause',
          isInternal: false,
          limitDate: null,
          isPermanent: true,
          canBeCancelled: true,
          limitLeft: null,
          limitPeriodType: null,
          limitValue: null,
        });
      })
      .expect(200));

  it('can login again', async () => {
    await request(app).post('/api/login/request').send({ email: player.email }).expect(200);
    while (!pinCode2) await new Promise((resolve) => setTimeout(resolve, 1000));
    await request(app)
      .post('/api/login/complete')
      .send({ email: player.email, pinCode: pinCode2 })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          ok: false,
          result: "Not allowed to login due to player's personal restrictions",
          code: 'PLAYER_EXCLUDED',
        });
        pinCode2 = null;
      })
      .expect(200);

    await request(app)
      .post('/api/login')
      .send({ email: player.email, password: player.password })
      .expect((res) => {
        expect(res.body).to.containSubset({
          content: 'You have blocked your account for an indefinite period.',
          expires: null,
          permanent: true,
          restrictionActive: true,
          showRestrictionRequest: true,
        });
        exclusionKey = res.body.exclusionKey;
      })
      .expect(200);
  });

  it('can remove infinite self exclusion', () => {
    const openTime = moment().add(7, 'days');
    request(app)
      .post('/api/selfexclusion/remove')
      .send({ exclusionKey })
      .expect((res) => {
        expect(res.body).to.containSubset({
          restrictionActive: true,
          showRestrictionRequest: false,
        });
        expect(res.body.content).to.have.string(
          `<span class="date">${openTime.format('D.M.YYYY,')}`,
        );
      })
      .expect(200);
  });
});

describe('Common routes - definite self exclusion 7 days cool off period', () => {
  const player = {
    pinCode: '0000',
    firstName: 'Foo',
    lastName: 'Foofoo',
    address: `Foobar ${counter++}`,
    postCode: '123123',
    city: 'Foobar123',
    dateOfBirth: '1985-01-01',
    countryISO: 'FI',
    currencyISO: 'EUR',
    languageISO: 'en',
    phone: `+358-${counter++}`,
    receivePromotional: '1',
    accept: '1',
    lang: 'en',
    email: `tech123${counter++}@luckydino.com`,
    password: 'Foobar123',
  };
  const exclusionDays = 182;
  let pinCode3 = null;
  let cookies;
  let exclusionKey;

  beforeEach(() => {
    phoneEmu.registerReceiver((v) => {
      const matches = v.message.match(/\d+/);
      pinCode3 = matches ? matches[0] : '';
    });

    mailEmu.registerReceiver((v) => {
      const matches = v.text.match(/\d+/);
      pinCode3 = matches ? matches[0] : '';
    });
  });

  it('is in test mode', () => {
    expect(process.env.NODE_ENV).to.equal('test');
    expect(config.isTest).to.equal(true);
  });

  it('can request registration', () =>
    request(app)
      .post('/api/activate/phone')
      .send(player)
      .expect((res) => {
        expect(res.body).to.deep.equal({ ok: true, valid: true });
      })
      .expect(200));

  it('can complete register', async () => {
    while (!pinCode3) await new Promise((resolve) => setTimeout(resolve, 1000));
    await request(app)
      .post('/api/register')
      .send({ ...player, pinCode: pinCode3 })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          nextUrl: '/loggedin/inbox/2/',
          ok: true,
          activated: true,
          register: true,
        });
        pinCode3 = null;
      })
      .expect(200);
  });

  it('can get limits', async () => {
    await request(app).post('/api/login/request').send({ email: player.email }).expect(200);
    while (!pinCode3) await new Promise((resolve) => setTimeout(resolve, 1000));
    await request(app)
      .post('/api/login/complete')
      .send({ email: player.email, pinCode: pinCode3 })
      .expect((res) => {
        cookies = _.flatten<any, string>(res.headers['set-cookie'].map((h) => h.split('; ')));
        pinCode3 = null;
      })
      .expect(200);

    await request(app)
      .get('/api/limits')
      .set('Cookie', cookies)
      .expect((res) => {
        expect(res.body).to.deep.equal({ minDepositLimit: 0, limits: [] });
      })
      .expect(200);
  });

  it('can set definite self exclusion to half year', () =>
    request(app)
      .post('/api/limits')
      .set('Cookie', cookies)
      .send({ limitLength: exclusionDays, limitType: 'pause' })
      .expect((res) => {
        expect(res.body).to.containSubset({
          limitId: res.body.limitId,
          limitType: 'pause',
          isInternal: false,
          limitDate: null,
          isPermanent: false,
          canBeCancelled: true,
          limitLeft: null,
          limitPeriodType: null,
          limitValue: null,
        });
        const days = moment(res.body.expires).diff(moment(), 'days') + 1; // +1 to include today
        expect(days).to.equal(exclusionDays);
      })
      .expect(200));

  it('can login again', async () => {
    await request(app).post('/api/login/request').send({ email: player.email }).expect(200);
    while (!pinCode3) await new Promise((resolve) => setTimeout(resolve, 1000));
    await request(app)
      .post('/api/login/complete')
      .send({ email: player.email, pinCode: pinCode3 })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          ok: false,
          result: "Not allowed to login due to player's personal restrictions",
          code: 'PLAYER_EXCLUDED',
        });
        pinCode3 = null;
      })
      .expect(200);

    await request(app)
      .post('/api/login')
      .send({ email: player.email, password: player.password })
      .expect((res) => {
        expect(res.body).to.containSubset({
          permanent: false,
          restrictionActive: true,
          showRestrictionRequest: true,
        });
        exclusionKey = res.body.exclusionKey;
        const days = moment(res.body.expires).diff(moment(), 'days') + 1;
        expect(days).to.equal(exclusionDays);
        expect(res.body.content).to.have.string(`Your account will be reopened at`);
      })
      .expect(200);
  });

  it('can remove definite self exclusion', async () => {
    const openTime = moment().add(7, 'days');
    await request(app)
      .post('/api/selfexclusion/remove')
      .send({ exclusionKey })
      .expect((res) => {
        expect(res.body).to.containSubset({
          restrictionActive: true,
          showRestrictionRequest: false,
        });
        expect(res.body.content).to.have.string(
          `<span class="date">${openTime.format('D.M.YYYY,')}`,
        );
      })
      .expect(200);
  });
});
