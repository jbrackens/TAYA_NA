/* @flow */
const request = require('supertest');  
const app = require('../../../api-server');
const config = require('../../../../config');

const nock = require('nock'); // eslint-disable-line
// nock.recorder.rec();

describe.skip('Netent API', () => {
  describe('with active session', () => {
    let player;
    before(async () => {
      await request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'NE',
          initialBalance: 1000,
        })
        .expect((res) => {
          player = res.body.player;
        })
        .expect(200);

      await nock('https://luckydino-api-test.casinomodule.com:443', { encodedQueryParams: true })
        .post('/ws-jaxws/services/casino', `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns:tns="http://casinomodule.com/api" xmlns:ns1="http://jaxb.dev.java.net/array"><soap:Body><tns:activateBonusProgramForPlayer xmlns:tns="http://casinomodule.com/api"><userName>${player.username}</userName><promotionCode>LDAW_Aloha_normal_5</promotionCode><merchantId>LD_merchant</merchantId><merchantPassword>tester1</merchantPassword></tns:activateBonusProgramForPlayer></soap:Body></soap:Envelope>`)  
        .times(2)
        .reply(200, '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Header xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"/><soap:Body><ns2:activateBonusProgramForPlayerResponse xmlns:ns2="http://casinomodule.com/api"><activateBonusProgramForPlayerReturn><bonusActivationDetailsArr><activated>true</activated><bonusProgramId>20</bonusProgramId></bonusActivationDetailsArr></activateBonusProgramForPlayerReturn></ns2:activateBonusProgramForPlayerResponse></soap:Body></soap:Envelope>', ['Server',  
          'Apache-Coyote/1.1',
          'Content-Type',
          'text/xml;charset=UTF-8',
          'Content-Length',
          '505',
          'Date',
          'Mon, 28 Jan 2019 13:13:41 GMT',
          'Set-Cookie',
          'NetEnt=!mCMVSZYRqx4rL9GI/YcRQUk4bcUAraVLUCpQWRWkvGqW8dfV3XFxlF4KsufBiz2M5JFS3VsPxGJ2xbAoH4vuoLcEQWbCRxMycQsHSgfCbw==; path=/; Httponly; Secure']);

      await nock('https://luckydino-api-test.casinomodule.com:443', { encodedQueryParams: true })
        .post('/ws-jaxws/services/casino', `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns:tns="http://casinomodule.com/api" xmlns:ns1="http://jaxb.dev.java.net/array"><soap:Body><tns:activateBonusProgramForPlayer xmlns:tns="http://casinomodule.com/api"><userName>${player.username}</userName><promotionCode>WRONG_BONUS_CODE</promotionCode><merchantId>LD_merchant</merchantId><merchantPassword>tester1</merchantPassword></tns:activateBonusProgramForPlayer></soap:Body></soap:Envelope>`)  
        .reply(200, '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Header xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"/><soap:Body><ns2:activateBonusProgramForPlayerResponse xmlns:ns2="http://casinomodule.com/api"><activateBonusProgramForPlayerReturn><bonusActivationDetailsArr><activated>false</activated><reason>No Active Bonus program associated with player for supplied promotion code.</reason></bonusActivationDetailsArr></activateBonusProgramForPlayerReturn></ns2:activateBonusProgramForPlayerResponse></soap:Body></soap:Envelope>', ['Server',  
          'Apache-Coyote/1.1',
          'Content-Type',
          'text/xml;charset=UTF-8',
          'Content-Length',
          '563',
          'Date',
          'Mon, 28 Jan 2019 14:02:51 GMT',
          'Set-Cookie',
          'NetEnt=!h2YsgUD/KKu98tGI/YcRQUk4bcUArcufOFwfQor6YsfGCe6oHD6pS3HLd1aSnQ/7gJPUupT0ABgfzrom5vdpr2+lSamyqMhOuONsqauksA==; path=/; Httponly; Secure']);

      await nock('https://luckydino-api-test.casinomodule.com:443', { encodedQueryParams: true })
        .post('/ws-jaxws/services/casino', '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns:tns="http://casinomodule.com/api" xmlns:ns1="http://jaxb.dev.java.net/array"><soap:Body><tns:getCurrentJackpot xmlns:tns="http://casinomodule.com/api"><jackpotId>megajackpot1</jackpotId><currencyISOCode>EUR</currencyISOCode><merchantId>LD_merchant</merchantId><merchantPassword>tester1</merchantPassword></tns:getCurrentJackpot></soap:Body></soap:Envelope>')  
        .reply(200, '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Header xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"/><soap:Body><ns2:getCurrentJackpotResponse xmlns:ns2="http://casinomodule.com/api"><getCurrentJackpotReturn><amount>150000.000000</amount><amountCurrencyISOCode>EUR</amountCurrencyISOCode></getCurrentJackpotReturn></ns2:getCurrentJackpotResponse></soap:Body></soap:Envelope>', ['Server',
          'Apache-Coyote/1.1',
          'Content-Type',
          'text/xml;charset=UTF-8',
          'Content-Length',
          '420',
          'Date',
          'Tue, 29 Jan 2019 11:59:56 GMT',
          'Set-Cookie',
          'NetEnt=!XavYySLmYlNv63CI/YcRQUk4bcUArS229afiuv1OYrNs9tPif3LuwDA+3s4POuLbAiRh37vsGN3R+PJVEiXlROgFSLcMSkCO32s3LOdEhw==; path=/; Httponly; Secure']);

      await nock('https://luckydino-api-test.casinomodule.com:443', { encodedQueryParams: true })
        .post('/ws-jaxws/services/casino', '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns:tns="http://casinomodule.com/api" xmlns:ns1="http://jaxb.dev.java.net/array"><soap:Body><tns:getCurrentJackpot xmlns:tns="http://casinomodule.com/api"><jackpotId>megajackpot1</jackpotId><currencyISOCode>SEK</currencyISOCode><merchantId>LD_merchant</merchantId><merchantPassword>tester1</merchantPassword></tns:getCurrentJackpot></soap:Body></soap:Envelope>')  
        .reply(200, '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Header xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"/><soap:Body><ns2:getCurrentJackpotResponse xmlns:ns2="http://casinomodule.com/api"><getCurrentJackpotReturn><amount>1500000.000000</amount><amountCurrencyISOCode>SEK</amountCurrencyISOCode></getCurrentJackpotReturn></ns2:getCurrentJackpotResponse></soap:Body></soap:Envelope>', ['Server',
          'Apache-Coyote/1.1',
          'Content-Type',
          'text/xml;charset=UTF-8',
          'Content-Length',
          '420',
          'Date',
          'Tue, 29 Jan 2019 11:59:56 GMT',
          'Set-Cookie',
          'NetEnt=!XavYySLmYlNv63CI/YcRQUk4bcUArS229afiuv1OYrNs9tPif3LuwDA+3s4POuLbAiRh37vsGN3R+PJVEiXlROgFSLcMSkCO32s3LOdEhw==; path=/; Httponly; Secure']);

      await nock('https://luckydino-api-test.casinomodule.com:443', { encodedQueryParams: true })
        .post('/ws-jaxws/services/casino', '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns:tns="http://casinomodule.com/api" xmlns:ns1="http://jaxb.dev.java.net/array"><soap:Body><tns:getCurrentJackpot xmlns:tns="http://casinomodule.com/api"><jackpotId>hog_large</jackpotId><currencyISOCode>EUR</currencyISOCode><merchantId>LD_merchant</merchantId><merchantPassword>tester1</merchantPassword></tns:getCurrentJackpot></soap:Body></soap:Envelope>')  
        .reply(200, '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Header xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"/><soap:Body><ns2:getCurrentJackpotResponse xmlns:ns2="http://casinomodule.com/api"><getCurrentJackpotReturn><amount>150000.000000</amount><amountCurrencyISOCode>EUR</amountCurrencyISOCode></getCurrentJackpotReturn></ns2:getCurrentJackpotResponse></soap:Body></soap:Envelope>', ['Server',
          'Apache-Coyote/1.1',
          'Content-Type',
          'text/xml;charset=UTF-8',
          'Content-Length',
          '420',
          'Date',
          'Tue, 29 Jan 2019 11:59:56 GMT',
          'Set-Cookie',
          'NetEnt=!XavYySLmYlNv63CI/YcRQUk4bcUArS229afiuv1OYrNs9tPif3LuwDA+3s4POuLbAiRh37vsGN3R+PJVEiXlROgFSLcMSkCO32s3LOdEhw==; path=/; Httponly; Secure']);

      await nock('https://luckydino-api-test.casinomodule.com:443', { encodedQueryParams: true })
        .post('/ws-jaxws/services/casino', '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns:tns="http://casinomodule.com/api" xmlns:ns1="http://jaxb.dev.java.net/array"><soap:Body><tns:getCurrentJackpot xmlns:tns="http://casinomodule.com/api"><jackpotId>hog_large</jackpotId><currencyISOCode>SEK</currencyISOCode><merchantId>LD_merchant</merchantId><merchantPassword>tester1</merchantPassword></tns:getCurrentJackpot></soap:Body></soap:Envelope>')  
        .reply(200, '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Header xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"/><soap:Body><ns2:getCurrentJackpotResponse xmlns:ns2="http://casinomodule.com/api"><getCurrentJackpotReturn><amount>1500000.000000</amount><amountCurrencyISOCode>SEK</amountCurrencyISOCode></getCurrentJackpotReturn></ns2:getCurrentJackpotResponse></soap:Body></soap:Envelope>', ['Server',
          'Apache-Coyote/1.1',
          'Content-Type',
          'text/xml;charset=UTF-8',
          'Content-Length',
          '420',
          'Date',
          'Tue, 29 Jan 2019 11:59:56 GMT',
          'Set-Cookie',
          'NetEnt=!XavYySLmYlNv63CI/YcRQUk4bcUArS229afiuv1OYrNs9tPif3LuwDA+3s4POuLbAiRh37vsGN3R+PJVEiXlROgFSLcMSkCO32s3LOdEhw==; path=/; Httponly; Secure']);

      await nock('https://luckydino-api-test.casinomodule.com:443', { encodedQueryParams: true })
        .post('/ws-jaxws/services/casino', '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns:tns="http://casinomodule.com/api" xmlns:ns1="http://jaxb.dev.java.net/array"><soap:Body><tns:getLeaderBoard xmlns:tns="http://casinomodule.com/api"><tournamentOccurrenceId>1224</tournamentOccurrenceId><merchantId>LD_merchant</merchantId><merchantPassword>tester1</merchantPassword></tns:getLeaderBoard></soap:Body></soap:Envelope>')  
        .reply(200, '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Header xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"/><soap:Body><ns2:getLeaderBoardResponse xmlns:ns2="http://casinomodule.com/api"><getLeaderBoardReturn><bet><amount>20.000000</amount><amountCurrencyISOCode>EUR</amountCurrencyISOCode></bet><qualified>false</qualified><rounds>19</rounds><score>19.0</score><userName>Filip</userName><win><amount>22.500000</amount><amountCurrencyISOCode>EUR</amountCurrencyISOCode></win></getLeaderBoardReturn><getLeaderBoardReturn><bet><amount>21.000000</amount><amountCurrencyISOCode>EUR</amountCurrencyISOCode></bet><qualified>false</qualified><rounds>19</rounds><score>19.0</score><userName>Kevin</userName><win><amount>16.000000</amount><amountCurrencyISOCode>EUR</amountCurrencyISOCode></win></getLeaderBoardReturn><getLeaderBoardReturn><bet><amount>21.000000</amount><amountCurrencyISOCode>EUR</amountCurrencyISOCode></bet><qualified>false</qualified><rounds>19</rounds><score>19.0</score><userName>Normund</userName><win><amount>22.500000</amount><amountCurrencyISOCode>EUR</amountCurrencyISOCode></win></getLeaderBoardReturn><getLeaderBoardReturn><bet><amount>3.900000</amount><amountCurrencyISOCode>EUR</amountCurrencyISOCode></bet><displayName>Gimli U.</displayName><qualified>true</qualified><rounds>26</rounds><score>26.0</score><userName>LD_66423</userName><win><amount>2.310000</amount><amountCurrencyISOCode>EUR</amountCurrencyISOCode></win></getLeaderBoardReturn><getLeaderBoardReturn><bet><amount>4.200000</amount><amountCurrencyISOCode>EUR</amountCurrencyISOCode></bet><displayName>Harold B.</displayName><qualified>true</qualified><rounds>28</rounds><score>28.0</score><userName>LD_5</userName><win><amount>3.920000</amount><amountCurrencyISOCode>EUR</amountCurrencyISOCode></win></getLeaderBoardReturn></ns2:getLeaderBoardResponse></soap:Body></soap:Envelope>', ['Server', // eslint-disable-line max-len
          'Apache-Coyote/1.1',
          'Content-Type',
          'text/xml;charset=UTF-8',
          'Content-Length',
          '255',
          'Date',
          'Tue, 29 Jan 2019 12:44:41 GMT',
          'Set-Cookie',
          'NetEnt=!FTXrxx6TJkb3ScaI/YcRQUk4bcUArfuefC5pKo9LEPwfWqaUTqTbO09wYBMiqVNs91/eitR1zNTjN0BPXSwtOHJynAM+RxuN3BOw3I2O8g==; path=/; Httponly; Secure']);

      await nock('https://luckydino-api-test.casinomodule.com:443', { encodedQueryParams: true })
        .post('/ws-jaxws/services/casino', '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns:tns="http://casinomodule.com/api" xmlns:ns1="http://jaxb.dev.java.net/array"><soap:Body><tns:ping xmlns:tns="http://casinomodule.com/api"></tns:ping></soap:Body></soap:Envelope>')
        .reply(200, '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Header xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"/><soap:Body><ns2:pingResponse xmlns:ns2="http://casinomodule.com/api"><pingReturn>Casino WebService for luckydino is alive. Time is Tue Jan 29 13:32:34 CET 2019 Reloaded on Fri Dec 14 11:07:25 CET 2018\n</pingReturn></ns2:pingResponse></soap:Body></soap:Envelope>', ['Server',
          'Apache-Coyote/1.1',
          'Content-Type',
          'text/xml;charset=UTF-8',
          'Content-Length',
          '408',
          'Date',
          'Tue, 29 Jan 2019 12:32:34 GMT',
          'Set-Cookie',
          'NetEnt=!JBN6bXWY44wTQP2I/YcRQUk4bcUAraagZavhvJ7MfqDBX0ZN9XWTN7CSxNEIgvcrOJtubY8Ks1A5Cq8EdrEqFnXkbWBJbEWDpklVjuiZxQ==; path=/; Httponly; Secure']);

      await nock('https://luckydino-api-test.casinomodule.com:443', { encodedQueryParams: true })
        .post('/ws-jaxws/services/casino', `<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:api=\"http://casinomodule.com/api\">\n     <soapenv:Header/>\n     <soapenv:Body>\n        <api:loginUserDetailed>\n           <userName>LD_Jack.Sparrow_${player.id}</userName>\n           <extra>DisplayName</extra>\n           <extra>Jack S</extra>\n           <extra>AffiliateCode</extra>\n           <extra>LD_</extra>\n           <extra>Country</extra>\n           <extra>DE</extra>\n           <extra>Channel</extra>\n           <extra>bbg</extra>\n           <merchantId>LD_merchant</merchantId>\n           <merchantPassword>tester1</merchantPassword>\n           <currencyISOCode>EUR</currencyISOCode>\n        </api:loginUserDetailed>\n     </soapenv:Body>\n  </soapenv:Envelope>`)  // eslint-disable-line
        .times(2)
        .reply(200, '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Header xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"/><soap:Body><ns2:loginUserDetailedResponse xmlns:ns2="http://casinomodule.com/api"><loginUserDetailedReturn>1581935004280-37691-TL1IGDYJT93ZR</loginUserDetailedReturn></ns2:loginUserDetailedResponse></soap:Body></soap:Envelope>', ['Server',
          'Apache-Coyote/1.1',
          'Content-Type',
          'text/xml;charset=ISO-8859-1',
          'Content-Length',
          '373',
          'Date',
          'Mon, 17 Feb 2020 10:23:24 GMT',
          'Connection',
          'close',
          'Set-Cookie',
          'NetEnt=3020831754.36895.0000; path=/; Httponly; Secure']);
    });

    it('can post creditfreespins without id', () =>
      request(app)
        .post('/api/v1/LD/creditfreespins/NE')
        .send({
          player,
          bonusCode: 'LDAW_Aloha_normal_5',
          sessionId: 123,
          games: [],
        })
        .expect((res) => {
          expect(res.body).to.containSubset({ ok: true });
        })
        .expect(200));

    it('can post creditfreespins with id', () =>
      request(app)
        .post('/api/v1/LD/creditfreespins/NE')
        .send({
          player,
          bonusCode: 'LDAW_Aloha_normal_5',
          id: '123',
          sessionId: 123,
          games: [],
        })
        .expect((res) => {
          expect(res.body).to.containSubset({ ok: true });
        })
        .expect(200));

    it('can fail creditfreespins when giving wrong bonus code', () =>
      request(app)
        .post('/api/v1/LD/creditfreespins/NE')
        .send({
          player,
          bonusCode: 'WRONG_BONUS_CODE',
          sessionId: 123,
          games: [],
        })
        .expect((res) => {
          expect(res.body.error.code).to.equal(201);
        })
        .expect(500));

    it('can get jackpot', () =>
      request(app)
        .post('/api/v1/LD/getjackpots/NE')
        .send({
          games: [{ manufacturerGameId: 'hallofgods_not_mobile_sw', gameId: 'NTE_hallofgods_not_mobile_sw' }, { manufacturerGameId: 'megafortune_not_mobile_sw', gameId: 'NTE_megafortune_not_mobile_sw' }],
          currencies: ['EUR', 'SEK'],
        })
        .expect((res) => {
          expect(res.body).to.containSubset([{
            game: 'NTE_hallofgods_not_mobile_sw',
            currencies: [
              {
                amount: '150000.000000',
                currency: 'EUR',
              }, {
                amount: '1500000.000000',
                currency: 'SEK',
              },
            ],
          }, {
            game: 'NTE_megafortune_not_mobile_sw',
            currencies: [
              {
                amount: '150000.000000',
                currency: 'EUR',
              }, {
                amount: '1500000.000000',
                currency: 'SEK',
              },
            ],
          }]);
        })
        .expect(200));

    it('can have empty array when get jackpot with wrong manufacturer', () =>
      request(app)
        .post('/api/v1/LD/getjackpots/WRONG')
        .send({
          games: [{ manufacturerGameId: 'hallofgods_not_mobile_sw', gameId: 'NTE_hallofgods_not_mobile_sw' }, { manufacturerGameId: 'megafortune_not_mobile_sw', gameId: 'NTE_megafortune_not_mobile_sw' }],
          currencies: ['EUR', 'SEK'],
        })
        .expect((res) => {
          expect(res.body).to.containSubset([]);
        })
        .expect(200));

    it('can have empty array when get jackpot with wrong brandid', () =>
      request(app)
        .post('/api/v1/NE/getjackpots/NE')
        .send({
          games: [{ manufacturerGameId: 'hallofgods_not_mobile_sw', gameId: 'NTE_hallofgods_not_mobile_sw' }, { manufacturerGameId: 'megafortune_not_mobile_sw', gameId: 'NTE_megafortune_not_mobile_sw' }],
          currencies: ['EUR', 'SEK'],
        })
        .expect((res) => {
          expect(res.body.error.code).to.equal(201);
        })
        .expect(500));

    it('can get leader board', () =>
      request(app)
        .post('/api/v1/LD/getleaderboard/NE/1224')
        .send({})
        .expect((res) => {
          expect(res.body).to.containSubset([{
            bet: { amount: '20.000000', amountCurrencyISOCode: 'EUR' },
            qualified: false,
            rounds: 19,
            score: '19.0',
            userName: 'Filip',
            win: { amount: '22.500000', amountCurrencyISOCode: 'EUR' },
          }, {
            bet: { amount: '21.000000', amountCurrencyISOCode: 'EUR' },
            qualified: false,
            rounds: 19,
            score: '19.0',
            userName: 'Kevin',
            win: { amount: '16.000000', amountCurrencyISOCode: 'EUR' },
          }, {
            bet: { amount: '21.000000', amountCurrencyISOCode: 'EUR' },
            qualified: false,
            rounds: 19,
            score: '19.0',
            userName: 'Normund',
            win: { amount: '22.500000', amountCurrencyISOCode: 'EUR' },
          }, {
            bet: { amount: '3.900000', amountCurrencyISOCode: 'EUR' },
            displayName: 'Gimli U.',
            qualified: true,
            rounds: 26,
            score: '26.0',
            userName: 'LD_66423',
            win: { amount: '2.310000', amountCurrencyISOCode: 'EUR' },
          }, {
            bet: { amount: '4.200000', amountCurrencyISOCode: 'EUR' },
            displayName: 'Harold B.',
            qualified: true,
            rounds: 28,
            score: '28.0',
            userName: 'LD_5',
            win: { amount: '3.920000', amountCurrencyISOCode: 'EUR' },
          }]);
        })
        .expect(200));

    it('can ping', () =>
      request(app)
        .post('/api/v1/LD/ping/NE')
        .send({})
        .expect((res) => {
          expect(res.body).to.containSubset({ ok: true });
        })
        .expect(200));
  });
});
