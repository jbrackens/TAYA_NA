/* @flow */

const proxyquire = require('proxyquire');

const pg = require('gstech-core/modules/pg');

const { campaigns, campaignsPlayers, countries, players } = require('./mockData');
const { cleanDb } = require('./utils');

const workers = proxyquire('./workers', {
  './modules/Smses/smsRenderer': {
    renderSms: () => ({ brandId: 'KK', content: { en: 'content' } }),
  },
  'gstech-core/modules/sms/index': {
    send: () => ({ ok: false, message: 'Invalid phone number' }),
  },
});

describe('workers', () => {
  before(async () => {
    await cleanDb();
    await pg('countries').insert(countries);
    await pg('players').insert(players);
    await pg('campaigns').insert(campaigns);
    await pg('campaigns_players').insert(campaignsPlayers);
  });

  describe('smsJob', () => {
    it('mark users mobile phone as invalid on "Invalid phone number" message', async () => {
      const player = players[0];
      await workers.smsJob({
        data: {
          mobilePhone: player.mobilePhone,
          campaignPlayerId: campaignsPlayers[0].id,
          player,
        },
      });

      const dbPlayer = await pg('players').where({ id: player.id }).first();
      expect(dbPlayer.invalidMobilePhone).to.equal(true);
    });
  });
});
