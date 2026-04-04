/* @flow */
const { v1: uuid } = require('uuid');
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const { players: { john } } = require('../../../scripts/utils/db-data');
const { connectPlayersWithPerson } = require('../persons/Person');
const { addTransaction } = require('../payments/Payment');
const Player = require('../players/Player');
const Limit = require('./Limit');
const { createSession, createManufacturerSession } = require('../sessions');
const { placeBet, creditWin } = require('../game_round');
const { getWithProfile } = require('../games');
const { startDeposit, processDeposit } = require('../payments/deposits/Deposit');
const { launchGame } = require('../games');
const { formatSessionLength, formatLimit } = require('./format');
const nock = require('nock'); // eslint-disable-line

// nock.recorder.rec();
nock('http://localhost:3004')
  .post('/api/v1/LD/game/NE', body => body.player.brandId === 'LD')
  .times(4)
  .reply(200, { })

nock('http://localhost:3004')
  .post('/api/v1/CJ/game/NE', body => body.player.brandId === 'CJ')
  .times(2)
  .reply(200, { })

nock('http://localhost:3004')
  .post('/api/v1/KK/game/NE', body => body.player.brandId === 'KK')
  .times(2)
  .reply(200, { })

describe('Limit', () => {
  describe('With valid player', () => {
    let playerId;
    let gameSessionId;

    beforeEach(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
      const { id } = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
      gameSessionId = id;
    });

    it('does not allow game play when activation is needed', async () => {
      await pg('players').update({ activated: false }).where({ id: playerId });
      try {
        await launchGame(playerId, 1, gameSessionId, true, ({}: any), ({}: any));
        expect(true).to.equal(false);
      } catch (e) {
        expect(e.error.code).to.equal(904);
      }
    });

    describe('having bet limit set', () => {
      let sessionId;
      let manufacturerSessionId;
      beforeEach(async () => {
        await Limit.create({
          playerId,
          permanent: true,
          expires: null,
          reason: 'Player requested for weekly 300€ bet limit',
          type: 'bet',
          limitValue: 30000,
          periodType: 'weekly',
          userId: 1,
        });
        await pg.transaction(tx =>
          addTransaction(playerId, null, 'compensation', 5000, 'Added some money', 1, tx));
        const { id } = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
        manufacturerSessionId = await createManufacturerSession('NE', uuid(), id, 'desktop', {});
        sessionId = id;
        await Limit.checkLogin(playerId);
      });

      it('allows bets until limit is hit', async () => {
        const externalGameRoundId = uuid();
        const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
        await placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 20,
          externalGameRoundId,
          externalTransactionId: uuid(),
          closeRound: true,
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
        }, [{ type: 'win', amount: 400000 }]);
        try {
          await placeBet(playerId, {
            manufacturerId: 'NE',
            game,
            sessionId,
            manufacturerSessionId,
            amount: 125000,
            externalGameRoundId: uuid(),
            externalTransactionId: uuid(),
            closeRound: true,
            timestamp: new Date(),
          }, []);
          expect(true).to.equal(false);
        } catch (e) {
          expect(e.code).to.equal(10008);
        }
        const limits = await Limit.getLimitsWithCounters(playerId);
        expect(formatLimit('EUR')(limits[0])).to.match(/€300.00 per week \(€299.80 left\)\./);
      });

      it('allows bets when limit is cancelled', async () => {
        const externalGameRoundId = uuid();
        const limits = await Limit.getLimitsWithCounters(playerId);
        await Limit.cancel(limits[0].exclusionKey, false, 'Ticket #123', 1);
        const limits2 = await Limit.getLimitsWithCounters(playerId);
        expect(limits2.length).to.equal(0);
        const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
        await placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 20,
          externalGameRoundId,
          externalTransactionId: uuid(),
          closeRound: true,
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
        }, [{ type: 'win', amount: 400000 }]);
        await placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 125000,
          externalGameRoundId: uuid(),
          externalTransactionId: uuid(),
          closeRound: true,
          timestamp: new Date(),
        }, []);
      });

      it('raises limit', async () => {
        const externalGameRoundId = uuid();
        const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
        await placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 20,
          externalGameRoundId,
          externalTransactionId: uuid(),
          closeRound: true,
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
        }, [{ type: 'win', amount: 400000 }]);
        await placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 29000,
          externalGameRoundId,
          externalTransactionId: uuid(),
          closeRound: true,
          timestamp: new Date(),
        }, []);

        const limits = await Limit.getLimitsWithCounters(playerId);
        expect(limits).to.containSubset([
          {
            permanent: true,
            type: 'bet',
            limitValue: 30000,
            limit: 30000,
            amount: 29020,
            periodType: 'weekly',
            reason: 'Player requested for weekly 300€ bet limit',
          },
        ]);

        await Limit.raise(playerId, limits[0].id, 50000, 'Raising limit ticket #123123', 'weekly', 1);
        const limits2 = await Limit.getLimitsWithCounters(playerId);
        expect(limits2).to.containSubset([
          {
            permanent: false,
            type: 'bet',
            limitValue: 30000,
            limit: 30000,
            amount: 29020,
            periodType: 'weekly',
            reason: 'Player requested for weekly 300€ bet limit',
          },
        ]);
      });

      it('changes the limit immediately when raise is used to lower the limit', async () => {
        const externalGameRoundId = uuid();
        const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
        await placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 20,
          externalGameRoundId,
          externalTransactionId: uuid(),
          closeRound: true,
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
        }, [{ type: 'win', amount: 400000 }]);
        await placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 29000,
          externalGameRoundId,
          externalTransactionId: uuid(),
          closeRound: true,
          timestamp: new Date(),
        }, []);

        const limits = await Limit.getLimitsWithCounters(playerId);
        expect(limits).to.containSubset([
          {
            permanent: true,
            type: 'bet',
            limitValue: 30000,
            limit: 30000,
            amount: 29020,
            periodType: 'weekly',
            reason: 'Player requested for weekly 300€ bet limit',
          },
        ]);

        await Limit.raise(playerId, limits[0].id, 20000, 'Lowering limit ticket #123124', 'weekly', 1);
        const limits2 = await Limit.getLimitsWithCounters(playerId);
        expect(limits2).to.containSubset([
          {
            expires: null,
            permanent: true,
            type: 'bet',
            limitValue: 20000,
            limit: 20000,
            amount: 29020,
            periodType: 'weekly',
            reason: 'Lowering limit ticket #123124',
          },
        ]);
      });
    });

    describe('having expired bet limit set', () => {
      let sessionId;
      let manufacturerSessionId;
      beforeEach(async () => {
        await Limit.create({
          playerId,
          permanent: false,
          expires: moment().add(1, 'day'),
          reason: 'Player requested for weekly 300€ bet limit',
          type: 'bet',
          limitValue: 30000,
          periodType: 'weekly',
          userId: 1,
        });
        await pg.transaction(tx =>
          addTransaction(playerId, sessionId, 'compensation', 5000, 'Added some money', 1, tx));
        const { id } = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
        manufacturerSessionId = await createManufacturerSession('NE', uuid(), id, 'desktop', {});
        sessionId = id;
        await Limit.checkLogin(playerId);
      });

      it('allows bets', async () => {
        const externalGameRoundId = uuid();
        const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
        await placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 20,
          externalGameRoundId,
          externalTransactionId: uuid(),
          closeRound: true,
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
        }, [{ type: 'win', amount: 400000 }]);

        await pg('player_limits').update({ expires: moment().subtract(1, 'minute') }).where({ playerId });
        await Limit.checkLogin(playerId);

        await placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 125000,
          externalGameRoundId: uuid(),
          externalTransactionId: uuid(),
          closeRound: true,
          timestamp: new Date(),
        }, []);
      });
    });

    describe('having loss limit set', () => {
      let sessionId;
      let manufacturerSessionId;

      beforeEach(async () => {
        await Limit.create({
          playerId,
          permanent: false,
          expires: moment().add(50, 'days'),
          reason: 'Player requested for daily 300€ loss limit',
          type: 'loss',
          limitValue: 30000,
          periodType: 'daily',
          userId: 1,
        });
        await pg.transaction(tx =>
          addTransaction(playerId, sessionId, 'compensation', 500000, 'Added some money', 1, tx));
        const { id } = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
        sessionId = id;
        manufacturerSessionId = await createManufacturerSession('NE', uuid(), sessionId, 'desktop', {});
        await Limit.checkLogin(playerId);
      });

      it('allows bets until limit is hit', async () => {
        const externalGameRoundId = uuid();
        const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
        await placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 25000,
          externalGameRoundId,
          externalTransactionId: uuid(),
          closeRound: false,
          timestamp: new Date(),
        }, []);
        await Limit.checkLogin(playerId);
        await creditWin(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          externalGameRoundId,
          externalTransactionId: uuid(),
          closeRound: false,
          timestamp: new Date(),
        }, [{ type: 'win', amount: 25000 }]);
        const externalGameRoundId2 = uuid();
        await placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 25000,
          externalGameRoundId: externalGameRoundId2,
          externalTransactionId: uuid(),
          closeRound: false,
          timestamp: new Date(),
        }, []);
        await creditWin(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          externalGameRoundId: externalGameRoundId2,
          externalTransactionId: uuid(),
          closeRound: false,
          timestamp: new Date(),
        }, [{ type: 'win', amount: 0 }]);
        await Limit.checkLogin(playerId);
        try {
          await placeBet(playerId, {
            manufacturerId: 'NE',
            game,
            sessionId,
            manufacturerSessionId,
            amount: 25000,
            externalGameRoundId: uuid(),
            externalTransactionId: uuid(),
            closeRound: false,
            timestamp: new Date(),
          }, []);
          expect(true).to.equal(false);
        } catch (e) {
          expect(e.code).to.equal(10008);
        }
        const limits = await Limit.getLimitsWithCounters(playerId);
        expect(limits.length).to.equal(1);
        expect(formatLimit('EUR')(limits[0])).to.match(
          /€300.00 per day \(€50.00 left\)\. Limit is active until/,
        );
      });
    });

    describe('having cooldown period active', () => {
      beforeEach(async () => {
        const limit = await Limit.create({
          playerId,
          permanent: false,
          expires: moment().add('1', 'month'),
          reason: 'Player requested for daily 50€ deposit limit',
          type: 'deposit_amount',
          limitValue: 5000,
          periodType: 'daily',
          userId: 1,
        });
        const { transactionKey } = await startDeposit(playerId, 1, 2500);
        await processDeposit(2500, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
        await Limit.cancel(limit[0].exclusionKey, true, 'Ticket #123', 1);
      });

      it('allows deposit under the limit', async () => {
        await startDeposit(playerId, 1, 2500);
      });

      it('blocks startDeposit over limit', async () => {
        try {
          await startDeposit(playerId, 1, 2600); // 25e of 50e already of used
          expect(true).to.equal(false);
        } catch (e) {
          expect(e.error.code).to.equal(575);
        }
      });
    });

    describe('having daily deposit limit set', () => {
      beforeEach(async () => {
        await Limit.create({
          playerId,
          permanent: true,
          expires: null,
          reason: 'Player requested for daily 50€ deposit limit',
          type: 'deposit_amount',
          limitValue: 5000,
          periodType: 'daily',
          userId: 1,
        });
        await Limit.checkLogin(playerId);
      });

      it('allows deposits until limit is hit', async () => {
        const { transactionKey } = await startDeposit(playerId, 1, 2500);
        await processDeposit(2500, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
        try {
          await startDeposit(playerId, 1, 3000);
          expect(true).to.equal(false);
        } catch (e) {
          expect(e.error.code).to.equal(575);
        }
        const limits = await Limit.getLimitsWithCounters(playerId);
        expect(formatLimit('EUR')(limits[0])).to.equal('€50.00 per day (€25.00 left).');
        expect(limits).to.containSubset([
          {
            permanent: true,
            expires: null,
            type: 'deposit_amount',
            limitValue: 5000,
            limit: 5000,
            amount: 2500,
          },
        ]);
      });

      it('allows deposit when limit is expired', async () => {
        await pg('player_limits').update({ permanent: false, expires: moment().subtract(1, 'hour') }).where({ playerId });
        const limits = await Limit.getLimitsWithCounters(playerId);
        expect(limits.length).to.equal(0);
        const { transactionKey } = await startDeposit(playerId, 1, 15000);
        await processDeposit(15000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
      });
    });

    describe('having monthly deposit limit set', () => {
      beforeEach(async () => {
        await Limit.create({
          playerId,
          permanent: true,
          expires: null,
          reason: 'Player requested for monthly 50€ deposit limit',
          type: 'deposit_amount',
          limitValue: 5000,
          periodType: 'monthly',
          userId: 1,
        });
        await Limit.checkLogin(playerId);
      });

      it('allows deposits to be raised with different period type', async () => {
        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 2500);
        await processDeposit(2500, tx1, 'FI2112345600008739', null, 'external-id1', 'complete');

        const limits0 = await Limit.getLimitsWithCounters(playerId);
        const c = await Limit.raise(playerId, limits0[0].id, 50000, 'Raising limit ticket #123123', 'weekly', 1);

        await pg('player_limits').update({ createdAt: moment().subtract(11, 'day'), expires: moment().subtract(1, 'day') }).where({ id: limits0[0].id });
        await pg('player_limits').update({ createdAt: moment().subtract(1, 'day') }).where({ id: c.id });
        await pg('player_counters').update({ week: moment().subtract(1, 'day').format('YYYYWW') }).where({ limitId: c.id });
        await Limit.checkLogin(playerId);

        const limits1 = await Limit.getLimitsWithCounters(playerId);
        expect(limits1.length).to.equal(1);
        /* eslint-disable */
        // expect(formatLimit('EUR')(limits1[0])).to.match(/500,00 € per week \(475,00 € left\)\./);
        /* eslint-enable */

        const { transactionKey: tx2 } = await startDeposit(playerId, 1, 5000);
        await processDeposit(5000, tx2, 'FI2112345600008739', null, 'external-id2', 'complete');
      });
    });

    describe('having session max time set', () => {
      beforeEach(async () => {
        await Limit.create({
          playerId,
          permanent: true,
          expires: null,
          reason: 'Player requested for max 60 minute session length',
          type: 'session_length',
          limitValue: 60,
          userId: 1,
        });
        const { id } = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
        gameSessionId = id;
      });

      it('lists limit as active', async () => {
        const limits = await Limit.getLimitsWithCounters(playerId);
        expect(limits.length).to.equal(1);
      });

      it('allows game play until session max age is hit', async () => {
        await launchGame(playerId, 1, gameSessionId, false, ({}: any), ({}: any));
        await pg('sessions').update({ timestamp: moment().subtract(61, 'minutes') });
        try {
          await launchGame(playerId, 1, gameSessionId, false, ({}: any), ({}: any));
          expect(true).to.equal(false);
        } catch (e) {
          expect(e.error.code).to.equal(918);
        }
        const limits = await Limit.getLimitsWithCounters(playerId);
        expect(formatSessionLength(limits[0])).to.equal('60 minutes per session.');
      });
    });

    describe('game play not allowed', () => {
      beforeEach(async () => {
        const { id } = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
        gameSessionId = id;
        await Player.updateAccountStatus(playerId, { allowGameplay: false }, 1);
      });

      it('does not allow game to be launched', async () => {
        try {
          await launchGame(playerId, 1, gameSessionId, false, ({}: any), ({}: any));
          expect(true).to.equal(false);
        } catch (e) {
          expect(e.error.code).to.equal(903);
        }
      });
    });

    describe('having timeout limit', () => {
      beforeEach(async () => {
        await Limit.create({
          playerId,
          permanent: false,
          expires: moment().add(7, 'days'),
          reason: 'Player requested timeout for 7 days',
          type: 'timeout',
          limitValue: null,
          userId: 1,
        });
        const { id } = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
        gameSessionId = id;
      });

      it('does not allow game to be launched', async () => {
        try {
          await launchGame(playerId, 1, gameSessionId, false, ({}: any), ({}: any));
          expect(true).to.equal(false);
        } catch (e) {
          expect(e.error.code).to.equal(918);
        }
      });
    });
  });

  describe('With valid person', () => {
    let playerId1;
    let playerId2;
    let playerId3;

    const appliesToAll = async () => {
      const [[p1limit], [p2limit], [p3limit]] = await Promise.all([
        Limit.getLimitsWithCounters(playerId1),
        Limit.getLimitsWithCounters(playerId2),
        Limit.getLimitsWithCounters(playerId3),
      ]);
      expect(p1limit).to.deep.equal(p2limit);
      expect(p2limit).to.deep.equal(p3limit);
    };
    beforeEach(async () => {
      await clean.players();
      const [player, player2, player3] = await Promise.all([
        Player.create({ ...john, brandId: 'LD' }),
        Player.create({ ...john, brandId: 'CJ' }),
        Player.create({ ...john, brandId: 'KK', countryId: 'FI', languageId: 'fi' }),
      ]);
      [playerId1, playerId2, playerId3] = [player.id, player2.id, player3.id];
      await connectPlayersWithPerson(pg, playerId2, playerId1);
      await connectPlayersWithPerson(pg, playerId3, playerId1);
    });

    describe('#exclusion', () => {
      beforeEach(async () => {
        await Limit.create({
          playerId: playerId1,
          permanent: true,
          expires: null,
          reason: 'Player requested exclusion',
          type: 'exclusion',
          limitValue: null,
          userId: 1,
        });
      });

      it('self exclusion is applied to all persons', async () => appliesToAll());

      it('blocks login for all players in person', async () => {
        const p2LoginAttempt = await Limit.checkLogin(playerId2);
        expect(p2LoginAttempt.error).to.have.property('code', 511);
        const p3LoginAttempt = await Limit.checkLogin(playerId3);
        expect(p3LoginAttempt.error).to.have.property('code', 511);
      });
    });
  });
})