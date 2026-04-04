/* @flow */
const depositNotificationWorker = require('./DepositNotificationWorker');
const { players: { testPlayer } } = require('../../../../../scripts/utils/db-data');
const Player = require('../../../players/Player');
const { startDeposit, processDeposit } = require('../../../payments/deposits/Deposit');

describe('Valid deposit notifications', () => {
  let player;
  let transactionKey;

  before(async () => {
    await clean.players();
    player = await Player.create(testPlayer({ countryId: 'FI', currencyId: 'EUR', brandId: 'LD' }));
    const { transactionKey: txKey } = await startDeposit(player.id, 1, 2000);
    transactionKey = txKey;
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
  });

  it('posts valid deposit notification', async () => {
    const job: any = {
      data: { playerId: player.id, transactionKey },
    };
    const { request } = await depositNotificationWorker.handleJob(job);
    expect(request).to.containSubset({
      player: {
        numDeposits: 1,
      },
      deposit: {
        amount: 2000,
        paymentMethod: 'BankTransfer',
        paymentProvider: 'Entercash',
        index: 0,
      },
    });
  });
});
