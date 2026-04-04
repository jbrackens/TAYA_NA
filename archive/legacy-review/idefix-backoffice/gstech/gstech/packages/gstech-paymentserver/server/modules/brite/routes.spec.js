/* @flow */
const nock = require('nock');  
const request = require('supertest');  
const { v1: uuid } = require('uuid');
const money = require('gstech-core/modules/money');
const backend = require('gstech-core/modules/clients/backend-payment-api');

const app = require('../../index');
const config = require('../../../config');
const { SESSION, TRANSACTION, KYC } = require('./constants');

const briteConfig = config.providers.brite;

// nock.recorder.rec();
describe('Brite Callback Routes', () => {
  let player;
  let sessionId;
  let depositTransactionKey;
  let withdrawalTransactionKey;
  let partialTransactionKey;
  let initialBalance = 0;
  const depositAmount = 5000;
  const withdrawalAmount = 3000;
  const NOCK: any = {
    SESSION_STATE: -1,
    TRANSACTION_STATE: -1,
    KYC_STATE: -1,
    AMOUNT: -1,
    MERCHANT_REFERENCE: '',
    TRANSACTION_TYPE: TRANSACTION.TYPE_DEPOSIT,
    SESSION_TYPE: SESSION.TYPE_DEPOSIT,
    SESSION_TOKEN: '<SESSION_TOKEN>',
    SESSION_ID: '<SESSION_ID>',
    TRANSACTION_ID: '<TRANSACTION_ID>',
    FROM_BANK_ACCOUNT_ID: '<FROM_BANK_ACCOUNT_ID>',
    FROM_BANK_ACCOUNT_HOLDER: '<FROM_BANK_ACCOUNT_HOLDER>',
    FROM_BANK_ACCOUNT_NAME: '<FROM_BANK_ACCOUNT_NAME>',
    FROM_BANK_ACCOUNT_IBAN: '<FROM_BANK_ACCOUNT_IBAN>',
    KYC_ID: '<KYC_ID>',
    KYC_SSN: '<KYC_SSN>',
    KYC_CUSTOMER_ID: '<KYC_CUSTOMER_ID>',
    KYC_INFO: {
      firstname: 'Anders',
      lastname: 'Andersson',
      dob: '1940-09-12',
      country_id: 'fi',
      address: {
        city: 'Helsinki',
        postal_code: '11246',
        street_address: 'Testgatan 1',
        country: 'Finland',
      },
    },
    sessionCallbackBody: () => ({
      merchant_id: 'ag9ofmFib25lYS0xNzYyMTNyFQsSCE1lcmNoYW50GICAgIqhrJ0IDA',
      session_id: NOCK.SESSION_ID,
      session_state: NOCK.SESSION_STATE,
    }),
    transactionCallbackBody: () => ({
      merchant_id: 'ag9ofmFib25lYS0xNzYyMTNyFQsSCE1lcmNoYW50GICAgIqhrJ0IDA',
      transaction_id: NOCK.TRANSACTION_ID,
      transaction_state: NOCK.TRANSACTION_STATE,
    }),
    'transaction.get': () => ({
      from_bank_account: {
        bank_name: NOCK.FROM_BANK_ACCOUNT_NAME,
        country_id: 'fi',
        bban: '********016286',
        iban: NOCK.FROM_BANK_ACCOUNT_IBAN,
      },
      to_bank_account: { bank_name: 'Nordea', country_id: 'fi', iban: '45*******456456' },
      created: 1652774655,
      type: NOCK.TRANSACTION_TYPE,
      to_bank_account_id: 'ag9ofmFib25lYS0xNzYyMTNyGAsSC0JhbmtBY2NvdW50GICAgJzU0KoLDA',
      from_bank_account_id: NOCK.FROM_BANK_ACCOUNT_ID,
      country_id: 'fi',
      amount: money.formatMoney(NOCK.AMOUNT),
      session_id: NOCK.SESSION_ID,
      approved: 1652774655,
      currency_id: 'eur',
      state: NOCK.TRANSACTION_STATE,
      completed: 1652774671,
      settled: 1652774675,
      message: 'RF377943556672848518',
      customer_id: NOCK.KYC_CUSTOMER_ID,
      merchant_reference: NOCK.MERCHANT_REFERENCE,
      id: NOCK.TRANSACTION_ID,
    }),
    'session.get': () => ({
      currency_id: 'eur',
      reference: 5660685581156352,
      created: 1652774610,
      ip: '212.250.151.149',
      merchant_reference: NOCK.MERCHANT_REFERENCE,
      country_id: 'fi',
      bank_id: 'ag9ofmFib25lYS0xNzYyMTNyEQsSBEJhbmsYgICAyvjIlwoM',
      bank_integration_id: 'fi_test_bank_03',
      state: NOCK.SESSION_STATE,
      user_agent: 'Mozilla/5.0 (Macintosh; ... Chrome/101.0.4951.64 Safari/537.36',
      amount: money.formatMoney(NOCK.AMOUNT),
      customer_id: NOCK.KYC_CUSTOMER_ID,
      type: NOCK.SESSION_TYPE,
      id: NOCK.SESSION_ID,
      bank: { id: 'ag9ofmFib25lYS0xNzYyMTNyEQsSBEJhbmsYgICAyvjIlwoM', name: 'Test Bank' },
    }),
    'kyc.get': () => ({
      id: NOCK.KYC_ID,
      ssn: NOCK.KYC_SSN,
      state: NOCK.KYC_STATE,
      customer_id: NOCK.KYC_CUSTOMER_ID,
      created: 1652774644,
      completed: 1652774645,
      ...NOCK.KYC_INFO,
    }),
    'kyc.get_latest': () => ({
      id: NOCK.KYC_ID,
      ssn: NOCK.KYC_SSN,
      state: NOCK.KYC_STATE,
      customer_id: NOCK.KYC_CUSTOMER_ID,
      created: 1652774644,
      completed: 1652774645,
      ...NOCK.KYC_INFO,
    }),
    'bank_account.get': () => ({
      name: NOCK.FROM_BANK_ACCOUNT_NAME,
      created: 1652554832,
      country_id: 'fi',
      bban: '********016286',
      bank_id: 'ag9ofmFib25lYS0xNzYyMTNyEQsSBEJhbmsYgICAyvjIlwoM',
      currency_id: 'eur',
      iban: NOCK.FROM_BANK_ACCOUNT_IBAN,
      payment_account: true,
      balance: '1234.56',
      holder: NOCK.FROM_BANK_ACCOUNT_HOLDER,
      id: NOCK.FROM_BANK_ACCOUNT_ID,
    }),
  };
  const nockedAuth = nock('https://sandbox.britepaymentgroup.com:443')
    .post('/api/merchant.authorize', {
      public_key: briteConfig.LD.publicKey,
      secret: briteConfig.LD.secret,
    })
    .reply(200, {
      access_token: '5555d270d13eb332258fd53d52e337bfa6c22b91',
      expires: 1652384440,
      refresh_token: '386da6feb6f41e6af0cb65ef56da828a47e0fd81',
    })
    .persist();

  after(() => nockedAuth.persist(false));

  describe('Invalid Brite Callbacks', () => {
    it('Returns error on unexpected body shape', async () => {
      await request(app)
        .post(`/api/v1/brite/LD/std`)
        .expect(500)
        .expect(({ body }) => {
          expect(body.error.message).to.contain('Brite::stdHandler');
        });
    });
    it('Returns error on unexpected body shape', async () => {
      await request(app)
        .post(`/api/v1/brite/LD/pnp`)
        .expect(500)
        .expect(({ body }) => {
          expect(body.error.message).to.contain('Brite::pnpHandler');
        });
    });
  });

  describe('Brite Basic', () => {
    beforeEach(async () => {
      await request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({ countryId: 'FI', initialBalance })
        .expect(200)
        .expect((res) => {
          sessionId = res.body.token;
          player = res.body.player;
        });
    });
    describe('Brite Basic Deposits', () => {
      beforeEach(async () => {
        await request(config.api.backend.url)
          .post('/api/LD/v1/deposit')
          .send({ depositMethod: 'Brite_Brite', amount: depositAmount })
          .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
          .expect(200)
          .expect((res) => {
            depositTransactionKey = res.body.transactionKey;
          });
        NOCK.MERCHANT_REFERENCE = `${player.username}|${depositTransactionKey}`;
        NOCK.AMOUNT = depositAmount;
        nock('https://sandbox.britepaymentgroup.com:443')
          .post('/api/transaction.get', (body) => body.id === NOCK.TRANSACTION_ID)
          .reply(200, NOCK['transaction.get'])
          .post('/api/bank_account.get', { id: NOCK.FROM_BANK_ACCOUNT_ID })
          .reply(200, NOCK['bank_account.get']);
      });
      describe('Transaction State Callbacks', () => {
        beforeEach(() => {
          NOCK.TRANSACTION_ID = uuid(); // 'payments_paymentProviderId_externalTransactionId_key' constraint
        });
        it('Transaction STATE_CREDIT', async () => {
          NOCK.TRANSACTION_STATE = TRANSACTION.STATE_CREDIT;
          await request(app)
            .post(`/api/v1/brite/LD/std`)
            .send(NOCK.transactionCallbackBody())
            .expect(200)
            .expect(({ body }) => {
              expect(body).to.containSubset({
                playerId: player.id,
                balance: {
                  balance: initialBalance + depositAmount,
                },
              });
            });
          const { deposit, balance } = await backend.getDepositAlt(depositTransactionKey);
          const account = await backend.getAccount(deposit.username, deposit.accountId);
          expect(account).to.containSubset({
            account: NOCK.FROM_BANK_ACCOUNT_IBAN,
            accountHolder: NOCK.FROM_BANK_ACCOUNT_HOLDER,
            parameters: {
              name: NOCK.FROM_BANK_ACCOUNT_NAME,
            },
          });
          expect(deposit.status).to.deep.equal('complete');
          expect(balance.balance).to.deep.equal(initialBalance + depositAmount);
        });
        it('Transaction STATE_SETTLED', async () => {
          NOCK.TRANSACTION_STATE = TRANSACTION.STATE_SETTLED;
          await request(app)
            .post(`/api/v1/brite/LD/std`)
            .send(NOCK.transactionCallbackBody())
            .expect(200)
            .expect(({ body }) => {
              expect(body).to.containSubset({
                playerId: player.id,
                balance: {
                  balance: initialBalance + depositAmount,
                },
              });
            });
          const { deposit, balance } = await backend.getDepositAlt(depositTransactionKey);
          const account = await backend.getAccount(deposit.username, deposit.accountId);
          expect(account).to.containSubset({
            account: NOCK.FROM_BANK_ACCOUNT_IBAN,
            accountHolder: NOCK.FROM_BANK_ACCOUNT_HOLDER,
            parameters: {
              name: NOCK.FROM_BANK_ACCOUNT_NAME,
            },
          });
          expect(deposit.status).to.deep.equal('complete');
          expect(balance.balance).to.deep.equal(initialBalance + depositAmount);
        });
        it('Transaction STATE_DEBIT', async () => {
          NOCK.TRANSACTION_STATE = TRANSACTION.STATE_DEBIT;
          await request(app)
            .post(`/api/v1/brite/LD/std`)
            .send(NOCK.transactionCallbackBody())
            .expect(200)
            .expect(({ body }) => {
              expect(body).to.containSubset({
                ok: true,
                balance: {
                  balance: initialBalance,
                },
                deposit: {
                  status: 'failed',
                },
              });
            });
        });
        it('Transaction STATE_FAILED', async () => {
          NOCK.TRANSACTION_STATE = TRANSACTION.STATE_FAILED;
          await request(app)
            .post(`/api/v1/brite/LD/std`)
            .send(NOCK.transactionCallbackBody())
            .expect(200)
            .expect(({ body }) => {
              expect(body).to.containSubset({
                ok: true,
                balance: {
                  balance: initialBalance,
                },
                deposit: {
                  status: 'failed',
                },
              });
            });
        });
        it('Transaction STATE_ABORTED', async () => {
          NOCK.TRANSACTION_STATE = TRANSACTION.STATE_ABORTED;
          await request(app)
            .post(`/api/v1/brite/LD/std`)
            .send(NOCK.transactionCallbackBody())
            .expect(200)
            .expect(({ body }) => {
              expect(body).to.containSubset({
                ok: true,
                balance: {
                  balance: initialBalance,
                },
                deposit: {
                  status: 'cancelled',
                },
              });
            });
        });
      });
    });
    describe('Brite API-Withdrawals', () => {
      before(() => {
        initialBalance = 4000;
      });
      describe('Transaction State Callbacks', () => {
        beforeEach(async () => {
          await request(config.api.backend.url)
            .post(`/api/LD/v1/player/${player.id}/accounts`)
            .send({
              method: 'Brite',
              account: player.mobilePhone,
              kycChecked: true,
              parameters: {},
            })
            .expect(200);
          await request(config.api.backend.url)
            .post('/api/LD/v1/test-withdraw')
            .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
            .send({
              amount: withdrawalAmount,
              provider: 'Brite',
            })
            .expect((res) => {
              withdrawalTransactionKey = res.body.transactionKey;
            })
            .expect(200);
          NOCK.MERCHANT_REFERENCE = `${player.username}|${withdrawalTransactionKey}`;
          NOCK.AMOUNT = withdrawalAmount;
          NOCK.TRANSACTION_TYPE = TRANSACTION.TYPE_WITHDRAWAL;
          NOCK.TRANSACTION_ID = uuid(); // 'payments_paymentProviderId_externalTransactionId_key' constraint
          nock('https://sandbox.britepaymentgroup.com:443')
            .post('/api/transaction.get', (body) => body.id === NOCK.TRANSACTION_ID)
            .reply(200, NOCK['transaction.get']);
        });
        it('Transaction STATE_CREDIT', async () => {
          NOCK.TRANSACTION_STATE = TRANSACTION.STATE_CREDIT;
          await request(app)
            .post(`/api/v1/brite/LD/std`)
            .send(NOCK.transactionCallbackBody())
            .expect(200)
            .expect(({ body }) => {
              expect(body).to.deep.equal({
                complete: true,
              });
            });
        });
        it('Transaction STATE_SETTLED', async () => {
          NOCK.TRANSACTION_STATE = TRANSACTION.STATE_SETTLED;
          await request(app)
            .post(`/api/v1/brite/LD/std`)
            .send(NOCK.transactionCallbackBody())
            .expect(200)
            .expect(({ body }) => {
              expect(body).to.deep.equal({
                complete: true,
              });
            });
        });
        it('Transaction STATE_DEBIT', async () => {
          NOCK.TRANSACTION_STATE = TRANSACTION.STATE_DEBIT;
          await request(app)
            .post(`/api/v1/brite/LD/std`)
            .send(NOCK.transactionCallbackBody())
            .expect(200)
            .expect(({ body }) => {
              expect(body).to.containSubset({
                failed: {
                  status: 'processing',
                  playerId: player.id,
                  amount: withdrawalAmount,
                },
              });
            });
        });
        it('Transaction STATE_FAILED', async () => {
          NOCK.TRANSACTION_STATE = TRANSACTION.STATE_FAILED;
          await request(app)
            .post(`/api/v1/brite/LD/std`)
            .send(NOCK.transactionCallbackBody())
            .expect(200)
            .expect(({ body }) => {
              expect(body).to.containSubset({
                failed: {
                  status: 'processing',
                  playerId: player.id,
                  amount: withdrawalAmount,
                },
              });
            });
        });
        it('Transaction STATE_ABORTED', async () => {
          NOCK.TRANSACTION_STATE = TRANSACTION.STATE_ABORTED;
          await request(app)
            .post(`/api/v1/brite/LD/std`)
            .send(NOCK.transactionCallbackBody())
            .expect(200)
            .expect(({ body }) => {
              expect(body).to.containSubset({
                failed: {
                  status: 'processing',
                  playerId: player.id,
                  amount: withdrawalAmount,
                },
              });
            });
        });
      });
    });
    describe('Brite Basic KYC Only (identify)', () => {
      describe('Session State Callbacks', () => {
        beforeEach(async () => {
          NOCK.MERCHANT_REFERENCE = `${player.username}|`;
          NOCK.KYC_STATE = KYC.STATE_COMPLETED;
          NOCK.SESSION_TYPE = SESSION.TYPE_AUTHENTICATION;
          nock('https://sandbox.britepaymentgroup.com:443')
            .post('/api/session.get', { id: NOCK.SESSION_ID })
            .reply(200, NOCK['session.get'])
            .post('/api/kyc.get_latest', { customer_id: NOCK.KYC_CUSTOMER_ID })
            .reply(200, NOCK['kyc.get_latest']);
        });
        it('Session STATE_AUTHENTICATION_COMPLETED', async () => {
          NOCK.SESSION_STATE = SESSION.STATE_AUTHENTICATION_COMPLETED;
          await request(app)
            .post(`/api/v1/brite/LD/std`)
            .send(NOCK.sessionCallbackBody())
            .expect(200)
            .expect(({ body }) => {
              expect(body).to.deep.equal({
                ok: true,
                updated: true,
              });
            });
        });
        it('KYC STATE_FAILED', async () => {
          NOCK.SESSION_STATE = SESSION.STATE_AUTHENTICATION_COMPLETED;
          NOCK.KYC_STATE = KYC.STATE_FAILED;
          await request(app)
            .post(`/api/v1/brite/LD/std`)
            .send(NOCK.sessionCallbackBody())
            .expect(500)
            .expect(({ body }) => {
              expect(body.error.message).to.deep.equal(
                'Brite::account::getOrCreateKyc KYC Failed.',
              );
            });
        });
        it('Session STATE_ABORTED', async () => {
          NOCK.SESSION_STATE = SESSION.STATE_ABORTED;
          await request(app)
            .post(`/api/v1/brite/LD/std`)
            .send(NOCK.sessionCallbackBody())
            .expect(200)
            .expect(({ body }) => {
              expect(body).to.deep.equal({
                ok: false,
                mode: 'std',
                reason: '>>> SESSION STATE_ABORTED (10) <<<',
              });
            });
        });
        it('Session STATE_FAILED', async () => {
          NOCK.SESSION_STATE = SESSION.STATE_FAILED;
          await request(app)
            .post(`/api/v1/brite/LD/std`)
            .send(NOCK.sessionCallbackBody())
            .expect(200)
            .expect(({ body }) => {
              expect(body).to.deep.equal({
                ok: false,
                mode: 'std',
                reason: '>>> SESSION STATE_FAILED (11) <<<',
              });
            });
        });
      });
    });
  });

  describe('Brite PNP', () => {
    const partialTestBody = (amnt: { amount: number } = { amount: depositAmount }) => ({
      player: {
        languageId: 'en',
        currencyId: 'EUR',
        ipAddress: '10.110.11.11',
        tcVersion: 11,
      },
      transactionKey: uuid(),
      ...amnt,
      paymentMethod: 'Brite',
      client: {
        ipAddress: '10.110.11.11',
        userAgent: 'Hugo Weaving',
        isMobile: false,
      },
      testParameters: {
        sessionToken: NOCK.SESSION_TOKEN
      }
    });
    before(() => {
      initialBalance = 0;
    });
    describe('Brite KYC Deposits (register)', () => {
      beforeEach(async () => {
        await request(config.api.backend.url)
          .post('/api/v1/test/init-session')
          .send({ countryId: 'FI', initialBalance })
          .expect(200)
          .expect(({ body }) => {
            sessionId = body.token;
          });
        await request(config.api.backend.url) // init partial
          .post('/api/LD/v1/test-partial')
          .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
          .send(partialTestBody())
          .expect(200)
          .expect(({ body }) => {
            partialTransactionKey = body.deposit.transactionKey;
          });
      });
      describe('State Callbacks', () => {
        beforeEach(() => {
          NOCK.KYC_STATE = KYC.STATE_COMPLETED;
          NOCK.SESSION_TYPE = SESSION.TYPE_DEPOSIT;
          NOCK.SESSION_ID = uuid();
          NOCK.TRANSACTION_ID = uuid(); // 'payments_paymentProviderId_externalTransactionId_key' constraint
          NOCK.KYC_SSN = uuid(); // stop tests from matching to same user
        });
        describe('Session states', () => {
          beforeEach(() => {
            NOCK.TRANSACTION_TYPE = TRANSACTION.TYPE_DEPOSIT;
            NOCK.MERCHANT_REFERENCE = `LD|${partialTransactionKey}`;
            NOCK.AMOUNT = depositAmount;
            nock('https://sandbox.britepaymentgroup.com:443')
              .post('/api/session.get', (body) => body.id === NOCK.SESSION_ID)
              .reply(200, NOCK['session.get'])
              .post('/api/kyc.create', { customer_id: NOCK.KYC_CUSTOMER_ID })
              .reply(200, () => ({ id: NOCK.KYC_ID }))
              .post('/api/kyc.get', { id: NOCK.KYC_ID })
              .reply(200, NOCK['kyc.get'])
              .post('/api/kyc.get_latest', { customer_id: NOCK.KYC_CUSTOMER_ID }) // account() -> getOrCreateKYC()
              .reply(200, NOCK['kyc.get_latest'])
              .post('/api/session.reject', (body) => body.session_token === NOCK.SESSION_TOKEN)
              .reply(200, {})
              .post('/api/session.approve', { session_token: NOCK.SESSION_TOKEN })
              .reply(200, {});
          });
          it('Session STATE_AUTHENTICATION_COMPLETED', async () => {
            NOCK.SESSION_STATE = SESSION.STATE_AUTHENTICATION_COMPLETED;
            await request(app)
              .post(`/api/v1/brite/LD/pnp`)
              .send(NOCK.sessionCallbackBody())
              .expect(200)
              .expect(({ body }) => {
                expect(body).to.containSubset({
                  isDeposit: true,
                  transactionKey: partialTransactionKey,
                  player: {
                    partial: true,
                    firstName: NOCK.KYC_INFO.firstname,
                    lastName: NOCK.KYC_INFO.lastname,
                    dateOfBirth: NOCK.KYC_INFO.dob,
                    countryId: NOCK.KYC_INFO.country_id.toUpperCase(),
                    nationalId: NOCK.KYC_SSN,
                    address: NOCK.KYC_INFO.address.street_address,
                    postCode: NOCK.KYC_INFO.address.postal_code,
                    city: NOCK.KYC_INFO.address.city,
                  },
                });
              });
          });
          it('KYC STATE_FAILED', async () => {
            NOCK.SESSION_STATE = SESSION.STATE_AUTHENTICATION_COMPLETED;
            NOCK.KYC_STATE = KYC.STATE_FAILED;
            await request(app)
              .post(`/api/v1/brite/LD/pnp`)
              .send(NOCK.sessionCallbackBody())
              .expect(500)
              .expect(({ body }) => {
                expect(body.error.message).to.deep.equal('Brite::kyc::getOrCreateKyc KYC Failed.');
              });
          });
          it('Session STATE_ABORTED', async () => {
            NOCK.SESSION_STATE = SESSION.STATE_ABORTED;
            await request(app)
              .post(`/api/v1/brite/LD/pnp`)
              .send(NOCK.sessionCallbackBody())
              .expect(200)
              .expect(({ body }) => {
                expect(body).to.deep.equal({
                  ok: false,
                  mode: 'pnp',
                  reason: '>>> SESSION STATE_ABORTED (10) <<<',
                });
              });
          });
          it('Session STATE_FAILED', async () => {
            NOCK.SESSION_STATE = SESSION.STATE_FAILED;
            await request(app)
              .post(`/api/v1/brite/LD/pnp`)
              .send(NOCK.sessionCallbackBody())
              .expect(200)
              .expect(({ body }) => {
                expect(body).to.deep.equal({
                  ok: false,
                  mode: 'pnp',
                  reason: '>>> SESSION STATE_FAILED (11) <<<',
                });
              });
          });
        });
        describe('Transaction states', () => {
          beforeEach(async () => {
            NOCK.MERCHANT_REFERENCE = `LD|${partialTransactionKey}`;
            NOCK.AMOUNT = depositAmount;
            nock('https://sandbox.britepaymentgroup.com:443')
              .post('/api/session.get', (body) => body.id === NOCK.SESSION_ID)
              .reply(200, NOCK['session.get'])
              .post('/api/kyc.create', { customer_id: NOCK.KYC_CUSTOMER_ID })
              .reply(200, () => ({ id: NOCK.KYC_ID }))
              .post('/api/kyc.get', { id: NOCK.KYC_ID })
              .reply(200, NOCK['kyc.get'])
              .post('/api/transaction.get', { id: NOCK.TRANSACTION_ID }) // transaction.get -> calling credit(t) -> calling account()
              .reply(200, NOCK['transaction.get'])
              .post('/api/bank_account.get', (body) => body.id === NOCK.FROM_BANK_ACCOUNT_ID) // credit(t) -> getBankAccountById()
              .reply(200, NOCK['bank_account.get'])
              .post('/api/session.reject', (body) => body.session_token === NOCK.SESSION_TOKEN)
              .reply(200, {})
              .post('/api/session.approve', { session_token: NOCK.SESSION_TOKEN })
              .reply(200, {});
            nock('https://sandbox.britepaymentgroup.com:443')
              .post('/api/kyc.get_latest', { customer_id: NOCK.KYC_CUSTOMER_ID }) // account() -> getOrCreateKYC()
              .twice()
              .reply(200, NOCK['kyc.get_latest']);
            NOCK.SESSION_STATE = SESSION.STATE_AUTHENTICATION_COMPLETED;
            await request(app)
              .post(`/api/v1/brite/LD/pnp`)
              .send(NOCK.sessionCallbackBody())
              .expect(200)
              .expect(({ body }) => {
                expect(body).to.not.include({ ok: false });
              });
          });
          it('Transaction STATE_CREDIT', async () => {
            NOCK.TRANSACTION_STATE = TRANSACTION.STATE_CREDIT;
            await request(app)
              .post(`/api/v1/brite/LD/pnp`)
              .send(NOCK.transactionCallbackBody())
              .expect(200)
              .expect(({ body }) => {
                expect(body).to.containSubset({
                  ok: true,
                  updated: true,
                  balance: { balance: depositAmount, numDeposits: 1 },
                });
              });
            const { deposit, balance } = await backend.getDepositAlt(partialTransactionKey);
            const account = await backend.getAccount(deposit.username, deposit.accountId);
            expect(account).to.containSubset({
              account: NOCK.FROM_BANK_ACCOUNT_IBAN,
              accountHolder: NOCK.FROM_BANK_ACCOUNT_HOLDER,
              parameters: {
                name: NOCK.FROM_BANK_ACCOUNT_NAME,
              },
            });
            expect(deposit.status).to.deep.equal('complete');
            expect(balance.balance).to.deep.equal(depositAmount);
          });
          it('Transaction STATE_SETTLED', async () => {
            NOCK.TRANSACTION_STATE = TRANSACTION.STATE_SETTLED;
            await request(app)
              .post(`/api/v1/brite/LD/pnp`)
              .send(NOCK.transactionCallbackBody())
              .expect(200)
              .expect(({ body }) => {
                expect(body).to.containSubset({
                  ok: true,
                  updated: true,
                  balance: { balance: depositAmount, numDeposits: 1 },
                });
              });
            const { deposit, balance } = await backend.getDepositAlt(partialTransactionKey);
            const account = await backend.getAccount(deposit.username, deposit.accountId);
            expect(account).to.containSubset({
              account: NOCK.FROM_BANK_ACCOUNT_IBAN,
              accountHolder: NOCK.FROM_BANK_ACCOUNT_HOLDER,
              parameters: {
                name: NOCK.FROM_BANK_ACCOUNT_NAME,
              },
            });
            expect(deposit.status).to.deep.equal('complete');
            expect(balance.balance).to.deep.equal(depositAmount);
          });
          it('Transaction STATE_DEBIT', async () => {
            NOCK.TRANSACTION_STATE = TRANSACTION.STATE_DEBIT;
            await request(app)
              .post(`/api/v1/brite/LD/pnp`)
              .send(NOCK.transactionCallbackBody())
              .expect(200)
              .expect(({ body }) => {
                expect(body).to.containSubset({
                  ok: true,
                  deposit: {
                    status: 'failed',
                    amount: depositAmount,
                    transactionKey: partialTransactionKey,
                  },
                  balance: {
                    balance: initialBalance,
                    numDeposits: 0,
                  },
                });
              });
          });
          it('Transaction STATE_FAILED', async () => {
            NOCK.TRANSACTION_STATE = TRANSACTION.STATE_FAILED;
            await request(app)
              .post(`/api/v1/brite/LD/pnp`)
              .send(NOCK.transactionCallbackBody())
              .expect(200)
              .expect(({ body }) => {
                expect(body).to.containSubset({
                  ok: true,
                  deposit: {
                    status: 'failed',
                    amount: depositAmount,
                    transactionKey: partialTransactionKey,
                  },
                  balance: {
                    balance: initialBalance,
                    numDeposits: 0,
                  },
                });
              });
          });
          it('Transaction STATE_ABORTED', async () => {
            NOCK.TRANSACTION_STATE = TRANSACTION.STATE_ABORTED;
            await request(app)
              .post(`/api/v1/brite/LD/pnp`)
              .send(NOCK.transactionCallbackBody())
              .expect(200)
              .expect(({ body }) => {
                expect(body).to.containSubset({
                  ok: true,
                  deposit: {
                    status: 'cancelled',
                    amount: depositAmount,
                    transactionKey: partialTransactionKey,
                  },
                  balance: {
                    balance: initialBalance,
                    numDeposits: 0,
                  },
                });
              });
          });
        });
      });
    });
    describe('Brite KYC Authentications (login)', () => {
      let playerId;
      before(async () => {
        // go through successful PNP register first
        await request(config.api.backend.url)
          .post('/api/v1/test/init-session')
          .send({ countryId: 'FI', initialBalance })
          .expect(200)
          .expect(({ body }) => {
            sessionId = body.token;
          });
        await request(config.api.backend.url) // init partial register
          .post('/api/LD/v1/test-partial')
          .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
          .send(partialTestBody())
          .expect(200)
          .expect(({ body }) => {
            partialTransactionKey = body.deposit.transactionKey;
          });
        NOCK.SESSION_TYPE = SESSION.TYPE_AUTHENTICATION;
        NOCK.KYC_SSN = uuid();
        NOCK.TRANSACTION_ID = uuid();
        NOCK.AMOUNT = depositAmount;
        NOCK.MERCHANT_REFERENCE = `LD|${partialTransactionKey}`;
        nock('https://sandbox.britepaymentgroup.com:443')
          .post('/api/session.get', (body) => body.id === NOCK.SESSION_ID)
          .reply(200, NOCK['session.get'])
          .post('/api/kyc.create', { customer_id: NOCK.KYC_CUSTOMER_ID })
          .reply(200, () => ({ id: NOCK.KYC_ID }))
          .post('/api/kyc.get', { id: NOCK.KYC_ID })
          .reply(200, NOCK['kyc.get'])
          .post('/api/kyc.get_latest', { customer_id: NOCK.KYC_CUSTOMER_ID })
          .twice() // kyc()/account() -> getOrCreateKYC()
          .reply(200, NOCK['kyc.get_latest'])
          .post('/api/transaction.get', { id: NOCK.TRANSACTION_ID }) // transaction.get -> calling credit(t) -> calling account()
          .reply(200, NOCK['transaction.get'])
          .post('/api/bank_account.get', { id: NOCK.FROM_BANK_ACCOUNT_ID }) // credit(t) -> getBankAccountById()
          .reply(200, NOCK['bank_account.get']);
        NOCK.SESSION_STATE = SESSION.STATE_AUTHENTICATION_COMPLETED;
        await request(app)
          .post(`/api/v1/brite/LD/pnp`)
          .send(NOCK.sessionCallbackBody())
          .expect(200)
          .expect(({ body }) => {
            expect(body).to.not.include({ ok: false });
          });
        NOCK.TRANSACTION_STATE = TRANSACTION.STATE_CREDIT;
        await request(app)
          .post(`/api/v1/brite/LD/pnp`)
          .send(NOCK.transactionCallbackBody())
          .expect(200)
          .expect(({ body }) => {
            expect(body).to.containSubset({
              ok: true,
              updated: true,
              balance: { balance: depositAmount, numDeposits: 1 },
            });
          });
        await request(config.api.backend.url) // complete partial login
          .post(`/api/LD/v1/partial/login/${partialTransactionKey}`)
          .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
          .send({
            ipAddress: '10.110.11.11',
            userAgent: 'Hugo Weaving',
          })
          .expect(200)
          .expect(({ body }) => {
            expect(body.player.nationalId).to.equal(NOCK.KYC_SSN);
            playerId = body.player.id
          });
        const counter = 407000000 + (Date.now() % 1000000);
        await request(config.api.backend.url) // complete partial register
          .post(`/api/LD/v1/partial/player/${playerId}`)
          .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
          .send({
            email: `tech${counter}@luckydino.com`,
            mobilePhone: `358${counter}`,
            allowSMSPromotions: false,
            allowEmailPromotions: true,
          })
          .expect(200)
          .expect(({ body }) => {
            expect(body).to.containSubset({
              partial:false,
              accountClosed: false,
              allowGameplay: true,
              nationalId: NOCK.KYC_SSN,
            })
          });
      });
      describe('Session State Callbacks', () => {
        beforeEach(async () => {
          NOCK.AMOUNT = 0;
          await request(config.api.backend.url) // init partial login
            .post('/api/LD/v1/test-partial')
            .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
            .send(partialTestBody({ amount: NOCK.AMOUNT }))
            .expect(200)
            .expect(({ body }) => {
              partialTransactionKey = body.deposit.transactionKey;
            });
          NOCK.MERCHANT_REFERENCE = `LD|${partialTransactionKey}`;
          nock('https://sandbox.britepaymentgroup.com:443')
            .post('/api/session.get', (body) => body.id === NOCK.SESSION_ID)
            .reply(200, NOCK['session.get'])
            .post('/api/kyc.create', { customer_id: NOCK.KYC_CUSTOMER_ID }) // kyc(s) -> createAndGetKyc()
            .reply(200, () => ({ id: NOCK.KYC_ID }))
            .post('/api/kyc.get', { id: NOCK.KYC_ID })
            .reply(200, NOCK['kyc.get'])
            .post('/api/kyc.get_latest', { customer_id: NOCK.KYC_CUSTOMER_ID }) // account() -> getOrCreateKYC()
            .reply(200, NOCK['kyc.get_latest']);
        });
        it('Session STATE_AUTHENTICATION_COMPLETED', async () => {
          NOCK.SESSION_STATE = SESSION.STATE_AUTHENTICATION_COMPLETED;
          await request(app)
            .post(`/api/v1/brite/LD/pnp`)
            .send(NOCK.sessionCallbackBody())
            .expect(200)
            .expect(({ body }) => {
              expect(body).to.containSubset({
                isDeposit: false,
                transactionKey: partialTransactionKey,
                player: {
                  firstName: NOCK.KYC_INFO.firstname,
                  lastName: NOCK.KYC_INFO.lastname,
                  dateOfBirth: NOCK.KYC_INFO.dob,
                  countryId: NOCK.KYC_INFO.country_id.toUpperCase(),
                  nationalId: NOCK.KYC_SSN,
                  address: NOCK.KYC_INFO.address.street_address,
                  postCode: NOCK.KYC_INFO.address.postal_code,
                  city: NOCK.KYC_INFO.address.city,
                },
              });
            });
        });
        it('KYC STATE_FAILED', async () => {
          NOCK.SESSION_STATE = SESSION.STATE_AUTHENTICATION_COMPLETED;
          NOCK.KYC_STATE = KYC.STATE_FAILED;
          await request(app)
            .post(`/api/v1/brite/LD/pnp`)
            .send(NOCK.sessionCallbackBody())
            .expect(500)
            .expect(({ body }) => {
              expect(body.error.message).to.deep.equal('Brite::kyc::getOrCreateKyc KYC Failed.');
            });
        });
        it('Session STATE_ABORTED', async () => {
          NOCK.SESSION_STATE = SESSION.STATE_ABORTED;
          await request(app)
            .post(`/api/v1/brite/LD/pnp`)
            .send(NOCK.sessionCallbackBody())
            .expect(200)
            .expect(({ body }) => {
              expect(body).to.deep.equal({
                ok: false,
                mode: 'pnp',
                reason: '>>> SESSION STATE_ABORTED (10) <<<',
              });
            });
        });
        it('Session STATE_FAILED', async () => {
          NOCK.SESSION_STATE = SESSION.STATE_FAILED;
          await request(app)
            .post(`/api/v1/brite/LD/pnp`)
            .send(NOCK.sessionCallbackBody())
            .expect(200)
            .expect(({ body }) => {
              expect(body).to.deep.equal({
                ok: false,
                mode: 'pnp',
                reason: '>>> SESSION STATE_FAILED (11) <<<',
              });
            });
        });
      });
    });
  });
});
