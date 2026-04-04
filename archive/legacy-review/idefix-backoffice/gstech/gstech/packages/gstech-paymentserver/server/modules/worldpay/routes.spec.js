/* @flow */
const nock = require('nock');  
const request = require('supertest');  

const app = require('../../index');
const config = require('../../../config');

// nock.recorder.rec();
describe('Worldpay Callback API', () => {
  let sessionId;
  let transactionKey;

  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 1000,
        countryId: 'FI',
        currencyId: 'USD',
      })
      .expect((res) => {
        sessionId = res.body.token;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'CreditCard_Worldpay', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      });
    nock('https://secure-test.worldpay.com:443')
      .post('/jsp/merchant/xml/paymentService.jsp', '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE paymentService PUBLIC "-//Worldpay//DTD Worldpay PaymentService v1//EN" "http://dtd.worldpay.com/paymentService_v1.dtd">\n<paymentService version="1.4" merchantCode="LUCKYDINOTEST">\n<submit>\n  <order orderCode="d69d3760-680a-11e9-90a4-07180c79429e" installationId="1185377">\n    <info3DSecure>\n      <paResponse>eNasdasdadadsadss</paResponse>\n    </info3DSecure>\n    <session id="d69d3760-680a-11e9-90a4-07180c79429e"/>\n  </order>\n</submit>\n</paymentService>')  
      .reply(200, '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE paymentService PUBLIC "-//WorldPay//DTD WorldPay PaymentService v1//EN" "http://dtd.worldpay.com/paymentService_v1.dtd"><paymentService version="1.4" merchantCode="LUCKYDINOTEST"><reply><orderStatus orderCode="CJ_omyd9gX1cj2i2Nu9kCPGGZ"><payment><paymentMethod>ECMC_CREDIT-SSL</paymentMethod><paymentMethodDetail><card number="528061******0382" type="creditcard"><expiryDate><date month="03" year="2022"/></expiryDate></card></paymentMethodDetail><amount value="2562" currencyCode="USD" exponent="2" debitCreditIndicator="credit"/><lastEvent>AUTHORISED</lastEvent><AuthorisationId id="096540"/><CVCResultCode description="UNKNOWN"/><balance accountType="IN_PROCESS_AUTHORISED"><amount value="2562" currencyCode="USD" exponent="2" debitCreditIndicator="credit"/></balance></payment></orderStatus></reply></paymentService>'); // eslint-disable-line
  });

  it('can handle visa callback ignorance', async () =>
    request(app)
      .post('/api/v1/worldpay/worldpay')
      .set({ 'content-type': 'text/xml' })
      .send(`<?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE paymentService PUBLIC "-//WorldPay//DTD WorldPay PaymentService v1//EN"
                                      "http://dtd.worldpay.com/paymentService_v1.dtd">
      <paymentService version="1.4" merchantCode="LUCKYDINOTEST">
          <notify>
              <orderStatusEvent orderCode="${transactionKey}">
                  <payment>
                      <paymentMethod>VISA_CREDIT-SSL</paymentMethod>
                      <amount value="4000" currencyCode="EUR" exponent="2" debitCreditIndicator="credit"/>
                      <lastEvent>AUTHORISED</lastEvent>
                      <CVCResultCode description="NOT SENT TO ACQUIRER"/>
                      <cardHolderName>
                          <![CDATA[Jack Sparrow]]>
                      </cardHolderName>
                      <issuerCountryCode>GB</issuerCountryCode>
                      <cardNumber>4779********6625</cardNumber>
                  </payment>
                  <journal journalType="SENT_FOR_AUTHORISATION">
                      <bookingDate>
                          <date dayOfMonth="26" month="04" year="2019"/>
                      </bookingDate>
                  </journal>
              </orderStatusEvent>
          </notify>
      </paymentService>`)
      .expect((res) => {
        expect(res.text).to.equal('[OK]');
      }));

  it('can handle visa callback', async () =>
    request(app)
      .post('/api/v1/worldpay/worldpay')
      .set({ 'content-type': 'text/xml' })
      .send(`<?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE paymentService PUBLIC "-//WorldPay//DTD WorldPay PaymentService v1//EN"
                                      "http://dtd.worldpay.com/paymentService_v1.dtd">
      <paymentService version="1.4" merchantCode="LUCKYDINOTEST">
          <notify>
              <orderStatusEvent orderCode="${transactionKey}">
                  <payment>
                      <paymentMethod>VISA_CREDIT-SSL</paymentMethod>
                      <amount value="4000" currencyCode="EUR" exponent="2" debitCreditIndicator="credit"/>
                      <lastEvent>AUTHORISED</lastEvent>
                      <CVCResultCode description="NOT SENT TO ACQUIRER"/>
                      <cardHolderName>
                          <![CDATA[Jack Sparrow]]>
                      </cardHolderName>
                      <issuerCountryCode>GB</issuerCountryCode>
                      <cardNumber>4779********6625</cardNumber>
                  </payment>
                  <token>
                      <authenticatedShopperID>LD_Jack.Sparrow_3002223</authenticatedShopperID>
                      <tokenEventReference>d69d3760_680a_11e9_90a4_07180c79429e</tokenEventReference>
                      <tokenDetails tokenEvent="NEW">
                          <paymentTokenID>9977124260294279902</paymentTokenID>
                          <paymentTokenExpiry>
                              <date dayOfMonth="3" month="05" year="2019" hour="10" minute="05" second="46"/>
                          </paymentTokenExpiry>
                          <tokenEventReference>d69d3760_680a_11e9_90a4_07180c79429e</tokenEventReference>
                          <tokenReason>Created during order: d69d3760-680a-11e9-90a4-07180c79429e</tokenReason>
                      </tokenDetails>
                      <paymentInstrument>
                          <cardDetails>
                              <expiryDate>
                                  <date month="12" year="2020"/>
                              </expiryDate>
                              <cardHolderName>
                                  <![CDATA[Jack Sparrow]]>
                              </cardHolderName>
                              <cardAddress>
                                  <address>
                                      <address1>Fugger Strasse 56</address1>
                                      <postalCode>06820</postalCode>
                                      <city>Dessau</city>
                                      <countryCode>DE</countryCode>
                                  </address>
                              </cardAddress>
                              <derived>
                                  <cardBrand>VISA</cardBrand>
                                  <cardSubBrand>VISA_CREDIT</cardSubBrand>
                                  <issuerCountryCode>GB</issuerCountryCode>
                                  <obfuscatedPAN>4779********6625</obfuscatedPAN>
                              </derived>
                          </cardDetails>
                      </paymentInstrument>
                  </token>
                  <journal journalType="AUTHORISED">
                      <bookingDate>
                          <date dayOfMonth="26" month="04" year="2019"/>
                      </bookingDate>
                      <accountTx accountType="IN_PROCESS_AUTHORISED" batchId="17">
                          <amount value="4000" currencyCode="EUR" exponent="2" debitCreditIndicator="credit"/>
                      </accountTx>
                  </journal>
              </orderStatusEvent>
          </notify>
      </paymentService>`)
      .expect((res) => {
        expect(res.text).to.equal('[OK]');
      }));

  it('can handle requestInfo callback', async () =>
    request(app)
      .post('/api/v1/worldpay/request/d69d3760-680a-11e9-90a4-07180c79429e?cookie=3213123&ok=http%3A%2F%2F127.0.0.1%3A3003%2Fok&fail=http%3A%2F%2F127.0.0.1%3A3003%2Ffail')
      .send({
        PaRes: 'eNasdasdadadsadss',
        MD: '',
      })
      .expect((res) => {
        expect(res.text).to.equal('Found. Redirecting to http://127.0.0.1:3003/ok');
      }));
});
