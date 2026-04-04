/* @flow */
const moment = require('moment-timezone');
const request = require('supertest');

const pg = require('gstech-core/modules/pg');
const app = require('../../../index');

const Player = require('../../players/Player');
const { findOrCreateAccount } = require('../../accounts');
const { addTransaction } = require("../Payment");
const { createWithdrawal, getPendingWithdrawalsReadyToAccept } = require('./Withdrawal');
const { players: { john } } = require('../../../../scripts/utils/db-data');

const { update } = require('./AutoAcceptWithdrawalsJob');

describe('Auto Accept Withdrawals Job', () => {
  it('can automatically accept pending withdrawals', async () => {
    await clean.players();
    const playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
    const accountId = await pg.transaction(async (tx) => {
      const acc = await findOrCreateAccount(playerId, 4, '444444xxxxxxxxx4444', null, 1, { paymentIqAccountId: 'bfd1fd22-134e-472b-865e-fb6bd7e269a2', provider: 'SafeCharge' }, tx);
      await addTransaction(playerId, null, 'compensation', 5000, 'Added some money', 1, tx);
      return acc;
    });

    const transactionKey = await createWithdrawal(playerId, null, accountId, 2500);
    const [payment] = await pg('payments').select().where({ transactionKey });

    await request(app)
      .put(`/api/v1/player/${playerId}/withdrawals/${transactionKey}/delay`)
      .send({ paymentProviderId: 18, amount: 3000, parameters: { staticId: 123 } })
      .expect(200);

    await pg('payment_event_logs').update({ timestamp: moment().subtract({ hours: 2 }).toISOString() }).where({ paymentId: payment.id });

    const withdrawals = await getPendingWithdrawalsReadyToAccept(2);
    expect(withdrawals.length).to.deep.equal(1);

    await update();

    const withdrawals2 = await getPendingWithdrawalsReadyToAccept(2);
    expect(withdrawals2.length).to.deep.equal(0);
  });
});
