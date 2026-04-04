/* @flow */
const moment = require('moment-timezone');
const { v1: uuid } = require('uuid');
const pg = require('gstech-core/modules/pg');
const errors = require('gstech-core/modules/errors/wallet-error-codes');
const { players: { john } } = require('../../../scripts/utils/db-data');
const { addTransaction } = require('../payments/Payment');
const { getBalance } = require('../players');
const { creditBonus } = require('../bonuses');
const Player = require('../players/Player');
const { getTransactions, cancelTransaction, getSummary, getTransactionsCount } = require('./Transaction');
const { startDeposit, processDeposit } = require('../payments/deposits/Deposit');
const { placeBet, creditWin } = require('../game_round');
const { createSession, createManufacturerSession } = require('../sessions');
const { getWithProfile, getTopGames } = require('../games/Game');
const PlayerGameSummaryUpdateJob = require('../reports/jobs/PlayerGameSummaryUpdateJob');

describe('Transactions', () => {
  describe('with real money', () => {
    let playerId;
    before(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
    });

    it('can create compensation on account and balance is updated', async () => {
      await pg.transaction(tx => addTransaction(playerId, null, 'compensation', 5000, 'Play money', 1, tx));
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(5000);
      expect(bonusBalance).to.equal(0);
    });

    it('can deposit and place bets', async () => {
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
        timestamp: new Date() },
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

    it('can cancel bet transaction and balance is reset back', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      const { balance, bonusBalance } = await getBalance(playerId);
      const { id: sessionId } = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
      const manufacturerSessionId = await createManufacturerSession('NE', uuid(), sessionId);
      const externalTransactionId = uuid();
      const { transactionId } = await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 400,
        externalGameRoundId: uuid(),
        externalTransactionId,
        closeRound: false,
        timestamp: new Date(),
      }, []);
      await pg.transaction(tx => cancelTransaction(transactionId, null, tx));
      await pg.transaction(tx => cancelTransaction(transactionId, null, tx));

      const { balance: balance2, bonusBalance: bonusBalance2 } = await getBalance(playerId);
      expect(balance).to.equal(balance2);
      expect(bonusBalance).to.equal(bonusBalance2);
    });

    it('returns transactions for given date', async () => {
      const transactions = await getTransactions(playerId, { startDate: moment(), endDate: moment() });
      expect(transactions).to.containSubset([
        {
          type: 'cancel_bet',
          amount: 400,
          bonusAmount: 0,
          realBalance: 4800,
          bonusBalance: 11000,
          description: 'Jungle Spirit',
          closed: false,
        },
        {
          type: 'bet',
          amount: 400,
          bonusAmount: 0,
          realBalance: 4400,
          bonusBalance: 11000,
          description: 'Jungle Spirit',
          closed: false,
        },
        {
          type: 'bet',
          amount: 400,
          bonusAmount: 0,
          realBalance: 4800,
          bonusBalance: 11000,
          description: 'Jungle Spirit',
          closed: true,
        },
        {
          type: 'win',
          amount: 0,
          bonusAmount: 10000,
          realBalance: 5200,
          bonusBalance: 11000,
          description: 'Jungle Spirit',
          closed: true,
        },
        {
          type: 'bet',
          amount: 400,
          bonusAmount: 0,
          realBalance: 5200,
          bonusBalance: 1000,
          description: 'Jungle Spirit',
          closed: true,
        },
        {
          type: 'bet',
          amount: 400,
          bonusAmount: 0,
          realBalance: 5600,
          bonusBalance: 1000,
          description: 'Jungle Spirit',
        },
        {
          type: 'bonus_credit',
          amount: 0,
          bonusAmount: 1000,
          realBalance: 6000,
          bonusBalance: 1000,
          externalTransactionId: null,
          bonus: 'LD_FIRST_DEPOSIT',
        },
        {
          type: 'wallet_deposit',
          amount: 1000,
          bonusAmount: 0,
          realBalance: 6000,
          bonusBalance: 0,
          externalTransactionId: 'external-id1',
          description: 'BankTransfer/Entercash',
        },
        {
          type: 'wallet_compensation',
          amount: 5000,
          bonusAmount: 0,
          realBalance: 5000,
          bonusBalance: 0,
          reservedBalance: 0,
          externalTransactionId: null,
        },
      ]);
    });

    it('returns transactions for given date with paging', async () => {
      const transactions = await getTransactions(playerId, { startDate: moment(), endDate: moment() }, { pageIndex: 0, pageSize: 3 });
      expect(transactions).to.containSubset([
        {
          type: 'cancel_bet',
          amount: 400,
          bonusAmount: 0,
          realBalance: 4800,
          bonusBalance: 11000,
          description: 'Jungle Spirit',
          closed: false,
        },
        {
          type: 'bet',
          amount: 400,
          bonusAmount: 0,
          realBalance: 4400,
          bonusBalance: 11000,
          description: 'Jungle Spirit',
          closed: false,
        },
        {
          type: 'bet',
          amount: 400,
          bonusAmount: 0,
          realBalance: 4800,
          bonusBalance: 11000,
          description: 'Jungle Spirit',
          closed: true,
        },
      ]);
    });

    it('returns transactions for given date with sorting by date', async () => {
      const transactions = await getTransactions(
        playerId,
        { startDate: moment(), endDate: moment() },
        undefined,
        { sortBy: 'date', sortDirection: 'DESC' },
      );
      expect(transactions).to.containSubset([
        {
          type: 'cancel_bet',
          amount: 400,
          bonusAmount: 0,
          realBalance: 4800,
          bonusBalance: 11000,
          description: 'Jungle Spirit',
          closed: false,
        },
        {
          type: 'bet',
          amount: 400,
          bonusAmount: 0,
          realBalance: 4400,
          bonusBalance: 11000,
          description: 'Jungle Spirit',
          closed: false,
        },
        {
          type: 'bet',
          amount: 400,
          bonusAmount: 0,
          realBalance: 4800,
          bonusBalance: 11000,
          description: 'Jungle Spirit',
          closed: true,
        },
      ]);
    });

    it('returns transactions for given date page index and page size', async () => {
      const transactions = await getTransactions(playerId, { startDate: moment(), endDate: moment() }, { pageIndex: 1, pageSize: 3 });
      expect(transactions).to.containSubset([
        {
          type: 'win',
          amount: 0,
          bonusAmount: 10000,
          realBalance: 5200,
          bonusBalance: 11000,
          description: 'Jungle Spirit',
          closed: true,
        },
        {
          type: 'bet',
          amount: 400,
          bonusAmount: 0,
          realBalance: 5200,
          bonusBalance: 1000,
          description: 'Jungle Spirit',
          closed: true,
        },
        {
          type: 'bet',
          amount: 400,
          bonusAmount: 0,
          realBalance: 5600,
          bonusBalance: 1000,
          description: 'Jungle Spirit',
        },
      ]);
    });

    it('returns transaction summary for given date range', async () => {
      const transactions = await getSummary(playerId, moment(), moment());
      expect(transactions).to.deep.equal([
        {
          name: 'Jungle Spirit',
          manufacturer: 'NetEnt',
          realBets: 1600,
          bonusBets: 0,
          realWins: 0,
          bonusWins: 10000,
          betCount: '4',
          averageBet: 400,
          biggestWin: 10000,
        },
      ]);
    });

    it('returns top games for player', async () => {
      await PlayerGameSummaryUpdateJob.update(new Date());
      const topGames = await getTopGames(playerId, moment().add(1, 'days'));
      expect(topGames).to.deep.equal([
        'junglespirit',
      ]);
    });

    it('can create correction with negative value and balance is updated', async () => {
      const { balance: balance2, bonusBalance: bonusBalance2 } = await getBalance(playerId);
      await pg.transaction(async (tx) => {
        await addTransaction(playerId, null, 'correction', -500, 'Transaction fee', null, tx);
        await addTransaction(playerId, null, 'correction', 250, 'Transaction refund 1', null, tx);
        await addTransaction(playerId, null, 'correction', 250, 'Transaction refund 2', null, tx);
      });
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(balance2);
      expect(bonusBalance).to.equal(bonusBalance2);
    });

    it('can cancel bet transaction with transactionId', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      const { balance, bonusBalance } = await getBalance(playerId);
      const { id: sessionId } = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
      const manufacturerSessionId = await createManufacturerSession('NE', uuid(), sessionId);
      const externalTransactionId = uuid();
      const { transactionId } = await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 400,
        externalGameRoundId: uuid(),
        externalTransactionId,
        closeRound: false,
        timestamp: new Date(),
      }, []);
      const id = uuid();
      await pg.transaction(tx => cancelTransaction(transactionId, id, tx));
      await pg.transaction(tx => cancelTransaction(transactionId, id, tx));

      const { balance: balance2, bonusBalance: bonusBalance2 } = await getBalance(playerId);
      expect(balance).to.equal(balance2);
      expect(bonusBalance).to.equal(bonusBalance2);
    });

    it('throws an error when trying to cancel transaction with two different ids', async () => {
      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
      const { id: sessionId } = await createSession({ id: playerId, brandId: 'LD' }, '1.2.3.4');
      const manufacturerSessionId = await createManufacturerSession('NE', uuid(), sessionId);
      const externalTransactionId = uuid();
      const { transactionId } = await placeBet(playerId, {
        manufacturerId: 'NE',
        game,
        sessionId,
        manufacturerSessionId,
        amount: 400,
        externalGameRoundId: uuid(),
        externalTransactionId,
        closeRound: false,
        timestamp: new Date(),
      }, []);

      await pg.transaction(tx => cancelTransaction(transactionId, uuid(), tx));
      try {
        await pg.transaction(tx => cancelTransaction(transactionId, uuid(), tx));
        throw new Error();
      } catch (e) {
        expect(e.code).to.equal(errors.CANCEL_FAILED.code);
      }
    });

    it('returns transaction count by player', async () => {
      const transactionsCount = await getTransactionsCount(pg, playerId);
      expect(transactionsCount).to.be.equal(16);

      await pg.transaction(async (tx) => {
        await addTransaction(playerId, null, 'correction', 400, 'Transaction refund 2', null, tx);
      });

      const transactionsCount3 = await getTransactionsCount(pg, playerId);
      expect(transactionsCount3).to.be.equal(17);

      const game = await getWithProfile('LD', 'NE', 'junglespirit_not_mobile_sw');
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
        closeRound: false,
        timestamp: new Date(),
      }, []);

      const transactionsCount2 = await getTransactionsCount(pg, playerId);
      expect(transactionsCount2).to.be.equal(18);
    });
  });

  describe('with bonus money', () => {
    let playerId;
    beforeEach(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
    });

    it('can create bonus on account and balance is updated', async () => {
      await creditBonus(1001, playerId, 5000);
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(0);
      expect(bonusBalance).to.equal(5000);
    });
  });
});
