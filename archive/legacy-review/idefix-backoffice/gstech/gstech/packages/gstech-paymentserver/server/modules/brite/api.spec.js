/* @flow */
const nock = require('nock');  
const request = require('supertest');  
const { v1: uuid } = require('uuid');

const api = require('../../api-server');
const config = require('../../../config');

const briteConfig = config.providers.brite;
// nock.recorder.rec();
describe('Brite API', () => {
  let player;
  let sessionId;
  let depositTransactionKey;
  let withdrawalTransactionKey;
  // eslint-disable-next-line
  let NOCK = {
    SESSION_TOKEN: 'eyJob3N0IjogImh0dHBzOi8v...',
    SESSION_ID: 'ag9ofmFib25lYS0xNzYyMTNyFAsSB1Nlc3Npb24YgICAitG6gQoM',
    WITHDRAW_TRANSACTION_ID: 'ag9ofmFib25lYS0xNzYyMTNyGAsSC1RyYW5zYWN0aW9uGICAgIqKq6kJDA',
    WITHDRAW_ERROR_MESSAGE: 'Missing or invalid amount: 0.0.',
  };

  beforeEach(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({ countryId: 'FI' })
      .expect(200)
      .expect((res) => {
        sessionId = res.body.token;
        player = res.body.player;
      });
    // TODO Brite: Split up these nocks under their respective suites where possible
    nock('https://sandbox.britepaymentgroup.com:443', { encodedQueryParams: true })
      .post('/api/merchant.authorize', {
        public_key: briteConfig.LD.publicKey,
        secret: briteConfig.LD.secret,
      })
      .reply(200, {
        access_token: '5555d270d13eb332258fd53d52e337bfa6c22b91',
        expires: 1652384440,
        refresh_token: '386da6feb6f41e6af0cb65ef56da828a47e0fd81',
      })
      .post('/api/session.create_deposit', (body) => body.amount && +body.amount === 0)
      .reply(400, {
        error_name: 'InvalidAmount',
        error_message: 'Amount can not be below or equal 0',
        state: 'APPLICATION_ERROR',
      })
      .post('/api/session.create_deposit', () => ({
        customer_firstname: 'Tech123',
        customer_lastname: 'Foo',
        country_id: 'FI',
        amount: '50.00',
        merchant_reference: `${player.username}|${depositTransactionKey}`,
        callbacks: [
          { url: `${config.server.public}/api/v1/brite/LD/std`, transaction_state: 2 },
          { url: `${config.server.public}/api/v1/brite/LD/std`, transaction_state: 3 },
          { url: `${config.server.public}/api/v1/brite/LD/std`, transaction_state: 5 },
        ],
      }))
      .reply(200, {
        url: `https://sandbox.britepaymentgroup.com/${NOCK.SESSION_TOKEN}`,
        token: NOCK.SESSION_TOKEN,
        id: NOCK.SESSION_ID,
      })
      .post('/api/transaction.create_withdrawal', (body) => body.amount && +body.amount === 0)
      .reply(400, {
        error_name: 'TransactionInvalid',
        error_message: NOCK.WITHDRAW_ERROR_MESSAGE,
        state: 'APPLICATION_ERROR',
      })
      .post(
        '/api/transaction.create_withdrawal',
        (body) =>
          body.bank_account_id &&
          body.bank_account_id === 'ag9ofmFib25lYS0xNzYyMTNyGAsSC0JhbmtBY2NvdW50GICAgLKcqcAIDA',
      )
      .reply(200, { id: NOCK.WITHDRAW_TRANSACTION_ID })
      .post('/api/session.create_authentication', (body) => body.country_id === 'XX')
      .reply(400, {
        error_name: 'NotFound',
        error_message: 'No Country found with id: ag9ofmFib25lYS0xNzYyMTNyDwsSB0NvdW50cnkiAnh4DA',
        state: 'APPLICATION_ERROR',
      })
      .post('/api/session.create_authentication', () => ({
        country_id: 'FI',
        merchant_reference: `${player.username}|`,
        callbacks: [
          { url: `${config.server.public}/api/v1/brite/LD/std`, session_state: 2 },
          { url: `${config.server.public}/api/v1/brite/LD/std`, session_state: 10 },
          { url: `${config.server.public}/api/v1/brite/LD/std`, session_state: 11 },
        ],
      }))
      .reply(200, {
        url: `https://sandbox.britepaymentgroup.com/${NOCK.SESSION_TOKEN}`,
        token: NOCK.SESSION_TOKEN,
        id: NOCK.SESSION_ID,
      });
  });

  describe('Deposits', () => {
    const dpBody = (amnt: { amount: number } = { amount: 5000 }) => ({
      player,
      urls: {
        ok: 'http://127.0.0.1:3003/ok',
        failure: 'http://127.0.0.1:3003/fail',
      },
      brand: {
        name: 'LuckyDino',
      },
      deposit: {
        paymentId: 101086349,
        transactionKey: depositTransactionKey,
        timestamp: '2019-01-23T06:29:52.406Z',
        playerId: 2017118,
        accountId: 1046785,
        ...amnt,
        status: 'accepted',
        paymentParameters: {},
        accountParameters: {},
        paymentMethod: 'Brite',
        paymentProvider: 'Brite',
      },
      client: {
        ipAddress: '10.110.11.11',
        userAgent: 'Hugo Weaving',
        isMobile: false,
      },
    });
    beforeEach(async () => {
      await request(config.api.backend.url)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'Brite_Brite', amount: 5000 })
        .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
        .expect(200)
        .expect((res) => {
          depositTransactionKey = res.body.transactionKey;
        });
    });

    it('can execute deposit', async () =>
      request(api)
        .post('/api/v1/deposit')
        .send(dpBody())
        .expect(200)
        .expect((res) => {
          expect(res.body.html).to.have.string(`${NOCK.SESSION_TOKEN}`);
          expect(res.body).to.containSubset({
            requiresFullscreen: false,
          });
        }));

    it('fails gracefully', async () =>
      request(api)
        .post('/api/v1/deposit')
        .send(dpBody({ amount: 0 }))
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            url: 'http://127.0.0.1:3003/fail',
            requiresFullscreen: false,
          });
        }));
  });

  describe('Withdrawals', () => {
    withdrawalTransactionKey = uuid();
    const wdBody = (amnt: { amount: number } = { amount: 100 }) => ({
      player,
      brand: {
        name: 'LuckyDino',
      },
      withdrawal: {
        paymentId: 101086349,
        transactionKey: withdrawalTransactionKey,
        timestamp: '2019-01-23T06:29:52.406Z',
        playerId: 2017118,
        accountId: 1046785,
        ...amnt,
        status: 'accepted',
        account: 'NO93 8601 1117 947',
        paymentParameters: {},
        accountParameters: {
          id: 'ag9ofmFib25lYS0xNzYyMTNyGAsSC0JhbmtBY2NvdW50GICAgLKcqcAIDA',
        },
        paymentMethodName: 'Brite',
        paymentProvider: 'Brite',
      },
      user: { handle: 'Test', name: 'Test User' },
    });

    it('can execute withdrawal', async () =>
      request(api)
        .post('/api/v1/withdraw')
        .send(wdBody())
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            ok: true,
            id: NOCK.WITHDRAW_TRANSACTION_ID,
            message: `Brite withdrawal initiated`,
            reject: false,
            complete: false,
          });
        }));

    it('fails gracefully', async () =>
      request(api)
        .post('/api/v1/withdraw')
        .send(wdBody({ amount: 0 }))
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            ok: false,
            reject: true,
            complete: false,
          });
          expect(res.body.message).to.have.string(NOCK.WITHDRAW_ERROR_MESSAGE);
        }));
  });

  describe('Identifications', () => {
    const idBody = (cntry: { countryId: string } = { countryId: 'FI' }) => ({
      player: {
        id: 2017118,
        username: player.username,
        email: 'test@gmail.com',
        firstName: 'Test',
        lastName: 'User',
        currencyId: 'EUR',
        ...cntry,
        languageId: 'en',
        address: '123 sesame street',
        postCode: '123456',
        city: 'Sudden Valley',
        address_country: 'FI',
        dateOfBirth: '1995-01-01',
        verified: false,
        mobilePhone: '3586666666666',
        brandId: 'LD',
      },
      identify: {
        paymentProvider: 'Brite',
      },
      brand: {
        name: 'LuckyDino',
      },
      urls: {
        ok: 'http://127.0.0.1:3003/ok',
        failure: 'http://127.0.0.1:3003/fail',
      },
    });

    it('can execute identification', async () =>
      request(api)
        .post('/api/v1/identify')
        .send(idBody())
        .expect(200)
        .expect((res) => {
          expect(res.body.html).to.have.string(`${NOCK.SESSION_TOKEN}`);
          expect(res.body).to.containSubset({
            requiresFullscreen: false,
          });
        }));

    it('fails gracefully', async () =>
      request(api)
        .post('/api/v1/identify')
        .send(idBody({ countryId: 'XX' }))
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            url: 'http://127.0.0.1:3003/fail',
            requiresFullscreen: false,
          });
        }));
  });

  describe('Registrations', () => {
    const regBody = (amnt: { amount: number } = { amount: 5000 }) => ({
      player: {
        id: 2017118,
        username: 'LD_Test.User_123',
        email: 'test@gmail.com',
        currencyId: 'EUR',
        brandId: 'LD',
        languageId: 'de',
        countryId: 'FI',
        firstName: 'Test',
        lastName: 'User',
      },
      urls: {
        ok: 'http://127.0.0.1:3003/ok',
        failure: 'http://127.0.0.1:3003/fail',
      },
      brand: {
        name: 'LuckyDino',
      },
      deposit: {
        paymentId: 101086349,
        transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f12',
        timestamp: '2019-01-23T06:29:52.406Z',
        playerId: 2017118,
        accountId: 1046785,
        ...amnt,
        status: 'accepted',
        account: 'foo@bar.com',
        paymentParameters: {},
        accountParameters: {},
        paymentMethodName: 'Brite',
        paymentProvider: 'Brite',
        paymentMethod: 'Brite',
      },
    });

    it('can execute registration', async () =>
      request(api)
        .post('/api/v1/register')
        .send(regBody())
        .expect(200)
        .expect((res) => {
          expect(res.body.html).to.have.string(`${NOCK.SESSION_TOKEN}`);
          expect(res.body).to.containSubset({
            requiresFullscreen: false,
          });
        }));

    it('fails gracefully', async () =>
      request(api)
        .post('/api/v1/register')
        .send(regBody({ amount: 0 }))
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            url: 'http://127.0.0.1:3003/fail',
            requiresFullscreen: false,
          });
        }));
  });

  describe('Logins', () => {
    const lgnBody = (cntry: { countryId: string } = { countryId: 'FI' }) => ({
      player: {
        id: 2017118,
        username: 'LD_Test.User_123',
        email: 'test@gmail.com',
        firstName: 'Test',
        lastName: 'User',
        currencyId: 'EUR',
        ...cntry,
        languageId: 'en',
        address: '123 sesame street',
        postCode: '123456',
        city: 'Sudden Valley',
        address_country: 'FI',
        dateOfBirth: '1995-01-01',
        verified: false,
        mobilePhone: '3586666666666',
        brandId: 'LD',
      },
      deposit: {
        paymentMethod: 'Brite',
        transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f12',
      },
      urls: {
        ok: 'http://127.0.0.1:3003/ok',
        failure: 'http://127.0.0.1:3003/fail',
      },
      brand: {
        name: 'LuckyDino',
      },
    });

    it('can execute login', async () =>
      request(api)
        .post('/api/v1/login')
        .send(lgnBody())
        .expect(200)
        .expect((res) => {
          expect(res.body.html).to.have.string(`${NOCK.SESSION_TOKEN}`);
          expect(res.body).to.containSubset({
            requiresFullscreen: false,
          });
        }));

    it('fails gracefully', async () =>
      request(api)
        .post('/api/v1/login')
        .send(lgnBody({ countryId: 'XX' }))
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            url: 'http://127.0.0.1:3003/fail',
            requiresFullscreen: false,
          });
        }));
  });
});
