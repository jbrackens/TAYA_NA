/* @flow */
const pg = require('gstech-core/modules/pg');
const { players: { john } } = require('../../../../scripts/utils/db-data');
const { creditBonus } = require('../../bonuses');
const { findOrCreateAccount } = require('../../accounts');
const { addTransaction } = require("../Payment");
const { getBalance } = require('../../players');
const { getWithdrawalMethods, createWithdrawal, cancelWithdrawal, acceptWithdrawal, acceptWithdrawalWithDelay, processWithdrawal, getWithdrawalWithOptions } = require('./Withdrawal');
const { markWithdrawalAsComplete, rejectFailedWithdrawal, getPendingWithdrawals, getPendingWithdrawalsReadyToAccept, getWithdrawal } = require('./Withdrawal');
const Player = require('../../players/Player');
const Fraud = require('../../frauds/Fraud');

describe('Withdrawals', () => {
  describe('with real money only', () => {
    let playerId;
    let accountId;
    beforeEach(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
      accountId = await pg.transaction(tx => findOrCreateAccount(playerId, 1, 'FI2112345600008739', null, 1, { bic: 'DABAIE2D' }, tx));
      await pg.transaction(tx => addTransaction(playerId, null, 'compensation', 5000, 'Added some money', 1, tx));
    });

    it('returns empty withdrawal method list when none is available', async () => {
      const { methods } = await getWithdrawalMethods(playerId);
      expect(methods.length).to.equal(0);
    });

    it('can create a withdrawal and cancel it', async () => {
      const withdrawals = await getPendingWithdrawals(playerId);
      expect(withdrawals).to.be.empty();

      const { balance: balanceBeforeWd } = await getBalance(playerId);
      expect(balanceBeforeWd).to.equal(5000);

      const transactionKey = await createWithdrawal(playerId, null, accountId, 2500);

      const withdrawals2 = await getPendingWithdrawals(playerId);
      expect(withdrawals2.length).to.equal(1);
      const { balance } = await getBalance(playerId);
      expect(balance).to.equal(2500);

      await cancelWithdrawal(playerId, transactionKey);

      expect(withdrawals2.length).to.equal(1);
      const { balance: balanceAfterCancel } = await getBalance(playerId);
      expect(balanceAfterCancel).to.equal(5000);

      try {
        await cancelWithdrawal(playerId, transactionKey);
        expect(true).to.be.false();
      } catch (e) {} // eslint-disable-line

      const { balance: balanceAfterSecondCancel } = await getBalance(playerId);
      expect(balanceAfterSecondCancel).to.equal(5000);
    });

    it('can create a withdrawal with payment fee and the fee is returned when withdrawal is canceled', async () => {
      const transactionKey = await createWithdrawal(playerId, null, accountId, 2500, 150);

      const { balance } = await getBalance(playerId);
      expect(balance).to.equal(2350);

      await cancelWithdrawal(playerId, transactionKey);

      const { balance: balanceAfterCancel } = await getBalance(playerId);
      expect(balanceAfterCancel).to.equal(5000);
    });
  });

  describe('with active bonus money', () => {
    let playerId;
    let accountId;

    beforeEach(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
      accountId = await pg.transaction(tx => findOrCreateAccount(playerId, 1, 'FI2112345600008739', null, 1, { bic: 'DABAIE2D' }, tx));
      await creditBonus(1001, playerId, 5000);
    });

    it('disallows withdrawal', async () => {
      try {
        await createWithdrawal(playerId, null, accountId, 2500);
      } catch (e) {} // eslint-disable-line
    });
  });

  describe('with pending withdrawal', function test(this: $npm$mocha$ContextDefinition) {
    this.timeout(300000);
    let playerId;
    let accountId;
    let transactionKey;

    beforeEach(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
      accountId = await pg.transaction(async (tx) => {
        const acc = await findOrCreateAccount(playerId, 1, 'FI2112345600008739', null, 1, { bic: 'DABAIE2D' }, tx);
        await addTransaction(playerId, null, 'compensation', 5000, 'Added some money', 1, tx);
        return acc;
      });
      transactionKey = await createWithdrawal(playerId, null, accountId, 2500);
    });

    it('can be accepted and is no longer pending', async () => {
      await acceptWithdrawal(transactionKey, 1, 2500, 1, playerId, { staticId: 1 });
      const withdrawals = await getPendingWithdrawals(playerId);
      expect(withdrawals).to.be.empty();
    });

    it('throws an error when trying to accept greater amount than original withdrawal', async () => {
      try {
        await acceptWithdrawal(transactionKey, 1, 3500, 1, playerId, { staticId: 1 });
        expect(true).to.equal(false);
      } catch (e) {
        expect(e.error.code).to.equal(569);
      }
    });

    it('can be accepted partially and new withdrawal is created for remaining balance', async () => {
      await acceptWithdrawal(transactionKey, 1, 1500, 1, playerId, { staticId: 1 });
      const withdrawals = await getPendingWithdrawals(playerId);
      expect(withdrawals.length).to.equal(1);
      const [wd] = withdrawals;
      expect(wd.amount).to.equal(1000);
    });


    it('failed transaction return withdrawal back to pending state', async () => {
      await acceptWithdrawal(transactionKey, 1, 2500, 1, playerId, { staticId: 1 });
      await processWithdrawal(transactionKey, 'WD Processed', {});
      await rejectFailedWithdrawal(transactionKey, 'Insufficient funds');
      const withdrawals = await getPendingWithdrawals(playerId);
      expect(withdrawals.length).to.equal(1);
      const [wd] = withdrawals;
      expect(wd.amount).to.equal(2500);

      const { balance } = await getBalance(playerId);
      expect(balance).to.equal(2500);
    });

    it('completes accepted transaction', async () => {
      await acceptWithdrawal(transactionKey, 1, 2500, 1, playerId, { staticId: 1 });
      await processWithdrawal(transactionKey, 'WD Processed', {});
      await markWithdrawalAsComplete(transactionKey, 'externalid-123123', 'WD complete', {});
      const withdrawals = await getPendingWithdrawals(playerId);
      expect(withdrawals.length).to.equal(0);
      const { balance } = await getBalance(playerId);
      expect(balance).to.equal(2500);
    });

    it('process transaction with parameters', async () => {
      await acceptWithdrawal(transactionKey, 1, 2500, 1, playerId, { staticId: 1 });
      await processWithdrawal(transactionKey, 'WD Processed', {}, { testParam: 1 });

      const withdrawal = await getWithdrawal(transactionKey);
      expect(withdrawal.paymentParameters).to.deep.equal({
        testParam: 1,
      });
    });

    it('can cancel complete transaction', async () => {
      await acceptWithdrawal(transactionKey, 1, 2500, 1, playerId, { staticId: 1 });
      await processWithdrawal(transactionKey, 'WD Processed', {});
      await markWithdrawalAsComplete(transactionKey, 'externalid-123123', 'WD complete', {});
      await rejectFailedWithdrawal(transactionKey, 'Failed!', {});
      const withdrawals = await getPendingWithdrawals(playerId);
      const [{ id }] = await Fraud.getUnchecked(playerId);
      const fraud = await Fraud.getById(id);
      expect(fraud).to.containSubset({
        fraudKey: 'failed_withdrawal',
        details: [
          { key: 'Payment provider', value: 'Entercash' },
          { key: 'Amount', value: '25.00' },
        ],
      });
      expect(withdrawals.length).to.equal(0);
      const { balance } = await getBalance(playerId);
      expect(balance).to.equal(2500);
    });

    it('can be accepted with delay', async () => {
      await acceptWithdrawalWithDelay(transactionKey, 1, 2500, 1, playerId, { staticId: 1 });
      const withdrawals = await getPendingWithdrawals(playerId);
      expect(withdrawals.length).to.equal(1);

      const { balance } = await getBalance(playerId);
      expect(balance).to.equal(2500);

      const readyWithdrawals = await getPendingWithdrawalsReadyToAccept(-1);
      expect(readyWithdrawals.length).to.equal(1);

      const readyWithdrawals2 = await getPendingWithdrawalsReadyToAccept(2);
      expect(readyWithdrawals2.length).to.equal(0);
    });
  });

  describe('with pending credit card withdrawal', function test(this: $npm$mocha$ContextDefinition) {
    this.timeout(300000);
    let playerId;
    let accountId;
    let transactionKey;

    beforeEach(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
      accountId = await pg.transaction(async (tx) => {
        const acc = await findOrCreateAccount(playerId, 4, '444444xxxxxxxxx4444', null, 1, { paymentIqAccountId: 'bfd1fd22-134e-472b-865e-fb6bd7e269a2', provider: 'SafeCharge' }, tx);
        await addTransaction(playerId, null, 'compensation', 5000, 'Added some money', 1, tx);
        return acc;
      });
      transactionKey = await createWithdrawal(playerId, null, accountId, 2500);
    });

    it('returns possible payment providers', async () => {
      const wd = await getWithdrawalWithOptions(transactionKey);
      expect(wd.paymentProviders).to.containSubset([{
        name: 'Bambora',
        provider: 'Bambora',
      }]);
    });
  });
});
