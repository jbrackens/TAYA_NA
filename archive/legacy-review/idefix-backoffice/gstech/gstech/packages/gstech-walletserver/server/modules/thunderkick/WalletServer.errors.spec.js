/* @flow */
const request = require('supertest');  
const app = require('../../index');
const config = require('../../../config');

const configuration = config.providers.thunderkick;

describe('Thunderkick WalletServer Errors', () => {
  describe('with active session', () => {
    let sessionId;
    let player;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'TK',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        player = res.body.player;
      })
      .expect(200));

    it('can get error when bet too much', () =>
      request(app)
        .post('/api/v1/thunderkick/bet/123459')
        .auth(configuration.user, configuration.pass)
        .send({
          playerId: 1234567,
          playerExternalReference: `LD_${player.id}`,
          ipAddress: '123.123.123.123',
          gameRound: {
            gameName: 'superdupergame',
            gameRoundId: 12347,
            providerGameRoundId: 123478,
            providerId: 1,
            gameRoundStartDate: '2012-06-14T07:59:58.456+0200',
            gameRoundEndDate: '2012-06-14T08:00:00.123+0200',
            numberOfBets: 1,
            numberOfWins: 1,
          },
          gameSessionToken: 'd056de0e-3d40-4e2a-a4bb-179ae86a014b',
          playerSessionToken: '85f3ad25-0bb4-460a-8464-bd8ee54758a1',
          operatorSessionToken: sessionId,
          distributionChannel: 'WEB',
          bets: [{
            bet: {
              amount: '100.000000',
              currency: 'EUR',
            },
            accountId: '11',
            accountType: 'REAL',
          }],
          betTime: '2012-06-14T08:00:00.100+0200',
          metaGameTags: [{
            id: 'FIVE_IN_A_ROW',
            details: {
              symbolid: 5,
              paylineid: 3,
            },
          }],
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            errorCode: '200',
            errorMessage: 'Not enough money',
            balances: {
              moneyAccounts: [{
                balance: {
                  amount: '10.000000',
                  currency: 'EUR',
                },
                accountType: 'REAL',
              }, {
                balance: {
                  amount: '0.000000',
                  currency: 'EUR',
                },
                accountType: 'BONUS',
              }],
            },
          });
          expect(res.body.balances.moneyAccounts[0].accountId).to.not.be.empty();
          expect(res.body.balances.moneyAccounts[0].accountId).to.not.equal('undefined');
          expect(res.body.balances.moneyAccounts[1].accountId).to.not.be.empty();
          expect(res.body.balances.moneyAccounts[1].accountId).to.not.equal('undefined');
        })
        .expect(523));
  });
});
