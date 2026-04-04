/* @flow */
const nock = require('nock');  
const request = require('supertest');  

const api = require('../../api-server');
const config = require('../../../config');

// nock.recorder.rec();
describe('Worldpay API', () => {
  let player;
  let sessionId;
  let depositTransactionKey;

  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.token;
        player = res.body.player;
      })
      .expect(200);
    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'Neteller_Neteller', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        depositTransactionKey = res.body.transactionKey;
      });

    nock('https://secure-test.worldpay.com:443')
      .post('/jsp/merchant/xml/paymentService.jsp', `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE paymentService PUBLIC "-//Worldpay//DTD Worldpay PaymentService v1//EN" "http://dtd.worldpay.com/paymentService_v1.dtd">\n<paymentService version="1.4" merchantCode="LUCKYDINOTEST">\n  <submit>\n    <order orderCode="${depositTransactionKey}" installationId="1185377">\n      <description>Deposit, ${player.email} (${depositTransactionKey})</description>\n      <amount currencyCode="EUR" exponent="2" value="19400"/>\n      <paymentMethodMask><storedCredentials usage="FIRST" merchantInitiatedReason="UNSCHEDULED" /><include code="VISA-SSL"/><include code="ECMC-SSL"/><include code="MAESTRO-SSL"/><include code="AMEX-SSL"/><include code="CB-SSL"/><include code="CARTEBLEUE-SSL"/><include code="DINERS-SSL"/><include code="DISCOVER-SSL"/><include code="JCB-SSL"/></paymentMethodMask>\n      <shopper>\n        <shopperEmailAddress>${player.email}</shopperEmailAddress>\n        <authenticatedShopperID>${player.username}</authenticatedShopperID>\n        <browser>\n  <acceptHeader>text/html</acceptHeader>\n  <userAgentHeader>Hugo Weaving</userAgentHeader>\n</browser>\n      </shopper>\n      <billingAddress>\n        <address>\n          <firstName>Jack</firstName>\n          <lastName>Sparrow</lastName>\n          <address1>Fugger Strasse 56</address1>\n          <postalCode>06820</postalCode>\n          <city>Dessau</city>\n          <countryCode>DE</countryCode>\n        </address>\n      </billingAddress>\n      <createToken tokenScope="shopper">\n  <tokenEventReference>${depositTransactionKey.replace(/-/g, '_')}</tokenEventReference>\n</createToken>\n    </order>\n  </submit>\n</paymentService>`) // eslint-disable-line max-len
      .reply(200, '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE paymentService PUBLIC "-//WorldPay//DTD WorldPay PaymentService v1//EN"\n                                "http://dtd.worldpay.com/paymentService_v1.dtd">\n<paymentService version="1.4" merchantCode="LUCKYDINOTEST"><reply><orderStatus orderCode="3ae7fe20-67fd-11e9-90a4-07180c79429e"><reference id="3134336051">https://payments-test.worldpay.com/app/hpp/integration/wpg/corporate?OrderKey=LUCKYDINOTEST%5E3ae7fe20-67fd-11e9-90a4-07180c79429e&amp;Ticket=001556699292799029ux0RzqeI8fBuYPH-9c_4A</reference></orderStatus></reply></paymentService>\n');  

    nock('https://secure-test.worldpay.com:443')
      .post('/jsp/merchant/xml/paymentService.jsp', `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE paymentService PUBLIC "-//Worldpay//DTD Worldpay PaymentService v1//EN" "http://dtd.worldpay.com/paymentService_v1.dtd">\n<paymentService version="1.4" merchantCode="LUCKYDINOTEST">\n  <submit>\n    <order orderCode="${depositTransactionKey}" installationId="1185377">\n      <description>Deposit, ${player.email} (${depositTransactionKey})</description>\n      <amount currencyCode="EUR" exponent="2" value="19400"/>\n      <paymentMethodMask><storedCredentials usage="FIRST" merchantInitiatedReason="UNSCHEDULED" /><include code="VISA-SSL"/><include code="ECMC-SSL"/><include code="MAESTRO-SSL"/><include code="AMEX-SSL"/><include code="CB-SSL"/><include code="CARTEBLEUE-SSL"/><include code="DINERS-SSL"/><include code="DISCOVER-SSL"/><include code="JCB-SSL"/></paymentMethodMask>\n      <shopper>\n        <shopperEmailAddress>${player.email}</shopperEmailAddress>\n        <authenticatedShopperID>${player.username}</authenticatedShopperID>\n        <browser>\n  <acceptHeader>text/html</acceptHeader>\n  <userAgentHeader>Hugo Weaving</userAgentHeader>\n</browser>\n      </shopper>\n      <billingAddress>\n        <address>\n          <firstName>Jack</firstName>\n          <lastName>Sparrow</lastName>\n          <address1>Fugger Strasse 56</address1>\n          <postalCode>06820</postalCode>\n          <city>Dessau</city>\n          <countryCode>DE</countryCode>\n        </address>\n      </billingAddress>\n      <createToken tokenScope="shopper">\n  <tokenEventReference>${depositTransactionKey.replace(/-/g, '_')}</tokenEventReference>\n</createToken>\n    </order>\n  </submit>\n</paymentService>`) // eslint-disable-line max-len
      .reply(200, '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE paymentService PUBLIC "-//WorldPay//DTD WorldPay PaymentService v1//EN" "http://dtd.worldpay.com/paymentService_v1.dtd"><paymentService version="1.4" merchantCode="LUCKYDINOTEST"><reply><orderStatus orderCode="T9NCU2cdHE4KmqZ"><requestInfo><request3DSecure><paRequest>eJxVUttu2zAM/RUhTxvQRBdLthWwar0a2FLUQ7Fmz4MiK4m62E59WZN+/aTEWTs+8ZA61OEFbg7VDv2xbeea+npCZ2SCbhQst621+ZM1Q2sVFLbr9MYiV/oXQsRU0pQlUSImCh6zH/ZFwVhB+QIzBvgCPbU1W133CrR5+bL4rgRnggrAI4TKtotc0VhSJpggZwN8DkOtK6seBvP7iHJXN+irrly9QQ99iQCfkmCaoe7bo+KJp10ADO1Obft+380x3gV+6ekz01TY1hhwSAN+F/c4BK/z5Q6uVMUyey2es0PxZkSxXGQf7BpweAGl7q1ihEri+0GUziMyZwngUxx0FXSon085YuIq9gMZI7APH2VnwETIfIyAn3dra3NUKQ/dXBDYw76pbV8pVOxJtM44eWUUiunK0L4dC1Xkov1mtGYfvbSQzXA76O4+xa2Znq/CEliSiRhjMqIcxaF/Z0SQZnzA2eMRCdpAQAOVDyeBh7Px3v/ndVfOzDKQw==</paRequest><issuerURL><![CDATA[https://www.securesuite.net/bmo/tdsecure/opt_in_dispatcher.jsp?VAA=B]]></issuerURL></request3DSecure></requestInfo><echoData>26126257592</echoData></orderStatus></reply></paymentService>'); // eslint-disable-line max-len

    nock('https://secure-test.worldpay.com:443')
      .post('/jsp/merchant/xml/paymentService.jsp', '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE paymentService PUBLIC "-//Worldpay//DTD Worldpay PaymentService v1//EN" "http://dtd.worldpay.com/paymentService_v1.dtd">\n<paymentService version="1.4" merchantCode="LUCKYDINOTEST">\n  <submit>\n    <order orderCode="daf94940-1ef2-11e9-97c9-253a956a0f44" installationId="1185377">\n      <description>Withdrawal, foo@bar.com (daf94940-1ef2-11e9-97c9-253a956a0f44)</description>\n      <amount currencyCode="EUR" exponent="2" value="19400"/>\n      <paymentDetails action="REFUND">\n <TOKEN-SSL tokenScope="shopper">\n    <paymentTokenID></paymentTokenID>\n </TOKEN-SSL>\n</paymentDetails>\n      <shopper>\n        <shopperEmailAddress>foo@bar.com</shopperEmailAddress>\n        <authenticatedShopperID>LD_Test.User_123</authenticatedShopperID>\n        \n      </shopper>\n      <billingAddress>\n        <address>\n          <firstName>Test</firstName>\n          <lastName>User</lastName>\n          <address1>undefined</address1>\n          <postalCode>undefined</postalCode>\n          <city>undefined</city>\n          <countryCode>DE</countryCode>\n        </address>\n      </billingAddress>\n      \n    </order>\n  </submit>\n</paymentService>') // eslint-disable-line max-len
      .reply(200, '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE paymentService PUBLIC "-//WorldPay//DTD WorldPay PaymentService v1//EN"\n                                "http://dtd.worldpay.com/paymentService_v1.dtd">\n<paymentService version="1.4" merchantCode="LUCKYDINOTEST"><reply><ok><refundReceived orderCode="daf94940-1ef2-11e9-97c9-253a956a0f44"><amount value="19400" currencyCode="EUR" exponent="2" debitCreditIndicator="credit"/></refundReceived></ok></reply></paymentService>\n');
  });

  it('can execute deposit 1', async () =>
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
          paymentMethod: 'CreditCard',
          paymentProvider: 'Worldpay',
        },
        client: {
          ipAddress: '10.110.11.11',
          userAgent: 'Hugo Weaving',
          isMobile: false,
        },
      })
      .expect(200)
      .expect(res =>
        expect(res.body).to.containSubset({
          requiresFullscreen: true,
          url: 'https://payments-test.worldpay.com/app/hpp/integration/wpg/corporate?OrderKey=LUCKYDINOTEST%5E3ae7fe20-67fd-11e9-90a4-07180c79429e&Ticket=001556699292799029ux0RzqeI8fBuYPH-9c_4A&language=en&country=DE&successURL=http%3A%2F%2F127.0.0.1%3A3003%2Fok&cancelURL=http%3A%2F%2F127.0.0.1%3A3003%2Ffail&failureURL=http%3A%2F%2F127.0.0.1%3A3003%2Ffail&pendingURL=http%3A%2F%2F127.0.0.1%3A3003%2Fok&errorURL=http%3A%2F%2F127.0.0.1%3A3003%2Ffail',
        })));

  it('can execute deposit 2', async () =>
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
          paymentMethod: 'CreditCard',
          paymentProvider: 'Worldpay',
        },
        client: {
          ipAddress: '10.110.11.11',
          userAgent: 'Hugo Weaving',
          isMobile: false,
        },
      })
      .expect(200)
      .expect(res => expect(res.body.html).to.not.equal(null))
      .expect(res =>
        expect(res.body).to.containSubset({
          requiresFullscreen: true,
        })));

  it('can execute withdrawal', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'foo@bar.com',
          currencyId: 'EUR',
          brandId: 'LD',
          languageId: 'de',
          countryId: 'DE',
          firstName: 'Test',
          lastName: 'User',
        },
        brand: {
          name: 'LuckyDino',
        },
        withdrawal: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f44',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: { },
          accountParameters: { },
          paymentMethodName: 'CreditCard',
          paymentProvider: 'Worldpay',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          ok: true,
          complete: true,
          reject: false,
          message: 'WD submitted',
          id: 'daf94940-1ef2-11e9-97c9-253a956a0f44',
        });
      }));
});
