/* @flow */
const request = require('supertest');  
const moment = require('moment-timezone');
const app = require('../../index');
const config = require('../../../config');

const configuration = config.providers.habanero;

describe('Habanero WalletServer', () => {
  describe('with active session', () => {
    let sessionId;
    let player;
    let token;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'HB',
        initialBalance: 1000,
        type: 'ticket',
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        player = res.body.player;
      })
      .expect(200));

    it('authentication with invalid token returns a valid error', () =>
      request(app)
        .post('/api/v1/habanero')
        .send({
          type: 'playerdetailrequest',
          dtsent: moment().format(),
          basegame: {
            brandgameid: '045a80d0-5b2a-e311-80bb-74d02b2c397f',
            keyname: 'SGAllForOne',
          },
          auth: {
            username: configuration.username,
            passkey: configuration.passkey,
            machinename: 'A-DESKTOP',
            locale: 'en',
            brandid: '6cf6f2f8-0ecd-4829-9bb7-e78abcffe6ef',
          },
          playerdetailrequest: {
            token: '123123123123',
            gamelaunch: true,
          },
        })
        .expect(res =>
          expect(res.body).to.containSubset({
            playerdetailresponse: {
              status: {
                success: false,
                autherror: true,
              },
            },
          }))
        .expect(200));

    it('can authenticate', () =>
      request(app)
        .post('/api/v1/habanero')
        .send({
          type: 'playerdetailrequest',
          dtsent: moment().format(),
          basegame: {
            brandgameid: '045a80d0-5b2a-e311-80bb-74d02b2c397f',
            keyname: 'SGAllForOne',
          },
          auth: {
            username: configuration.username,
            passkey: configuration.passkey,
            machinename: 'A-DESKTOP',
            locale: 'en',
            brandid: '6cf6f2f8-0ecd-4829-9bb7-e78abcffe6ef',
          },
          playerdetailrequest: {
            token: sessionId,
            gamelaunch: true,
          },
        })
        .expect(res =>
          expect(res.body).to.containSubset({
            playerdetailresponse: {
              status: {
                success: true,
                autherror: false,
              },
              accountid: `LD_${player.id}`,
              accountname: 'Jack S',
              balance: 10.00,
              currencycode: 'EUR',
            },
          }))
        .expect(200)
        .expect((res) => {
          token = res.body.playerdetailresponse.newtoken;
        }));

    it('returns an error when trying to use initial ticket', () =>
      request(app)
        .post('/api/v1/habanero')
        .send({
          type: 'fundtransferrequest',
          dtsent: moment().format(),
          basegame: {
            brandgameid: '9bc350d1-f968-4e6a-aaa7-5e4d39941e05',
            keyname: 'BlackJack3H',
          },
          auth: {
            username: configuration.username,
            passkey: configuration.passkey,
            machinename: 'A-DESKTOP',
            locale: 'en',
            brandid: '6cf6f2f8-0ecd-4829-9bb7-e78abcffe6ef',
          },
          fundtransferrequest: {
            token: sessionId,
            accountid: `LD_${player.id}`,
            customplayertype: 0,
            gameinstanceid: 'bf22d5cf-8572-e711-9c0b-74d02b2c397f',
            friendlygameinstanceid: 1330635,
            isretry: false,
            retrycount: 0,
            isrefund: false,
            isrecredit: false,
            funds: {
              debitandcredit: false,
              fundinfo: [
                {
                  gamestatemode: 1,
                  transferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
                  currencycode: 'EUR',
                  amount: -100,
                  jpwin: false,
                  jpcont: 0,
                  isbonus: false,
                  dtevent: moment().format(),
                  initialdebittransferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
                },
              ],
            },
            gamedetails: {
              gamestatemode: 1,
              transferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
              currencycode: 'EUR',
              amount: -100,
              jpwin: false,
              jpcont: 0,
              isbonus: false,
              dtevent: moment().format(),
              initialdebittransferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
              name: 'Blackjack (3 Hand)',
              keyname: 'BlackJack3H',
              gametypeid: 4,
              gametypename: 'Blackjack',
              brandgameid: '9bc350d1-f968-4e6a-aaa7-5e4d39941e05',
              gamesessionid: 'be22d5cf-8572-e711-9c0b-74d02b2c397f',
              gameinstanceid: 'bf22d5cf-8572-e711-9c0b-74d02b2c397f',
              friendlygameinstanceid: 1330635,
              channel: 1,
              device: 'Non Mobile',
              browser: 'Non Mobile',
            },
          },
        })
        .expect(res =>
          expect(res.body).to.containSubset({
            fundtransferresponse: {
              status: {
                success: false,
                autherror: true,
              },
            },
          }))
        .expect(200));


    it('returns valid error when not enough balance', () =>
      request(app)
        .post('/api/v1/habanero')
        .send({
          type: 'fundtransferrequest',
          dtsent: moment().format(),
          basegame: {
            brandgameid: '9bc350d1-f968-4e6a-aaa7-5e4d39941e05',
            keyname: 'BlackJack3H',
          },
          auth: {
            username: configuration.username,
            passkey: configuration.passkey,
            machinename: 'A-DESKTOP',
            locale: 'en',
            brandid: '6cf6f2f8-0ecd-4829-9bb7-e78abcffe6ef',
          },
          fundtransferrequest: {
            token,
            accountid: `LD_${player.id}`,
            customplayertype: 0,
            gameinstanceid: 'bf22d5cf-8572-e711-9c0b-74d02b2c397f',
            friendlygameinstanceid: 1330635,
            isretry: false,
            retrycount: 0,
            isrefund: false,
            isrecredit: false,
            funds: {
              debitandcredit: false,
              fundinfo: [
                {
                  gamestatemode: 1,
                  transferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
                  currencycode: 'EUR',
                  amount: -100,
                  jpwin: false,
                  jpcont: 0,
                  isbonus: false,
                  dtevent: moment().format(),
                  initialdebittransferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
                },
              ],
            },
            gamedetails: {
              gamestatemode: 1,
              transferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
              currencycode: 'EUR',
              amount: -100,
              jpwin: false,
              jpcont: 0,
              isbonus: false,
              dtevent: moment().format(),
              initialdebittransferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
              name: 'Blackjack (3 Hand)',
              keyname: 'BlackJack3H',
              gametypeid: 4,
              gametypename: 'Blackjack',
              brandgameid: '9bc350d1-f968-4e6a-aaa7-5e4d39941e05',
              gamesessionid: 'be22d5cf-8572-e711-9c0b-74d02b2c397f',
              gameinstanceid: 'bf22d5cf-8572-e711-9c0b-74d02b2c397f',
              friendlygameinstanceid: 1330635,
              channel: 1,
              device: 'Non Mobile',
              browser: 'Non Mobile',
            },
          },
        })
        .expect(res =>
          expect(res.body).to.containSubset({
            fundtransferresponse: {
              status: {
                success: false,
                nofunds: true,
              },
              balance: 10,
              currencycode: 'EUR',
            },
          }))
        .expect(200));

    it('can place a bet without win', () =>
      request(app)
        .post('/api/v1/habanero')
        .send({
          type: 'fundtransferrequest',
          dtsent: moment().format(),
          basegame: {
            brandgameid: '9bc350d1-f968-4e6a-aaa7-5e4d39941e05',
            keyname: 'BlackJack3H',
          },
          auth: {
            username: configuration.username,
            passkey: configuration.passkey,
            machinename: 'A-DESKTOP',
            locale: 'en',
            brandid: '6cf6f2f8-0ecd-4829-9bb7-e78abcffe6ef',
          },
          fundtransferrequest: {
            token,
            accountid: `LD_${player.id}`,
            customplayertype: 0,
            gameinstanceid: 'bf22d5cf-8572-e711-9c0b-74d02b2c397f',
            friendlygameinstanceid: 1330635,
            isretry: false,
            retrycount: 0,
            isrefund: false,
            isrecredit: false,
            funds: {
              debitandcredit: false,
              fundinfo: [
                {
                  gamestatemode: 1,
                  transferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
                  currencycode: 'EUR',
                  amount: -3,
                  jpwin: false,
                  jpcont: 0,
                  isbonus: false,
                  dtevent: moment().format(),
                  initialdebittransferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
                },
              ],
            },
            gamedetails: {
              gamestatemode: 1,
              transferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
              currencycode: 'EUR',
              amount: -3,
              jpwin: false,
              jpcont: 0,
              isbonus: false,
              dtevent: moment().format(),
              initialdebittransferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
              name: 'Blackjack (3 Hand)',
              keyname: 'BlackJack3H',
              gametypeid: 4,
              gametypename: 'Blackjack',
              brandgameid: '9bc350d1-f968-4e6a-aaa7-5e4d39941e05',
              gamesessionid: 'be22d5cf-8572-e711-9c0b-74d02b2c397f',
              gameinstanceid: 'bf22d5cf-8572-e711-9c0b-74d02b2c397f',
              friendlygameinstanceid: 1330635,
              channel: 1,
              device: 'Non Mobile',
              browser: 'Non Mobile',
            },
          },
        })
        .expect(res =>
          expect(res.body).to.containSubset({
            fundtransferresponse: {
              status: {
                success: true,
              },
              balance: 7,
              currencycode: 'EUR',
            },
          }))
        .expect(200));

    it('handles error properly when session is expired', () =>
      request(app)
        .post('/api/v1/habanero')
        .send({
          type: 'fundtransferrequest',
          dtsent: moment().format(),
          basegame: {
            brandgameid: '9bc350d1-f968-4e6a-aaa7-5e4d39941e05',
            keyname: 'BlackJack3H',
          },
          auth: {
            username: configuration.username,
            passkey: configuration.passkey,
            machinename: 'A-DESKTOP',
            locale: 'en',
            brandid: '6cf6f2f8-0ecd-4829-9bb7-e78abcffe6ef',
          },
          fundtransferrequest: {
            token: 'xxx',
            accountid: `LD_${player.id}`,
            customplayertype: 0,
            gameinstanceid: 'bf22d5cf-8572-e711-9c0b-74d02b2c397f',
            friendlygameinstanceid: 1330635,
            isretry: false,
            retrycount: 0,
            isrefund: false,
            isrecredit: false,
            funds: {
              debitandcredit: false,
              fundinfo: [
                {
                  gamestatemode: 1,
                  transferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
                  currencycode: 'EUR',
                  amount: -3,
                  jpwin: false,
                  jpcont: 0,
                  isbonus: false,
                  dtevent: moment().format(),
                  initialdebittransferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
                },
              ],
            },
            gamedetails: {
              gamestatemode: 1,
              transferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
              currencycode: 'EUR',
              amount: -3,
              jpwin: false,
              jpcont: 0,
              isbonus: false,
              dtevent: moment().format(),
              initialdebittransferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
              name: 'Blackjack (3 Hand)',
              keyname: 'BlackJack3H',
              gametypeid: 4,
              gametypename: 'Blackjack',
              brandgameid: '9bc350d1-f968-4e6a-aaa7-5e4d39941e05',
              gamesessionid: 'be22d5cf-8572-e711-9c0b-74d02b2c397f',
              gameinstanceid: 'bf22d5cf-8572-e711-9c0b-74d02b2c397f',
              friendlygameinstanceid: 1330635,
              channel: 1,
              device: 'Non Mobile',
              browser: 'Non Mobile',
            },
          },
        })
        .expect(res =>
          expect(res.body).to.deep.equal({
            fundtransferresponse: {
              status: {
                success: false,
                autherror: true,
                message: 'Session is not active',
              },
            },
          }))
        .expect(200));


    it('handles bet + win request', () =>
      request(app)
        .post('/api/v1/habanero')
        .send({
          type: 'fundtransferrequest',
          dtsent: moment().format(),
          basegame: {
            brandgameid: '045a80d0-5b2a-e311-80bb-74d02b2c397f',
            keyname: 'SGAllForOne',
          },
          auth: {
            username: configuration.username,
            passkey: configuration.passkey,
            machinename: 'A-DESKTOP',
            locale: 'en',
            brandid: '6cf6f2f8-0ecd-4829-9bb7-e78abcffe6ef',
          },
          fundtransferrequest: {
            token,
            accountid: `LD_${player.id}`,
            customplayertype: 0,
            gameinstanceid: '00ffcc29-7972-e711-9c0b-74d02b2c397f',
            friendlygameinstanceid: 1330623,
            isretry: false,
            retrycount: 0,
            isrefund: false,
            isrecredit: false,
            funds: {
              debitandcredit: true,
              fundinfo: [
                {
                  gamestatemode: 0,
                  transferid: '00ffcc297972e7119c0b74d02b2c397f',
                  currencycode: 'EUR',
                  amount: -2.5,
                  jpwin: false,
                  jpcont: 0.1,
                  isbonus: false,
                  dtevent: moment().format(),
                  initialdebittransferid: '00ffcc297972e7119c0b74d02b2c397f',
                },
                {
                  gamestatemode: 0,
                  transferid: '00ffcc297972e7119c0b74d02b2c397b',
                  currencycode: 'EUR',
                  amount: 25,
                  jpwin: false,
                  jpcont: 0,
                  isbonus: false,
                  dtevent: moment().format(),
                  initialdebittransferid: '00ffcc297972e7119c0b74d02b2c397f',
                },
              ],
            },
            gamedetails: {
              name: 'All For One',
              keyname: 'SGAllForOne',
              gametypeid: 11,
              gametypename: 'Video Slots',
              brandgameid: '045a80d0-5b2a-e311-80bb-74d02b2c397f',
              gamesessionid: 'b08b32a6-7872-e711-9c0b-74d02b2c397f',
              gameinstanceid: '00ffcc29-7972-e711-9c0b-74d02b2c397f',
              friendlygameinstanceid: 1330623,
              channel: 1,
              device: 'Non Mobile',
              browser: 'Non Mobile',
            },
          },
        })
        .expect(res =>
          expect(res.body).to.deep.equal({
            fundtransferresponse: {
              status: {
                success: true,
                successdebit: true,
                successcredit: true,
              },
              balance: 29.50,
              currencycode: 'EUR',
            },
          }))
        .expect(200));

    it('continues game round', () =>
      request(app)
        .post('/api/v1/habanero')
        .send({
          type: 'fundtransferrequest',
          dtsent: moment().format(),
          basegame: {
            brandgameid: '045a80d0-5b2a-e311-80bb-74d02b2c397f',
            keyname: 'SGAllForOne',
          },
          auth: {
            username: configuration.username,
            passkey: configuration.passkey,
            machinename: 'A-DESKTOP',
            locale: 'en',
            brandid: '6cf6f2f8-0ecd-4829-9bb7-e78abcffe6ef',
          },
          fundtransferrequest: {
            token,
            accountid: `LD_${player.id}`,
            customplayertype: 0,
            gameinstanceid: '00ffcc29-7972-e711-9c0b-74d02b2c397f',
            friendlygameinstanceid: 1330623,
            isretry: false,
            retrycount: 0,
            isrefund: false,
            isrecredit: false,
            funds: {
              debitandcredit: false,
              fundinfo: [
                {
                  gamestatemode: 0,
                  transferid: '9b2bfa54527148f2ab2202cd7ba553fc',
                  currencycode: 'EUR',
                  amount: 200,
                  jpwin: false,
                  jpcont: 0,
                  isbonus: false,
                  dtevent: moment().format(),
                  initialdebittransferid: '00ffcc297972e7119c0b74d02b2c397f',
                },
              ],
            },
            gamedetails: {
              name: 'All For One',
              keyname: 'SGAllForOne',
              gametypeid: 11,
              gametypename: 'Video Slots',
              brandgameid: '045a80d0-5b2a-e311-80bb-74d02b2c397f',
              gamesessionid: 'b08b32a6-7872-e711-9c0b-74d02b2c397f',
              gameinstanceid: '00ffcc29-7972-e711-9c0b-74d02b2c397f',
              friendlygameinstanceid: 1330623,
              channel: 1,
              device: 'Non Mobile',
              browser: 'Non Mobile',
            },
          },
        })
        .expect(res =>
          expect(res.body).to.deep.equal({
            fundtransferresponse: {
              status: {
                success: true,
              },
              balance: 229.50,
              currencycode: 'EUR',
            },
          }))
        .expect(200));

    it('credits empty free spin results', () =>
      request(app)
        .post('/api/v1/habanero')
        .send({
          type: 'fundtransferrequest',
          dtsent: moment().format(),
          basegame: {
            brandgameid: '045a80d0-5b2a-e311-80bb-74d02b2c397f',
            keyname: 'SGAllForOne',
          },
          auth: {
            username: configuration.username,
            passkey: configuration.passkey,
            machinename: 'A-DESKTOP',
            locale: 'en',
            brandid: '6cf6f2f8-0ecd-4829-9bb7-e78abcffe6ef',
          },
          fundtransferrequest: {
            token,
            accountid: `LD_${player.id}`,
            customplayertype: 0,
            gameinstanceid: '00ffcc29-7972-e711-9c0b-74d02b2c397f',
            friendlygameinstanceid: 1330623,
            isretry: false,
            retrycount: 0,
            isrefund: false,
            isrecredit: false,
            funds: {
              debitandcredit: false,
              fundinfo: [
                {
                  gamestatemode: 2,
                  transferid: '73000169375540c5be99c9d8d3240ec2',
                  currencycode: 'EUR',
                  amount: 0,
                  jpwin: false,
                  jpcont: 0,
                  isbonus: false,
                  dtevent: moment().format(),
                  initialdebittransferid: '00ffcc297972e7119c0b74d02b2c397f',
                },
              ],
            },
            gamedetails: {
              name: 'All For One',
              keyname: 'SGAllForOne',
              gametypeid: 11,
              gametypename: 'Video Slots',
              brandgameid: '045a80d0-5b2a-e311-80bb-74d02b2c397f',
              gamesessionid: 'b08b32a6-7872-e711-9c0b-74d02b2c397f',
              gameinstanceid: '00ffcc29-7972-e711-9c0b-74d02b2c397f',
              friendlygameinstanceid: 1330623,
              channel: 1,
              device: 'Non Mobile',
              browser: 'Non Mobile',
            },
          },
        })
        .expect(res =>
          expect(res.body).to.deep.equal({
            fundtransferresponse: {
              status: {
                success: true,
              },
              balance: 229.50,
              currencycode: 'EUR',
            },
          }))
        .expect(200));

    it('credits jackpot win', () =>
      request(app)
        .post('/api/v1/habanero')
        .send({
          type: 'fundtransferrequest',
          dtsent: moment().format(),
          basegame: {
            brandgameid: '045a80d0-5b2a-e311-80bb-74d02b2c397f',
            keyname: 'SGAllForOne',
          },
          auth: {
            username: configuration.username,
            passkey: configuration.passkey,
            machinename: 'A-DESKTOP',
            locale: 'en',
            brandid: '6cf6f2f8-0ecd-4829-9bb7-e78abcffe6ef',
          },
          fundtransferrequest: {
            token,
            accountid: `LD_${player.id}`,
            customplayertype: 0,
            gameinstanceid: '00ffcc29-7972-e711-9c0b-74d02b2c397f',
            friendlygameinstanceid: 1330623,
            isretry: false,
            retrycount: 0,
            isrefund: false,
            isrecredit: false,
            funds: {
              debitandcredit: false,
              fundinfo: [
                {
                  gamestatemode: 2,
                  transferid: '73000169375540c5be99c9d8d3240ec3',
                  currencycode: 'EUR',
                  amount: 1340.99,
                  jpwin: true,
                  jpid: '762c4031-d6f3-427c-bf1e-6d95ad49d542',
                  jpcont: 0,
                  dtevent: moment().format(),
                  initialdebittransferid: '73000169375540c5be99c9d8d3240ec3',
                },
              ],
            },
            gamedetails: {
              name: 'All For One',
              keyname: 'SGAllForOne',
              gametypeid: 11,
              gametypename: 'Video Slots',
              brandgameid: '045a80d0-5b2a-e311-80bb-74d02b2c397f',
              gamesessionid: 'b08b32a6-7872-e711-9c0b-74d02b2c397f',
              gameinstanceid: '00ffcc29-7972-e711-9c0b-74d02b2c397f',
              friendlygameinstanceid: 1330623,
              channel: 1,
              device: 'Non Mobile',
              browser: 'Non Mobile',
            },
          },
        })
        .expect(res =>
          expect(res.body).to.deep.equal({
            fundtransferresponse: {
              status: {
                success: true,
              },
              balance: 1570.49,
              currencycode: 'EUR',
            },
          }))
        .expect(200));

    it('queries for nonexisting transaction', () =>
      request(app)
        .post('/api/v1/habanero')
        .send({
          type: 'queryrequest',
          dtsent: moment().format(),
          auth: {
            username: configuration.username,
            passkey: configuration.passkey,
            machinename: 'A-DESKTOP',
            locale: 'en',
            brandid: '6cf6f2f8-0ecd-4829-9bb7-e78abcffe6ef',
          },
          queryrequest: {
            transferid: 'a04e00021b88415eafbcaa5d89ea66fa',
            accountid: `LD_${player.id}`,
            token,
            queryamount: 85,
          },
        })
        .expect(res =>
          expect(res.body).to.deep.equal({
            fundtransferresponse: {
              status: {
                success: false,
              },
            },
          }))
        .expect(200));

    it('queries for existing transaction', () =>
      request(app)
        .post('/api/v1/habanero')
        .send({
          type: 'queryrequest',
          dtsent: moment().format(),
          auth: {
            username: configuration.username,
            passkey: configuration.passkey,
            machinename: 'A-DESKTOP',
            locale: 'en',
            brandid: '6cf6f2f8-0ecd-4829-9bb7-e78abcffe6ef',
          },
          queryrequest: {
            transferid: '00ffcc297972e7119c0b74d02b2c397b',
            accountid: `LD_${player.id}`,
            token,
            queryamount: 25,
          },
        })
        .expect(res =>
          expect(res.body).to.deep.equal({
            fundtransferresponse: {
              status: {
                success: true,
              },
            },
          }))
        .expect(200));
  });
  describe('with active session', () => {
    let sessionId;
    let player;
    let token;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'HB',
        initialBalance: 1000,
        type: 'ticket',
        gamePlayerBlocked: true,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        player = res.body.player;
      })
      .expect(200));

    it('can authenticate', () =>
      request(app)
        .post('/api/v1/habanero')
        .send({
          type: 'playerdetailrequest',
          dtsent: moment().format(),
          basegame: {
            brandgameid: '045a80d0-5b2a-e311-80bb-74d02b2c397f',
            keyname: 'SGAllForOne',
          },
          auth: {
            username: configuration.username,
            passkey: configuration.passkey,
            machinename: 'A-DESKTOP',
            locale: 'en',
            brandid: '6cf6f2f8-0ecd-4829-9bb7-e78abcffe6ef',
          },
          playerdetailrequest: {
            token: sessionId,
            gamelaunch: true,
          },
        })
        .expect(res =>
          expect(res.body).to.containSubset({
            playerdetailresponse: {
              status: {
                success: true,
                autherror: false,
              },
              accountid: `LD_${player.id}`,
              accountname: 'Jack S',
              balance: 10.00,
              currencycode: 'EUR',
            },
          }))
        .expect(200)
        .expect((res) => {
          token = res.body.playerdetailresponse.newtoken;
        }));

    it('returns valid error when trying to place a bet', () =>
      request(app)
        .post('/api/v1/habanero')
        .send({
          type: 'fundtransferrequest',
          dtsent: moment().format(),
          basegame: {
            brandgameid: '9bc350d1-f968-4e6a-aaa7-5e4d39941e05',
            keyname: 'BlackJack3H',
          },
          auth: {
            username: configuration.username,
            passkey: configuration.passkey,
            machinename: 'A-DESKTOP',
            locale: 'en',
            brandid: '6cf6f2f8-0ecd-4829-9bb7-e78abcffe6ef',
          },
          fundtransferrequest: {
            token,
            accountid: `LD_${player.id}`,
            customplayertype: 0,
            gameinstanceid: 'bf22d5cf-8572-e711-9c0b-74d02b2c397f',
            friendlygameinstanceid: 1330635,
            isretry: false,
            retrycount: 0,
            isrefund: false,
            isrecredit: false,
            funds: {
              debitandcredit: false,
              fundinfo: [
                {
                  gamestatemode: 1,
                  transferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
                  currencycode: 'EUR',
                  amount: -100,
                  jpwin: false,
                  jpcont: 0,
                  isbonus: false,
                  dtevent: moment().format(),
                  initialdebittransferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
                },
              ],
            },
            gamedetails: {
              gamestatemode: 1,
              transferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
              currencycode: 'EUR',
              amount: -100,
              jpwin: false,
              jpcont: 0,
              isbonus: false,
              dtevent: moment().format(),
              initialdebittransferid: 'bf22d5cf8572e7119c0b74d02b2c397f',
              name: 'Blackjack (3 Hand)',
              keyname: 'BlackJack3H',
              gametypeid: 4,
              gametypename: 'Blackjack',
              brandgameid: '9bc350d1-f968-4e6a-aaa7-5e4d39941e05',
              gamesessionid: 'be22d5cf-8572-e711-9c0b-74d02b2c397f',
              gameinstanceid: 'bf22d5cf-8572-e711-9c0b-74d02b2c397f',
              friendlygameinstanceid: 1330635,
              channel: 1,
              device: 'Non Mobile',
              browser: 'Non Mobile',
            },
          },
        })
        .expect(res =>
          expect(res.body).to.containSubset({
            fundtransferresponse: {
              status: {
                success: false,
                nofunds: false,
                message: 'Account locked',
                successcredit: false,
                successdebit: false,
              },
              balance: 10,
              currencycode: 'EUR',
            },
            dialogmessageresponse: {
              message: 'Account locked',
              type: 3,
            },
          }))
        .expect(200));
  });
});
