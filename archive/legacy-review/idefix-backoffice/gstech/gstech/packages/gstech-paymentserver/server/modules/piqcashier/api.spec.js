/* @flow */
const nock = require('nock');  
const request = require('supertest');  

const api = require('../../api-server');
const config = require('../../../config');

// nock.recorder.rec();
describe('PaymentIQ API', () => {
  let player;
  let sessionId;

  let depositTransactionKey;
  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 1000,
        countryId: 'NO',
      })
      .expect((res) => {
        sessionId = res.body.token;
        player = res.body.player;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'VisaVoucher_Kluwp', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        depositTransactionKey = res.body.transactionKey;
      });

    nock('https://test-api.paymentiq.io:443', {
      encodedQueryParams: true,
    })
      .post('/paymentiq/api/visavoucher/deposit/process', {
        encCreditcardNumber: 'YzZhOcYbtX2Yuotlqat+XgdGMNtWAqzFWrn5d6ZpW3oeflLZ48KugnW3UCAjnExLc88cbEJOdpu3/t0K4xyTkXCXraAgamTIy+/HqdbHmPBZaijI+7/wP6zYxwtbl5EMPjPCy0iCzsLMKHrAJtAjtQiokAQUaoegjnMB16OyC/7XUvKZJmDeA5DjLKVr1h54M7WfYBcjvgnSVT4VKj0lXkLxzj4h6xtwfR2tBj5jpobJAJsr01fxbqM1yesmnGpw3sEsbpKFLtCyb/IZhXkx9IyClrxpWjbKB2WyJqU0P51FzAF5y2sYotc51bgNE0jx5cGFS2EXoCY/c5rjdD5ghg==',
        cardHolder: 'Jack Sparrow',
        expiryYear: 2020,
        expiryMonth: 12,
        cvv: 895,
        amount: '194.00',
        merchantId: '100011999',
        sessionId: `dp:${depositTransactionKey}`,
        userId: player.username,
        attributes: {
          transactionKey: depositTransactionKey,
          successUrl: 'http://127.0.0.1:3003/ok',
          failureUrl: 'http://127.0.0.1:3003/fail',
          pendingUrl: 'http://127.0.0.1:3003/ok',
        },
      })
      .reply(200, {
        txState: 'WAITING_INPUT',
        redirectOutput: {
          html: null,
          url: 'https://testgateway.gpsfsoft.com/payment/initialize/87996-1555394112-1064/de',
          method: 'GET',
          container: 'iframe',
          parameters: {},
          height: 600,
          width: 600,
        },
        messages: [{
          label: 'Account',
          keys: ['visavoucherdeposit.receiptDepositAccountToCharge', 'receiptDepositAccountToCharge'],
          value: '',
        }, {
          label: 'Amount deposited to player account',
          keys: ['visavoucherdeposit.receiptDepositAmount', 'receiptDepositAmount'],
          value: '194.00 EUR',
        }, {
          label: 'Deposit fee',
          keys: ['visavoucherdeposit.receiptDepositFee', 'receiptDepositFee'],
          value: '0.00 EUR',
        }, {
          label: 'Amount withdrawn from PSP account',
          keys: ['visavoucherdeposit.receiptDepositTxAmount', 'receiptDepositTxAmount'],
          value: '194.00 EUR',
        }, {
          label: 'Payment reference',
          keys: ['visavoucherdeposit.receiptDepositPspRefId', 'receiptDepositPspRefId'],
          value: '87996-1555394112-1064',
        }, {
          label: 'visavoucherdeposit.receiptDepositInProgressExtraMsg',
          keys: ['visavoucherdeposit.receiptDepositInProgressExtraMsg', 'receiptDepositInProgressExtraMsg'],
          value: '',
        }],
        txRefId: '100011999A1067695',
        success: true,
      }, ['Access-Control-Allow-Credentials',
        'true',
        'Access-Control-Allow-Headers',
        'DNT, X-CustomHeader, Keep-Alive, User-Agent, X-Requested-With, If-Modified-Since, Cache-Control, Content-Type, Authorization, PIQ-Client-IP',
        'Access-Control-Allow-Methods',
        'GET, PUT, POST, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Origin',
        '*',
        'Content-Type',
        'application/json;charset=UTF-8',
        'Date',
        'Tue, 16 Apr 2019 05:55:12 GMT',
        'Server',
        'nginx/1.13.7',
        'Vary',
        'Accept-Encoding',
        'Vary',
        'Accept-Encoding',
        'X-Application-Context',
        'application:jar,processing,backoffice:8080',
        'Content-Length',
        '1112',
        'Connection',
        'Close',
      ]);
  });

  nock('https://test-api.paymentiq.io', {})
    .post('/paymentiq/api/creditcard/withdrawal/process', {
      amount: '194.00',
      merchantId: '100011999',
      sessionId: 'wd:daf94940-1ef2-11e9-97c9-253a956a0f69',
      userId: 'LD_Test.User_123',
      accountId: '12345123',
      attributes: {
        transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
      },
    })
    .reply(200, {
      txState: 'SUCCESS',
      errors: [],
      messages: [],
      txRefId: '100011999A904829',
      success: true,
    });

  nock('https://test-api.paymentiq.io', {
    reqheaders: {
      'PIQ-Client-IP': '10.110.11.11',
    },
  })
    .post('/paymentiq/api/interac/withdrawal/process', {
      amount: '194.00',
      merchantId: '100011999',
      sessionId: 'wd:daf94940-1ef2-11e9-97c9-253a956a0f60',
      userId: 'LD_Test.User_321',
      accountId: '12345123',
      attributes: {
        transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f60',
      },
      email: 'test@gmail.com',
      mobile: '358500000000',
      service: 'InteracETransfer',
    })
    .reply(200, {
      txState: 'SUCCESS',
      errors: [],
      messages: [],
      txRefId: '100011999A904829',
      success: true,
    });

  it('can execute deposit', async () =>
    request(api)
      .post('/api/v1/deposit')
      .send({
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
          amount: 19400,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: {},
          accountParameters: {},
          paymentMethod: 'VisaVoucher',
          paymentProvider: 'Kluwp',
        },
        client: {
          ipAddress: '127.0.0.1',
          userAgent: 'unknown',
          isMobile: false,
        },
        params: {
          accountId: '453501020503',
          secureId: '908379',
          card: {
            encCreditcardNumber: 'YzZhOcYbtX2Yuotlqat+XgdGMNtWAqzFWrn5d6ZpW3oeflLZ48KugnW3UCAjnExLc88cbEJOdpu3/t0K4xyTkXCXraAgamTIy+/HqdbHmPBZaijI+7/wP6zYxwtbl5EMPjPCy0iCzsLMKHrAJtAjtQiokAQUaoegjnMB16OyC/7XUvKZJmDeA5DjLKVr1h54M7WfYBcjvgnSVT4VKj0lXkLxzj4h6xtwfR2tBj5jpobJAJsr01fxbqM1yesmnGpw3sEsbpKFLtCyb/IZhXkx9IyClrxpWjbKB2WyJqU0P51FzAF5y2sYotc51bgNE0jx5cGFS2EXoCY/c5rjdD5ghg==',
            cardHolder: 'Jack Sparrow',
            expiryYear: 2020,
            expiryMonth: 12,
            cvv: 895,
          },
        },
      })
      .expect(200)
      .expect(res =>
        expect(res.body).to.containSubset({
          requiresFullscreen: false,
        })));

  it('can execute CreditCard withdrawal', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          brandId: 'LD',
          mobilePhone: '358500000000',
        },
        brand: {
          name: 'LuckyDino',
        },
        client: {
          ipAddress: '10.110.11.11',
          userAgent: 'Hugo Weaving',
          isMobile: false,
        },
        withdrawal: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: '1234********1234',
          paymentParameters: { },
          accountParameters: { paymentIqAccountId: '12345123' },
          paymentMethodName: 'CreditCard',
          paymentProvider: 'Bambora',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          id: '100011999A904829',
          ok: true,
          reject: false,
          complete: false,
        });
      }));

  it('can execute Interac withdrawal', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_321',
          email: 'test@gmail.com',
          brandId: 'LD',
          mobilePhone: '358500000000',
        },
        brand: {
          name: 'LuckyDino',
        },
        client: {
          ipAddress: '10.110.11.11',
          userAgent: 'Hugo Weaving',
          isMobile: false,
        },
        withdrawal: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f60',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          paymentParameters: { },
          accountParameters: { paymentIqAccountId: '12345123' },
          paymentMethodName: 'InteracETransfer',
          paymentProvider: 'Bambora',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          id: '100011999A904829',
          ok: true,
          reject: false,
          complete: false,
        });
      }));
});
