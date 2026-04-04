/* @flow */
const request = require('supertest');
const { v1: uuid } = require('uuid');
const moment = require('moment-timezone');
const app = require('../../index');

const { players: { john } } = require('../../../scripts/utils/db-data');

const { creditBonus } = require('../bonuses');
const { createSession, createManufacturerSession } = require('../sessions');
const { getWithProfile } = require('../games/Game');
const { startDeposit, processDeposit } = require('../payments/deposits/Deposit');
const { placeBet, creditWin } = require('../game_round');

describe('Transaction REST API', () => {
  describe('with active session', () => {
    let headers;
    let playerId;

    beforeEach(async () => {
      await setup.players();
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(200)
        .expect((res) => {
          playerId = res.body.player.id;
          headers = { Authorization: `Token ${res.body.token}` };
        });
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      const { transactionKey } = await startDeposit(playerId, 1, 2000);
      await processDeposit(1000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
      await creditBonus(1001, playerId, 1000);

      const { id: sessionId } = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
      const manufacturerSessionId = await createManufacturerSession('NE', uuid(), sessionId);
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 400,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);
      const externalGameRoundId = uuid();
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 400,
        externalGameRoundId,
        externalTransactionId: uuid(),
        closeRound: false,
        timestamp: new Date(),
      }, []);
      await creditWin(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        externalGameRoundId,
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      },
      [{ type: 'win', amount: 10000 }]);
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 400,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);
    });

    it('can fetch transaction list for player', async () => {
      await request(app)
        .get(`/api/v1/player/${playerId}/transactions?startDate=${moment().subtract(1, 'days')}&endDate=${moment().add(1, 'days')}`)
        .set(headers)
        .expect((res) => {
          expect(res.body.length).to.equal(6);
        })
        .expect(200);
    });

    it('can fetch transaction list for player with paging', async () => {
      await request(app)
        .get(`/api/v1/player/${playerId}/transactions?startDate=${moment().subtract(1, 'days')}&endDate=${moment().add(1, 'days')}&pageSize=3`)
        .set(headers)
        .expect((res) => {
          expect(res.body.length).to.equal(3);
        })
        .expect(200);
    });

    it('can fetch transaction list for player with page index and page size', async () => {
      await request(app)
        .get(`/api/v1/player/${playerId}/transactions?startDate=${moment().subtract(1, 'days')}&endDate=${moment().add(1, 'days')}&pageIndex=0&pageSize=3`)
        .set(headers)
        .expect((res) => {
          expect(res.body.length).to.equal(3);
        })
        .expect(200);
    });

    it('can fetch transaction list for player with search query', async () => {
      let transactionId = "";

      await request(app)
        .get(`/api/v1/player/${playerId}/transactions?startDate=${moment().subtract(1, 'days')}&endDate=${moment().add(1, 'days')}`)
        .set(headers)
        .expect((res) => {
          if (res.body.length !== 0) {
            transactionId = res.body[0].transactionId;
          }
        });

      await request(app)
        .get(`/api/v1/player/${playerId}/transactions?startDate=${moment().subtract(1, 'days')}&endDate=${moment().add(1, 'days')}&text=${transactionId}`)
        .set(headers)
        .expect((res) => {
          expect(res.body.length).to.equal(1);
        })
        .expect(200);
    });
  });
});
