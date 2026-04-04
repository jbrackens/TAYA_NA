/* @flow */
/* eslint-disable */

const { loginUserDetailed, getGameInfo, logoutUser, isUserSessionAlive } = require('./CasinoModule');
const nock = require('nock');

//nock.recorder.rec();

nock('https://luckydino-api-test.casinomodule.com:443', {"encodedQueryParams":true})
  .post('/ws-jaxws/services/casino', "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:api=\"http://casinomodule.com/api\">\n     <soapenv:Header/>\n     <soapenv:Body>\n        <api:getGameInfo>\n           <gameId>starburst_not_mobile_sw</gameId>\n           <lang>en</lang>\n           <merchantId>LD_merchant</merchantId>\n           <merchantPassword>tester1</merchantPassword>\n        </api:getGameInfo>\n     </soapenv:Body>\n    </soapenv:Envelope>")
  .reply(200, "<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"><SOAP-ENV:Header xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\"/><soap:Body><ns2:getGameInfoResponse xmlns:ns2=\"http://casinomodule.com/api\"><getGameInfoReturn>flashVersion</getGameInfoReturn><getGameInfoReturn>10.0.42.34</getGameInfoReturn><getGameInfoReturn>height</getGameInfoReturn><getGameInfoReturn>720</getGameInfoReturn><getGameInfoReturn>client</getGameInfoReturn><getGameInfoReturn>mobilehtml</getGameInfoReturn><getGameInfoReturn>width</getGameInfoReturn><getGameInfoReturn>1280</getGameInfoReturn><getGameInfoReturn>gameserverurl</getGameInfoReturn><getGameInfoReturn></getGameInfoReturn><getGameInfoReturn>helpfile</getGameInfoReturn><getGameInfoReturn>%2Fgame%2Fgamerules.jsp%3Fgame%3Dstarburst_not_mobile_sw%26lang%3Den</getGameInfoReturn><getGameInfoReturn>mobilegameurl</getGameInfoReturn><getGameInfoReturn>https://luckydino-static-test.casinomodule.com/games/starburst_mobile_html/game/starburst_not_mobile_sw.xhtml</getGameInfoReturn><getGameInfoReturn>gamepageURL</getGameInfoReturn><getGameInfoReturn>https://luckydino-static-test.casinomodule.com/games/starburst_mobile_html/game/starburst_mobile_html.xhtml?server=https%3A%2F%2Fluckydino-game-test.casinomodule.com%2F&amp;operatorId=luckydino&amp;gameId=starburst_not_mobile_sw&amp;lang=en</getGameInfoReturn><getGameInfoReturn>wmode</getGameInfoReturn><getGameInfoReturn>window</getGameInfoReturn></ns2:getGameInfoResponse></soap:Body></soap:Envelope>", [ 'Server',
  'Apache-Coyote/1.1',
  'Content-Type',
  'text/xml;charset=ISO-8859-1',
  'Content-Length',
  '1508',
  'Date',
  'Thu, 18 May 2017 10:12:31 GMT',
  'Connection',
  'close',
  'Set-Cookie',
  'NetEnt=!1yidGBPmDugF1UoutJGZIOE+n2OmpugnQTH8s9QxSW54HQKY+TOQ4GFsVhrwUDSMNiry3HaW8jsIvChfV5C2ccesDahsAbq6jlZ8ZbIDZg==; path=/; Httponly; Secure' ]);

nock('https://luckydino-api-test.casinomodule.com:443', { encodedQueryParams: true })
  .post('/ws-jaxws/services/casino', "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:api=\"http://casinomodule.com/api\">\n     <soapenv:Header/>\n     <soapenv:Body>\n        <api:loginUserDetailed>\n           <userName>LD_6</userName>\n           <extra>DisplayName</extra>\n           <extra>Jack S</extra>\n           <extra>AffiliateCode</extra>\n           <extra>LD_</extra>\n           <extra>Country</extra>\n           <extra>DE</extra>\n           <extra>Channel</extra>\n           <extra>mobg</extra>\n           <merchantId>LD_merchant</merchantId>\n           <merchantPassword>tester1</merchantPassword>\n           <currencyISOCode>EUR</currencyISOCode>\n        </api:loginUserDetailed>\n     </soapenv:Body>\n  </soapenv:Envelope>")
  .reply(200, "<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"><SOAP-ENV:Header xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\"/><soap:Body><ns2:loginUserDetailedResponse xmlns:ns2=\"http://casinomodule.com/api\"><loginUserDetailedReturn>1495098081913-36938-71KHJ475G2ZV2</loginUserDetailedReturn></ns2:loginUserDetailedResponse></soap:Body></soap:Envelope>", [ 'Server',
  'Apache-Coyote/1.1',
  'Content-Type',
  'text/xml;charset=ISO-8859-1',
  'Content-Length',
  '373',
  'Date',
  'Thu, 18 May 2017 09:09:40 GMT',
  'Connection',
  'close',
  'Set-Cookie',
  'NetEnt=!LMToWvws2BZgRKUutJGZIOE+n2Ompv5gP0rY6Cd2s9kojQC++A+yioiKpJpVSvsVCfguGb6zgbdSGEkeBtcmyzq5jn72SYhYRBFDiql4Yw==; path=/; Httponly; Secure' ]);

nock('https://luckydino-api-test.casinomodule.com:443', {"encodedQueryParams":true})
  .post('/ws-jaxws/services/casino', "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:api=\"http://casinomodule.com/api\">\n     <soapenv:Header/>\n     <soapenv:Body>\n        <api:logoutUser>\n           <sessionId>1495098081913-36938-71KHJ475G2ZV2</sessionId>\n           <merchantId>LD_merchant</merchantId>\n           <merchantPassword>tester1</merchantPassword>\n        </api:logoutUser>\n     </soapenv:Body>\n  </soapenv:Envelope>")
  .reply(200, "<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"><SOAP-ENV:Header xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\"/><soap:Body><ns2:logoutUserResponse xmlns:ns2=\"http://casinomodule.com/api\"/></soap:Body></soap:Envelope>", [ 'Server',
  'Apache-Coyote/1.1',
  'Content-Type',
  'text/xml;charset=ISO-8859-1',
  'Content-Length',
  '251',
  'Date',
  'Thu, 18 May 2017 10:43:33 GMT',
  'Connection',
  'close',
  'Set-Cookie',
  'NetEnt=!m0tfRa4AeGGKi0sutJGZIOE+n2OmpgGwmtnPxr2VBCURGuNPzeVA+25Yc+mxvyn8Q0/l8L/BmlZvTOVPYPiNY6AS4naLmcwZMj79k/zLBg==; path=/; Httponly; Secure' ]);

nock('https://luckydino-api-test.casinomodule.com:443', {"encodedQueryParams":true})
  .post('/ws-jaxws/services/casino', "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:api=\"http://casinomodule.com/api\">\n     <soapenv:Header/>\n     <soapenv:Body>\n        <api:isUserSessionAlive>\n          <sessionId>1495098081913-36938-71KHJ475G2ZV2</sessionId>\n          <merchantId>LD_merchant</merchantId>\n          <merchantPassword>tester1</merchantPassword>\n        </api:isUserSessionAlive>\n     </soapenv:Body>\n  </soapenv:Envelope>")
  .reply(200, "<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"><SOAP-ENV:Header xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\"/><soap:Body><ns2:isUserSessionAliveResponse xmlns:ns2=\"http://casinomodule.com/api\"><isUserSessionAliveReturn>true</isUserSessionAliveReturn></ns2:isUserSessionAliveResponse></soap:Body></soap:Envelope>", [ 'Server',
  'Apache-Coyote/1.1',
  'Content-Type',
  'text/xml;charset=ISO-8859-1',
  'Content-Length',
  '348',
  'Date',
  'Mon, 07 Aug 2017 21:06:44 GMT',
  'Connection',
  'close',
  'Set-Cookie',
  'NetEnt=!m0tfRa4AeGGKi0sutJGZIOE+n2OmpgGwmtnPxr2VBCURGuNPzeVA+25Yc+mxvyn8Q0/l8L/BmlZvTOVPYPiNY6AS4naLmcwZMj79k/zLBg==; path=/; Httponly; Secure' ]);


const player = {
  id: 6,
  username: 'LD_Jack.Sparrow_123',
  nationalId: null,
  email: 'foo@bar.com',
  firstName: 'Jack',
  lastName: 'Sparrow',
  brandId: 'LD',
  currencyId: 'EUR',
  languageId: 'en',
  city: 'Foo',
  countryId: 'DE',
  createdAt: new Date(),
  dateOfBirth: '1994-12-12',
  nationalId: "123456789",
};

describe.skip('NetEnt CasinoModule', function(this: $npm$mocha$ContextDefinition) {
  this.timeout(30000);
  let sessionId;
  it('creates CasinoModule session', async () => {
    // $FlowFixMe[prop-missing]
    sessionId = await loginUserDetailed(player, true);
    expect(sessionId).to.equal('1495098081913-36938-71KHJ475G2ZV2');
  });

  it('checks if session is still alive', async () => {
    // $FlowFixMe[prop-missing]
    const alive = await isUserSessionAlive(player, sessionId);
    expect(alive).to.equal(true);
  })

  it('fetches game info', async () => {
    const gameInfo = await getGameInfo('starburst_not_mobile_sw', 'en');
    expect(gameInfo).to.containSubset({
      "flashVersion": "10.0.42.34",
      "height": "720",
      "client": "mobilehtml",
      "width": "1280",
      "gameserverurl": "",
      "helpfile": "%2Fgame%2Fgamerules.jsp%3Fgame%3Dstarburst_not_mobile_sw%26lang%3Den",
      "mobilegameurl": "https://luckydino-static-test.casinomodule.com/games/starburst_mobile_html/game/starburst_not_mobile_sw.xhtml",
      "gamepageURL": "https://luckydino-static-test.casinomodule.com/games/starburst_mobile_html/game/starburst_mobile_html.xhtml?server=https%3A%2F%2Fluckydino-game-test.casinomodule.com%2F&operatorId=luckydino&gameId=starburst_not_mobile_sw&lang=en",
      "wmode": "window",
    })
  });

  it('destroys session', async() => {
    // $FlowFixMe[prop-missing]
    await logoutUser(player, sessionId);
  })
});
