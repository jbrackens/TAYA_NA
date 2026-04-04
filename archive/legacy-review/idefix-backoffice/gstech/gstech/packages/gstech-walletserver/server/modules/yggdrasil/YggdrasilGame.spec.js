/* @flow */
/* eslint-disable */

const request = require('supertest');  
const app = require('../../api-server');

const { getJackpots } = require('./api');
const nock = require('nock');

// nock.recorder.rec();

describe('Yggdrasil API', function (this: $npm$mocha$ContextDefinition) {
  this.timeout(30000);

  nock('https://production.yggdrasilgaming.com:443', { "encodedQueryParams": true })
    .get('/game.web/services/feed/jackpot/')
    .query({ "org": "LuckyDino", "currency": "EUR" })
    .reply(200, "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><xsi:jackpotListing xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"><jackpot><org>LuckyDinoGroup</org><id>7312</id><name>Joker Millions/Empire Fortune</name><type>pooled</type><gameid>7312</gameid><values><value><currency>EUR</currency><amount>1753195.14</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73171</id><name>Mr Holmes 1</name><type>local</type><gameid>7317</gameid><values><value><currency>EUR</currency><amount>51.09</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73172</id><name>Mr Holmes 2</name><type>local</type><gameid>7317</gameid><values><value><currency>EUR</currency><amount>215.42</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73173</id><name>Mr Holmes 3</name><type>local</type><gameid>7317</gameid><values><value><currency>EUR</currency><amount>3317.50</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73174</id><name>Mr Holmes 4</name><type>local</type><gameid>7317</gameid><values><value><currency>EUR</currency><amount>2883.15</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73175</id><name>Mr Holmes 5</name><type>local</type><gameid>7317</gameid><values><value><currency>EUR</currency><amount>17146.00</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>7312</id><name>Joker Millions/Empire Fortune</name><type>pooled</type><gameid>7324</gameid><values><value><currency>EUR</currency><amount>1753195.14</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73451</id><name>Ozwins Jackpots 1</name><type>local</type><gameid>7345</gameid><values><value><currency>EUR</currency><amount>112.08</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73452</id><name>Ozwins Jackpots 2</name><type>local</type><gameid>7345</gameid><values><value><currency>EUR</currency><amount>303.85</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73453</id><name>Ozwins Jackpots 3</name><type>local</type><gameid>7345</gameid><values><value><currency>EUR</currency><amount>1148.81</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73454</id><name>Ozwins Jackpots 4</name><type>local</type><gameid>7345</gameid><values><value><currency>EUR</currency><amount>2874.38</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73455</id><name>Ozwins Jackpots 5</name><type>local</type><gameid>7345</gameid><values><value><currency>EUR</currency><amount>7748.35</amount></value></values></jackpot></xsi:jackpotListing>", ['Date',
      'Fri, 15 Feb 2019 11:44:26 GMT',
      'Content-Type',
      'application/xml',
      'Transfer-Encoding',
      'chunked',
      'Connection',
      'close',
      'Set-Cookie',
      '__cfduid=d64bae05c80b2b57986efb3d63eacf3291550231066; expires=Sat, 15-Feb-20 11:44:26 GMT; path=/; domain=.yggdrasilgaming.com; HttpOnly; Secure',
      'X-Powered-By',
      'ASP.NET',
      'Access-Control-Allow-Credentials',
      'true',
      'Access-Control-Allow-Methods',
      'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers',
      'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,SESSION-ID',
      'Strict-Transport-Security',
      'max-age=15552000',
      'Expect-CT',
      'max-age=604800, report-uri="https://report-uri.cloudflare.com/cdn-cgi/beacon/expect-ct"',
      'Server',
      'cloudflare',
      'CF-RAY',
      '4a9785c32c45b62f-TLL']);

  nock('https://production.yggdrasilgaming.com:443', { "encodedQueryParams": true })
    .get('/game.web/services/feed/jackpot/')
    .query({ "org": "LuckyDino", "currency": "SEK" })
    .reply(200, "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><xsi:jackpotListing xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"><jackpot><org>LuckyDinoGroup</org><id>7312</id><name>Joker Millions/Empire Fortune</name><type>pooled</type><gameid>7312</gameid><values><value><currency>SEK</currency><amount>18399414.87</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73171</id><name>Mr Holmes 1</name><type>local</type><gameid>7317</gameid><values><value><currency>SEK</currency><amount>536.22</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73172</id><name>Mr Holmes 2</name><type>local</type><gameid>7317</gameid><values><value><currency>SEK</currency><amount>2260.79</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73173</id><name>Mr Holmes 3</name><type>local</type><gameid>7317</gameid><values><value><currency>SEK</currency><amount>34816.56</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73174</id><name>Mr Holmes 4</name><type>local</type><gameid>7317</gameid><values><value><currency>SEK</currency><amount>30258.13</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73175</id><name>Mr Holmes 5</name><type>local</type><gameid>7317</gameid><values><value><currency>SEK</currency><amount>179943.71</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>7312</id><name>Joker Millions/Empire Fortune</name><type>pooled</type><gameid>7324</gameid><values><value><currency>SEK</currency><amount>18399414.87</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73451</id><name>Ozwins Jackpots 1</name><type>local</type><gameid>7345</gameid><values><value><currency>SEK</currency><amount>1176.33</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73452</id><name>Ozwins Jackpots 2</name><type>local</type><gameid>7345</gameid><values><value><currency>SEK</currency><amount>3188.88</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73453</id><name>Ozwins Jackpots 3</name><type>local</type><gameid>7345</gameid><values><value><currency>SEK</currency><amount>12056.61</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73454</id><name>Ozwins Jackpots 4</name><type>local</type><gameid>7345</gameid><values><value><currency>SEK</currency><amount>30166.07</amount></value></values></jackpot><jackpot><org>LuckyDinoGroup</org><id>73455</id><name>Ozwins Jackpots 5</name><type>local</type><gameid>7345</gameid><values><value><currency>SEK</currency><amount>81317.33</amount></value></values></jackpot></xsi:jackpotListing>", ['Date',
      'Fri, 15 Feb 2019 11:44:26 GMT',
      'Content-Type',
      'application/xml',
      'Transfer-Encoding',
      'chunked',
      'Connection',
      'close',
      'Set-Cookie',
      '__cfduid=d7172137ac87f8a4cd920943f1fc159e01550231066; expires=Sat, 15-Feb-20 11:44:26 GMT; path=/; domain=.yggdrasilgaming.com; HttpOnly; Secure',
      'X-Powered-By',
      'ASP.NET',
      'Access-Control-Allow-Credentials',
      'true',
      'Access-Control-Allow-Methods',
      'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers',
      'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,SESSION-ID',
      'Strict-Transport-Security',
      'max-age=15552000',
      'Expect-CT',
      'max-age=604800, report-uri="https://report-uri.cloudflare.com/cdn-cgi/beacon/expect-ct"',
      'Server',
      'cloudflare',
      'CF-RAY',
      '4a9785c32e95b647-TLL']);

  it('can get jackpot', () =>
  request(app)
    .post('/api/v1/LD/getjackpots/YGG')
    .send({
      games: [{ manufacturerGameId: '7312', gameId: 'YGG_HolmesAndTheStolenStones' }, { manufacturerGameId: '7324', gameId: 'YGG_GemRocks' }],
      currencies: ['EUR', 'SEK'],
    })
    .expect((res) => {
      expect(res.body).to.containSubset([{
        game: 'YGG_HolmesAndTheStolenStones',
        currencies: [
          {
            amount: '1753195.14',
            currency: 'EUR',
          }, {
            amount: '18399414.87',
            currency: 'SEK',
          },
        ],
      }]);
    })
    .expect(200));

});
