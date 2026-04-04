/* @flow */
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');

const {
  players: { john, jack },
} = require('../../../../scripts/utils/db-data');
const Player = require('../Player');

const VIPBirthdaysJob = require('./VIPBirthdaysJob');

describe('Executes VIPBirthdaysJob', () => {
  beforeEach(async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;

    await clean.players();
    await Player.create({ brandId: 'LD', ...john });
    const vipPlayer1 = await Player.create({ brandId: 'CJ', ...john, dateOfBirth: todayString });
    const vipPlayer2 = await Player.create({ brandId: 'LD', ...jack });
    await Player.addTag(vipPlayer1.id, 'vip');
    await Player.addTag(vipPlayer2.id, 'vip');
  });

  it('sends slack notification to VIP players with Birthday', async () => {
    const players = await pg.select('*').from('players');
    logger.info('+++ VIPBirthdaysJob Test started', players);
    try {
      await VIPBirthdaysJob.run();
    } catch (error) {
      logger.error('XXX VIPBirthdaysJob Test Error', error);
      expect(true).to.be.equal(false);
    }
    logger.info('+++ VIPBirthdaysJob Test completed');
  });
});
