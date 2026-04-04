/* @flow */
const request = require('supertest');  
const app = require('../../index');
const config = require('../../../config');

const configuration = config.providers.yggdrasil;

const formatPlayerId = (player: Player) => player.username;

describe('Yggdrasil WalletServer', () => {
  describe('with active session', () => {
    let sessionId;
    let player;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'YGM',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        player = res.body.player;
      })
      .expect(200));

    it('returns an error when doing a request with invalid hash', () =>
      request(app)
        .get('/api/v1/yggdrasil/playerinfo.json')
        .query({
          org: configuration.brands.LD.org,
          sessiontoken: 'foobar',
          lang: 'en',
          version: '5',
          cat1: 'Casino',
          cat2: 'Slot',
          cat3: 'StickyJ',
          cat4: 'Joker Millions',
          cat5: '7312',
          tag1: 'GameName.Joker Millions',
          tag2: 'Model.M1',
          tag3: 'Channel.pc',
        })
        .expect(res =>
          expect(res.body).to.containSubset({
            code: '1000',
            msg: 'Session not active',
          }))
        .expect(200));

    it('can authenticate', () =>
      request(app)
        .get('/api/v1/yggdrasil/playerinfo.json')
        .query({
          org: configuration.brands.LD.org,
          sessiontoken: sessionId,
          lang: 'en',
          version: '5',
          cat1: 'Casino',
          cat2: 'Slot',
          cat3: 'StickyJ',
          cat4: 'Joker Millions',
          cat5: '7312',
          tag1: 'GameName.Joker Millions',
          tag2: 'Model.M1',
          tag3: 'Channel.pc',
        })
        .expect(res =>
          expect(res.body).to.containSubset({
            code: '0',
            data: {
              applicableBonus: '0.00',
              balance: '10.00',
              birthdate: '1989-02-01',
              country: 'DE',
              currency: 'EUR',
              gender: '',
              homeCurrency: 'EUR',
              nickName: 'Jack S',
              organization: configuration.brands.LD.org,
              playerId: formatPlayerId(player),
            },
          }))
        .expect(200));

    it('can get balance', () =>
      request(app)
        .get('/api/v1/yggdrasil/getbalance.json')
        .query({
          org: configuration.brands.LD.org,
          sessiontoken: sessionId,
          playerid: formatPlayerId(player),
          gameid: 7330,
          description: 'getbalance',
        })
        .expect(res =>
          expect(res.body).to.containSubset({
            code: '0',
            data: {
              currency: 'EUR',
              applicableBonus: '0.00',
              homeCurrency: 'EUR',
              organization: configuration.brands.LD.org,
              balance: '10.00',
              nickName: 'Jack S',
              playerId: formatPlayerId(player),
            },
          }))
        .expect(200));

    it('returns an error when bet over balance', () =>
      request(app)
        .get('/api/v1/yggdrasil/wager.json')
        .query({
          org: configuration.brands.LD.org,
          sessiontoken: sessionId,
          playerid: formatPlayerId(player),
          amount: '20',
          currency: 'EUR',
          service: 'Mir',
          reference: '1603231211330100001',
          subreference: 'w1603231211330100002',
          description: 'Start+Game',
          cat1: 'Casino',
          cat2: 'Slot',
          cat3: 'Bicicleta',
          cat4: 'Bicicleta',
          cat5: '7326',
          tag1: 'GameName.Bicicleta',
          tag2: 'Model.M1',
          tag3: 'Channel.pc',
          lang: 'en',
          version: '5',
        })
        .expect(res =>
          expect(res.body).to.containSubset({
            code: '1006',
            msg: 'Insufficient balance',
          }))
        .expect(200));

    it('can place a bet', () =>
      request(app)
        .get('/api/v1/yggdrasil/wager.json')
        .query({
          org: configuration.brands.LD.org,
          sessiontoken: sessionId,
          playerid: formatPlayerId(player),
          amount: '0.20',
          currency: 'EUR',
          service: 'Mir',
          reference: '1603231211330100001',
          subreference: 'w1603231211330100002',
          description: 'Start+Game',
          cat1: 'Casino',
          cat2: 'Slot',
          cat3: 'Bicicleta',
          cat4: 'Bicicleta',
          cat5: '7326',
          tag1: 'GameName.Bicicleta',
          tag2: 'Model.M1',
          tag3: 'Channel.pc',
          lang: 'en',
          version: '5',
        })
        .expect(res =>
          expect(res.body).to.containSubset({
            code: '0',
            data: {
              applicableBonus: '0.00',
              balance: '9.80',
              currency: 'EUR',
              homeCurrency: 'EUR',
              organization: configuration.brands.LD.org,
              playerId: formatPlayerId(player),
            },
          }))
        .expect(200));

    it('credits win', () =>
      request(app)
        .get('/api/v1/yggdrasil/endwager.json')
        .query({
          org: configuration.brands.LD.org,
          playerid: formatPlayerId(player),
          amount: '0.00',
          bonusprize: '0.00',
          currency: 'EUR',
          tickets: 1,
          service: 'Mir',
          reference: '1603231211330100001',
          subreference: '1801031603200000000',
          description: 'Start Game',
          cat1: 'Casino',
          cat2: 'Slot',
          cat3: 'Express',
          cat4: 'Bicicleta',
          cat5: '7326',
          tag1: 'GameName.Bicicleta',
          tag2: 'Model.M1',
          tag3: 'Channel.pc',
          lang: 'en',
          version: '3',
        })
        .expect((res) => {
          expect(res.body.transactionId).to.not.equal(null);
          expect(res.body).to.containSubset({
            code: '0',
            data: {
              applicableBonus: '0.00',
              balance: '9.80',
              currency: 'EUR',
              homeCurrency: 'EUR',
              organization: configuration.brands.LD.org,
              playerId: formatPlayerId(player),
            },
          });
        })
        .expect(200));

    it('places a bet and cancels it', async () => {
      await request(app)
        .get('/api/v1/yggdrasil/wager.json')
        .query({
          org: configuration.brands.LD.org,
          sessiontoken: sessionId,
          playerid: formatPlayerId(player),
          amount: '0.20',
          currency: 'EUR',
          service: 'Mir',
          reference: '1403231211330100001',
          subreference: 'w1403231211330100002',
          description: 'Start+Game',
          cat1: 'Casino',
          cat2: 'Slot',
          cat3: 'Bicicleta',
          cat4: 'Bicicleta',
          cat5: '7326',
          tag1: 'GameName.Bicicleta',
          tag2: 'Model.M1',
          tag3: 'Channel.pc',
          lang: 'en',
          version: '5',
        })
        .expect((res) => {
          expect(res.body.transactionId).to.not.equal(null);
          expect(res.body).to.containSubset({
            code: '0',
            data: {
              applicableBonus: '0.00',
              balance: '9.60',
              currency: 'EUR',
              homeCurrency: 'EUR',
              organization: configuration.brands.LD.org,
              playerId: formatPlayerId(player),
            },
          });
        })
        .expect(200);

      await request(app)
        .get('/api/v1/yggdrasil/cancelwager.json')
        .query({
          org: configuration.brands.LD.org,
          playerid: formatPlayerId(player),
          reference: '1403231211330100001',
          subreference: 'w1403231211330100002',
          version: '3',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            code: '0',
            data: {
              playerId: formatPlayerId(player),
              currency: 'EUR',
              balance: '9.80',
              bonus: '0.00',
            },
          });
        })
        .expect(200);
    });
    it('credits jackpot win', async () => {
      await request(app)
        .get('/api/v1/yggdrasil/wager.json')
        .query({
          org: configuration.brands.LD.org,
          sessiontoken: sessionId,
          playerid: formatPlayerId(player),
          amount: '0.20',
          currency: 'EUR',
          service: 'Mir',
          reference: '1553231211330100001',
          subreference: 'w1553231211330100001',
          description: 'Start+Game',
          cat1: 'Casino',
          cat2: 'Slot',
          cat3: 'Bicicleta',
          cat4: 'Bicicleta',
          cat5: '7326',
          tag1: 'GameName.Bicicleta',
          tag2: 'Model.M1',
          tag3: 'Channel.pc',
          lang: 'en',
          version: '5',
        })
        .expect((res) => {
          expect(res.body.transactionId).to.not.equal(null);
          expect(res.body).to.containSubset({
            code: '0',
            data: {
              applicableBonus: '0.00',
              balance: '9.60',
              currency: 'EUR',
              homeCurrency: 'EUR',
              organization: configuration.brands.LD.org,
              playerId: formatPlayerId(player),
            },
          });
        })
        .expect(200);

      await request(app)
        .get('/api/v1/yggdrasil/appendwagerresult.json')
        .query({
          org: configuration.brands.LD.org,
          playerid: formatPlayerId(player),
          amount: '100.00',
          bonusprize: '0.00',
          isJackpotWin: true,
          currency: 'EUR',
          reference: '1553231211330100001',
          subreference: '1851031603200000000',
          description: 'Start Game',
          cat1: 'Casino',
          cat2: 'Slot',
          cat3: 'Express',
          cat4: 'Bicicleta',
          cat5: '7326',
          tag1: 'GameName.Bicicleta',
          tag2: 'Model.M1',
          tag3: 'Channel.pc',
          lang: 'en',
          version: '3',
        })
        .expect((res) => {
          expect(res.body.transactionId).to.not.equal(null);
          expect(res.body).to.containSubset({
            code: '0',
            data: {
              organization: configuration.brands.LD.org,
              playerId: formatPlayerId(player),
              currency: 'EUR',
              applicableBonus: '0.00',
              homeCurrency: 'EUR',
              balance: '109.60',
              bonus: '0.00',
            },
          });
        })
        .expect(200);
    });
    it('credits credits freespins win', () =>
      request(app)
        .get('/api/v1/yggdrasil/campaignpayout.json')
        .query({
          org: configuration.brands.LD.org,
          playerid: formatPlayerId(player),
          cash: '100.00',
          bonus: '0.00',
          currency: 'EUR',
          reference: '15532312113301000012',
          description: 'Free spin win',
          cat1: 'Casino',
          cat2: 'Slot',
          cat3: 'Express',
          cat4: 'Bicicleta',
          cat5: '7326',
          tag1: 'GameName.Bicicleta',
          tag2: 'Model.M1',
          tag3: 'Channel.pc',
          campaignref: 'xxx123',
          last: 'Y',
          lang: 'en',
          version: '3',
        })
        .expect((res) => {
          expect(res.body.transactionId).to.not.equal(null);
          expect(res.body).to.containSubset({
            code: '0',
            data: {
              organization: configuration.brands.LD.org,
              playerId: formatPlayerId(player),
              currency: 'EUR',
              applicableBonus: '0.00',
              homeCurrency: 'EUR',
              balance: '209.60',
            },
          });
        })
        .expect(200));
    it('handles error when using invalid game id to credit a win', () =>
      request(app)
        .get('/api/v1/yggdrasil/campaignpayout.json')
        .query({
          org: configuration.brands.LD.org,
          playerid: formatPlayerId(player),
          cash: '100.00',
          bonus: '0.00',
          currency: 'EUR',
          reference: '15532312113301000012',
          description: 'Free spin win',
          cat1: 'Casino',
          cat2: 'Slot',
          cat3: 'Express',
          cat4: 'Bicicleta',
          cat5: 'YggdrasilTest',
          tag1: 'GameName.Bicicleta',
          tag2: 'Model.M1',
          tag3: 'Channel.pc',
          campaignref: 'xxx123',
          last: 'Y',
          lang: 'en',
          version: '3',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            code: '1',
            msg: 'Game not found',
          });
        })
        .expect(200));
  });
});
