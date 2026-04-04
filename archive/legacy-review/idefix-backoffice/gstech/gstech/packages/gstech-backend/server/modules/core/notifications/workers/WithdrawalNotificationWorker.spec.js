/* @flow */
const pg = require('gstech-core/modules/pg');
const withdrawalNotificationWorker = require('./WithdrawalNotificationWorker');
const { players: { testPlayer } } = require('../../../../../scripts/utils/db-data');
const Player = require('../../../players/Player');
const { findOrCreateAccount } = require('../../../accounts');
const { addTransaction } = require('../../../payments/Payment');
const { createWithdrawal, acceptWithdrawal } = require('../../../payments/withdrawals/Withdrawal');
const nock = require('nock'); // eslint-disable-line

// nock.recorder.rec();

nock('http://localhost:3007')
  .post('/api/v1/withdraw', w => w.withdrawal.account === 'FI2112345600008739')
  .reply(200, { ok: true, id: 123 });

describe('Valid withdrawal notifications', () => {
  let player;
  let withdrawalId;

  before(async () => {
    player = await Player.create(testPlayer({ countryId: 'FI', currencyId: 'EUR', brandId: 'LD' }));
    const accountId = await pg.transaction(async (tx) => {
      const acc = await findOrCreateAccount(player.id, 1, 'FI2112345600008739', null, 1, { bic: 'NDEAFIHH' }, tx);
      await addTransaction(player.id, null, 'compensation', 5000, 'Added some money', 1, tx);
      return acc;
    });
    const transactionKey = await createWithdrawal(player.id, null, accountId, 2500);
    const wd = await pg('payments').first('id').where({ transactionKey });
    await acceptWithdrawal(transactionKey, 1, 2500, 1, player.id, { staticId: 213 });
    withdrawalId = wd.id;
  });

  it('posts valid withdrawal notification', async () => {
    const job: any = {
      data: { playerId: player.id, withdrawalId, userId: 1 },
    };
    const { request } = await withdrawalNotificationWorker(job);
    expect(request.player.id).to.equal(player.id);
    expect(request).to.containSubset({
      user: { handle: 'Test', name: 'Test Support User' },
      withdrawal: {
        amount: 2500,
        status: 'accepted',
        account: 'FI2112345600008739',
        accountParameters: { bic: 'NDEAFIHH' },
        paymentParameters: { staticId: 213 },
        paymentProvider: 'Entercash',
      },
    });
  });
});
