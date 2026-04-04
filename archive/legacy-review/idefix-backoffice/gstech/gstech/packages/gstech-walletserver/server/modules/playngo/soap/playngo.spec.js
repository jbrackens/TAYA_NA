/* @flow */
const request = require('supertest');  
const crypto = require('crypto');
const app = require('../../../api-server');
const config = require('../../../../config');

const nock = require('nock'); // eslint-disable-line
// nock.recorder.rec();
const md5 = (text: string) => crypto.createHash('md5').update(text).digest('hex');

describe('PlaynGo API', () => {
  describe('with active session', () => {
    let player;
    let userId;
    before(async () => {
      await request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'PNG',
          initialBalance: 1000,
        })
        .expect((res) => {
          player = res.body.player;
          userId = `${player.brandId}_${player.id}`;
        })
        .expect(200);

      await nock('https://mltstage.playngonetwork.com:33001', { encodedQueryParams: true })
        .post('/CasinoGameTPService', `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="http://playngo.com/v1" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">\n<soapenv:Header/>\n<soapenv:Body>\n   <v1:AddFreegameOffers>\n      <v1:UserId>${userId}</v1:UserId>\n      <v1:RequestId>${md5(['4770,310', userId].join('_'))}</v1:RequestId>\n      <v1:TriggerId>4770</v1:TriggerId>\n      <v1:AllGamesVariants>1</v1:AllGamesVariants>\n      <v1:GameIdList>\n        <arr:int>310</arr:int>\n      </v1:GameIdList>\n   </v1:AddFreegameOffers>\n</soapenv:Body>\n</soapenv:Envelope>`)  
        .times(2)
        .reply(200, '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><AddFreegameOffersResponse xmlns="http://playngo.com/v1"><AddFreegameOffersResult xmlns:i="http://www.w3.org/2001/XMLSchema-instance"><OfferId>39107</OfferId><GameId>310</GameId><UserId>LD_3001024</UserId><Lines>10</Lines><Coins>1</Coins><Rounds>10</Rounds><Denomination>0.0100</Denomination><ExpireTime>2030-10-28T00:00:00</ExpireTime><FreegameExternalId i:nil="true"/><Used i:nil="true"/><Turnover>0</Turnover><Finished i:nil="true"/><RoundsUsed>0</RoundsUsed><FreegameTriggerId>4770</FreegameTriggerId><Created>2019-01-28T14:14:27.32</Created><Currency i:nil="true"/><AllGamesVariants>true</AllGamesVariants><VariantGameId>100310</VariantGameId><OfferCancelled>false</OfferCancelled><ProductGroup>572</ProductGroup><FreegameId i:nil="true"/><GameIdList i:nil="true" xmlns:a="http://schemas.microsoft.com/2003/10/Serialization/Arrays"/></AddFreegameOffersResult></AddFreegameOffersResponse></s:Body></s:Envelope>', ['Date', // eslint-disable-line max-len
          'Mon, 28 Jan 2019 14:14:27 GMT',
          'Content-Type',
          'text/xml; charset=utf-8',
          'Content-Length',
          '999',
          'Connection',
          'close',
          'Server',
          'Microsoft-HTTPAPI/2.0']);

      await nock('https://mltstage.playngonetwork.com:33001', { encodedQueryParams: true })
        .post('/CasinoGameTPService', `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="http://playngo.com/v1" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">\n<soapenv:Header/>\n<soapenv:Body>\n   <v1:AddFreegameOffers>\n      <v1:UserId>${userId}</v1:UserId>\n      <v1:RequestId>${md5(['123', userId].join('_'))}</v1:RequestId>\n      <v1:TriggerId>4770</v1:TriggerId>\n      <v1:AllGamesVariants>1</v1:AllGamesVariants>\n      <v1:GameIdList>\n        <arr:int>310</arr:int>\n      </v1:GameIdList>\n   </v1:AddFreegameOffers>\n</soapenv:Body>\n</soapenv:Envelope>`)  
        .times(2)
        .reply(200, '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><AddFreegameOffersResponse xmlns="http://playngo.com/v1"><AddFreegameOffersResult xmlns:i="http://www.w3.org/2001/XMLSchema-instance"><OfferId>39107</OfferId><GameId>310</GameId><UserId>LD_3001024</UserId><Lines>10</Lines><Coins>1</Coins><Rounds>10</Rounds><Denomination>0.0100</Denomination><ExpireTime>2030-10-28T00:00:00</ExpireTime><FreegameExternalId i:nil="true"/><Used i:nil="true"/><Turnover>0</Turnover><Finished i:nil="true"/><RoundsUsed>0</RoundsUsed><FreegameTriggerId>4770</FreegameTriggerId><Created>2019-01-28T14:14:27.32</Created><Currency i:nil="true"/><AllGamesVariants>true</AllGamesVariants><VariantGameId>100310</VariantGameId><OfferCancelled>false</OfferCancelled><ProductGroup>572</ProductGroup><FreegameId i:nil="true"/><GameIdList i:nil="true" xmlns:a="http://schemas.microsoft.com/2003/10/Serialization/Arrays"/></AddFreegameOffersResult></AddFreegameOffersResponse></s:Body></s:Envelope>', ['Date', // eslint-disable-line max-len
          'Mon, 28 Jan 2019 14:14:27 GMT',
          'Content-Type',
          'text/xml; charset=utf-8',
          'Content-Length',
          '999',
          'Connection',
          'close',
          'Server',
          'Microsoft-HTTPAPI/2.0']);

      await nock('https://mltstage.playngonetwork.com:33001', { encodedQueryParams: true })
        .post('/CasinoGameTPService', `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="http://playngo.com/v1" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays\">\n<soapenv:Header/>\n<soapenv:Body>\n   <v1:AddFreegameOffers>\n      <v1:UserId>${userId}</v1:UserId>\n      <v1:RequestId>${md5(['123456', userId].join('_'))}</v1:RequestId>\n      <v1:TriggerId>123456</v1:TriggerId>\n      <v1:AllGamesVariants>1</v1:AllGamesVariants>\n      <v1:GameIdList>\n        \n      </v1:GameIdList>\n   </v1:AddFreegameOffers>\n</soapenv:Body>\n</soapenv:Envelope>`) // eslint-disable-line
        .reply(500, '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><s:Fault><faultcode>s:Client</faultcode><faultstring xml:lang="en-US">triggerId not found</faultstring><detail><ServiceFault xmlns="http://playngo.com/v1" xmlns:i="http://www.w3.org/2001/XMLSchema-instance"><ErrorId>InvalidArguments</ErrorId><ErrorMessage>triggerId not found</ErrorMessage><Details>InvalidArguments</Details></ServiceFault></detail></s:Fault></s:Body></s:Envelope>', ['Date',
          'Mon, 28 Jan 2019 14:14:27 GMT',
          'Content-Type',
          'text/xml; charset=utf-8',
          'Content-Length',
          '453',
          'Connection',
          'close',
          'Server',
          'Microsoft-HTTPAPI/2.0']);
    });

    it('can post creditfreespins without id', () =>
      request(app)
        .post('/api/v1/LD/creditfreespins/PNG')
        .send({
          player,
          bonusCode: '4770,310',
          sessionId: 123,
          games: [
            {
              id: 11,
              name: 'Tower Quest',
              manufacturerId: 'PNG',
              manufacturerGameId: '287',
              mobileGame: false,
              permalink: 'towersquest'
            },
            {
              id: 12,
              name: 'Tower Quest Mobile',
              manufacturerId: 'PNG',
              manufacturerGameId: '100287',
              mobileGame: true,
              permalink: 'towersquest'
            },
          ]
        })
        .expect((res) => {
          expect(res.body).to.containSubset({ ok: true });
        })
        .expect(200));

    it('can post creditfreespins with id', () =>
      request(app)
        .post('/api/v1/LD/creditfreespins/PNG')
        .send({
          player,
          bonusCode: '4770,310',
          id: '123',
          sessionId: 123,
          games: [],
        })
        .expect((res) => {
          expect(res.body).to.containSubset({ ok: true });
        })
        .expect(200));

    it('creditfreespins to use games from request if not set in the bonusCode', () =>
      request(app)
        .post('/api/v1/LD/creditfreespins/PNG')
        .send({
          player,
          bonusCode: '4770',
          id: '123',
          sessionId: 123,
          games: [
            {
              id: 11,
              name: 'Tower Quest',
              manufacturerId: 'PNG',
              manufacturerGameId: '310',
              mobileGame: false,
              permalink: 'towersquest',
            },
          ],
        })
        .expect((res) => {
          expect(res.body).to.containSubset({ ok: true });
        })
        .expect(200));

    it('can fail creditfreespins when giving wrong bonus code', () =>
      request(app)
        .post('/api/v1/LD/creditfreespins/PNG')
        .send({
          player,
          bonusCode: '123456',
        })
        .expect((res) => {
          expect(res.body.error.code).to.equal(201);
        })
        .expect(500));

    it('can get leader board', () =>
      request(app)
        .post('/api/v1/LD/getleaderboard/PNG/KK_RAGINGREX')
        .send({})
        .expect((res) => {
          expect(res.body).to.containSubset([]);
        })
        .expect(200));
  });
});
