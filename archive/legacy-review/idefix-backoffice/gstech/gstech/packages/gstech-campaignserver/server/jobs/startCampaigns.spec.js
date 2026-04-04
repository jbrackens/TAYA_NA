/* @flow */

const pg = require('gstech-core/modules/pg');

const startCampaigns = require('./startCampaigns');
const { campaigns, content, contentType, countries, players, subscriptionOptions } = require('../mockData');
const { cleanDb } = require('../utils');

describe('startCampaigns', () => {
  beforeEach(cleanDb);

  it('does not do much when there is no candidates for update', async () => {
    const campaignsStarted = await startCampaigns();

    expect(campaignsStarted).to.equal(0);
  });

  it('does not start campaigns if infinite recurrence detected', async () => {
    await pg('campaigns').insert(campaigns);
    await pg('audience_rules').insert({
      campaignId: 4,
      name: '',
      operator: 'otherCampaignsMember',
      values: { campaignIds: [1], state: 'any' },
    });

    const started = await startCampaigns();
    expect(started).to.equal(0);
  });

  it('does 2 rounds if dependency campaign is not running (yet)', async () => {
    await pg('campaigns').insert({ ...campaigns[0], status: 'active' });
    await pg('campaigns').insert(campaigns.slice(1));

    await pg('audience_rules').insert({
      campaignId: 4,
      name: '',
      operator: 'otherCampaignsMember',
      values: { campaignIds: [1], state: 'any' },
    });

    const started = await startCampaigns();
    expect(started).to.equal(2);
  });

  it('starts campaigns if dependency campaign is running', async () => {
    await pg('campaigns').insert(campaigns);
    await pg('audience_rules').insert({
      campaignId: 4,
      name: '',
      operator: 'otherCampaignReward',
      values: { campaignId: 3, rewardId: 1 },
    });

    const started = await startCampaigns();
    expect(started).to.equal(1);
  });

  it('starts all the campaigns that needs to be started and send content', async () => {
    const campaignId = campaigns[3].id;
    await pg('campaigns').insert(campaigns);
    await pg('countries').insert(countries);
    await pg('subscription_options').insert(subscriptionOptions);
    await pg('players').insert(players.map((p) => ({ ...p, subscriptionOptionsId: 1 })));
    await pg('content_type').insert(contentType);
    await pg('content').insert(content);
    await pg('campaigns_content').insert({
      contentId: content[0].id,
      contentTypeId: content[0].contentTypeId,
      sendingTime: '14:00:00+02:00',
      campaignId,
      sendToAll: false,
    });
    await pg('audience_rules').insert({ campaignId, name: 'numDeposits', operator: '>', values: 5 });

    const campaignsStarted = await startCampaigns();

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(campaignsStarted).to.equal(1);
    const startedCampaigns = (await pg('campaigns').select('id').where({ status: 'running' })).map(
      ({ id }) => id,
    );
    expect(startedCampaigns).to.include.members([campaignId]);
    expect(startedCampaigns).to.not.include.members([5]);
    const campaignPlayers = await pg('campaigns_players').where({ campaignId });
    expect(campaignPlayers.length).to.equal(4);
    expect(campaignPlayers.filter(({ emailSentAt }) => emailSentAt !== null).length).to.equal(1);
  });
});
