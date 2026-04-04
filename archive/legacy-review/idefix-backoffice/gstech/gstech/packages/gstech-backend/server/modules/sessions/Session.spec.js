/* @flow */
const { players: { john } } = require('../../../scripts/utils/db-data');
const { createSession, destroy, getSessionTotals, get } = require('./Session');
const Player = require('../players/Player');

describe('Sessions', () => {
  describe('when created succesfully', () => {
    let session;
    let player;

    before(async () => {
      await clean.players();
      player = await Player.create({ brandId: 'LD', ...john });
      session = await createSession(player, '6.5.43.2', 'Mozilla/5.0 (Linux; Android 9; SM-G960F Build/PPR1.180610.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/74.0.3729.157 Mobile Safari/537.36');
    });

    it('can get clientInfo for players last session', async () => {
      const info = await Player.getClientInfo(player.id);
      expect(info).to.deep.equal({
        ipAddress: '6.5.43.2',
        userAgent: 'Mozilla/5.0 (Linux; Android 9; SM-G960F Build/PPR1.180610.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/74.0.3729.157 Mobile Safari/537.36',
        isMobile: true,
      });
    });

    it('returns totals for player', async () => {
      const totals = await getSessionTotals(player.id);
      expect(totals).to.containSubset({ bonusBet: 0, bonusWin: 0, realBet: 0, realWin: 0 });
    });

    it('can log out and logout time is recorded', async () => {
      const sessionBeforeLogout = await get(player.id, session.id);
      expect(sessionBeforeLogout).to.containSubset({ endReason: null });
      await destroy(player, 'logout');
      const sessionAfterLogout = await get(player.id, session.id);
      expect(sessionAfterLogout).to.containSubset({ endReason: 'logout' });
    });
  });
});
