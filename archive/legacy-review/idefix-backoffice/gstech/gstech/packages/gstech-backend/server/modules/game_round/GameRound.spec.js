/* @flow */
const { v1: uuid } = require('uuid');
const pg = require('gstech-core/modules/pg');
const { placeBet, creditWin, cancelTransaction, getTransaction, getRoundTransactions } = require('./index');
const { refund, close } = require('./GameRound');
const { getBalance } = require('../players');
const { creditBonus, getActiveBonuses, forfeitBonus, doMaintenance } = require('../bonuses');
const { players: { john } } = require('../../../scripts/utils/db-data');
const { startDeposit, processDeposit } = require('../payments/deposits/Deposit');
const Player = require('../players/Player');
const { getWithProfile } = require('../games');
const { createSession, createManufacturerSession } = require('../sessions');
const { addTransaction } = require('../payments/Payment');
const Session = require('../sessions/Session');

describe('Game rounds', () => {
  let playerId;
  let sessionId;
  let manufacturerSessionId;
  let playerBonusId;

  beforeEach(async () => {
    await clean.players();
    playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    await processDeposit(1000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    playerBonusId = await creditBonus(1001, playerId, 1000);
    const { id } = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
    manufacturerSessionId = await createManufacturerSession('NE', uuid(), id, 'desktop', {});
    sessionId = id;
  });

  describe('when placing bets', () => {
    it('wagers bonus 100% when playing a video slot', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      const betResult = await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);
      expect(betResult).to.containSubset({
        currencyId: 'EUR',
        balance: 500,
        bonusBalance: 1000,
        bonusBalanceUsed: false,
        type: 'bet',
        ops: [{ balance: 500, bonusBalance: 1000, type: 'bet' }],
      });
      const bonuses = await getActiveBonuses(playerId);
      const [{ wageringRequirement, wagered }] = bonuses;
      expect(wagered).to.equal(500);
      expect(wageringRequirement).to.equal(50000);
    });

    it('when bet uses last bonus money and wins it credits wins as bonus money', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 1000,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 1000,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, [{ type: 'win', amount: 50000 }]);
      const bonuses = await getActiveBonuses(playerId);
      expect(bonuses.length).to.equal(1);
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(0);
      expect(bonusBalance).to.equal(50000);
    });

    it('throws an exception when currencyId is passed and does not match player currency', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      try {
        await placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 500,
          externalGameRoundId: uuid(),
          externalTransactionId: uuid(),
          closeRound: true,
          currencyId: 'SEK',
          timestamp: new Date(),
        }, []);
        expect(true).to.equal(false);
      } catch (e) {
        expect(e.message).to.equal('Invalid currency');
      }
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(1000);
      expect(bonusBalance).to.equal(1000);
    });

    it('wagers bonus 50% when playing a game with limited wagering', async () => {
      const game = await getWithProfile('LD', 'NE', 'bloodsuckers_not_mobile_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        currencyId: 'EUR',
        timestamp: new Date(),
      }, []);
      const bonuses = await getActiveBonuses(playerId);
      const [{ wageringRequirement, wagered }] = bonuses;
      expect(wagered).to.equal(250);
      expect(wageringRequirement).to.equal(50000);
    });

    it('does not wager a bonus when playing a table game', async () => {
      const game = await getWithProfile('LD', 'NE', 'baccarat2_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);
      const bonuses = await getActiveBonuses(playerId);
      const [{ wageringRequirement, wagered }] = bonuses;
      expect(wagered).to.equal(0);
      expect(wageringRequirement).to.equal(50000);
    });
  });

  describe('concurrent bets to nonexisting game round', () => {
    it('completes all bets successfully', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      const externalGameRoundId = uuid();
      const timestamp = new Date();
      const ops = [...Array(10)].map(() =>
        placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 50,
          externalGameRoundId,
          externalTransactionId: uuid(),
          closeRound: false,
          timestamp
        }, []));
      const result = await Promise.all(ops);
      expect(result).to.have.lengthOf(ops.length);
      result.forEach(x => expect(x.gameRoundId).to.equal(result[0].gameRoundId));
    });
  });

  describe('When bet is placed', () => {
    it('real money is used when available', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(500);
      expect(bonusBalance).to.equal(1000);
    });

    it('returns transaction by id', async () => {
      const txId = uuid();
      const game = await getWithProfile('LD', 'NE', 'baccarat2_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: txId,
        closeRound: true,
        timestamp: new Date(),
      }, []);

      const tx = await getTransaction(playerId, {
        manufacturerId: 'NE',
        externalTransactionId: txId,
        timestamp: new Date(),
      });
      expect(tx).to.containSubset([{
        amount: 500,
        bonusAmount: 0,
        subTransactionId: 0,
        type: 'bet',
        balance: 500,
        bonusBalance: 1000,
        currencyId: 'EUR',
      }]);
    });

    it('returns round transactions', async () => {
      const externalGameRoundId = uuid();
      const game = await getWithProfile('LD', 'NE', 'baccarat2_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId,
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);

      const transactions = await getRoundTransactions(playerId, {
        manufacturerId: 'NE',
        externalGameRoundId,
        timestamp: new Date(),
      });
      expect(transactions).to.containSubset([{
        amount: 500,
        balance: 500,
        bonusAmount: 0,
        bonusBalance: 1000,
        currencyId: 'EUR',
        subTransactionId: 0,
        type: 'bet',
      }]);
    });

    it('is idempotent on bet when reusing external transaction id', async () => {
      const externalGameRoundId = uuid();
      const externalTransactionId = uuid();
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      const result = await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId,
        externalTransactionId,
        closeRound: true,
        timestamp: new Date(),
      }, []);
      expect(result.existingTransaction).to.equal(undefined);
      const result2 = await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId,
        externalTransactionId,
        closeRound: true,
        timestamp: new Date(),
      }, []);
      expect(result2.existingTransaction).to.equal(true);
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(500);
      expect(bonusBalance).to.equal(1000);
    });

    it('can process bet and win together in one transaction', async () => {
      const externalGameRoundId = uuid();
      const externalTransactionId = uuid();
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId,
        externalTransactionId,
        closeRound: true,
        timestamp: new Date(),
      }, [{ type: 'win', amount: 5000 }]);
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(500);
      expect(bonusBalance).to.equal(6000);
    });

    it('ignores cancel when gameRoundId does not match', async () => {
      const externalGameRoundId = uuid();
      const externalTransactionId = uuid();
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId,
        externalTransactionId,
        closeRound: true,
        timestamp: new Date(),
      }, [{ type: 'win', amount: 5000 }]);
      const { transactionIds, transactionFound, invalidTransaction } = await cancelTransaction(playerId, { manufacturerId: 'NE', externalTransactionId, externalGameRoundId: 'xxx', timestamp: new Date() });
      expect(invalidTransaction).to.equal(true);
      expect(transactionFound).to.equal(false);
      expect(transactionIds).to.deep.equal([]);
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(500);
      expect(bonusBalance).to.equal(6000);
    });


    it('can cancel bet + win transaction', async () => {
      const externalGameRoundId = uuid();
      const externalTransactionId = uuid();
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId,
        externalTransactionId,
        closeRound: true,
        timestamp: new Date(),
      }, [{ type: 'win', amount: 5000 }]);
      const { transactionIds } = await cancelTransaction(playerId, { manufacturerId: 'NE', externalTransactionId, timestamp: new Date() });
      expect(transactionIds.length).to.equal(2);
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(1000);
      expect(bonusBalance).to.equal(1000);
    });

    it('can cancel bet + win transaction again with no effect', async () => {
      const externalGameRoundId = uuid();
      const externalTransactionId = uuid();
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId,
        externalTransactionId,
        closeRound: true,
        timestamp: new Date(),
      }, [{ type: 'win', amount: 5000 }]);
      const { transactionIds } = await cancelTransaction(playerId, { manufacturerId: 'NE', externalTransactionId, timestamp: new Date() });
      expect(transactionIds.length).to.equal(2);

      const { transactionIds: ids2, invalidTransaction, transactionFound } = await cancelTransaction(playerId, { manufacturerId: 'NE', externalTransactionId, timestamp: new Date() });
      expect(invalidTransaction).to.equal(false);
      expect(transactionFound).to.equal(true);
      expect(ids2.length).to.equal(2);

      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(1000);
      expect(bonusBalance).to.equal(1000);
    });

    it('can cancel noexistent bet + win transaction again with no effect', async () => {
      const externalTransactionId = uuid();
      await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      const { transactionIds, transactionFound, invalidTransaction } = await cancelTransaction(playerId, { manufacturerId: 'NE', externalTransactionId, timestamp: new Date() });
      expect(invalidTransaction).to.equal(false);
      expect(transactionFound).to.equal(false);
      expect(transactionIds.length).to.equal(0);

      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(1000);
      expect(bonusBalance).to.equal(1000);
    });

    it('can credit several win types in one transaction and cancel them', async () => {
      const externalGameRoundId = uuid();
      const externalTransactionId = uuid();
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId,
        externalTransactionId,
        closeRound: true,
        timestamp: new Date(),
      }, [{ type: 'win', amount: 5000 }, { type: 'win_local_jackpot', amount: 10123 }]);
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(500);
      expect(bonusBalance).to.equal(16123);

      const { transactionIds } = await cancelTransaction(playerId, { manufacturerId: 'NE', externalTransactionId, timestamp: new Date() });
      expect(transactionIds.length).to.equal(3);
      const { balance: balance2, bonusBalance: bonusBalance2 } = await getBalance(playerId);
      expect(balance2).to.equal(1000);
      expect(bonusBalance2).to.equal(1000);
    });

    it('starts using bonus money when no more real money', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
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

      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(0);
      expect(bonusBalance).to.equal(800);
    });

    it('allows multiple bets to be placed on single round', async () => {
      const externalGameRoundId = uuid();
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 400,
        externalGameRoundId,
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 400,
        externalGameRoundId,
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 400,
        externalGameRoundId,
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);

      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(0);
      expect(bonusBalance).to.equal(800);
    });

    it('credits winnings as bonus money when bonus is active', async () => {
      const externalGameRoundId = uuid();
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 400,
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
      }, [{ type: 'win', amount: 10000 }]);

      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(600);
      expect(bonusBalance).to.equal(11000);
    });

    it('winning credition is idempotent', async () => {
      const externalGameRoundId = uuid();
      const externalTransactionId = uuid();
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 400,
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
        externalTransactionId,
        closeRound: true,
        timestamp: new Date(),
      }, [{ type: 'win', amount: 10000 }]);
      await creditWin(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        externalGameRoundId,
        externalTransactionId,
        closeRound: true,
        timestamp: new Date(),
      }, [{ type: 'win', amount: 10000 }]);

      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(600);
      expect(bonusBalance).to.equal(11000);
    });


    it('when bonus is not available winnings are credited as real money', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 1500,
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
        amount: 300,
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
      }, [{ type: 'win', amount: 10000 }]);

      const { balance, bonusBalance } = await getBalance(playerId);
      expect(bonusBalance).to.equal(10200);
      expect(balance).to.equal(0);
    });

    it('returns an error when not enough balance for bet', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      try {
        await placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 5000,
          externalGameRoundId: uuid(),
          externalTransactionId: uuid(),
          closeRound: true,
          timestamp: new Date(),
        }, []);
      } catch (e) {
        expect(e.code).to.equal(10006);
      }

      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(1000);
      expect(bonusBalance).to.equal(1000);
    });

    it('wagerings are updated based on placed bets', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await Promise.all([
        placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 500,
          externalGameRoundId: uuid(),
          externalTransactionId: uuid(),
          closeRound: true,
          timestamp: new Date(),
        }, []),
        placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 500,
          externalGameRoundId: uuid(),
          externalTransactionId: uuid(),
          closeRound: true,
          timestamp: new Date(),
        }, []),
        placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: 500,
          externalGameRoundId: uuid(),
          externalTransactionId: uuid(),
          closeRound: true,
          timestamp: new Date(),
        }, []),
      ]);

      const { wageringRequirement, wagered } = await pg('player_bonuses')
        .first([
          pg.raw('sum("wagered") as "wagered"'),
          pg.raw('sum("wageringRequirement") as "wageringRequirement"'),
        ])
        .where({ playerId });

      expect(wageringRequirement).to.equal(50000);
      expect(wagered).to.equal(1500);
    });

    it('can close a round', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      const bet = await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: false,
        timestamp: new Date(),
      }, []);
      await close(bet.gameRoundId);
    });

    it('can refund a round', async () => {
      const { balance, bonusBalance } = await getBalance(playerId);
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      const bet = await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: false,
        timestamp: new Date(),
      }, []);

      await refund(bet.gameRoundId);
      const { balance: endBalance, bonusBalance: endBonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(endBalance);
      expect(bonusBalance).to.equal(endBonusBalance);
    });

    it('refund a round containg bonus money of forfeited bonus credits real money', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: false,
        timestamp: new Date(),
      }, []);

      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: false,
        timestamp: new Date(),
      }, []);

      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: false,
        timestamp: new Date(),
      }, []);

      const { balance, bonusBalance } = await getBalance(playerId);

      const bet = await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: false,
        timestamp: new Date(),
      }, []);
      await forfeitBonus(pg, playerId, playerBonusId);
      await refund(bet.gameRoundId);
      const { balance: endBalance, bonusBalance: endBonusBalance } = await getBalance(playerId);
      expect(endBalance).to.equal(balance + bonusBalance);
      expect(endBonusBalance).to.equal(0);
    });

    it('survives invalid state when player has bonus balance but no active bonus', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);

      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);

      await pg('player_bonuses').update({ status: 'completed', completedAt: new Date() }).where({ id: playerBonusId });

      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);

      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(bonusBalance).to.equal(0);
      expect(balance).to.equal(0);

      await pg.transaction(tx => doMaintenance(playerId, tx));

      const bonuses = await getActiveBonuses(playerId);
      expect(bonuses.length).to.equal(0);
    });

    it('survives invalid state when player has no bonus balance but has active bonus', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await pg('players').update({ bonusBalance: pg.raw('"bonusBalance" - 100') }).where({ id: playerId });
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);
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

      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(0);
      expect(bonusBalance).to.equal(0);

      await pg.transaction(tx => doMaintenance(playerId, tx));

      const bonuses = await getActiveBonuses(playerId);
      expect(bonuses.length).to.equal(0);
    });

    it('survives invalid state when player has more bonus balance than balance in active bonuses', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');

      await pg('player_bonuses').update({ balance: pg.raw('"balance" - 100') }).where({ id: playerBonusId });

      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);

      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);

      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);

      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);

      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(0);
      expect(bonusBalance).to.equal(0);

      await pg.transaction(tx => doMaintenance(playerId, tx));

      const bonuses = await getActiveBonuses(playerId);
      expect(bonuses.length).to.equal(0);
    });


    it('creates bonus lost transaction when all bonus money is used', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);

      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);

      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);

      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);

      await pg.transaction(tx => doMaintenance(playerId, tx));

      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(0);
      expect(bonusBalance).to.equal(0);
      const lost = await pg('transactions').where({ playerId, type: 'bonus_lost', playerBonusId });
      expect(lost.length).to.equal(1);
      const bonuses = await getActiveBonuses(playerId);
      expect(bonuses.length).to.equal(0);
    });


    it('wagering requirement rises when overbetting', async () => {
      await pg.transaction(tx => addTransaction(playerId, null, 'compensation', 500, 'Added some money', 1, tx));
      await creditBonus(1012, playerId, 500);
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');

      const roundId = uuid();
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 800,
        externalGameRoundId: roundId,
        externalTransactionId: uuid(),
        closeRound: false,
        timestamp: new Date(),
      }, []);
      await creditWin(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        externalGameRoundId: roundId,
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, [{ amount: 0, type: 'win' }]);

      const roundId2 = uuid();
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 800,
        externalGameRoundId: roundId2,
        externalTransactionId: uuid(),
        closeRound: false,
        timestamp: new Date(),
      }, []);
      await creditWin(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        externalGameRoundId: roundId2,
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, [{ amount: 0, type: 'win' }]);

      const roundId3 = uuid();
      await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 800,
        externalGameRoundId: roundId3,
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);
      await creditWin(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        externalGameRoundId: roundId3,
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, [{ amount: 10000, type: 'win' }]);

      const bonuses = await getActiveBonuses(playerId);
      const [{ wageringRequirement, wagered }] = bonuses;

      expect(wagered).to.equal(1500);
      // added (3/8 * 100€) * 50 = 1875 because of overbets
      expect(wageringRequirement).to.equal(237500);

      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(0);
      expect(bonusBalance).to.equal(10600);
    });

    it('converts bonus to real money when wagering has completed', async function test(this: $npm$mocha$TestDefinition) {
      this.timeout(30000);
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      const round = async (bet: any, win: any) => {
        const externalGameRoundId = uuid();
        await placeBet(playerId, {
          manufacturerId: 'NE',
          game,
          sessionId,
          manufacturerSessionId,
          amount: bet,
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
        }, [{ type: 'win', amount: win }]);
      };
      await round(1000, 0);
      await round(500, 100000);
      await Promise.all(Array(98).fill().map(() => round(500, 0)));

      const { balance, bonusBalance } = await getBalance(playerId);
      expect(bonusBalance).to.equal(0);
      expect(balance).to.equal(51500);


      const session = await Session.get(playerId, sessionId);
      expect(session.bet).to.equal(50500);
      expect(session.win).to.equal(100000);
    });
  });
});

describe('Game rounds with child game provider', () => {
  let playerId;
  let sessionId;
  let manufacturerSessionId;

  beforeEach(async () => {
    await clean.players();
    playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    await processDeposit(1000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    await creditBonus(1001, playerId, 1000);
    const { id } = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
    manufacturerSessionId = await createManufacturerSession('PGM', uuid(), id, 'desktop', {});
    sessionId = id;
  });

  describe('when placing bets', () => {
    it('wagers bonus 100% when playing a video slot', async () => {
      const game = await getWithProfile('LD', 'PGM', '292');
      expect(game).to.containSubset({
        manufacturerId: 'PGM',
        name: 'Spin Party',
      });
      const betResult = await placeBet(playerId, {
        manufacturerId: 'PGM',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 500,
        externalGameRoundId: uuid(),
        externalTransactionId: uuid(),
        closeRound: true,
        timestamp: new Date(),
      }, []);
      expect(betResult).to.containSubset({
        currencyId: 'EUR',
        balance: 500,
        bonusBalance: 1000,
        bonusBalanceUsed: false,
        type: 'bet',
        ops: [{ balance: 500, bonusBalance: 1000, type: 'bet' }],
      });
      const bonuses = await getActiveBonuses(playerId);
      const [{ wageringRequirement, wagered }] = bonuses;
      expect(wagered).to.equal(500);
      expect(wageringRequirement).to.equal(50000);
    });
  });
});
