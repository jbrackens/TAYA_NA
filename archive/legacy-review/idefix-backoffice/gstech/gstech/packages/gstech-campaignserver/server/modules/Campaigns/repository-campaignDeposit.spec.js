/* @flow */

const pg = require('gstech-core/modules/pg');

const { connectDepositWithPlayerActiveCampaigns } = require('../Players/repository');
const mock = require('../../mockData');
const { cleanDb } = require('../../utils');

describe('Repository campaigns_deposits', () => {
  before(async () => {
    await cleanDb();
    await pg('campaigns').insert(mock.campaigns[1]);
    await pg('campaigns').insert(mock.campaigns[2]);
    await pg('countries').insert(mock.countries);
    await pg('players').insert(mock.players[0]);
    await pg('players').insert(mock.players[1]);
    await pg('players').insert(mock.players[2]);
    await pg('campaigns_players').insert(mock.campaignsPlayers[0]);
    await pg('campaigns_players').insert(mock.campaignsPlayers[1]);
    await pg('campaigns_players').insert(mock.campaignsPlayers[2]);
    await pg('campaigns_players').insert({ ...mock.campaignsPlayers[2], id: 4, playerId: 1 });
    await pg('deposits').insert(mock.deposits[0]);
    await pg('deposits').insert({ ...mock.deposits[0], id: 2, paymentId: 1234, perPlayerCount: 2 });
    await pg('deposits').insert({ ...mock.deposits[0], id: 3, paymentId: 12345, perPlayerCount: 3 });
  });

  beforeEach(async () => await pg('campaigns_deposits').del());

  describe('connectDepositWithPlayersActiveCampaigns', () => {
    it('can connect 1 deposit with 2 active players campaign and ignore other players campaigns', async () => {
      await connectDepositWithPlayerActiveCampaigns(pg, 1, 1, []);

      const result = await pg('campaigns_deposits').select(
        'campaignId',
        'depositId',
        'playerConsent',
      );
      expect(result.length).to.equal(1);
      expect(result).to.have.deep.members([
        { campaignId: mock.campaigns[1].id, depositId: mock.deposits[0].id, playerConsent: false },
      ]);
    });

    it('registers all deposits for static campaigns even if player was removed/marked as complete', async () => {
      await connectDepositWithPlayerActiveCampaigns(pg, 1, 1, [mock.campaigns[1].id]);
      await pg('campaigns_players').update({ removedAt: new Date(), complete: true });
      await connectDepositWithPlayerActiveCampaigns(pg, 2, 1, []);

      const result = await pg('campaigns_deposits').select(
        'campaignId',
        'depositId',
        'playerConsent',
      );
      expect(result).to.have.deep.members([
        { campaignId: mock.campaigns[1].id, depositId: mock.deposits[0].id, playerConsent: true },
        { campaignId: mock.campaigns[1].id, depositId: 2, playerConsent: false },
      ]);
    });

    it('does not register deposits for dynamic campaigns without consent', async () => {
      await connectDepositWithPlayerActiveCampaigns(pg, 3, 2, []);

      const result = await pg('campaigns_deposits').select('*').where({ campaignId: mock.campaigns[2].id });
      expect(result.length).to.equal(0);
    });

    it('registers consent deposits for dynamic campaigns', async () => {
      await connectDepositWithPlayerActiveCampaigns(pg, 3, 2, [mock.campaigns[2].id]);

      const result = await pg('campaigns_deposits').select(
        'campaignId',
        'depositId',
        'playerConsent',
      ).where({ campaignId: mock.campaigns[2].id });
      expect(result).to.have.deep.members([
        { campaignId: mock.campaigns[2].id, depositId: 3, playerConsent: true },
      ]);
    })
  });
});
