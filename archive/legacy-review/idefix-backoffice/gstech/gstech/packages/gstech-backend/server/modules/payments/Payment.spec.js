/* @flow */

const { DateTime } = require('luxon');
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const { players: { john } } = require('../../../scripts/utils/db-data');
const { startDeposit, processDeposit } = require('./deposits/Deposit');
const { createWithdrawal, acceptWithdrawal, processWithdrawal, markWithdrawalAsComplete } = require('./withdrawals/Withdrawal');
const { findOrCreateAccount } = require('../accounts');
const { statement, getPaymentInfo, addTransaction, payments, getPaymentSummary } = require('./Payment');
const HourlyActivityUpdateJob = require('../reports/jobs/HourlyActivityUpdateJob');
const Player = require('../players/Player');

describe('Payments', () => {
  let playerId;

  beforeEach(async () => {
    await clean.players();
    playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
    await pg.transaction(tx =>
      addTransaction(playerId, null, 'compensation', 5000, 'Added some money', 1, tx));
    const accountId = await pg.transaction(tx => findOrCreateAccount(playerId, 1, 'FI2112345600008739', null, 1, { bic: 'DABAIE2D' }, tx));
    const transactionKeyWd = await createWithdrawal(playerId, null, accountId, 2500);
    await acceptWithdrawal(transactionKeyWd, 1, 2500, 1, playerId, { staticId: 123 });
    await processWithdrawal(transactionKeyWd, 'WD processed', '{}');
    await markWithdrawalAsComplete(transactionKeyWd, 'externalid-123123', 'WD Complete', {});

    await createWithdrawal(playerId, null, accountId, 2500);

    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');

    await startDeposit(playerId, 1, 2000);
    await startDeposit(playerId, 1, 2000);
  });

  it('returns payment info for player', async () => {
    const result = await getPaymentInfo(playerId);
    expect(result).to.deep.equal({
      depositCount: 1,
      totalDepositAmount: 2000,
      totalWithdrawalAmount: 2500,
      withdrawalCount: 1,
    });
  });

  it('returns payment summary for player', async () => {
    await HourlyActivityUpdateJob.update(moment());
    const result = await getPaymentSummary(playerId);
    expect(result).to.deep.equal({
      bonusToReal: 0,
      compensations: 5000,
      creditedBonusMoney: 0,
      depositAmountInSixMonths: 2000,
      depositCountInSixMonths: 1,
      freespins: 0,
      withdrawalAmountInSixMonths: 2500,
      withdrawalCountInSixMonths: 1,
    });
  });

  it('returns account statement', async () => {
    const result = await statement(playerId);
    expect(result.length).to.equal(2);
    expect(result[0].account).to.equal('FI2112345600008739');
    expect(result[0].paymentMethod).to.equal('BankTransfer');
    expect(result[0].paymentType).to.equal('deposit');
    expect(result[1].account).to.equal('FI2112345600008739');
    expect(result[1].paymentMethod).to.equal('BankTransfer');
    expect(result[1].paymentType).to.equal('withdraw');
  });

  it('returns payment transaction list for a player', async () => {
    const result = await payments(playerId);
    expect(result.length).to.equal(6);
  });

  it('returns payment transaction list for a player with paging', async () => {
    const result = await payments(playerId, { pageIndex: 0, pageSize: 3 });
    expect(result.length).to.equal(3);
  });

  it('returns payment transaction list for a player with date range filter', async () => {
    let from = DateTime.local().startOf('month').toJSDate();
    let to = DateTime.local().endOf('month').toJSDate();

    const result = await payments(playerId, undefined, undefined, { from, to });
    expect(result.length).to.equal(6);

    from = DateTime.local().plus({ months: 1 }).startOf('month').toJSDate();
    to = DateTime.local().plus({ months: 1 }).endOf('month').toJSDate();

    const result2 = await payments(playerId, undefined, undefined, { from, to });
    expect(result2.length).to.equal(0);
  });
});
