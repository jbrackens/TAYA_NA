/* @flow */
const request = require('supertest');
const moment = require('moment-timezone');
const { v1: uuid } = require('uuid');
const app = require('../../index');
const { players: { john } } = require('../../../scripts/utils/db-data');
const nock = require('nock'); // eslint-disable-line
const { startDeposit, processDeposit } = require('./deposits/Deposit');
const { creditBonus } = require('../bonuses');
const { placeBet } = require('../game_round');
const { createSession, createManufacturerSession } = require('../sessions');
const { getWithProfile } = require('../games');
const HourlyActivityUpdateJob = require('../reports/jobs/HourlyActivityUpdateJob');

describe('Payment api routes', () => {
  describe('with active session', () => {
    let headers;
    let player;

    beforeEach(async () => {
      await setup.players();
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(200)
        .expect((res) => {
          headers = { Authorization: `Token ${res.body.token}` };
          player = res.body.player;
        });

      const { id } = await createSession({ id: player.id, brandId: 'LD' }, '1.2.3.4');
      const manufacturerSessionId = await createManufacturerSession('NE', uuid(), id, 'desktop', {});
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');

      const { transactionKey } = await startDeposit(player.id, 1, 2000);
      await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
      await placeBet(player.id, {
        manufacturerId: 'NE',
        game,
        sessionId: id,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, [{ amount: 10000, type: 'win' }]);
      await creditBonus(1001, player.id, 5000);
      await placeBet(player.id, {
        manufacturerId: 'NE',
        game,
        sessionId: id,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);

      await HourlyActivityUpdateJob.update(moment());

      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(200)
        .expect((res) => {
          headers = { Authorization: `Token ${res.body.token}` };
          player = res.body.player;
        });
    });

    it('returns account statement', () =>
      request(app)
        .get('/api/LD/v1/statement')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            statement: [{
              amount: 2000,
              paymentType: 'deposit',
              paymentMethod: 'BankTransfer',
              account: 'FI2112345600008739',
              externalTransactionId: 'external-id1',
            }],
            balance: {
              balance: 11000,
              bonusBalance: 5000,
              currencyId: 'EUR',
              numDeposits: 1,
              brandId: 'LD',
            },
            summary: {
              totalDepositAmount: 2000,
              totalWithdrawalAmount: 0,
              depositCount: 1,
              withdrawalCount: 0,
            },
            transactions: [],
          });
        }));
  });
});
