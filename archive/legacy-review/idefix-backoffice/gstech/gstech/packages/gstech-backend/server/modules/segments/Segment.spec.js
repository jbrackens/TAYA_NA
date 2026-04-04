/* @flow */
const { v1: uuid } = require('uuid');
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const { players: { testPlayer } } = require('../../../scripts/utils/db-data');
const { updateSegments, getPlayerSegments, dailyUpdateSegmentsHandler } = require('./Segment');
const Player = require('../players/Player');
const { startDeposit, processDeposit } = require('../payments/deposits/Deposit');
const { placeBet, creditWin } = require('../game_round');
const { createSession, createManufacturerSession } = require('../sessions');
const { getWithProfile } = require('../games');
const Limit = require('../limits');

describe('Segments', function(this: $npm$mocha$ContextDefinition) {
  this.timeout(300000);
  describe('player with bad session', () => {
    let playerId;
    let sessionId;

    before(async () => {
      await clean.players();
      const player = await Player.create(testPlayer({ brandId: 'LD' }));
      playerId = player.id;
      const session = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
      sessionId = session.id;
      const { transactionKey } = await startDeposit(playerId, 1, 2000, null, {}, null, sessionId);
      await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
      const externalGameRoundId = uuid();
      const { id } = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
      const manufacturerSessionId = await createManufacturerSession('NE', uuid(), id, 'desktop', {});
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId: id,
        manufacturerSessionId,
        amount: 1950,
        externalGameRoundId,
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);
      await creditWin(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId: id,
        manufacturerSessionId,
        externalGameRoundId,
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, [{ type: 'win', amount: 0 }]);
    });

    it('updates player segments', async () => {
      const updated: Id[] = [];
      await updateSegments(updated);
      expect(updated).to.deep.equal([playerId]);
      const segments = await getPlayerSegments(playerId);
      expect(segments).to.deep.equalInAnyOrder(['depleted', 'bad_session', 'active_low', 'active_cumulative_low', 'last_depo_casual', 'level-1-rookie']);
    });

    it('does not update anything on second run', async () => {
      const updated: Id[] = [];
      await updateSegments(updated);
      expect(updated).to.deep.equal([]);
      const segments = await getPlayerSegments(playerId);
      expect(segments).to.deep.equalInAnyOrder(['depleted', 'bad_session', 'active_low', 'active_cumulative_low', 'last_depo_casual', 'level-1-rookie']);
    });

    it('removes from segment', async () => {
      const { transactionKey } = await startDeposit(playerId, 1, 2000, null, {}, null, sessionId);
      await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id2', 'complete');
      const updated: Id[] = [];
      await updateSegments(updated);
      expect(updated).to.deep.equal([playerId]);
      const segments = await getPlayerSegments(playerId);
      expect(segments).to.deep.equalInAnyOrder(['active_low', 'active_cumulative_low', 'last_depo_casual', 'level-1-rookie']);
    });
  });

  describe('player with highroller deposit', () => {
    let playerId;
    let sessionId;

    before(async () => {
      await clean.players();
      const player = await Player.create(testPlayer({ brandId: 'LD' }));
      playerId = player.id;
      const session = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
      sessionId = session.id;

      const { transactionKey } = await startDeposit(playerId, 1, 25000, null, {}, null, sessionId);
      await processDeposit(25000, transactionKey, 'FI2112345600008740', null, 'external-id1', 'complete');
    });

    it('updates player segments', async () => {
      const updated: Id[] = [];
      await updateSegments(updated);
      expect(updated).to.deep.equal([playerId]);
      const segments = await getPlayerSegments(playerId);
      expect(segments).to.deep.equalInAnyOrder([
        'singledeposit250',
        'singledeposit250_30',
        'singledeposit250_60',
        'singledeposit250_90',
        'active_medium',
        'active_cumulative_low',
        'last_depo_potential_highroller',
        'level-2-regular',
      ]);
    });

    it('does not update anything on second run', async () => {
      const updated: Id[] = [];
      await updateSegments(updated);
      expect(updated).to.deep.equal([]);
      const segments = await getPlayerSegments(playerId);
      expect(segments).to.deep.equalInAnyOrder([
        'singledeposit250',
        'singledeposit250_30',
        'singledeposit250_60',
        'singledeposit250_90',
        'active_medium',
        'active_cumulative_low',
        'last_depo_potential_highroller',
        'level-2-regular',
      ]);
    });
  });

  describe('churned player with highroller deposit', () => {
    let playerId;
    let sessionId;

    before(async () => {
      await clean.players();
      const player = await Player.create(testPlayer({ brandId: 'LD' }));
      playerId = player.id;
      const session = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
      sessionId = session.id;

      const { transactionKey } = await startDeposit(playerId, 1, 25000, null, {}, null, sessionId);
      await processDeposit(25000, transactionKey, 'FI2112345600008740', null, 'external-id1', 'complete');
      await pg('payments').update({ timestamp: moment().subtract(4, 'months') }).where({ transactionKey });
    });

    it('updates player segments', async () => {
      const updated: Id[] = [];
      await updateSegments(updated);
      expect(updated).to.deep.equal([playerId]);
      const segments = await getPlayerSegments(playerId);
      expect(segments).to.deep.equalInAnyOrder(['churned', 'singledeposit250', 'last_depo_potential_highroller', 'level-2-regular']);
    });
  });

  describe('player with active selfexclusion', () => {
    let playerId;

    before(async () => {
      await clean.players();
      const player = await Player.create(testPlayer({ brandId: 'LD' }));
      playerId = player.id;
      await Limit.create({ playerId, permanent: true, reason: 'Test', type: 'exclusion', userId: null, limitValue: null, expires: null });
      await Limit.create({ playerId, permanent: true, limitValue: 1000, periodType: 'weekly', reason: 'Test', type: 'bet', userId: null, expires: null });
      await Limit.updateCounters(playerId);
    });

    it('updates player segments', async () => {
      const updated: Id[] = [];
      await updateSegments(updated);
      expect(updated).to.deep.equal([playerId]);
      const segments = await getPlayerSegments(playerId);
      expect(segments).to.deep.equalInAnyOrder(['selfexcluded']);
    });
  });

  describe('player with limit full', () => {
    let playerId;

    before(async () => {
      await clean.players();
      const player = await Player.create(testPlayer({ brandId: 'CJ' }));
      playerId = player.id;
      await Limit.create({ playerId, permanent: true, reason: 'Test', type: 'exclusion', userId: null, limitValue: null, expires: null });
      await Limit.create({ playerId, permanent: true, limitValue: 1000, periodType: 'weekly', reason: 'Test', type: 'bet', userId: null, expires: null });
      await Limit.updateCounters(playerId);
      await pg('player_counters').update({ amount: 1000 }).where({ type: 'bet', playerId });
    });

    it('updates player segments', async () => {
      const updated: Id[] = [];
      await updateSegments(updated);
      expect(updated).to.deep.equal([playerId]);
      const segments = await getPlayerSegments(playerId);
      expect(segments).to.deep.equalInAnyOrder(['selfexcluded', 'level-1', 'limit']);
    });
  });

  describe('Check Activity segments at new Player', () => {
    let playerId;

    before(async () => {
      await clean.players();
      const player = await Player.create(testPlayer({ brandId: 'LD' }));
      playerId = player.id;
    });

    it('Daily segment updating - new Player should have active segment', async () => {
      const updated: Id[] = [];
      await dailyUpdateSegmentsHandler(updated);
      expect(updated).to.deep.equal([playerId]);
      const segments = await getPlayerSegments(playerId);
      expect(segments).to.deep.equalInAnyOrder(['active']);
    });

    it('Daily segment updating - existing player asleep longtime', async () => {
      await pg('players').update({ lastLogin: moment().subtract(2, 'months') }).where({ id: playerId });
      const updated: Id[] = [];
      await dailyUpdateSegmentsHandler(updated);
      expect(updated).to.deep.equal([playerId]);
      const segments = await getPlayerSegments(playerId);
      expect(segments).to.deep.equalInAnyOrder(['lapsed']);
    });
  });
});
