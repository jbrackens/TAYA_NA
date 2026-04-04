/* @flow */
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const {
  players: { testPlayer },
} = require('../../../scripts/utils/db-data');
const Player = require('./Player');
const PlayerActivity = require('./PlayerActivity');
const Fraud = require('../frauds/Fraud');

describe('Players Activity', () => {
  describe('Able to catch inactive players', () => {
    let playerId;

    before(async () => {
      await clean.players();
      const player = await Player.create(testPlayer({ brandId: 'LD' }));
      playerId = player.id;
    });

    it('existing player asleep 11 months and zero balance - not visible', async () => {
      await pg('players')
        .update({ lastLogin: moment().subtract(11, 'months') })
        .where({ id: playerId });
      const catchingPlayers = await PlayerActivity.getPlayersByInactivityPeriod(pg, 11);
      expect(catchingPlayers).to.be.an('array').with.length(0);
    });

    it('existing player asleep 17 months and zero balance - visible', async () => {
      await pg('players')
        .update({ lastLogin: moment().subtract(17, 'months') })
        .where({ id: playerId });
      const catchingPlayers = await PlayerActivity.getPlayersByInactivityPeriod(pg, 17, true);
      expect(catchingPlayers).to.be.an('array').with.length(1);
    });

    it('existing player asleep 11 months and non-zero balance - visible', async () => {
      await pg('players')
        .update({ lastLogin: moment().subtract(11, 'months'), balance: 1000 })
        .where({ id: playerId });
      const catchingPlayers = await PlayerActivity.getPlayersByInactivityPeriod(pg, 11);
      expect(catchingPlayers).to.be.an('array').with.length(1);
    });
  });

  describe('Inactivity Fee Deduction', () => {
    let playerId1;
    let playerId2;
    const player1InitialBalance = 3500;
    const player2InitialBalance = 35000;
    const fee = PlayerActivity.INACTIVITY_FEE.value * 100;

    before(async () => {
      await clean.players();
      const player1 = await Player.create(testPlayer({ brandId: 'LD' }));
      const player2 = await Player.create(testPlayer({ brandId: 'LD', currencyId: 'NOK' }));
      playerId1 = player1.id;
      playerId2 = player2.id;
      await pg('players').update({ balance: player1InitialBalance }).where({ id: playerId1 });
      await pg('players').update({ balance: player2InitialBalance }).where({ id: playerId2 });
    });

    it('should handle inactive players with fee deduction or trigger fraud', async () => {
      for (const [i, v] of [12, 13, 14, 15, 16, 17, 18].entries()) {
        await pg('players')
          .update({ lastLogin: moment().subtract(v, 'months') })
          .whereIn('id', [playerId1, playerId2]);
        await PlayerActivity.actionInactivePlayers();
        const { balance: player1Bal } = await Player.getBalance(playerId1);
        const { balance: player2Bal } = await Player.getBalance(playerId2);
        if (v < 18) {
          expect(player1Bal).to.equal(player1InitialBalance - fee * (i + 1));
          expect(player2Bal).to.equal(player2InitialBalance - fee * 10 * (i + 1));
        } else {
          expect(player1Bal).to.equal(player1InitialBalance - fee * 6);
          expect(player2Bal).to.equal(player2InitialBalance - fee * 10 * 6);
          const player1Frauds = await Fraud.getUnchecked(playerId1);
          expect(player1Frauds).to.containSubset([
            {
              fraudKey: '18mo_inactive',
              fraudId: moment().format('YYYYMM'),
            },
          ]);
          const player2Frauds = await Fraud.getUnchecked(playerId2);
          expect(player2Frauds).to.containSubset([
            {
              fraudKey: '18mo_inactive',
              fraudId: moment().format('YYYYMM'),
            },
          ]);
        }
      }
    });
  });
});
