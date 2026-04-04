/* @flow */

const client = require('gstech-core/modules/clients/campaignserver-api');
const superClient = require('gstech-core/modules/superClient');
const ports = require('gstech-core/modules/ports');
const pg = require('gstech-core/modules/pg');

const app = require('../../app');
const { cleanDb } = require('../../utils');
const { content, contentType, countries, players } = require('../../mockData');

describe('Smses routes', () => {
  before(async () => {
    await cleanDb();
    await pg('countries').insert(countries);
    await pg('players').insert(players);
    await pg('content_type').insert(contentType);
    await pg('content').insert(content);
  });

  describe('sendSmsForExternalCampaign (client)', () => {
    it('can create new campaign and send sms to player', async () => {
      await superClient(app, ports.campaignServer.publicPort, client)
        .call((api) =>
          api.sendSmsForExternalCampaign(
            content[2].name,
            players[0].externalId,
            players[0].brandId,
          ),
        )
        .expect(200, (res) => {
          expect(res.ok).to.equal(true);
        });

      // Wait for queue to process the sms
      await new Promise(r => setTimeout(r, 300));

      const campaigns = await pg('campaigns');
      expect(campaigns.length).to.equal(1);
      expect(campaigns[0].name).to.equal(content[2].name);

      const campaignsPlayers = await pg('campaigns_players');
      expect(campaignsPlayers.length).to.equal(1);
      expect(campaignsPlayers[0].campaignId).to.equal(campaigns[0].id);
      expect(campaignsPlayers[0].playerId).to.equal(players[0].id);
      expect(campaignsPlayers[0].smsSentAt).to.not.equal(null);
    });
  });
});
