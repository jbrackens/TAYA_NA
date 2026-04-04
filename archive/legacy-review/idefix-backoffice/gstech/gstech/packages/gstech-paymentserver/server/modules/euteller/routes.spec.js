/* @flow */
const nock = require('nock');  
const request = require('supertest');  
const { v1: uuid } = require('uuid');
const api = require('gstech-core/modules/clients/backend-payment-api');
const { md5, sha256, wdRequestSignature } = require('./signature');

const app = require('../../index');
const config = require('../../../config');

const eutellerConfig = config.providers.euteller;

// nock.recorder.rec();

describe('Euteller Notification API', () => {
  let sessionId;
  let transactionKey;
  const bankref = uuid();
  let username;

  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({ countryId: 'FI' })
      .expect((res) => {
        sessionId = res.body.token;
        username = res.body.player.username;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'BankTransfer_Euteller', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      });
  });

  it('can handle callback', async () => {
    await request(app)
      .get('/api/v1/euteller/ipn')
      .query({
        ipn: 'true',
        orderid: '123123',
        state: '200',
        original_amount: 500,
        amount: 499,
        bankref,
        addfield: {
          username,
          transactionKey,
        },
        end_user: {
          login: username,
          category: '0',
          device: '0',
          phoneNumber: '4903950078026',
        },
        security: md5(['123123', 'ipn', eutellerConfig.deposit.username, '499', eutellerConfig.deposit.password].join('')),
      })
      .expect(200);

    await request(config.api.backend.url)
      .get('/api/LD/v1/balance')
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        expect(res.body.balance).to.equal(50000);
      });
  });

  it('can consume kyc data', async () => {
    const security = sha256(['kyc_data', 'TestCasino', transactionKey, '2019-01-12 06:00:13', 'JOHN PLAYER', 'EUTxxxxx', 'FI1234XXXXXXXX5678', eutellerConfig.merchant.password].join(''));
    await request(app)
      .post('/api/v1/euteller/kyc')
      .send({
        method: 'kyc_data',
        customer: 'TestCasino',
        merchant_reference: transactionKey,
        last_update: '2019-01-12 06:00:13',
        bank_reference: '13123123',
        original_amount: '25.00',
        extra_fields: {
          email: 'felix.fortunatus@luckydino.com',
          siteName: 'LuckyDino',
          firstName: 'John',
          lastName: 'Player',
          username,
          phoneNumber: '3581231238321',
          transactionKey,
        },
        kyc: {
          account_owner: 'JOHN PLAYER',
          iban_masked: 'FI1234XXXXXXXX5678',
          iban_hashed: 'EUTxxxxx',
        },
        security,
      })
      .expect(200);

    const { deposit } = await api.getDepositAlt(transactionKey);
    const account = await api.getAccount(deposit.username, deposit.accountId);
    expect(account).to.containSubset({
      parameters: {
        iban_hashed: 'EUTxxxxx',
      },
      account: 'FI1234XXXXXXXX5678',
    });
  });
});


describe('Euteller Siirto Notification API', () => {
  let sessionId;
  let transactionKey;
  let username;
  const bankReference = uuid();

  nock('https://payment.euteller.com', { encodedQueryParams: true })
    .get('/merchantapi/v1?customer=LuckyDino_dev&action=paymentcheck&security=5c51abd57c0dfa1fc9bd7dfaf32f13b973a7b54b2abd8ce7bb4470e9ddcc7b27&orderid=123123')
    .reply(200, {
      response: { bankref: '123123', account_owner: 'Funny Person' },
      status: 'Transaction found and OK',
      status_code: 200,
      action: 'paymentcheck',
      customer: 'LuckyDino_dev',
      response_date_time: '2019-04-13 11:04:44',
    });

  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        countryId: 'FI',
      })
      .expect((res) => {
        sessionId = res.body.token;
        username = res.body.player.username;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'Siirto_Euteller', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      });
  });

  it('returns an error with invalid signature', async () => {
    await request(app)
      .get('/api/v1/euteller/ipn')
      .query({
        ipn: 'siirto',
        orderid: 123123,
        state: '200',
        state_text: 'PAID',
        original_amount: 500,
        amount: 499,
        customer: eutellerConfig.deposit.username,
        bankReference,
        addfield: {
          transactionKey,
          username,
        },
        security: sha256(['111', 'siirto', eutellerConfig.deposit.username, '499', eutellerConfig.deposit.password].join('')),
      })
      .expect(500);
  });

  it('can handle callback', async () => {
    await request(app)
      .get('/api/v1/euteller/ipn')
      .query({
        ipn: 'siirto',
        orderid: '123123',
        state: '200',
        state_text: 'PAID',
        original_amount: 500,
        amount: 499,
        customer: eutellerConfig.deposit.username,
        bankReference,
        addfield: {
          transactionKey,
          username,
          phoneNumber: '4903950078026',
        },
        security: sha256([123123, 'siirto', eutellerConfig.deposit.username, '499', eutellerConfig.deposit.password].join('')),
      })
      .expect(200);

    await request(config.api.backend.url)
      .get('/api/LD/v1/balance')
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        expect(res.body.balance).to.equal(50000);
      });
  });
});

describe('Withdrawal processing', () => {
  let player;
  let sessionId;
  let transactionKey;

  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        countryId: 'FI',
      })
      .expect((res) => {
        player = res.body.player;
        sessionId = res.body.token;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'BankTransfer_Euteller', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      })
      .expect(200);

    await api.updateDeposit(player.username, transactionKey, {
      account: 'FI2112345600000785',
      externalTransactionId: transactionKey,
      accountParameters: {},
      message: 'OK',
      rawTransaction: {},
    });
    await request(config.api.backend.url)
      .post('/api/LD/v1/test-withdraw')
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .send({
        amount: 5000,
        provider: 'Euteller',
      })
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      })
      .expect(200);
  });

  it('returns an error with invalid wd signature', async () => {
    const signature = wdRequestSignature('123', player.username);
    const security = sha256(['140', eutellerConfig.withdraw.username, '123', '1511764363', eutellerConfig.withdraw.password].join('&'));
    await request(app)
      .get(`/api/v1/euteller/wd/${transactionKey}/${player.username}/${signature}`)
      .query(`method=withdraw&version=1.0&request_timestamp=1511764363&data[status]=140&data[customer]=${eutellerConfig.withdraw.username}&data[transactionid]=123&security=${security}`)
      .expect(500);
  });

  it('returns an error with invalid euteller signature', async () => {
    const signature = wdRequestSignature(transactionKey, player.username);
    const security = sha256(['10', eutellerConfig.withdraw.username, '123', '1511764363', eutellerConfig.withdraw.password].join('&'));
    await request(app)
      .get(`/api/v1/euteller/wd/${transactionKey}/${player.username}/${signature}`)
      .query(`method=withdraw&version=1.0&request_timestamp=1511764363&data[status]=140&data[customer]=${eutellerConfig.withdraw.username}&data[transactionid]=123&security=${security}`)
      .expect(500);
  });


  it('can handle wd complete callback', async () => {
    const signature = wdRequestSignature(transactionKey, player.username);
    const security = sha256(['140', eutellerConfig.withdraw.username, '123', '1511764363', eutellerConfig.withdraw.password].join('&'));
    await request(app)
      .get(`/api/v1/euteller/wd/${transactionKey}/${player.username}/${signature}`)
      .query(`method=withdraw&version=1.0&request_timestamp=1511764363&data[status]=140&data[customer]=${eutellerConfig.withdraw.username}&data[transactionid]=123&security=${security}`)
      .expect((res) => {
        expect(res.body.status).to.equal('OK');
        expect(res.body.data.customer).to.equal(eutellerConfig.withdraw.username);
        expect(res.body.security).to.equal(sha256([eutellerConfig.withdraw.username, '123', res.body.response_timestamp, eutellerConfig.withdraw.password].join('')));
      })
      .expect(200);
  });
});
