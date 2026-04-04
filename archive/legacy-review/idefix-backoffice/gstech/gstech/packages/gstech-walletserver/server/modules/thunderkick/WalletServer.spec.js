/* @flow */
const request = require('supertest');  
const app = require('../../index');
const config = require('../../../config');

const configuration = config.providers.thunderkick;

describe('Thunderkick WalletServer', () => {
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

    it('can get balances', () =>
      request(app)
        .post('/api/v1/thunderkick/balances')
        .auth(configuration.user, configuration.pass)
        .send({
          playerExternalReference: `LD_${player.id}`,
          playerSessionToken: '321f7ba1-b928-11e1-afa6-0800200c9a66',
          operatorSessionToken: '4233224',
          gameName: 'superdupergame',
          distributionChannel: 'WEB',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            moneyAccounts: [
              {
                balance: {
                  amount: '10.000000',
                  currency: 'EUR',
                },
                accountType: 'REAL',
              },
              {
                balance: {
                  amount: '0.000000',
                  currency: 'EUR',
                },
                accountType: 'BONUS',
              },
            ],
          });
          expect(res.body.moneyAccounts[0].accountId).to.not.be.empty();
          expect(res.body.moneyAccounts[0].accountId).to.not.equal('undefined');
          expect(res.body.moneyAccounts[1].accountId).to.not.be.empty();
          expect(res.body.moneyAccounts[1].accountId).to.not.equal('undefined');
        })
        .expect(200));

    it('can get bet and win', () =>
      request(app)
        .post('/api/v1/thunderkick/betandwin/123458')
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
            gameRoundStartDate: new Date().toISOString(),
            gameRoundEndDate: new Date().toISOString(),
            numberOfBets: 1,
            numberOfWins: 1,
          },
          gameSessionToken: 'd056de0e-3d40-4e2a-a4bb-179ae86a014b',
          playerSessionToken: '85f3ad25-0bb4-460a-8464-bd8ee54758a1',
          operatorSessionToken: sessionId,
          distributionChannel: 'WEB',
          bets: [{
            bet: {
              amount: '0.250000',
              currency: 'EUR',
            },
            accountId: '11',
            accountType: 'REAL',
          }],
          betTime: new Date().toISOString(),
          wins: [{
            win: {
              amount: '1.000000',
              currency: 'EUR',
            },
            accountId: '11',
            accountType: 'REAL',
          }],
          winTime: new Date().toISOString(),
          winTransactionId: 123456,
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
            balances: {
              moneyAccounts: [{
                balance: {
                  amount: '10.750000',
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

          expect(res.body.extBetTransactionId).to.not.be.empty();
          expect(res.body.extWinTransactionId).to.not.be.empty();
          expect(res.body.extBetTransactionId).to.not.equal('undefined');
          expect(res.body.extWinTransactionId).to.not.equal('undefined');
        })
        .expect(200));

    it('can get bet and win from free spins', () =>
      request(app)
        .post('/api/v1/thunderkick/betandwin/1234589')
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
            gameRoundStartDate: new Date().toISOString(),
            gameRoundEndDate: new Date().toISOString(),
            numberOfBets: 1,
            numberOfWins: 1,
          },
          gameSessionToken: 'd056de0e-3d40-4e2a-a4bb-179ae86a014b',
          playerSessionToken: '85f3ad25-0bb4-460a-8464-bd8ee54758a1',
          operatorSessionToken: sessionId,
          distributionChannel: 'WEB',
          bets: [{
            bet: {
              amount: '1',
              currency: 'EUR',
            },
            accountId: '11',
            accountType: 'FREE_ROUND',
          }],
          betTime: new Date().toISOString(),
          wins: [{
            win: {
              amount: '1.000000',
              currency: 'EUR',
            },
            accountId: '11',
            accountType: 'FREE_ROUND',
          }],
          winTime: new Date().toISOString(),
          winTransactionId: 123456799,
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
            balances: {
              moneyAccounts: [{
                balance: {
                  amount: '11.750000',
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

          expect(res.body.extBetTransactionId).to.not.be.empty();
          expect(res.body.extWinTransactionId).to.not.be.empty();
          expect(res.body.extBetTransactionId).to.not.equal('undefined');
          expect(res.body.extWinTransactionId).to.not.equal('undefined');
        })
        .expect(200));

    it('can get bet', () =>
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
            gameRoundStartDate: new Date().toISOString(),
            gameRoundEndDate: new Date().toISOString(),
            numberOfBets: 1,
            numberOfWins: 1,
          },
          gameSessionToken: 'd056de0e-3d40-4e2a-a4bb-179ae86a014b',
          playerSessionToken: '85f3ad25-0bb4-460a-8464-bd8ee54758a1',
          operatorSessionToken: sessionId,
          distributionChannel: 'WEB',
          bets: [{
            bet: {
              amount: '0.250000',
              currency: 'EUR',
            },
            accountId: '11',
            accountType: 'REAL',
          }],
          betTime: new Date().toISOString(),
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
            balances: {
              moneyAccounts: [{
                balance: {
                  amount: '11.500000',
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

          expect(res.body.extBetTransactionId).to.not.be.empty();
          expect(res.body.extBetTransactionId).to.not.equal('undefined');
        })
        .expect(200));

    it('can get win', () =>
      request(app)
        .post('/api/v1/thunderkick/win/1234560')
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
            gameRoundStartDate: new Date().toISOString(),
            gameRoundEndDate: new Date().toISOString(),
            numberOfBets: 1,
            numberOfWins: 1,
          },
          gameSessionToken: 'd056de0e-3d40-4e2a-a4bb-179ae86a014b',
          playerSessionToken: '85f3ad25-0bb4-460a-8464-bd8ee54758a1',
          operatorSessionToken: sessionId,
          distributionChannel: 'WEB',
          wins: [{
            win: {
              amount: '1.000000',
              currency: 'EUR',
            },
            accountId: '11',
            accountType: 'REAL',
          },
          {
            win: {
              amount: '1.000000',
              currency: 'EUR',
            },
            accountId: '11',
            accountType: 'FREE_ROUND',
          }],
          winTime: new Date().toISOString(),
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
            balances: {
              moneyAccounts: [{
                balance: {
                  amount: '13.500000',
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

          expect(res.body.extWinTransactionId).to.not.be.empty();
          expect(res.body.extWinTransactionId).to.not.equal('undefined');
        })
        .expect(200));

    it('can get rollbackBetAndWin', () =>
      request(app)
        .post('/api/v1/thunderkick/rollbackbetandwin/123459')
        .auth(configuration.user, configuration.pass)
        .send({
          playerId: 1234567,
          playerExternalReference: `LD_${player.id}`,
          gameSessionToken: 'd056de0e-3d40-4e2a-a4bb-179ae86a014b',
          operatorSessionToken: sessionId,
          gameName: 'superdupergame',
          gameRoundId: 12347,
          betAmount: {
            amount: '0.250000',
            currency: 'EUR',
          },
          numberOfWins: 1,
          rollbackTime: new Date().toISOString(),
          betTransactionId: 123459,
          winTransactionId: 1234560,
          betTime: new Date().toISOString(),
          numberOfRetries: 0,
          externalAccountId: '11',
          accountType: 'REAL',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            balances: {
              moneyAccounts: [{
                balance: {
                  amount: '13.750000',
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

          expect(res.body.extRollbackTransactionId).to.not.be.empty();
          expect(res.body.extRollbackTransactionId).to.not.equal('undefined');
        })
        .expect(200));

    it('can get rollbackBet', () =>
      request(app)
        .post('/api/v1/thunderkick/rollbackbet/123459')
        .auth(configuration.user, configuration.pass)
        .send({
          playerId: 1234567,
          playerExternalReference: `LD_${player.id}`,
          gameSessionToken: 'd056de0e-3d40-4e2a-a4bb-179ae86a014b',
          operatorSessionToken: sessionId,
          gameName: 'superdupergame',
          gameRoundId: 12347,
          betAmount: {
            amount: '0.250000',
            currency: 'EUR',
          },
          rollbackTime: '2012-06-14T08:00:00.100+0200',
          betTransactionId: '123459',
          betTime: '2012-06-14T07:50:00.100+0200',
          numberOfRetries: 0,
          externalAccountId: '11',
          accountType: 'REAL',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            balances: {
              moneyAccounts: [{
                balance: {
                  amount: '13.750000',
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

          expect(res.body.extRollbackTransactionId).to.not.be.empty();
          expect(res.body.extRollbackTransactionId).to.not.equal('undefined');
        })
        .expect(200));

    it('can get freeRoundsResult', () =>
      request(app)
        .post('/api/v1/thunderkick/freeroundsresult/1234560')
        .auth(configuration.user, configuration.pass)
        .send({
          playerId: 1234567,
          playerExternalReference: `LD_${player.id}`,
          ipAddress: '123.123.123.123',
          gameName: 'superdupergame',
          gameSessionToken: 'd056de0e-3d40-4e2a-a4bb-179ae86a014b',
          playerSessionToken: '85f3ad25-0bb4-460a-8464-bd8ee54758a1',
          operatorSessionToken: sessionId,
          distributionChannel: 'WEB',
          totalWin: {
            amount: '10.000000',
            currency: 'EUR',
          },
          playerFreeRoundsReference: '12345summer2013',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            balances: {
              moneyAccounts: [{
                balance: {
                  amount: '12.500000',
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

          expect(res.body.extFreeRoundsResultTransactionId).to.not.be.empty();
          expect(res.body.extFreeRoundsResultTransactionId).to.not.equal('undefined');
        })
        .expect(200));
  });
});
