/* @flow */
const playerNotificationWorker = require('./PlayerNotificationWorker');
const { players: { testPlayer } } = require('../../../../../scripts/utils/db-data');
const Player = require('../../../players/Player');

describe('Player notifications', () => {
  let player;
  before(async () => {
    player = await Player.create(testPlayer({ countryId: 'FI', currencyId: 'EUR', brandId: 'LD' }));
  });

  it('posts valid player data notification', async () => {
    const job: any = {
      data: { playerId: player.id },
    };
    await playerNotificationWorker.handleJob(job);
  });
});
