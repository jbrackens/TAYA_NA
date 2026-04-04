/* @flow */
const { v1: uuid } = require('uuid');
const pg = require('gstech-core/modules/pg');
const { players: { john } } = require('../../../scripts/utils/db-data');
const { getDeposit, startDeposit, processDeposit } = require('../payments/deposits/Deposit');
const { createDepositWageringCounter, updateCounters, getActiveCounters, getWageringRequirementCounter } = require('./Counter');
const { placeBet, creditWin } = require('../game_round');
const { createWithdrawal } = require('../payments/withdrawals/Withdrawal');
const { findOrCreateAccount } = require('../accounts');
const { getWithProfile } = require('../games');
const { createSession, createManufacturerSession } = require('../sessions');
const { setupPromotions } = require('../promotions');
const Player = require('../players/Player');

describe('Counter', () => {
  let playerId;
  let accountId;
  let sessionId;
  let manufacturerSessionId;

  const playRound = async (gameId: string, amount: Money = 1000) => {
    const game = await getWithProfile('LD', 'NE', gameId);
    const externalGameRoundId = uuid();
    await placeBet(playerId, {
      manufacturerId: 'NE',
      game,
      sessionId,
      manufacturerSessionId,
      amount,
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
    }, [{ type: 'win', amount: 500 }]);

    await updateCounters(playerId);
  };

  describe('with a deposit', () => {
    let transactionKey;

    beforeEach(async () => {
      await clean.players();
      const player = await Player.create({ brandId: 'LD', ...john });
      playerId = player.id;
      const { id } = await createSession(player, '12.3.4.5');
      sessionId = id;
      manufacturerSessionId = await createManufacturerSession('NE', uuid(), sessionId, 'desktop', {});
      accountId = await pg.transaction(tx => findOrCreateAccount(playerId, 1, 'FI2112345600008739', null, 1, { bic: 'DABAIE2D' }, tx));
      const t = await startDeposit(playerId, 1, 2000);
      transactionKey = t.transactionKey;
      await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
      await setupPromotions(playerId);
    });

    it('counter is active until it has been fully wagered', async () => {
      await updateCounters(playerId);
      const counters = await getActiveCounters(playerId, ['deposit_wager']);
      expect(counters.length).to.equal(1);

      await playRound('junglespirit_not_mobile_sw');

      const counters2 = await getActiveCounters(playerId, ['deposit_wager']);
      expect(counters2.length).to.equal(1);

      const { amount, limit } = await getWageringRequirementCounter(playerId);
      expect(amount).to.equal(1000);
      expect(limit).to.equal(2000);

      await playRound('junglespirit_not_mobile_sw');
      const counters3 = await getActiveCounters(playerId, ['deposit_wager']);
      expect(counters3.length).to.equal(0);

      const counters4 = await getActiveCounters(playerId, ['promotion']);
      expect(counters4.length).to.equal(1);
      expect(counters4[0].amount).to.equal(2000);

      await createWithdrawal(playerId, sessionId, accountId, 1000);
    });

    it('can use campaign wagering rules for deposit', async () => {
      await pg.transaction(async (tx) => {
        const deposit = await getDeposit(transactionKey).transacting(tx);
        await createDepositWageringCounter(playerId, 4000, deposit.paymentId, 'deposit_campaign', tx);
      });
      await updateCounters(playerId);
      const counters = await getActiveCounters(playerId, ['deposit_wager', 'deposit_campaign']);
      expect(counters.length).to.equal(2);
      await playRound('junglespirit_not_mobile_sw');

      const counters2 = await getActiveCounters(playerId, ['deposit_wager', 'deposit_campaign']);
      expect(counters2.length).to.equal(2);

      const { amount, limit } = await getWageringRequirementCounter(playerId);
      expect(amount).to.equal(1000);
      expect(limit).to.equal(4000);

      await playRound('bloodsuckers_not_mobile_sw');

      const counters3 = await getActiveCounters(playerId, ['deposit_wager', 'deposit_campaign']);
      expect(counters3.length).to.equal(1);
      expect(counters3[0].amount).to.equal(1500);
      expect(counters3[0].limit).to.equal(4000);

      try {
        await createWithdrawal(playerId, sessionId, accountId, 1000);
        // Can't create withdrawal until counter has been fully wagered
        expect(true).to.be.false();
      } catch (e) {
        expect(e.error.message).to.equal('Unable to create withdrawal - all wagering requirements are not met');
      }
    });
  });

  describe('with multiple deposits', () => {
    let transactionKey;
    let txKey2;

    beforeEach(async () => {
      await clean.players();
      const player = await Player.create({ brandId: 'LD', ...john });
      playerId = player.id;
      const { id } = await createSession(player, '12.3.4.5');
      sessionId = id;
      manufacturerSessionId = await createManufacturerSession('NE', uuid(), sessionId, 'desktop', {});

      const d = await startDeposit(playerId, 1, 2000);
      transactionKey = d.transactionKey;
      await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');

      const d2 = await startDeposit(playerId, 1, 2000);
      txKey2 = d2.transactionKey;
      await processDeposit(2000, txKey2, 'FI2112345600008739', null, 'external-id2', 'complete');
    });

    it('wagers only one counter at a time when placing a bet', async () => {
      const { amount, limit } = await getWageringRequirementCounter(playerId);
      expect(amount).to.equal(0);
      expect(limit).to.equal(4000);

      await playRound('junglespirit_not_mobile_sw');

      const { amount: amount2, limit: limit2 } = await getWageringRequirementCounter(playerId);
      expect(amount2).to.equal(1000);
      expect(limit2).to.equal(4000);
    });

    it('can use campaign wagering rules for deposit', async () => {
      await pg.transaction(async (tx) => {
        const deposit = await getDeposit(transactionKey).transacting(tx);
        await createDepositWageringCounter(playerId, 4000, deposit.paymentId, 'deposit_campaign', tx);
      });
      await pg.transaction(async (tx) => {
        const deposit2 = await getDeposit(txKey2).transacting(tx);
        await createDepositWageringCounter(playerId, 4000, deposit2.paymentId, 'deposit_campaign', tx);
      });
      await updateCounters(playerId);
      const counters = await getActiveCounters(playerId, ['deposit_wager', 'deposit_campaign']);
      expect(counters.length).to.equal(4);
      await playRound('junglespirit_not_mobile_sw');

      const counters2 = await getActiveCounters(playerId, ['deposit_wager', 'deposit_campaign']);
      expect(counters2.length).to.equal(4);

      const { amount, limit } = await getWageringRequirementCounter(playerId);
      expect(amount).to.equal(1000);
      expect(limit).to.equal(8000);

      await playRound('bloodsuckers_not_mobile_sw');

      const counters3 = await getActiveCounters(playerId, ['deposit_wager']);
      expect(counters3.length).to.equal(1);
      expect(counters3[0].amount).to.equal(0);
      expect(counters3[0].limit).to.equal(2000);

      const counters4 = await getActiveCounters(playerId, ['deposit_campaign']);
      expect(counters4.length).to.equal(2);
      expect(counters4[0].amount).to.equal(1500);
      expect(counters4[0].limit).to.equal(4000);

      try {
        await createWithdrawal(playerId, sessionId, accountId, 1000);
        // Can't create withdrawal until counter has been fully wagered
        expect(true).to.be.false();
      } catch (e) {
        expect(e.error.message).to.equal('Unable to create withdrawal - all wagering requirements are not met');
      }
    });
  });

  describe('with multiple small deposits', () => {
    beforeEach(async () => {
      await clean.players();
      const player = await Player.create({ brandId: 'LD', ...john });
      playerId = player.id;
      const { id } = await createSession(player, '12.3.4.5');
      sessionId = id;
      manufacturerSessionId = await createManufacturerSession('NE', uuid(), sessionId, 'desktop', {});

      const { transactionKey } = await startDeposit(playerId, 1, 2000);
      await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');

      const { transactionKey: txKey2 } = await startDeposit(playerId, 1, 2000);
      await processDeposit(2000, txKey2, 'FI2112345600008739', null, 'external-id2', 'complete');

      const { transactionKey: txKey3 } = await startDeposit(playerId, 1, 2000);
      await processDeposit(2000, txKey3, 'FI2112345600008730', null, 'external-id3', 'complete');

      const { transactionKey: txKey4 } = await startDeposit(playerId, 1, 2000);
      await processDeposit(2000, txKey4, 'FI2112345600008731', null, 'external-id4', 'complete');

      const { transactionKey: txKey5 } = await startDeposit(playerId, 1, 2000);
      await processDeposit(2000, txKey5, 'FI2112345600008732', null, 'external-id5', 'complete');
    });


    it('wagers all amount even when bet is larger than counter value', async () => {
      const { amount, limit } = await getWageringRequirementCounter(playerId);
      expect(amount).to.equal(0);
      expect(limit).to.equal(10000);

      await playRound('junglespirit_not_mobile_sw', 8500);

      const { amount: amount2, limit: limit2 } = await getWageringRequirementCounter(playerId);
      expect(amount2).to.equal(500);
      expect(limit2).to.equal(2000);
    });
  });

  describe('for tournaments', () => {
    let promotionId;

    beforeEach(async () => {
      await clean.players();
      const player = await Player.create({ brandId: 'LD', ...john });
      playerId = player.id;
      const { id } = await createSession(player, '12.3.4.5');
      sessionId = id;
      manufacturerSessionId = await createManufacturerSession('NE', uuid(), sessionId, 'desktop', {});

      const { transactionKey } = await startDeposit(playerId, 1, 6000);
      await processDeposit(6000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    });

    afterEach(async () => await pg('promotions').del().where({ id: promotionId }));

    it('works', async () => {
      const [p] = await pg('promotions')
        .insert({ brandId: 'LD', name: 'tournament', autoStart: true, calculateRounds: true })
        .returning('id');
      expect(p.id).to.exist();
      promotionId = p.id;
      await setupPromotions(playerId);

      await playRound('junglespirit_not_mobile_sw');

      const [counter] = await pg('player_counters').where({ promotionId, playerId });
      expect(counter).to.containSubset({
        type: 'promotion',
        amount: 100,
      });
    });

    it('works with minimumContribution', async () => {
      const [p] = await pg('promotions')
        .insert({
          brandId: 'LD',
          name: 'tournament',
          autoStart: true,
          calculateRounds: true,
          minimumContribution: 2000,
        })
        .returning('id');
      expect(p.id).to.exist();
      promotionId = p.id;
      await setupPromotions(playerId);
      const counterQuery = pg('player_counters').where({ promotionId, playerId });

      await playRound('junglespirit_not_mobile_sw');

      const [counter] = await counterQuery;
      expect(counter.amount).to.equal(0);

      await playRound('junglespirit_not_mobile_sw', 3000);

      const [counter2] = await counterQuery;
      expect(counter2.amount).to.equal(100);

      await playRound('junglespirit_not_mobile_sw', 3000);

      const [counter3] = await counterQuery;
      expect(counter3.amount).to.equal(200);
    });

    it('works for wins', async () => {
      const [p] = await pg('promotions')
        .insert({
          brandId: 'LD',
          name: 'tournament',
          autoStart: true,
          calculateRounds: false,
          calculateWins: true,
        })
        .returning('id');
      expect(p.id).to.exist();
      promotionId = p.id;
      await setupPromotions(playerId);
      const counterQuery = pg('player_counters').where({ promotionId, playerId });

      await playRound('junglespirit_not_mobile_sw');

      const [counter] = await counterQuery;
      expect(counter).to.deep.containSubset({
        type: 'promotion_wins',
        amount: 500,
      });

      await playRound('junglespirit_not_mobile_sw', 2000);

      const [{ amount }] = await counterQuery;
      expect(amount).to.equal(1000);
    });

    it('works for wins ratio', async () => {
      const [p] = await pg('promotions')
        .insert({ brandId: 'LD', name: 'tournament', autoStart: true, calculateWinsRatio: true })
        .returning('id');
      expect(p.id).to.exist();
      promotionId = p.id;
      await setupPromotions(playerId);
      const counterQuery = pg('player_counters').where({ promotionId, playerId });

      await playRound('junglespirit_not_mobile_sw');

      const [counter] = await counterQuery;
      expect(counter).to.deep.containSubset({
        type: 'promotion_wins_ratio',
        amount: 50,
      });

      await playRound('junglespirit_not_mobile_sw', 2000);

      let [{ amount }] = await counterQuery;
      expect(amount).to.equal(50);

      await playRound('junglespirit_not_mobile_sw', 500);

      [{ amount }] = await counterQuery;
      expect(amount).to.equal(100);
    })
  });
});
