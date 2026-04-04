/* @flow */
import type { DepositStatus } from "gstech-core/modules/types/backend";

const moment = require('moment-timezone');

const _ = require('lodash');
const pg = require('gstech-core/modules/pg');
const promiseLimit = require('promise-limit');
const { getBalance } = require('../../players');
const { players: { john } } = require('../../../../scripts/utils/db-data');
const { startDeposit, processDeposit, setDepositStatus, getDepositMethods, getRawDepositById } = require('./Deposit');
const { addTransaction } = require('../Payment');
const { getDepositsLeftAfterPending } = require('../PaymentLimits');
const { getAccount } = require('../../accounts');
const { formatMoney } = require('../../core/money');
const Player = require('../../players/Player');
const Fraud = require('../../frauds/Fraud');
const Limits = require('../../limits/Limit');
const Person = require('../../persons/Person');
const { answerQuestionnaire } = require('../../questionnaires/Questionnaire');

describe('Deposits NOK', () => {
  let playerId;

  beforeEach(async () => {
    await clean.players();
    playerId = await Player.create({ ...john, brandId: 'LD', currencyId: 'NOK' }).then(({ id }) => id);
  });

  it('does not trigger huge deposit from deposit under limit', async () => {
    const { transactionKey: tx1 } = await startDeposit(playerId, 1, 25000);
    await processDeposit(25000, tx1, 'FI2112345600008739', null, 'external-id1', 'complete', 'Message', null, null, null, 200);
    const frauds0 = await Fraud.getUnchecked(playerId);
    expect(frauds0).to.not.containSubset([{ fraudKey: 'huge_deposit' }]);
  });

  it('triggers huge deposit from deposit under limit', async () => {
    const { transactionKey: tx1 } = await startDeposit(playerId, 1, 2500000);
    await processDeposit(2500000, tx1, 'FI2112345600008739', null, 'external-id1', 'complete', 'Message', null, null, null, 200);

    const frauds0 = await Fraud.getUnchecked(playerId);
    expect(frauds0).to.containSubset([
      { fraudKey: 'huge_deposit' },
    ]);
  });

  it('triggers a fraud when 30 day deposits twice over country treshold', async () => {
    const { transactionKey: tx1 } = await startDeposit(playerId, 1, 3000000);
    await processDeposit(3000000, tx1, 'FI2112345600008739', null, 'external-id1', 'complete', 'Message', null, null, null, 200);

    const frauds0 = await Fraud.getUnchecked(playerId);
    expect(frauds0).to.containSubset([
      { fraudKey: 'huge_deposit' },
    ]);
    const { transactionKey: tx2 } = await startDeposit(playerId, 1, 3000000);
    await processDeposit(3000000, tx2, 'FI2112345600008739', null, 'external-id2', 'complete', 'Message', null, null, null, 200);

    const frauds1 = await Fraud.getUnchecked(playerId);
    expect(frauds1).to.containSubset([
      { fraudKey: 'huge_deposit' },
      { fraudKey: 'cumulative_deposits_over_amount' },
    ]);

    const { transactionKey: tx3 } = await startDeposit(playerId, 1, 6000000);
    await processDeposit(6000000, tx3, 'FI2112345600008739', null, 'external-id3', 'complete', 'Message', null, null, null, 200);

    const frauds = await Fraud.getUnchecked(playerId);
    expect(frauds).to.containSubset([
      { fraudKey: 'huge_deposit' },
      { fraudKey: 'cumulative_deposits_over_amount' },
      { fraudKey: 'cumulative_deposits_2x_nodoc' },
    ]);
  });
});

describe('Deposits', () => {
  let playerId;
  let secondPlayerId;

  const fakeDeposit = async (pid: number, amount: any | number, timestamp: any | null = null, paymentProviderId: number = 1) => {
    const { transactionKey: tx0 } = await startDeposit(pid, paymentProviderId, amount);
    const { transactionKey } = await processDeposit(
      amount,
      tx0,
      `FI${407000000 + (Date.now() % 1000000)}`,
      null,
      `FI${407000000 + (Date.now() % 1000000)}`,
      'complete',
      'Message',
      null,
      null,
      null,
      0,
    );
    if (timestamp) await pg('payments').where({ transactionKey }).update({ timestamp });
    return { transactionKey, playerId: pid };
  };

  beforeEach(async () => {
    await clean.players();
    playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
    secondPlayerId = await Player.create({ brandId: 'CJ', ...john }).then(({ id }) => id);
  });

  it('lists available deposit methods for player', async () => {
    const methods = await getDepositMethods(playerId);
    expect(methods.length > 0);
  });

  it('returns an error when deposits are disabled for player', async () => {
    await pg('players').update({ allowTransactions: false }).where({ id: playerId });
    try {
      await startDeposit(playerId, 1, 3000);
      expect(false).to.equal(true);
    } catch (e) {
      expect(e.error.code).to.equal(585);
    }
  });

  it('returns an error when player has timeout limit', async () => {
    await Limits.create({
      playerId,
      permanent: false,
      expires: moment().add(1, 'days').toDate(),
      reason: 'Test reason',
      type: 'timeout',
      limitValue: null,
      userId: null,
    });

    try {
      await startDeposit(playerId, 1, 3000);
      expect(false).to.equal(true);
    } catch (e) {
      expect(e.error.code).to.equal(585);
    }
  });

  it('returns an error when deposit is below limit', async () => {
    try {
      await startDeposit(playerId, 1, 1000);
      expect(false).to.equal(true);
    } catch (e) {
      expect(e.error.code).to.equal(558);
    }
  });

  it('returns an error when deposit is over limit', async () => {
    try {
      await startDeposit(playerId, 1, 80000000);
      expect(false).to.equal(true);
    } catch (e) {
      expect(e.error.code).to.equal(575);
    }
  });

  it('credits balance when successful', async () => {
    const initalBalance = await getBalance(playerId);
    expect(initalBalance.balance).to.equal(0);
    expect(initalBalance.bonusBalance).to.equal(0);
    expect(initalBalance.numDeposits).to.equal(0);
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    const { balance, bonusBalance, numDeposits } = await getBalance(playerId);
    expect(balance).to.equal(2000);
    expect(bonusBalance).to.equal(0);
    expect(numDeposits).to.equal(1);
  });

  it('credits balance when successful', async () => {
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    const { balance, bonusBalance } = await getBalance(playerId);
    expect(balance).to.equal(2000);
    expect(bonusBalance).to.equal(0);
  });

  it('can go from pending to settled state and records log events for both complete and settled', async () => {
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    const { id } = await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'settled');
    const { balance, bonusBalance } = await getBalance(playerId);
    expect(balance).to.equal(2000);
    expect(bonusBalance).to.equal(0);
    const events = await pg('payment_event_logs').select('*').where({ paymentId: id }).orderBy('id');
    expect(events.length).to.equal(2);
    expect(events).to.containSubset([
      { status: 'complete' },
      { status: 'settled' },
    ]);
    const deposit = await getRawDepositById(id);
    expect(deposit).to.containSubset({
      status: 'complete',
    });
  });

  it('can go from pending to complete and records settled event', async () => {
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    const { id } = await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'settled');
    const { balance, bonusBalance } = await getBalance(playerId);
    expect(balance).to.equal(2000);
    expect(bonusBalance).to.equal(0);
    const events = await pg('payment_event_logs').select('*').where({ paymentId: id }).orderBy('id');
    expect(events.length).to.equal(2);
    expect(events).to.containSubset([
      { status: 'complete' },
      { status: 'settled' },
    ]);
    const deposit = await getRawDepositById(id);
    expect(deposit).to.containSubset({
      status: 'complete',
    });
  });

  it('records multiple settled events', async () => {
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    const { id } = await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'settled');
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'settled');
    const { balance, bonusBalance } = await getBalance(playerId);
    expect(balance).to.equal(2000);
    expect(bonusBalance).to.equal(0);
    const events = await pg('payment_event_logs').select('*').where({ paymentId: id }).orderBy('id');
    expect(events.length).to.equal(3);
    expect(events).to.containSubset([
      { status: 'complete' },
      { status: 'settled' },
      { status: 'settled' },
    ]);
    const deposit = await getRawDepositById(id);
    expect(deposit).to.containSubset({
      status: 'complete',
    });
  });

  it('can be cancelled', async () => {
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    await setDepositStatus(transactionKey, 'failed', 'Not enough funds');
    const { balance, bonusBalance } = await getBalance(playerId);
    expect(balance).to.equal(0);
    expect(bonusBalance).to.equal(0);
  });


  it('removes money from account and locks transactions when complete deposit is cancelled', async () => {
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    await setDepositStatus(transactionKey, 'failed', 'Cashback');
    const { balance, bonusBalance } = await getBalance(playerId);
    expect(balance).to.equal(0);
    expect(bonusBalance).to.equal(0);
    const { allowGameplay, allowTransactions } = await Player.getAccountStatus(playerId);
    expect(allowGameplay).to.equal(false);
    expect(allowTransactions).to.equal(false);
  });

  it('removes remaining money from account deposit is cancelled', async () => {
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    await pg.transaction(tx => addTransaction(playerId, null, 'correction', -1000, 'Use some money', 1, tx));
    await setDepositStatus(transactionKey, 'failed', 'Cashback');
    const { balance, bonusBalance } = await getBalance(playerId);
    expect(balance).to.equal(0);
    expect(bonusBalance).to.equal(0);
  });

  it('does not credit deposit with duplicate id ', async () => {
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    const { processed: processed1 } = await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    const { processed: processed2 } = await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    expect(processed1).to.equal(true);
    expect(processed2).to.equal(false);
    const { balance, bonusBalance } = await getBalance(playerId);
    expect(balance).to.equal(2000);
    expect(bonusBalance).to.equal(0);
  });

  it('allows updating created payment with account details before completing it', async () => {
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    await processDeposit(null, transactionKey, 'FI2112345600008739', 'Test Player Dude', 'external-id1', null, 'OK', {}, { idParameter: 123 });
    const { accountId } = await processDeposit(2000, transactionKey, undefined, undefined, 'external-id1', 'complete', 'Complete', {}, {}, {});
    const { balance, bonusBalance, numDeposits } = await getBalance(playerId);
    expect(balance).to.equal(2000);
    expect(bonusBalance).to.equal(0);
    expect(numDeposits).to.equal(1);
    const account = await getAccount(accountId);
    expect(account.accountHolder).to.equal('Test Player Dude');
    expect(account.account).to.equal('FI2112345600008739');
    expect(account.parameters.idParameter).to.equal(123);
  });

  it('credits bonus money with minimum bonus amount', async () => {
    const { transactionKey } = await startDeposit(playerId, 1, 2000, 1001);
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    const { balance, bonusBalance } = await getBalance(playerId);
    expect(balance).to.equal(2000);
    expect(bonusBalance).to.equal(2000);
  });

  it('credits maximum bonus amount when deposit over maximum', async () => {
    const { transactionKey } = await startDeposit(playerId, 1, 200000, 1001);
    await processDeposit(200000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    const { balance, bonusBalance } = await getBalance(playerId);
    expect(balance).to.equal(200000);
    expect(bonusBalance).to.equal(20000);
  });

  it('does not credit bonus money when final amount is below bonus minimum', async () => {
    const { transactionKey } = await startDeposit(playerId, 1, 2000, 1001);
    await processDeposit(1800, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    const { balance, bonusBalance } = await getBalance(playerId);
    expect(balance).to.equal(1800);
    expect(bonusBalance).to.equal(0);
  });

  it('can pass a deposit fee amount when creating a deposit and it is reduced from balance after completing the deposit', async () => {
    const { transactionKey } = await startDeposit(playerId, 1, 2000, 1001, {}, 100);
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
    const { balance, bonusBalance } = await getBalance(playerId);
    expect(balance).to.equal(1900);
    expect(bonusBalance).to.equal(2000);
  });

  it('allows final payment fee to be passed when processing the deposit', async () => {
    const { transactionKey } = await startDeposit(playerId, 1, 2000, 1001, {}, 100);
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete', 'Message', null, null, null, 200);
    const { balance, bonusBalance } = await getBalance(playerId);
    expect(balance).to.equal(1800);
    expect(bonusBalance).to.equal(2000);
  });

  it('returns amount of pending deposits', async () => {
    const { transactionKey: tx1 } = await startDeposit(playerId, 1, 2000);
    await processDeposit(2000, tx1, 'FI2112345600008739', null, 'external-id1', 'pending', 'Message', null, null, null, 200);

    const { transactionKey: tx2 } = await startDeposit(playerId, 1, 2000);
    await processDeposit(2000, tx2, 'FI2112345600008739', null, 'external-id2', 'pending', 'Message', null, null, null, 200);

    const { transactionKey: tx3 } = await startDeposit(playerId, 1, 2000);
    await processDeposit(2000, tx3, 'FI2112345600008739', null, 'external-id3', 'pending', 'Message', null, null, null, 200);

    const amounts = await getDepositsLeftAfterPending(playerId);
    expect(amounts).to.deep.equal([{
      paymentProviderId: 1,
      amount: 194000,
    }]);
  });

  it('prevents deposits when there are over week old pending deposit', async () => {
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'pending', 'Message', null, null, null, 200);
    await pg('payments').update({
      timestamp: pg.raw('now() - \'1 month\'::interval'),
    }).where({ transactionKey });

    try {
      await startDeposit(playerId, 1, 2000);
      expect(true).to.equal(false);
    } catch (e) {
      expect(e.error.code).to.equal(585);
    }
  });

  it('raises risk profile when high risk payment method is used', async () => {
    const { transactionKey: tx1 } = await startDeposit(playerId, 9, 50000);
    await processDeposit(50000, tx1, '', null, 'external-id1', 'complete', 'Message', null, null, null, 200);
    const { riskProfile } = await Player.getAccountStatus(playerId);
    expect(riskProfile).to.equal('medium');
  });

  it('Player details returns DD requirement flag when over 2k deposited', async () => {
    const { transactionKey: tx1 } = await startDeposit(playerId, 1, 500000);
    await processDeposit(500000, tx1, '', null, 'external-id1', 'complete', 'Message', null, null, null, 200);
    const details = await Player.getPlayerWithDetails(playerId);
    expect(details).to.containSubset({
      dd: {
        flagged: true,
        locked: false,
      },
    });
    expect(details.dd.lockTime).to.not.equal(null);
  });

  it('can set depositLimitReached to all connected players', async () => {
    await Person.connectPlayersWithPerson(pg, playerId, secondPlayerId);

    const { transactionKey: tx1 } = await startDeposit(playerId, 1, 1250_00);
    const { transactionKey: tx3 } = await startDeposit(secondPlayerId, 1, 1250_00);

    await processDeposit(1250_00, tx1, 'FI2112345600008739', null, 'external-id1', 'complete', 'Message', null, null, null, 2_00);
    await processDeposit(1250_00, tx3, 'FI2112345600008739', null, 'external-id2', 'complete', 'Message', null, null, null, 2_00);

    const player1 = await pg('players').select('depositLimitReached').where({ id: playerId }).first();
    const player2 = await pg('players').select('depositLimitReached').where({ id: secondPlayerId }).first();

    expect(player1).to.deep.equal(player2);
    expect(player1.depositLimitReached).to.not.equal(undefined);

    const { personId } = await pg('players').select('personId').where({ id: playerId }).first();
    const frauds = await Fraud.getUnchecked(secondPlayerId);
    expect(frauds).to.containSubset([{ fraudKey: 'pep_questionnaire', fraudId: `${personId}` }]);
  });

  describe('Deposit Frauds', () => {
    describe('Main frauds', () => {

      it('triggers a fraud when 30 day deposits over country treshold', async () => {
        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 300000);
        await processDeposit(300000, tx1, 'FI2112345600008739', null, 'external-id1', 'complete', 'Message', null, null, null, 200);

        const frauds0 = await Fraud.getUnchecked(playerId);
        expect(frauds0).to.containSubset([
          { fraudKey: 'huge_deposit' },
        ]);
        const { transactionKey: tx2 } = await startDeposit(playerId, 1, 300000);
        await processDeposit(300000, tx2, 'FI2112345600008739', null, 'external-id2', 'complete', 'Message', null, null, null, 200);

        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.containSubset([
          { fraudKey: 'huge_deposit' },
          { fraudKey: 'cumulative_deposits_over_amount' },
        ]);
      });

      it('triggers a fraud when 30 day deposits twice over country treshold', async () => {
        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 300000);
        await processDeposit(300000, tx1, 'FI2112345600008739', null, 'external-id1', 'complete', 'Message', null, null, null, 200);

        const frauds0 = await Fraud.getUnchecked(playerId);
        expect(frauds0).to.containSubset([
          { fraudKey: 'huge_deposit' },
        ]);
        const { transactionKey: tx2 } = await startDeposit(playerId, 1, 300000);
        await processDeposit(300000, tx2, 'FI2112345600008739', null, 'external-id2', 'complete', 'Message', null, null, null, 200);

        const frauds1 = await Fraud.getUnchecked(playerId);
        expect(frauds1).to.containSubset([
          { fraudKey: 'huge_deposit' },
          { fraudKey: 'cumulative_deposits_over_amount' },
        ]);

        const { transactionKey: tx3 } = await startDeposit(playerId, 1, 600000);
        await processDeposit(600000, tx3, 'FI2112345600008739', null, 'external-id3', 'complete', 'Message', null, null, null, 200);

        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.containSubset([
          { fraudKey: 'huge_deposit' },
          { fraudKey: 'cumulative_deposits_over_amount' },
          { fraudKey: 'cumulative_deposits_2x_nodoc' },
        ]);
      });

      it('triggers a fraud when depositing and money originating from different deposit method already on account', async () => {
        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 50000);
        await processDeposit(50000, tx1, 'FI2112345600008739', null, 'external-id1', 'complete', 'Message', null, null, null, 200);

        const { transactionKey: tx2 } = await startDeposit(playerId, 3, 50000);
        await processDeposit(50000, tx2, 'foo@bar.com', null, 'external-id2', 'complete', 'Message', null, null, null, 200);

        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.containSubset([
          { fraudKey: 'altering_deposit_method' },
        ]);
      });

      it('triggers a fraud when depositing while account has over 1k balance already', async () => {
        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 200000);
        await processDeposit(200000, tx1, 'FI2112345600008739', null, 'external-id1', 'complete', 'Message', null, null, null, 200);

        const { transactionKey: tx2 } = await startDeposit(playerId, 1, 50000);
        await processDeposit(50000, tx2, 'FI2112345600008739', null, 'external-id2', 'complete', 'Message', null, null, null, 200);

        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.containSubset([
          { fraudKey: 'balance_on_account' },
        ]);
      });

      it('triggers a fraud task when several high risk deposits is done in short period of time', async () => {
        const { transactionKey: tx1 } = await startDeposit(playerId, 9, 5000);
        await processDeposit(5000, tx1, '', null, 'external-id1', 'complete', 'Message', null, null, null, 200);
        const { transactionKey: tx2 } = await startDeposit(playerId, 9, 5000);
        await processDeposit(5000, tx2, '', null, 'external-id2', 'complete', 'Message', null, null, null, 200);
        const { transactionKey: tx3 } = await startDeposit(playerId, 9, 5000);
        await processDeposit(5000, tx3, '', null, 'external-id3', 'complete', 'Message', null, null, null, 200);
        const { transactionKey: tx4 } = await startDeposit(playerId, 9, 5000);
        await processDeposit(5000, tx4, '', null, 'external-id4', 'complete', 'Message', null, null, null, 200);
        const { transactionKey: tx5 } = await startDeposit(playerId, 9, 5000);
        await processDeposit(5000, tx5, '', null, 'external-id5', 'complete', 'Message', null, null, null, 200);
        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.containSubset([
          { fraudKey: 'successive_high_risk_deposits' },
        ]);
      });

      it('triggers a fraud task when deposit amount is suddenly much larger than previous ones', async () => {
        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 2000);
        await processDeposit(2000, tx1, '', null, 'external-id1', 'complete', 'Message', null, null, null, 200);
        const { transactionKey: tx2 } = await startDeposit(playerId, 1, 2000);
        await processDeposit(2000, tx2, '', null, 'external-id2', 'complete', 'Message', null, null, null, 200);
        const { transactionKey: tx3 } = await startDeposit(playerId, 1, 2000);
        await processDeposit(2000, tx3, '', null, 'external-id3', 'complete', 'Message', null, null, null, 200);
        const { transactionKey: tx4 } = await startDeposit(playerId, 1, 2000);
        await processDeposit(2000, tx4, '', null, 'external-id4', 'complete', 'Message', null, null, null, 200);
        const { transactionKey: tx5 } = await startDeposit(playerId, 1, 25000);
        await processDeposit(25000, tx5, '', null, 'external-id5', 'complete', 'Message', null, null, null, 200);
        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.containSubset([
          { fraudKey: 'sudden_big_deposit' },
        ]);
      });

      it('triggers a fraud task when there are several active accounts used on a payment method', async () => {
        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 2000);
        await processDeposit(2000, tx1, 'acc1', null, 'external-id1', 'complete', 'Message', null, null, null, 200);
        const { transactionKey: tx2 } = await startDeposit(playerId, 1, 2000);
        await processDeposit(2000, tx2, 'acc2', null, 'external-id2', 'complete', 'Message', null, null, null, 200);
        const { transactionKey: tx3 } = await startDeposit(playerId, 1, 2000);
        await processDeposit(2000, tx3, 'acc3', null, 'external-id3', 'complete', 'Message', null, null, null, 200);
        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.containSubset([
          { fraudKey: 'several_payment_accounts', fraudId: 'BankTransfer:acc3' },
        ]);
      });
    });

    /* eslint-disable no-unused-vars */
    describe('SOW frauds', () => {
      const limit = promiseLimit(1);
      const spreadDates = (startDaysBack: number, n: number = 10, endDaysBack: number = 0) =>
        Array.from({ length: n }, (v, i) =>
          moment()
            .subtract({ days: startDaysBack - (i * (startDaysBack - endDaysBack)) / n })
            .toDate(),
        );

      const spreadFakeDeposits = async (pid: number, sum: number, numDeposits: number, daysBackSince: number, daysBackTo: void | number) => {
        const amounts = Array(numDeposits).fill(+sum / numDeposits);
        const dates = spreadDates(daysBackSince, numDeposits, daysBackTo);
        const ops = _.zip(amounts, dates).map((args) => () => limit(() => fakeDeposit(pid, ...args)));
        const deps = await Promise.all(ops.map((o) => o()));
      };

      describe('Applies necessary SOW-related blocks on deposits', () => {
        beforeEach(async () => {
          await Person.connectPlayersWithPerson(pg, playerId, secondPlayerId);
          await spreadFakeDeposits(playerId, 5000000, 10, 180);
          await spreadFakeDeposits(secondPlayerId, 5000000, 10, 180);
          const { total } = await Player.getLifetimeDeposits(playerId);
          expect(total).to.equal(10000000);
        });

        it('adds fraud when player has accumulated 100K deposits in last 180 days', async () => {
          const frauds = await Fraud.getUnchecked(secondPlayerId);
          expect(frauds).to.containSubset([{ fraudKey: 'cumulative_100k_180days' }]);
        });

        it('does not allow further deposits while SOW state is pending', async () => {
          try {
            await startDeposit(playerId, 1, 10000);
            expect(true).to.equal(false);
          } catch (e) {
            expect(e.error.code).to.equal(497);
          }
          try {
            await startDeposit(secondPlayerId, 1, 10000);
            expect(true).to.equal(false);
          } catch (e) {
            expect(e.error.code).to.equal(497);
          }
        });

        it('allows further deposits after SOW state is passed', async () => {
          const { balance: balance0 } = await getBalance(secondPlayerId);
          expect(balance0).to.equal(5000000);
          await Player.addTag(playerId, 'pass-sow');
          await fakeDeposit(secondPlayerId, 10000);
          const { balance: balance1 } = await getBalance(secondPlayerId);
          expect(balance1).to.equal(5010000);
        })

        it('does not allow further deposits if SOW state is rejected', async () => {
          const { balance: balance0 } = await getBalance(secondPlayerId);
          expect(balance0).to.equal(5000000);
          await Player.addTag(playerId, 'fail-sow');
          try {
            await fakeDeposit(secondPlayerId, 10000);
            expect(true).to.equal(false);
          } catch (e) {
            expect(e.error.code).to.equal(498);
          }
        });

      });

      describe('Triggers SOW 100k180 fraud within correct timeframe', () => {
        it('triggers 100K180 fraud based on time of most recent pass-sow tag', async () => {
          await Person.connectPlayersWithPerson(pg, playerId, secondPlayerId);
          await spreadFakeDeposits(playerId, 5000000, 10, 360, 180);
          await spreadFakeDeposits(secondPlayerId, 5000000, 10, 360, 180);
          const { total } = await Player.getLifetimeDeposits(playerId);
          expect(total).to.equal(10000000);
          const { total: recentCumulative0 } = await Player.getRecentCumulativeDeposits(playerId);
          expect(recentCumulative0).to.equal(0);
          await Player.addTag(playerId, 'pass-sow', moment().subtract({ days: 180 }).toISOString());
          const [tags0p1, tags0p2] = [
            await Player.getTags(playerId),
            await Player.getTags(secondPlayerId),
          ];
          expect(tags0p1).to.have.keys(['pass-sow']);
          expect(tags0p2).to.have.keys(['pass-sow']);
          await spreadFakeDeposits(playerId, 2500000, 5, 180, 90);
          await spreadFakeDeposits(secondPlayerId, 2500000, 5, 180, 90);
          const { total: recentCumulative1 } = await Player.getRecentCumulativeDeposits(playerId);
          expect(recentCumulative1).to.equal(5000000);
          await spreadFakeDeposits(playerId, 2500000, 5, 90);
          await spreadFakeDeposits(secondPlayerId, 2500000, 5, 90);
          const [tags1p1, tags1p2] = [
            await Player.getTags(playerId),
            await Player.getTags(secondPlayerId),
          ];
          expect(tags1p1).to.not.have.keys(['pass-sow']);
          expect(tags1p2).to.not.have.keys(['pass-sow']);
          const frauds = await Fraud.getUnchecked(secondPlayerId);
          expect(frauds).to.containSubset([{ fraudKey: 'cumulative_100k_180days' }]);
          const [{ id: fraudId }] = frauds.filter((f) => f.fraudKey === 'cumulative_100k_180days');
          await Fraud.check(fraudId, 1, true);
          await Player.addTag(secondPlayerId, 'pass-sow');
          const { total: recentCumulative2 } = await Player.getRecentCumulativeDeposits(playerId);
          expect(recentCumulative2).to.equal(0);
        });

        it('triggers 100K180 fraud based based on last 6 months if last pass-sow tag is older than that', async () => {
          await Person.connectPlayersWithPerson(pg, playerId, secondPlayerId);
          await spreadFakeDeposits(playerId, 5000000, 10, 360, 210);
          await spreadFakeDeposits(secondPlayerId, 5000000, 10, 360, 210);
          const { total } = await Player.getLifetimeDeposits(playerId);
          expect(total).to.equal(10000000);
          const { total: recentCumulative0 } = await Player.getRecentCumulativeDeposits(playerId);
          expect(recentCumulative0).to.equal(0);
          await Player.addTag(playerId, 'pass-sow', moment().subtract({ days: 210 }).toISOString());
          await spreadFakeDeposits(playerId, 500000, 1, 210, 180);
          await spreadFakeDeposits(secondPlayerId, 500000, 1, 210, 180);
          await spreadFakeDeposits(playerId, 2500000, 5, 180, 90);
          await spreadFakeDeposits(secondPlayerId, 2500000, 5, 180, 90);
          const { total: recentCumulative1 } = await Player.getRecentCumulativeDeposits(playerId);
          expect(recentCumulative1).to.equal(5000000);
          const [tags0p1, tags0p2] = [
            await Player.getTags(playerId),
            await Player.getTags(secondPlayerId),
          ];
          expect(tags0p1).to.have.keys(['pass-sow']);
          expect(tags0p2).to.have.keys(['pass-sow']);
          await spreadFakeDeposits(playerId, 2500000, 5, 90);
          await spreadFakeDeposits(secondPlayerId, 2500000, 5, 90);
          const [tags1p1, tags1p2] = [
            await Player.getTags(playerId),
            await Player.getTags(secondPlayerId),
          ];
          expect(tags1p1).to.not.have.keys(['pass-sow']);
          expect(tags1p2).to.not.have.keys(['pass-sow']);
          const frauds = await Fraud.getUnchecked(secondPlayerId);
          expect(frauds).to.containSubset([{ fraudKey: 'cumulative_100k_180days' }]);
          const [{ id: fraudId }] = frauds.filter((f) => f.fraudKey === 'cumulative_100k_180days');
          await Fraud.check(fraudId, 1, true);
          await Player.addTag(secondPlayerId, 'pass-sow');
          const { total: recentCumulative2 } = await Player.getRecentCumulativeDeposits(playerId);
          expect(recentCumulative2).to.equal(0);
        });
      })
    });

    describe('New account deposit threshold met frauds', () => {
      const rules = [
        { fraudKey: 'dep500_acc30days', thresholdDepositAmount: 500 * 100, minAge: 30 },
        { fraudKey: 'dep1000_acc60days', thresholdDepositAmount: 1000 * 100, minAge: 60 },
        { fraudKey: 'dep2500_acc90days', thresholdDepositAmount: 2500 * 100, minAge: 90 },
      ];
      rules.forEach(({ fraudKey, thresholdDepositAmount, minAge }) => {
        it(`triggers ${fraudKey} fraud`, async () => {
          const accountAgeLessThanRule = minAge - 1;
          await pg('players')
            .update({ createdAt: moment().subtract({ days: accountAgeLessThanRule }).toDate() })
            .where({ id: playerId });
          const { transactionKey: tx1 } = await startDeposit(playerId, 1, thresholdDepositAmount);
          await processDeposit(
            thresholdDepositAmount,
            tx1,
            'acc1',
            null,
            'external-id1',
            'complete',
            'Message',
            null,
            null,
            null,
            200,
          );
          const { transactionKey: tx2 } = await startDeposit(playerId, 1, thresholdDepositAmount);
          await processDeposit(
            thresholdDepositAmount,
            tx2,
            'acc1',
            null,
            'external-id2',
            'complete',
            'Message',
            null,
            null,
            null,
            200,
          );
          const frauds = await Fraud.getUnchecked(playerId);
          expect(frauds).to.containSubset([{ fraudKey }]);
          const thisKeyFrauds = frauds.filter(fraud => fraud.fraudKey === fraudKey);
          expect(thisKeyFrauds).to.have.length(1);
        });
      });
    });

    describe('Successful deposits frauds', () => {
      const createSuccessiveDeposits = async (
        minutesBack: number,
        timesDeposited: number = 3,
        paymentProviderId: number = 1,
      ) => {
        const cushionTime = 2 / 60;
        const spreadedMinutes = Array.from({ length: timesDeposited }, (v, i) =>
          moment()
            .subtract({ minutes: minutesBack - cushionTime - (i * minutesBack) / timesDeposited })
            .toDate(),
        );
        const defaultDepositAmount = 100 * 100;
        for (const timestamp of spreadedMinutes)
          await fakeDeposit(playerId, defaultDepositAmount, timestamp, paymentProviderId);
      };

      const rules = [
        { fraudKey: 'velocity_dep3tx_3min', deposits: 3, timeframeInMinutes: 3 },
        { fraudKey: 'velocity_dep6tx_12min', deposits: 6, timeframeInMinutes: 12 },
        { fraudKey: 'velocity_dep10tx_24h', deposits: 10, timeframeInMinutes: 24 * 60 },
      ];
      rules.forEach(({ fraudKey, deposits, timeframeInMinutes }) => {
        const timeframe =
          timeframeInMinutes < 60
            ? `${timeframeInMinutes} minutes`
            : `${timeframeInMinutes / 60} hours`;
        it(`triggers ${fraudKey} when customer made ${deposits} successfull deposits within ${timeframe}`, async () => {
          const { numDeposits: initialDeposits } = await getBalance(playerId);
          expect(initialDeposits).to.equal(0);
          await createSuccessiveDeposits(timeframeInMinutes, deposits);
          const { numDeposits } = await getBalance(playerId);
          expect(numDeposits).to.equal(deposits);
          const frauds = await Fraud.getUnchecked(playerId);
          expect(frauds).to.containSubset([{ fraudKey }]);
        });
      });

      it('triggers no_wagering_between_deps when customer made 2 or more deposits with no gameplay in between', async () => {
        const firstDepositAmount = 2000;
        const secondDepositAmount = 2500;
        const depositSum = firstDepositAmount + secondDepositAmount;
        const { transactionKey: tx1 } = await startDeposit(playerId, 1, firstDepositAmount);
        await processDeposit(
          firstDepositAmount,
          tx1,
          '',
          null,
          'external-id1',
          'complete',
          'Message',
          null,
          null,
          null,
          200,
        );
        const { transactionKey: tx2 } = await startDeposit(playerId, 1, secondDepositAmount);
        await processDeposit(
          secondDepositAmount,
          tx2,
          '',
          null,
          'external-id2',
          'complete',
          'Message',
          null,
          null,
          null,
          200,
        );
        const { numDeposits } = await getBalance(playerId);
        expect(numDeposits).to.equal(2);
        const frauds = await Fraud.getUnchecked(playerId);
        const foundFraud = frauds.find((fraud) => fraud.fraudKey === 'no_wagering_between_deps');
        expect(foundFraud).to.exist();
        if (foundFraud) {
          const fraud = await Fraud.getById(foundFraud.id);
          const testedDetail = fraud.details.find(
            (detail) => detail.key === 'Deposited since last Gameplay',
          );
          expect(testedDetail).to.exist();
          if (testedDetail) expect(testedDetail.value).to.equal(formatMoney(depositSum, 'EUR'));
        }
        expect(frauds).to.containSubset([{ fraudKey: 'no_wagering_between_deps' }]);
      });

      it('triggers no_wagering_between_deps when customer has gameplay and made 2 or more deposits with no gameplay in between', async () => {
        const previousDepositAmount = 3000;
        const firstDepositAmount = 2000;
        const secondDepositAmount = 2500;
        const depositSum = firstDepositAmount + secondDepositAmount;

        const { transactionKey: tx0 } = await startDeposit(playerId, 1, previousDepositAmount);
        await processDeposit(
          previousDepositAmount,
          tx0,
          '',
          null,
          'external-id0',
          'complete',
          'Message',
          null,
          null,
          null,
          200,
        );

        const gameplayId = await pg('transactions')
          .insert({
            playerId,
            type: 'bet',
            amount: 2000,
            bonusAmount: 0,
            playerBonusId: null,
            gameRoundId: 100,
            balance: 1800,
            bonusBalance: 0,
            reservedBalance: 0,
            manufacturerId: 'NE',
            externalTransactionId: 'external-id2',
            subTransactionId: Math.round(Math.random() * 1000),
            targetTransactionId: null,
            timestamp: new Date(),
          })
          .returning('id');

        const { transactionKey: tx1 } = await startDeposit(playerId, 1, firstDepositAmount);
        await processDeposit(
          firstDepositAmount,
          tx1,
          '',
          null,
          'external-id1',
          'complete',
          'Message',
          null,
          null,
          null,
          200,
        );
        const { transactionKey: tx2 } = await startDeposit(playerId, 1, secondDepositAmount);
        await processDeposit(
          secondDepositAmount,
          tx2,
          '',
          null,
          'external-id2',
          'complete',
          'Message',
          null,
          null,
          null,
          200,
        );
        const { numDeposits } = await getBalance(playerId);
        expect(numDeposits).to.equal(3);
        const frauds = await Fraud.getUnchecked(playerId);
        const foundFraud = frauds.find((fraud) => fraud.fraudKey === 'no_wagering_between_deps');
        expect(foundFraud).to.exist();
        if (foundFraud) {
          const fraud = await Fraud.getById(foundFraud.id);
          const testedDetail = fraud.details.find(
            (detail) => detail.key === 'Deposited since last Gameplay',
          );
          expect(testedDetail).to.exist();
          if (testedDetail) expect(testedDetail.value).to.equal(formatMoney(depositSum, 'EUR'));
        }
        expect(frauds).to.containSubset([{ fraudKey: 'no_wagering_between_deps' }]);
      });

      it('does not trigger no_wagering_between_deps when customer made only 1 deposit without previous deposits', async () => {
        const { numDeposits: previousNumDeposits } = await getBalance(playerId);
        expect(previousNumDeposits).to.equal(0);
        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 2000);
        await processDeposit(
          2000,
          tx1,
          '',
          null,
          'external-id1',
          'complete',
          'Message',
          null,
          null,
          null,
          200,
        );
        const { numDeposits } = await getBalance(playerId);
        expect(numDeposits).to.equal(1);
        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.not.containSubset([{ fraudKey: 'no_wagering_between_deps' }]);
      });

      it('does not trigger no_wagering_between_deps when customer made a gameplay between 2 deposits', async () => {
        const transactionsBefore = await pg('transactions').select('*');
        expect(transactionsBefore).to.have.length(0);
        const paymentsBefore = await pg('payments').select('*');
        expect(paymentsBefore).to.have.length(0);

        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 2000);
        await processDeposit(
          2000,
          tx1,
          'acc1',
          null,
          'external-id1',
          'complete',
          'Message',
          null,
          null,
          null,
          200,
        );

        const transactionsAfterFirstDeposit = await pg('transactions').select('*');
        expect(transactionsAfterFirstDeposit).to.have.length(2);
        expect(
          transactionsAfterFirstDeposit.filter(({ type }) => type === 'wallet_deposit'),
        ).to.have.length(1);
        expect(transactionsAfterFirstDeposit.filter(({ type }) => type === 'bet')).to.have.length(0);

        const paymentsAfterFirstDeposit = await pg('payments').select('*');
        expect(paymentsAfterFirstDeposit).to.have.length(1);

        const gameplayId = await pg('transactions')
          .insert({
            playerId,
            type: 'bet',
            amount: 2000,
            bonusAmount: 0,
            playerBonusId: null,
            gameRoundId: 100,
            balance: 1800,
            bonusBalance: 0,
            reservedBalance: 0,
            manufacturerId: 'NE',
            externalTransactionId: 'external-id2',
            subTransactionId: Math.round(Math.random() * 1000),
            targetTransactionId: null,
            timestamp: new Date(),
          })
          .returning('id');

        const transactionsAfterGameplay = await pg('transactions').select('*');
        expect(transactionsAfterGameplay).to.have.length(3);
        expect(
          transactionsAfterGameplay.filter(({ type }) => type === 'wallet_deposit'),
        ).to.have.length(1);
        expect(transactionsAfterGameplay.filter(({ type }) => type === 'bet')).to.have.length(1);

        const paymentsAfterGameplay = await pg('payments').select('*');
        expect(paymentsAfterGameplay).to.have.length(1);

        const { transactionKey: tx3 } = await startDeposit(playerId, 1, 2000);
        await processDeposit(
          2000,
          tx3,
          'acc1',
          null,
          'external-id3',
          'complete',
          'Message',
          null,
          null,
          null,
          200,
        );
        const { numDeposits } = await getBalance(playerId);
        expect(numDeposits).to.equal(2);

        const transactionsAfterSecondDeposit = await pg('transactions').select('*');
        expect(
          transactionsAfterSecondDeposit.filter(({ type }) => type === 'wallet_deposit'),
        ).to.have.length(2);
        expect(transactionsAfterSecondDeposit.filter(({ type }) => type === 'bet')).to.have.length(1);

        const paymentsAfterSecondDeposit = await pg('payments').select('*');
        expect(paymentsAfterSecondDeposit).to.have.length(2);

        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.not.containSubset([{ fraudKey: 'no_wagering_between_deps' }]);
      });

      it(`triggers each successful deposit fraud key only once per day`, async () => {
        const timeframeInMinutes = 3;
        const deposits = 20;
        const { numDeposits: initialDeposits } = await getBalance(playerId);
        expect(initialDeposits).to.equal(0);
        await createSuccessiveDeposits(timeframeInMinutes, deposits);
        const { numDeposits } = await getBalance(playerId);
        expect(numDeposits).to.equal(deposits);

        const frauds = await Fraud.getUnchecked(playerId);

        const dep3frauds = frauds.filter(({ fraudKey }) => fraudKey === 'velocity_dep3tx_3min');
        expect(dep3frauds).to.have.length(1);

        const dep6frauds = frauds.filter(({ fraudKey }) => fraudKey === 'velocity_dep6tx_12min');
        expect(dep6frauds).to.have.length(1);

        const dep10frauds = frauds.filter(({ fraudKey }) => fraudKey === 'velocity_dep10tx_24h');
        expect(dep10frauds).to.have.length(1);

        const noWageringBetweenDepsFrauds = frauds.filter(
          ({ fraudKey }) => fraudKey === 'no_wagering_between_deps',
        );
        expect(noWageringBetweenDepsFrauds).to.have.length(1);
      });

      it(`does not trigger velocity_dep10tx_24h if deposit is bank transfer from Trustly`, async () => {
        const bankTransferTrustlyPaymentProviderId = 29;
        const timeframeInMinutes = 24 * 60;
        const deposits = 20;
        const { numDeposits: initialDeposits } = await getBalance(playerId);
        expect(initialDeposits).to.equal(0);
        await createSuccessiveDeposits(
          timeframeInMinutes,
          deposits,
          bankTransferTrustlyPaymentProviderId,
        );
        const { numDeposits } = await getBalance(playerId);
        expect(numDeposits).to.equal(deposits);

        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.not.containSubset([{ fraudKey: 'velocity_dep10tx_24h' }]);
      });

      it(`does not trigger velocity_dep10tx_24h if deposit is bank transfer from Brite`, async () => {
        const bankTransferBritePaymentProviderId = 50;
        const timeframeInMinutes = 24 * 60;
        const deposits = 20;
        const { numDeposits: initialDeposits } = await getBalance(playerId);
        expect(initialDeposits).to.equal(0);
        await createSuccessiveDeposits(
          timeframeInMinutes,
          deposits,
          bankTransferBritePaymentProviderId,
        );
        const { numDeposits } = await getBalance(playerId);
        expect(numDeposits).to.equal(deposits);

        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.not.containSubset([{ fraudKey: 'velocity_dep10tx_24h' }]);
      });

      it(`does not trigger velocity_dep10tx_24h if deposit is bank transfer from Euteller`, async () => {
        const bankTransferEutellerPaymentProviderId = 22;
        const timeframeInMinutes = 24 * 60;
        const deposits = 20;
        const { numDeposits: initialDeposits } = await getBalance(playerId);
        expect(initialDeposits).to.equal(0);
        await createSuccessiveDeposits(
          timeframeInMinutes,
          deposits,
          bankTransferEutellerPaymentProviderId,
        );
        const { numDeposits } = await getBalance(playerId);
        expect(numDeposits).to.equal(deposits);

        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.not.containSubset([{ fraudKey: 'velocity_dep10tx_24h' }]);
      });

      it(`does not trigger velocity_dep10tx_24h if deposit is Siirto from Euteller`, async () => {
        const siirtoEutellerPaymentProviderId = 23;
        const timeframeInMinutes = 24 * 60;
        const deposits = 20;
        const { numDeposits: initialDeposits } = await getBalance(playerId);
        expect(initialDeposits).to.equal(0);
        await createSuccessiveDeposits(timeframeInMinutes, deposits, siirtoEutellerPaymentProviderId);
        const { numDeposits } = await getBalance(playerId);
        expect(numDeposits).to.equal(deposits);

        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.not.containSubset([{ fraudKey: 'velocity_dep10tx_24h' }]);
      });
    });

    describe('Failed deposits frauds', () => {
      const miminumRejectedDeposits = 3;
      const fakeRejectedDeposit = async (
        pid: number,
        timestamp: any,
        status: DepositStatus = 'failed',
      ): Promise<void> => {
        const { transactionKey } = await startDeposit(pid, 1, 2000);
        await pg('payments').where({ transactionKey }).update({ timestamp });
        await setDepositStatus(transactionKey, status, `Message ${status}`);
      };

      const timeframes = [24, 36, 72];
      timeframes.forEach((timeframe) => {
        it(`triggers high_rejection_rate when customer has 50% or more rejected deposits in ${timeframe} hours period with at least ${miminumRejectedDeposits} rejected deposits`, async () => {
          for (let i = 0; i < miminumRejectedDeposits; i += 1) {
            const backInTime = (timeframe - i) * 60;
            await fakeDeposit(playerId, 2000, moment().subtract({ minutes: backInTime - 1 }));
            await fakeRejectedDeposit(playerId, moment().subtract({ minutes: backInTime - 2 }));
          }
          const rejectedDeposits = await pg('payments').where({ status: 'failed' });
          expect(rejectedDeposits).to.have.length(miminumRejectedDeposits);
          const successfulDeposits = await pg('payments').where({ status: 'complete' });
          expect(successfulDeposits).to.have.length(miminumRejectedDeposits);

          await fakeRejectedDeposit(playerId, moment());

          const expectedRate = Intl.NumberFormat('en-US', {
            style: 'percent',
            maximumFractionDigits: 2,
          }).format((miminumRejectedDeposits + 1) / (miminumRejectedDeposits * 2 + 1));
          const frauds = await Fraud.getUnchecked(playerId);
          expect(frauds).to.containSubset([{ fraudKey: 'high_rejection_rate' }]);
          const fraud = frauds.find(({ fraudKey }) => fraudKey === 'high_rejection_rate');
          expect(fraud).to.exist();
          const fullFraud = fraud && (await Fraud.getById(fraud.id));
          expect(fullFraud)
            .to.exist()
            .and.to.have.property('details')
            .that.is.an('array')
            .with.length(3);
          if (!fullFraud) return;
          expect(fullFraud.details).to.containSubset([
            { key: 'Time Frame', value: `${timeframe} hours` },
            { key: 'Rejections', value: miminumRejectedDeposits + 1 },
            { key: 'Rejection Rate', value: expectedRate },
          ]);
        });
      });

      timeframes.forEach((timeframe) => {
        it(`does not trigger high_rejection_rate when customer has 50% or more rejected deposits in ${timeframe} hours period with less than ${miminumRejectedDeposits} rejected deposits`, async () => {
          const lessThanMinimum = miminumRejectedDeposits - 1;
          for (let i = 0; i < lessThanMinimum; i += 1) {
            const backInTime = (timeframe - i) * 60;
            await fakeDeposit(playerId, 2000, moment().subtract({ minutes: backInTime - 1 }));
            await fakeRejectedDeposit(playerId, moment().subtract({ minutes: backInTime - 2 }));
          }
          const rejectedDeposits = await pg('payments').where({ status: 'failed' });
          expect(rejectedDeposits).to.have.length(lessThanMinimum);
          const successfulDeposits = await pg('payments').where({ status: 'complete' });
          expect(successfulDeposits).to.have.length(lessThanMinimum);

          await fakeRejectedDeposit(playerId, moment());

          const expectedRate = Intl.NumberFormat('en-US', {
            style: 'percent',
            maximumFractionDigits: 2,
          }).format((miminumRejectedDeposits + 1) / (miminumRejectedDeposits * 2 + 1));
          const frauds = await Fraud.getUnchecked(playerId);
          expect(frauds).to.not.containSubset([{ fraudKey: 'high_rejection_rate' }]);
          const fraud = frauds.find(({ fraudKey }) => fraudKey === 'high_rejection_rate');
          expect(fraud).to.not.exist();
        });
      });

      const maxFrametime = timeframes[timeframes.length - 1];
      it(`does not trigger high_rejection_rate when customer has 50% or more rejected deposits in more than ${maxFrametime} hours period with at least ${miminumRejectedDeposits} rejected deposits`, async () => {
        const frametime = maxFrametime * 60;
        for (let i = 0; i < miminumRejectedDeposits; i += 1) {
          await fakeDeposit(playerId, 2000, moment().subtract({ minutes: frametime + 2 * i }));
          await fakeRejectedDeposit(playerId, moment().subtract({ minutes: frametime + i }));
        }
        const rejectedDeposits = await pg('payments').where({ status: 'failed' });
        expect(rejectedDeposits).to.have.length(miminumRejectedDeposits);
        const successfulDeposits = await pg('payments').where({ status: 'complete' });
        expect(successfulDeposits).to.have.length(miminumRejectedDeposits);

        await fakeRejectedDeposit(playerId, moment());

        const expectedRate = Intl.NumberFormat('en-US', {
          style: 'percent',
          maximumFractionDigits: 2,
        }).format((miminumRejectedDeposits + 1) / (miminumRejectedDeposits * 2 + 1));
        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.not.containSubset([{ fraudKey: 'high_rejection_rate' }]);
        const fraud = frauds.find(({ fraudKey }) => fraudKey === 'high_rejection_rate');
        expect(fraud).to.not.exist();
      });

      it('triggers high_rejection_count when customer has zero successful deposits in the last 24h and has attempted to deposit at least 3 times', async () => {
        await fakeRejectedDeposit(playerId, moment().subtract({ hours: 23 }), 'failed');
        await fakeRejectedDeposit(playerId, moment().subtract({ hours: 22 }), 'failed');
        await fakeRejectedDeposit(playerId, moment().subtract({ hours: 21 }), 'failed');
        await fakeRejectedDeposit(playerId, moment(), 'failed');

        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.containSubset([{ fraudKey: 'high_rejection_count' }]);
      });

      it('does not trigger high_rejection_count when customer has any successful deposits in the last 24h even if attempted to deposit at least 3 times', async () => {
        await fakeRejectedDeposit(playerId, moment().subtract({ hours: 23 }), 'failed');
        await fakeRejectedDeposit(playerId, moment().subtract({ hours: 22 }), 'failed');
        await fakeRejectedDeposit(playerId, moment().subtract({ hours: 21 }), 'failed');
        await fakeDeposit(playerId, 2000, moment().subtract({ hours: 20 }));
        await fakeRejectedDeposit(playerId, moment(), 'failed');

        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.not.containSubset([{ fraudKey: 'high_rejection_count' }]);
      });

      it('does not trigger high_rejection_count when customer has zero successful deposits in more than 24h and has attempted to deposit at least 3 times', async () => {
        await fakeRejectedDeposit(playerId, moment().subtract({ hours: 24 }), 'failed');
        await fakeRejectedDeposit(playerId, moment().subtract({ hours: 23 }), 'failed');
        await fakeRejectedDeposit(playerId, moment().subtract({ hours: 21 }), 'failed');
        await fakeRejectedDeposit(playerId, moment(), 'failed');

        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.not.containSubset([{ fraudKey: 'high_rejection_count' }]);
      });

      it('does not trigger high_rejection_count when customer has zero successful deposits in the last 24h and has attempted to deposit less than 3 times', async () => {
        await fakeRejectedDeposit(playerId, moment().subtract({ hours: 23 }), 'failed');
        await fakeRejectedDeposit(playerId, moment().subtract({ hours: 22 }), 'failed');
        await fakeRejectedDeposit(playerId, moment(), 'failed');

        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.not.containSubset([{ fraudKey: 'high_rejection_count' }]);
      });

      it('does not trigger high_rejection_count when customer has made a successful deposit even with 3 failed attempts in the last 24h', async () => {
        await fakeRejectedDeposit(playerId, moment().subtract({ hours: 23 }), 'failed');
        await fakeRejectedDeposit(playerId, moment().subtract({ hours: 22 }), 'failed');
        await fakeRejectedDeposit(playerId, moment().subtract({ hours: 21 }), 'failed');

        const { transactionKey: tx2 } = await startDeposit(playerId, 1, 2000);
        await processDeposit(2000, tx2, 'FI2112345600008739', null, 'external-id1', 'complete');

        const frauds = await Fraud.getUnchecked(playerId);
        expect(frauds).to.not.containSubset([{ fraudKey: 'high_rejection_count' }]);
      });

    });

    describe('Deposit over X amount frauds', () => {
      const thresholds = [
        { fraudKey: 'cumulative_deposits_5k', threshold: 5000 },
        { fraudKey: 'cumulative_deposits_10k', threshold: 10000 },
        { fraudKey: 'cumulative_deposits_25k', threshold: 25000 },
      ];
      thresholds.forEach(({ fraudKey, threshold }) => {
        const formattedThreshold = Intl.NumberFormat('en', {
          style: 'currency',
          currency: 'EUR',
        }).format(threshold);

        it(`triggers ${fraudKey} when deposited ${formattedThreshold} or more in a single account`, async () => {
          const [found, value] = /cumulative_deposits_(\d+)k/.exec(fraudKey) ?? ['', 0];
          expect(+value).to.equal(threshold / 1000);
          expect(found).to.have.length.greaterThan(0);

          const maxDeposit = 10000;
          let amountLeft = threshold;
          while (amountLeft > 0) {
            const depositAmount = Math.min(amountLeft, maxDeposit);
            await fakeDeposit(playerId, depositAmount * 100);
            amountLeft -= depositAmount;
          }

          const frauds = await Fraud.getUnchecked(playerId);
          expect(frauds).to.containSubset([{ fraudKey }]);
        });

        it(`does not trigger ${fraudKey} more than once`, async () => {
          const [found, value] = /cumulative_deposits_(\d+)k/.exec(fraudKey) ?? ['', 0];
          expect(+value).to.equal(threshold / 1000);
          expect(found).to.have.length.greaterThan(0);

          const maxDeposit = 10000;
          let amountLeft = threshold;
          let runsLeft = 2;
          while (runsLeft > 0) {
            const depositAmount = Math.min(amountLeft, maxDeposit);
            await fakeDeposit(playerId, depositAmount * 100);
            amountLeft -= depositAmount;
            if (amountLeft <= 0) {
              runsLeft -= 1;
              amountLeft = threshold;
            }
          }

          const frauds = await Fraud.getUnchecked(playerId);
          expect(frauds).to.containSubset([{ fraudKey }]);

          const currentFraudKeyFrauds = frauds.filter((fraud) => fraud.fraudKey === fraudKey);
          expect(currentFraudKeyFrauds).to.have.length(1);
        });
      });
    });

    describe('Lifetime deposit frauds', () => {
      it('triggers lifetime_deposit_2k when connected players deposit 2k', async () => {
        await Person.connectPlayersWithPerson(pg, playerId, secondPlayerId);

        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 1000_00);
        const { transactionKey: tx3 } = await startDeposit(secondPlayerId, 1, 1000_00);

        await processDeposit(1000_00, tx1, 'FI2112345600008739', null, 'external-id_2k_1', 'complete', 'Message', null, null, null, 2_00);
        await processDeposit(1000_00, tx3, 'FI2112345600008739', null, 'external-id_2k_2', 'complete', 'Message', null, null, null, 2_00);

        const frauds = await Fraud.getUnchecked(secondPlayerId);
        expect(frauds).to.containSubset([{ fraudKey: 'lifetime_deposit_2k', fraudId: `` }]);
      });

      it('does not trigger lifetime_deposit_2k when connected players deposit less than 2k', async () => {
        await Person.connectPlayersWithPerson(pg, playerId, secondPlayerId);

        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 1000_00);
        const { transactionKey: tx3 } = await startDeposit(secondPlayerId, 1, 999_00);

        await processDeposit(1000_00, tx1, 'FI2112345600008739', null, 'external-id_2k_1', 'complete', 'Message', null, null, null, 2_00);
        await processDeposit(999_00, tx3, 'FI2112345600008739', null, 'external-id_2k_2', 'complete', 'Message', null, null, null, 2_00);

        const frauds = await Fraud.getUnchecked(secondPlayerId);
        expect(frauds).to.not.containSubset([{ fraudKey: 'lifetime_deposit_2k', fraudId: `` }]);
      });

      it('does not trigger lifetime_deposit_2k again after it was checked', async () => {
        await Person.connectPlayersWithPerson(pg, playerId, secondPlayerId);

        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 1000_00);
        const { transactionKey: tx3 } = await startDeposit(secondPlayerId, 1, 1000_00);

        await processDeposit(1000_00, tx1, 'FI2112345600008739', null, 'external-id_2k_1', 'complete', 'Message', null, null, null, 2_00);
        await processDeposit(1000_00, tx3, 'FI2112345600008739', null, 'external-id_2k_2', 'complete', 'Message', null, null, null, 2_00);

        const frauds = await Fraud.getUnchecked(secondPlayerId);
        expect(frauds).to.containSubset([{ fraudKey: 'lifetime_deposit_2k', fraudId: `` }]);

        const fraud = frauds.find((f) => f.fraudKey === 'lifetime_deposit_2k');
        if (!fraud) {
          expect(true).to.equal(false);
          return;
        }
        await Fraud.check(fraud.id, 1, true, 'lifetime_deposit_2k');

        const { transactionKey: tx4 } = await startDeposit(secondPlayerId, 1, 1000_00);
        await processDeposit(1000_00, tx4, 'FI2112345600008739', null, 'external-id_2k_3', 'complete', 'Message', null, null, null, 2_00);

        const fraudsAfterCheck = await Fraud.getUnchecked(secondPlayerId);
        expect(fraudsAfterCheck).to.not.containSubset([{ fraudKey: 'lifetime_deposit_2k', fraudId: `` }]);
      });
    });

    describe('Deposit monitoring expected monthly deposits frauds', () => {
      beforeEach(async () => {
        await clean.players();
        playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
        secondPlayerId = await Player.create({ brandId: 'CJ', ...john }).then(({ id }) => id);
        await Person.connectPlayersWithPerson(pg, playerId, secondPlayerId);
      });

      it('triggers expected_monthly_deposits when customer has deposited double the expected amount in a month', async () => {
        const expectedMonthlyDeposit = '5-250';
        await answerQuestionnaire(playerId, 'Lifetime_Deposit_2k', [
          { key: 'industry', value: 'audit' },
          { key: 'salary', value: '1-2k' },
          { key: 'monthlyDeposit', value: expectedMonthlyDeposit },
        ]);

        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 250_00);
        const { transactionKey: tx2 } = await startDeposit(secondPlayerId, 1, 250_00);

        await processDeposit(250_00, tx1, 'FI2112345600008739', null, 'external-id_emd_1', 'complete', 'Message', null, null, null, 2_00);
        await processDeposit(250_00, tx2, 'FI2112345600008739', null, 'external-id_emd_2', 'complete', 'Message', null, null, null, 2_00);

        const referenceFraudKey = 'deposit_estimation_doubled';
        const frauds = await Fraud.getUnchecked(secondPlayerId);
        expect(frauds).to.containSubset([{ fraudKey: referenceFraudKey }]);

        const fraud = frauds.find(({ fraudKey }) => fraudKey === referenceFraudKey);
        expect(fraud).to.exist();
        const fullFraud = fraud && (await Fraud.getById(fraud.id));
        expect(fullFraud).to.exist().and.to.have.property('details').that.is.an('array').with.length(2);
        if (!fullFraud) return;
        expect(fullFraud.details).to.containSubset([
          { key: 'Expected Monthly Deposit', value: expectedMonthlyDeposit },
          { key: 'Amount Deposited Last 30 Days', value: '€500.00' },
        ]);
      });

      it('triggers expected_monthly_deposits when customer has deposited more than the expected amount in a month', async () => {
        const expectedMonthlyDeposit = '5-250';
        await answerQuestionnaire(playerId, 'Lifetime_Deposit_2k', [
          { key: 'industry', value: 'audit' },
          { key: 'salary', value: '1-2k' },
          { key: 'monthlyDeposit', value: expectedMonthlyDeposit },
        ]);

        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 250_00);
        const { transactionKey: tx2 } = await startDeposit(secondPlayerId, 1, 251_00);

        await processDeposit(250_00, tx1, 'FI2112345600008739', null, 'external-id_emd_3', 'complete', 'Message', null, null, null, 2_00);
        await processDeposit(251_00, tx2, 'FI2112345600008739', null, 'external-id_emd_4', 'complete', 'Message', null, null, null, 2_00);

        const referenceFraudKey = 'deposit_estimation_doubled';
        const frauds = await Fraud.getUnchecked(secondPlayerId);
        expect(frauds).to.containSubset([{ fraudKey: referenceFraudKey }]);

        const fraud = frauds.find(({ fraudKey }) => fraudKey === referenceFraudKey);
        expect(fraud).to.exist();
        const fullFraud = fraud && (await Fraud.getById(fraud.id));
        expect(fullFraud).to.exist().and.to.have.property('details').that.is.an('array').with.length(2);
        if (!fullFraud) return;
        expect(fullFraud.details).to.containSubset([
          { key: 'Expected Monthly Deposit', value: expectedMonthlyDeposit },
          { key: 'Amount Deposited Last 30 Days', value: '€501.00' },
        ]);
      });

      it('does not trigger expected_monthly_deposits when customer has deposited less than double of the expected amount in a month', async () => {
        await answerQuestionnaire(playerId, 'Lifetime_Deposit_2k', [
          { key: 'industry', value: 'audit' },
          { key: 'salary', value: '1-2k' },
          { key: 'monthlyDeposit', value: '5-250' },
        ]);

        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 250_00);
        const { transactionKey: tx2 } = await startDeposit(secondPlayerId, 1, 249_00);

        await processDeposit(250_00, tx1, 'FI2112345600008739', null, 'external-id_emd_5', 'complete', 'Message', null, null, null, 2_00);
        await processDeposit(249_00, tx2, 'FI2112345600008739', null, 'external-id_emd_6', 'complete', 'Message', null, null, null, 2_00);

        const frauds = await Fraud.getUnchecked(secondPlayerId);
        expect(frauds).to.not.containSubset([{ fraudKey: 'deposit_estimation_doubled' }]);
      });

      it('does not trigger expected_monthly_deposits when customer has deposited double of the expected amount in over 30 days period', async () => {
        await answerQuestionnaire(playerId, 'Lifetime_Deposit_2k', [
          { key: 'industry', value: 'audit' },
          { key: 'salary', value: '1-2k' },
          { key: 'monthlyDeposit', value: '5-250' },
        ]);

        await fakeDeposit(playerId, 250_00, moment().subtract({ days: 30, minutes: 1 }));

        const { transactionKey } = await startDeposit(secondPlayerId, 1, 250_00);
        await processDeposit(250_00, transactionKey, 'FI2112345600008739', null, 'external-id_emd_7', 'complete', 'Message', null, null, null, 2_00);

        const frauds = await Fraud.getUnchecked(secondPlayerId);
        expect(frauds).to.not.containSubset([{ fraudKey: 'deposit_estimation_doubled' }]);
      });

      it('does not trigger expected_monthly_deposits when customer has not answered questionnaire yet', async () => {
        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 1000_00);
        const { transactionKey: tx2 } = await startDeposit(secondPlayerId, 1, 1500_00);

        await processDeposit(1000_00, tx1, 'FI2112345600008739', null, 'external-id_emd_8', 'complete', 'Message', null, null, null, 2_00);
        await processDeposit(1500_00, tx2, 'FI2112345600008739', null, 'external-id_emd_9', 'complete', 'Message', null, null, null, 2_00);

        const frauds = await Fraud.getUnchecked(secondPlayerId);
        expect(frauds).to.not.containSubset([{ fraudKey: 'deposit_estimation_doubled' }]);
      });

      it('does not trigger expected_monthly_deposits again if already triggered in the last 30 days', async () => {
        const expectedMonthlyDeposit = '5-250';
        await answerQuestionnaire(playerId, 'Lifetime_Deposit_2k', [
          { key: 'industry', value: 'audit' },
          { key: 'salary', value: '1-2k' },
          { key: 'monthlyDeposit', value: expectedMonthlyDeposit },
        ]);

        const { transactionKey: tx1 } = await startDeposit(playerId, 1, 250_00);
        const { transactionKey: tx2 } = await startDeposit(secondPlayerId, 1, 250_00);

        await processDeposit(250_00, tx1, 'FI2112345600008739', null, 'external-id_emd_10', 'complete', 'Message', null, null, null, 2_00);
        await processDeposit(250_00, tx2, 'FI2112345600008739', null, 'external-id_emd_11', 'complete', 'Message', null, null, null, 2_00);

        const referenceFraudKey = 'deposit_estimation_doubled';
        const frauds = await Fraud.getUnchecked(secondPlayerId);
        expect(frauds).to.containSubset([{ fraudKey: referenceFraudKey }]);
        const fraud = frauds.find(({ fraudKey }) => fraudKey === referenceFraudKey);
        expect(fraud).to.exist();
        const fullFraud = fraud && (await Fraud.getById(fraud.id));
        expect(fullFraud).to.exist().and.to.have.property('details').that.is.an('array').with.length(2);
        if (!fullFraud) return;
        expect(fullFraud.details).to.containSubset([
          { key: 'Expected Monthly Deposit', value: expectedMonthlyDeposit },
          { key: 'Amount Deposited Last 30 Days', value: '€500.00' },
        ]);

        const { transactionKey: tx3 } = await startDeposit(secondPlayerId, 1, 250_00);
        await processDeposit(250_00, tx3, 'FI2112345600008739', null, 'external-id_emd_12', 'complete', 'Message', null, null, null, 2_00);

        const fraudsAfter = await Fraud.getUnchecked(secondPlayerId);
        expect(fraudsAfter).to.containSubset([{ fraudKey: referenceFraudKey }]);
        const latestFrauds = fraudsAfter.filter((f) => f.fraudKey === referenceFraudKey);
        expect(latestFrauds).to.have.length(1);
        expect(latestFrauds).to.containSubset([{ fraudKey: referenceFraudKey }]);

        const fraudAfter = frauds.find(({ fraudKey }) => fraudKey === referenceFraudKey);
        expect(fraudAfter).to.exist().and.to.have.property('id').equals(fraud?.id);
        const fullFraudAfter = fraudAfter && (await Fraud.getById(fraudAfter.id));
        expect(fullFraudAfter).to.exist().and.to.have.property('details').that.is.an('array').with.length(2);
        if (!fullFraudAfter) return;
        expect(fullFraudAfter.details).to.containSubset([
          { key: 'Expected Monthly Deposit', value: expectedMonthlyDeposit },
          { key: 'Amount Deposited Last 30 Days', value: '€500.00' },
        ]);
      });
    });
  });
});
