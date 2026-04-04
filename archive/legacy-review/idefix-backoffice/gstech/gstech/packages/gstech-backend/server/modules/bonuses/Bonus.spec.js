/* @flow */
const pg = require('gstech-core/modules/pg');
const { getBalance } = require('../players');
const { players: { john } } = require('../../../scripts/utils/db-data');
const { expireBonus, getExpiredBonuses, creditBonus, getActiveBonuses, getAvailableDepositBonuses, forfeitBonus, getBonuses, doMaintenance, giveBonus } = require('./Bonus');
const Player = require('../players/Player');
const { startDeposit, processDeposit } = require('../payments/deposits/Deposit');

describe('Bonuses', () => {
  describe('when no active bonus', () => {
    let playerId;

    beforeEach(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
    });

    it('does not credit bonus over limit', async () => {
      await creditBonus(1012, playerId, 500000, 1);
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(0);
      expect(bonusBalance).to.equal(20000);
      const bonuses = await getActiveBonuses(playerId);
      expect(bonuses.length).to.equal(1);
    });

    it('turns bonus with zero wagering immediately to real money', async () => {
      await creditBonus(1013, playerId, 5000, 1);
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(5000);
      expect(bonusBalance).to.equal(0);
      const bonuses = await getActiveBonuses(playerId);
      expect(bonuses.length).to.equal(0);
    });
    it('ignores try to credit bonus with creditOnce flag again', async () => {
      await creditBonus(1014, playerId, 500, 1);
      try {
        await creditBonus(1014, playerId, 500, 1);
        expect(false).to.be.true();
      } catch (e) {
        expect(e.message).to.equal('bonusId is invalid');
      }
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(500);
      expect(bonusBalance).to.equal(0);
      const bonuses = await getActiveBonuses(playerId);
      expect(bonuses.length).to.equal(0);
    });
  });

  describe('when no active bonus', () => {
    let playerId;

    before(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
    });

    it('lists available bonuses', async () => {
      const bonuses = await getAvailableDepositBonuses(playerId);
      expect(bonuses.length).to.equal(1);
      const [bonus] = bonuses;
      expect(bonus.name).to.equal('LD_FIRST_DEPOSIT');
      expect(bonus.minAmount).to.equal(2000);
      expect(bonus.maxAmount).to.equal(20000);
      expect(bonus.depositMatchPercentage).to.equal(100);
    });

    it('does not allow bonus when not available', async () => {
      try {
        await startDeposit(playerId, 1, 3000, 1012);
        expect(true).to.be.false();
      } catch (e) {
        expect(e.error.message).to.equal('bonusId is invalid');
      }
    });

    it('bonus can be given', async () => {
      await giveBonus(playerId, 1012, 1);
      const bonuses = await getAvailableDepositBonuses(playerId);
      expect(bonuses.length).to.equal(2);
      expect(bonuses).to.containSubset([
        { name: 'LD_FIRST_DEPOSIT', id: 1001 },
        { name: 'DEPOSIT_OFFER_TEST', id: 1012 },
      ]);
    });

    it('ignores when active bonus is given again', async () => {
      await giveBonus(playerId, 1012, 1);
      const bonuses = await getAvailableDepositBonuses(playerId);
      expect(bonuses.length).to.equal(2);
      expect(bonuses).to.containSubset([
        { name: 'LD_FIRST_DEPOSIT', id: 1001 },
        { name: 'DEPOSIT_OFFER_TEST', id: 1012 },
      ]);
    });

    it('credits selected bonus on deposit', async () => {
      const { transactionKey } = await startDeposit(playerId, 1, 300000, 1012);
      await processDeposit(300000, transactionKey, 'FI2112345600008739', null, 'external-id2', 'complete');
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(300000);
      expect(bonusBalance).to.equal(20000);
      const bonuses = await getActiveBonuses(playerId);
      expect(bonuses).to.containSubset([
        { balance: 20000, wagered: 0, wageringRequirement: 100000, initialBalance: 20000 },
      ]);
    });

    it('given bonus is not available after deposit', async () => {
      const bonuses = await getAvailableDepositBonuses(playerId);
      expect(bonuses.length).to.equal(1);
      expect(bonuses[0].name).to.equal('LD_SECOND_DEPOSIT');
    });

    it('reload bonus is available for next deposits', async () => {
      const { transactionKey } = await startDeposit(playerId, 1, 300000);
      await processDeposit(300000, transactionKey, 'FI2112345600008739', null, 'external-id3', 'complete');
      const bonuses = await getAvailableDepositBonuses(playerId);
      expect(bonuses.length).to.equal(1);
      expect(bonuses[0].name).to.equal('LD_MONTHLY_RELOAD');

      const { transactionKey: txKey2 } = await startDeposit(playerId, 1, 300000, 1016);
      await processDeposit(300000, txKey2, 'FI2112345600008739', null, 'external-id4', 'complete');
      const bonuses2 = await getAvailableDepositBonuses(playerId);
      expect(bonuses2.length).to.equal(0);
    });
  });

  describe('with active bonus', () => {
    let playerBonusId;
    let playerId;

    beforeEach(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
      playerBonusId = await creditBonus(1001, playerId, 5000, 1);
    });

    it('lists available bonuses when bonus is used', async () => {
      const bonuses = await getAvailableDepositBonuses(playerId);
      expect(bonuses.length).to.equal(0);
    });

    it('lists active bonuses', async () => {
      const bonuses = await getActiveBonuses(playerId);
      expect(bonuses.length).to.equal(1);
      const [bonus] = bonuses;
      expect(bonus.balance).to.equal(5000);
      expect(bonus.wagered).to.equal(0);
    });

    it('small bonus conversion does not affect bonuses', async () => {
      await pg.transaction(tx => doMaintenance(playerId, tx));
      const bonuses = await getActiveBonuses(playerId);
      expect(bonuses.length).to.equal(1);
      const [bonus] = bonuses;
      expect(bonus.balance).to.equal(5000);
      expect(bonus.wagered).to.equal(0);
    });

    it('updates balances when bonus active', async () => {
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(0);
      expect(bonusBalance).to.equal(5000);
    });

    it('removes bonus balance when bonus is forfeited', async () => {
      await forfeitBonus(pg, playerId, playerBonusId);
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(0);
      expect(bonusBalance).to.equal(0);
    });

    it('lists expired bonuses', async () => {
      const bonuses = await getExpiredBonuses();
      expect(bonuses.length).to.equal(0);
    });

    it('returns an error when trying to expire nonexpired bonus', async () => {
      try {
        await expireBonus(playerBonusId);
        expect(true).to.be.false();
      } catch (e) {
        expect(e.message).to.equal('Unable to expire bonus - not active');
      }
    });
    // TODO test expire bonus

    it('returns an error when trying to forfeit bonus twice', async () => {
      await forfeitBonus(pg, playerId, playerBonusId);
      try {
        await forfeitBonus(pg, playerId, playerBonusId);
        expect(true).to.be.false();
      } catch (e) {
        expect(e.message).to.equal('Unable to forfeit bonus - not active');
      }

      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(0);
      expect(bonusBalance).to.equal(0);
    });

    it('returns log of all player bonuses', async () => {
      const bonuses = await getBonuses(playerId);
      expect(bonuses).to.containSubset([
        {
          balance: 5000,
          name: 'LD_FIRST_DEPOSIT',
          creditedBy: 'Test',
          bonusId: 1001,
          wagered: 0,
          wageringRequirement: 250000,
          initialBalance: 5000,
          status: 'active',
        },
      ]);
    });
  });

  describe('with tiny active bonus', () => {
    let playerId;

    beforeEach(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
      await creditBonus(1001, playerId, 200, 1);
    });

    it('bonus balance is as set before conversion', async () => {
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(0);
      expect(bonusBalance).to.equal(200);
    });

    it('small bonus conversion converts money to real', async () => {
      await pg.transaction(tx => doMaintenance(playerId, tx));
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(200);
      expect(bonusBalance).to.equal(0);
    });
  });

  describe('with tiny active bonus with SEK', () => {
    let playerId;

    beforeEach(async () => {
      await clean.players();
      playerId = await Player.create({ ...john, brandId: 'LD', currencyId: 'SEK' }).then(({ id }) => id);
      await creditBonus(1001, playerId, 2000, 1);
    });

    it('bonus balance is as set before conversion', async () => {
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(0);
      expect(bonusBalance).to.equal(2000);
    });

    it('small bonus conversion converts money to real', async () => {
      await pg.transaction(tx => doMaintenance(playerId, tx));
      const { balance, bonusBalance } = await getBalance(playerId);
      expect(balance).to.equal(2000);
      expect(bonusBalance).to.equal(0);
    });
  });
});
