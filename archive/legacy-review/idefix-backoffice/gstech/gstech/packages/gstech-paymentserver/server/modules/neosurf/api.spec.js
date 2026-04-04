/* @flow */
const nock = require('nock');  
const request = require('supertest');  
const crypto = require('crypto');

const api = require('../../api-server');
const config = require('../../../config');

const configuration = config.providers.neosurf;

// nock.recorder.rec();
describe('Neosurf', () => {
  let player;
  let sessionId;

  let depositTransactionKey;
  // const withdrawTransactionKey = uuid();
  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send()
      .expect((res) => {
        sessionId = res.body.token;
        player = res.body.player;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'Neosurf_Neosurf', amount: 5000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        depositTransactionKey = res.body.transactionKey;
      });
      const parameters = {
        amount: 5000,
        currency: 'eur',
        language: 'en',
        merchantId: '24842',
        merchantTransactionId: depositTransactionKey,
        prohibitedForMinors: 'yes',
        subMerchantId: 'https://luckydino.com',
        test: 'yes',
        urlCallback: 'http://localhost:3006/api/v1/neosurf',
        urlKo: 'http://127.0.0.1:3003/fail',
        urlOk: 'http://127.0.0.1:3003/ok',
        urlPending: 'http://127.0.0.1:3003/fail',
        version: 3,
      };

      const data = Object.values(parameters).map(v => v).join('') + configuration.secret;
      const hash = crypto.createHash('sha512').update(data).digest('hex');

      nock('https://pay.neosurf.com:443', { encodedQueryParams: true })
        .post('/')
        .query({
          ...parameters,
          hash,
        })
        .reply(
          200,
          '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="utf-8">\n    <meta http-equiv="X-UA-Compatible" content="IE=edge">\n    <meta name="viewport" content="width=device-width, initial-scale=1">\n    <meta name="ct" content="">\n    <title>PAY</title>\n\n    <link href="https://pay.secure-neosurf.com/assets/pay/css/app.css?id=ed7f7677ba367ffa70f0" rel="stylesheet">\n    \n    \n</head>\n<body class="neosurf-pay" onload="redirection()">\n\n<script src="https://pay.secure-neosurf.com/assets/pay/js/redirection-page.js"></script>\n<script>\n    $.blockUI();\n\n    function redirection() {\n        document.location.href = \'https://pay.secure-neosurf.com/EN-PKQQ08MBAK4R0ZVUO\';\n    }\n</script>\n</body>\n</html>',
        );
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
          amount: 5000,
          status: 'accepted',
          paymentParameters: {},
          accountParameters: {},
          paymentMethod: 'Neosurf',
          paymentProvider: 'Neosurf',
        },
        client: {
          ipAddress: '10.110.11.11',
          userAgent: 'Hugo Weaving',
          isMobile: false,
        },
      })
      .expect(200)
      .expect(res => {
        expect(res.body.html.includes('https://pay.secure-neosurf.com/assets/pay/js/redirection-page.js')).to.equal(true);
        expect(res.body).to.containSubset({
          requiresFullscreen: true,
        });
      }));
});
