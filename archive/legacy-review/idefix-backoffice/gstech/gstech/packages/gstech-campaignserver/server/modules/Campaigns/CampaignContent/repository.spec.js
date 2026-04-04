/* @flow */

const _ = require('lodash');

const pg = require('gstech-core/modules/pg');

const { cleanDb } = require('../../../utils');
const repository = require('./repository');
const {
  campaigns,
  campaignsContent,
  campaignsPlayers,
  content,
  contentType,
  countries,
  events,
  players,
} = require('../../../mockData');

describe('CampaignContent repository', () => {
  let campaignContentId;

  before(async () => {
    await cleanDb();
    await pg('campaigns').insert(campaigns);
    await pg('content_type').insert(contentType);
    await pg('content').insert(content);
    await pg('countries').insert(countries);
    await pg('players').insert(players);
    await pg('campaigns_players').insert(campaignsPlayers);
    await pg('campaigns_content').insert(campaignsContent);
    await pg('events').insert(events);
  });

  describe('createCampaignContent', () => {
    it('cant connect campaign and content, cause active is false', async () => {
      await expect(
        repository.createCampaignContent(pg, campaigns[3].id, {
          contentId: content[9].id,
        }),
      ).to.be.rejectedWith('Content should be active.');
    });

    it('can connect campaign and content', async () => {
      campaignContentId = await repository.createCampaignContent(pg, campaigns[4].id, {
        contentId: content[0].id,
      });

      const [campaignContent] = await pg('campaigns_content').where({
        id: campaignContentId,
      });
      expect(campaignContent).to.deep.equal({
        id: campaignContentId,
        campaignId: campaigns[4].id,
        contentId: content[0].id,
        contentTypeId: contentType[0].id,
        sendingTime: null,
        removedAt: null,
        sendToAll: false,
      });
    });
  });

  describe('getPlayerNotificationsWithEvents', () => {
    it('can get player notifications', async () => {
      const notifications = await repository.getPlayerNotificationsWithEvents(pg, 2);

      expect(notifications.length).to.equal(1);
      expect(notifications[0].campaignId).to.equal(campaignsContent[3].campaignId);
      expect(notifications[0].contentId).to.equal(campaignsContent[3].contentId);
      expect(notifications[0].name).to.equal(content[4].name);
      expect(notifications[0].externalId).to.equal(content[4].externalId);
      expect(notifications[0].content).to.deep.equal(JSON.parse(content[4].content));
      expect(notifications[0].events.length).to.equal(1);
      expect(notifications[0].events[0]).to.deep.equal(
        _.pick(events[7], 'text', 'timestamp', 'extras'),
      );
    });

    it('can get testPlayer notifications', async () => {
      const notifications = await repository.getPlayerNotificationsWithEvents(pg, 4);

      expect(notifications.length).to.equal(1);
      expect(notifications[0]).to.containSubset({ campaignId: campaigns[5].id });
    });
  });

  describe('upsertCampaignContent', () => {
    it('cant upsert campaign content, cause content.active is false', async () => {
      await expect(
        repository.upsertCampaignContent(pg, campaigns[0].id, {
          contentId: content[9].id,
          sendingTime: '15:00:00+02',
        }),
      ).to.be.rejectedWith('Content should be active.');
    });
  });

  describe('updateCampaignContent', () => {
    it('cant update campaign with new content, cause content.active is false', async () => {
      await expect(
        repository.updateCampaignContent(pg, campaignContentId, {
          contentId: content[9].id,
          sendingTime: '15:00:00+02',
        }),
      ).to.be.rejectedWith('Content should be active.');
    });

    it('can update campaign content', async () => {
      const campaignContent = await repository.updateCampaignContent(pg, campaignContentId, {
        contentId: content[0].id,
        sendingTime: '15:00:00+02',
      });

      expect(campaignContent).to.deep.equal({
        id: campaignContentId,
        campaignId: campaigns[4].id,
        contentId: content[0].id,
        contentTypeId: contentType[0].id,
        sendingTime: '15:00:00+02',
        removedAt: null,
        sendToAll: false,
      });
    });
  });

  describe('deleteCampaignContent', () => {
    it('can delete campaign content', async () => {
      const affectedRows = await repository.deleteCampaignContent(pg, campaignContentId);

      expect(affectedRows).to.equal(1);
    });

    it('does not prevent to add another content afterwards', async () => {
      campaignContentId = await repository.createCampaignContent(pg, campaigns[4].id, {
        contentId: content[0].id,
      });

      expect(campaignContentId).to.be.a('number');
    });
  });
});
