/* @flow */
const request = require('supertest');  
const { v1: uuid } = require('uuid');

const api = require('gstech-core/modules/clients/backend-payment-api');
const app = require('../../index');
const config = require('../../../config');

const paymentiqConfig = config.providers.paymentiq;

describe('PaymentIQ Callback API', () => {
  it('can return an error on verifyuser', async () =>
    request(app)
      .post('/api/v1/paymentiq/verifyuser')
      .auth('paymentiq', paymentiqConfig.password)
      .send({ sessionId: 's9wefk2392masgp', userId: 'LD_Eino.Porkka_123' })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          userId: 'LD_Eino.Porkka_123',
          success: false,
          errCode: '110',
          errMsg: 'Session not active',
        });
      }));

  describe('With a valid session', () => {
    let username;
    let sessionId;

    beforeEach(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.token;
        username = res.body.player.username;
      })
      .expect(200));

    it('returns player details from verifyuser', async () =>
      request(app)
        .post('/api/v1/paymentiq/verifyuser')
        .auth('paymentiq', paymentiqConfig.password)
        .send({ sessionId, userId: username })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            userId: username,
            success: true,
            balance: '0.00',
            balanceCy: 'EUR',
            country: 'DEU',
            locale: 'en_US',
          });
        }));
  });

  describe('CreditcardDeposit', () => {
    let username;
    let sessionId;
    let transactionKey;

    before(async () => {
      await request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'NE',
          initialBalance: 1000,
        })
        .expect((res) => {
          sessionId = res.body.token;
          username = res.body.player.username;
        })
        .expect(200);

      await request(config.api.backend.url)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'CreditCard_Bambora', amount: 5000, bonusId: 1001, parameters: { foo: 'bar', zoo: 1 } })
        .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });
    });

    it('authorizes a payment CreditcardDeposit', async () =>
      request(app)
        .post('/api/v1/paymentiq/authorize')
        .auth('paymentiq', paymentiqConfig.password)
        .send({
          userId: username,
          txAmount: '50.00',
          txAmountCy: 'EUR',
          txId: uuid(),
          txTypeId: 101,
          txName: 'CreditcardDeposit',
          provider: 'ESP',
          pspService: 'Envoy',
          originTxId: uuid(),
          accountId: uuid(),
          accountHolder: 'Edvard Mörkö',
          maskedAccount: '411812******2410',
          pspFeeCy: 'EUR',
          pspFeeBaseCy: 'EUR',
          attributes: {
            transactionKey,
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            userId: username,
            success: true,
            authCode: transactionKey,
          });
        })
        .expect(200));

    it('proceeds with deposit a payment', async () =>
      request(app)
        .post('/api/v1/paymentiq/transfer')
        .auth('paymentiq', paymentiqConfig.password)
        .send({
          feeMode: 'A',
          pspRefId: uuid(),
          txRefId: uuid(),
          authCode: transactionKey,
          fee: '0.00',
          txId: uuid(),
          maskedAccount: '545721******1420',
          pspStatusMessage: 'APPROVED',
          userId: username,
          txAmount: '50.00',
          txAmountCy: 'EUR',
          txPspAmount: '50.00',
          feeCy: 'EUR',
          txTypeId: '108',
          accountId: 'c9552f20-b59e-44e5-922d-1991c90c3bc0',
          accountHolder: 'Edvard Mörkö',
          provider: 'BamboraGa',
          expiryMonth: '07',
          expiryYear: '2020',
          attributes: {
            transactionKey,
            successUrl: 'http://localhost:3010/api/deposit/ok',
            failureUrl: `http://localhost:3010/api/deposit/pending/${transactionKey}`,
            pendingUrl: `http://localhost:3010/api/deposit/pending/${transactionKey}`,
          },
          txPspAmountCy: 'EUR',
          txName: 'CreditcardDeposit',
        })
        .expect(200)
        .expect(async (res) => {
          expect(res.body).to.containSubset({
            userId: username,
            success: true,
          });

          const { deposit } = await api.getDepositAlt(transactionKey);
          const account = await api.getAccount(deposit.username, deposit.accountId);
          expect(account.parameters).to.containSubset({
            expiryMonth: '07',
            expiryYear: '2020',
          });
        }));
  });

  describe('VisaVoucherDeposit', () => {
    let username;
    let sessionId;
    let transactionKey;

    before(async () => {
      await request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'NE',
          initialBalance: 1000,
          currencyId: 'NOK',
        })
        .expect((res) => {
          sessionId = res.body.token;
          username = res.body.player.username;
        })
        .expect(200);

      await request(config.api.backend.url)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 50000, bonusId: 1001 })
        .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });
    });

    it('authorizes a payment VisaVoucherDeposit', async () =>
      request(app)
        .post('/api/v1/paymentiq/authorize')
        .auth('paymentiq', paymentiqConfig.password)
        .send({
          userId: username,
          txAmount: '500.00',
          txAmountCy: 'NOK',
          txId: uuid(),
          txTypeId: 101,
          txName: 'VisaVoucherDeposit',
          provider: 'Kluwp',
          pspService: 'Kl',
          originTxId: uuid(),
          accountId: uuid(),
          accountHolder: 'Edvard Mörkö',
          maskedAccount: '411812******2410',
          pspFeeCy: 'EUR',
          pspFeeBaseCy: 'EUR',
          attributes: {
            transactionKey,
          },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            userId: username,
            success: true,
            authCode: transactionKey,
          });
        }));

    it('proceeds with deposit a payment', async () =>
      request(app)
        .post('/api/v1/paymentiq/transfer')
        .auth('paymentiq', paymentiqConfig.password)
        .send({ feeMode: 'A',
          pspRefId: uuid(),
          txRefId: uuid(),
          authCode: transactionKey,
          fee: '0.00',
          txId: uuid(),
          maskedAccount: null,
          pspStatusMessage: 'APPROVED',
          userId: username,
          txAmount: '1025.00',
          txAmountCy: 'NOK',
          txPspAmount: '1025.00',
          feeCy: 'NOK',
          txTypeId: 408,
          accountId: null,
          provider: 'Kluwp',
          attributes: {
            transactionKey,
            successUrl: 'https://casinojefe.com/api/deposit/ok',
            failureUrl: `http://localhost:3010/api/deposit/pending/${transactionKey}`,
            pendingUrl: `http://localhost:3010/api/deposit/pending/${transactionKey}`,
          },
          txPspAmountCy: 'NOK',
          txName: 'VisaVoucherDeposit',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            userId: username,
            success: true,
          });
        }));
  });

  describe('VisaVoucherDeposit cancel', () => {
    let username;
    let sessionId;
    let transactionKey;

    before(async () => {
      await request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'NE',
          initialBalance: 1000,
          currencyId: 'NOK',
        })
        .expect((res) => {
          sessionId = res.body.token;
          username = res.body.player.username;
        })
        .expect(200);

      await request(config.api.backend.url)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 50000, bonusId: 1001 })
        .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });
    });

    it('authorizes a payment VisaVoucherDeposit', async () =>
      request(app)
        .post('/api/v1/paymentiq/authorize')
        .auth('paymentiq', paymentiqConfig.password)
        .send({
          userId: username,
          txAmount: '500.00',
          txAmountCy: 'NOK',
          txId: uuid(),
          txTypeId: 101,
          txName: 'VisaVoucherDeposit',
          provider: 'Kluwp',
          pspService: 'Kl',
          originTxId: uuid(),
          accountId: uuid(),
          accountHolder: 'Edvard Mörkö',
          maskedAccount: '411812******2410',
          pspFeeCy: 'EUR',
          pspFeeBaseCy: 'EUR',
          attributes: {
            transactionKey,
          },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            userId: username,
            success: true,
            authCode: transactionKey,
          });
        }));

    it('cancels payment', async () =>
      request(app)
        .post('/api/v1/paymentiq/cancel')
        .auth('paymentiq', paymentiqConfig.password)
        .send({
          authCode: transactionKey,
          txId: uuid(),
          maskedAccount: null,
          pspStatusCode: 'SYSTEM ERROR',
          pspStatusMessage: '',
          userId: username,
          txAmount: '1025.00',
          txAmountCy: 'NOK',
          txPspAmount: '1025.00',
          txTypeId: '108',
          accountId: null,
          provider: 'Kluwp',
          attributes: {
            transactionKey,
            successUrl: 'https://casinojefe.com/api/deposit/ok',
            failureUrl: `http://localhost:3010/api/deposit/pending/${transactionKey}`,
            pendingUrl: `http://localhost:3010/api/deposit/pending/${transactionKey}`,
          },
          txPspAmountCy: 'NOK',
          txName: 'VisaVoucherDeposit',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            userId: username,
            success: true,
          });
        }));
  });
});
