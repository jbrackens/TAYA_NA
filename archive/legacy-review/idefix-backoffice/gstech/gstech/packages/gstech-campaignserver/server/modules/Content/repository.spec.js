/* @flow */

const pg = require('gstech-core/modules/pg');

const repository = require('./repository');
const { connectPlayersWithCampaign } = require('../Campaigns/repository');
const {
  countries,
  campaigns,
  content,
  contentType,
  campaignsContent,
  players,
  events,
} = require('../../mockData');
const { cleanDb } = require('../../utils');
const AudienceBuilder = require('../Campaigns/AudienceRule/AudienceBuilder');

describe('Content repository', () => {
  describe('getPlayerAvailableContent', () => {
    before(async () => {
      await cleanDb();
      await pg('content_type').insert(contentType);
      await pg('content').insert(
        content.map(({ content: con, ...c }, i) => ({
          ...c,
          content: JSON.stringify({
            ...JSON.parse(con),
            location: i === 0 ? null : `location-${i % 3}`,
          }),
        })),
      );
      await pg('campaigns').insert(campaigns);
      await pg('campaigns_content').insert(campaignsContent);
      await pg('countries').insert(countries);
      await pg('players').insert(players);
      await pg('events').insert(events);
    });

    it('returns empty array if no results found', async () => {
      const result = await repository.getPlayerAvailableContent(pg, 1, 'email');

      expect(result.length).to.equal(0);
    });

    it('returns players available content in players language of type email', async () => {
      const ab = new AudienceBuilder(pg, campaigns[1]);
      ab.in('players.externalId', [1]);
      await connectPlayersWithCampaign(pg, ab.getQueryBuilder(), campaigns[1].id);

      const result = await repository.getPlayerAvailableContent(pg, 1, 'email');
      const contentWithoutTimestamp = result.map((c) => ({
        ...c,
        events: c.events.map((e) => ({ text: e.text })),
      }));

      expect(result.length).to.equal(1);
      expect(contentWithoutTimestamp[0].events).to.deep.have.members([
        { text: 'open' },
        { text: 'close' },
        { text: 'click' },
      ]);
      expect(contentWithoutTimestamp[0].id).to.equal(1);
      expect(contentWithoutTimestamp[0].name).to.equal('content-name-1');
      expect(contentWithoutTimestamp[0].content).to.deep.equal(JSON.parse(content[0].content).en);
    });

    it('returns players available content of type sms', async () => {
      const result = await repository.getPlayerAvailableContent(pg, 1, 'sms');

      expect(result.length).to.equal(1);
      expect(result[0].name).to.equal('sms-1');
      expect(result[0].events.length).to.equal(2);
    });
  });

  describe('createContent', () => {
    const contentDraft = {
      content: {},
      name: 'name-1',
      externalId: 'name-1',
      brandId: 'CJ',
      type: 'banner',
      subtype: 'nice-one',
      active: false,
    };

    it('should return an error if content type is not found', async () => {
      await expect(repository.createContent(pg, contentDraft)).to.be.rejectedWith(
        'Cannot find content type for brandId: CJ, type: banner',
      );
    });

    it('should create content when content type found', async () => {
      const [cT] = await pg('content_type')
        .insert({ brandId: 'CJ', type: 'banner' })
        .returning('id');
      expect(cT.id).to.exist();
      const result = await repository.createContent(pg, contentDraft);

      expect(result).to.deep.equal({
        id: result.id,
        name: contentDraft.name,
        externalId: contentDraft.externalId,
        subtype: contentDraft.subtype,
        content: contentDraft.content,
        contentTypeId: cT.id,
        updatedAt: result.updatedAt,
        status: 'draft',
        active: contentDraft.active,
      });
    });
  });

  describe('getPlayerSentContent', () => {
    it('get content sent to player with events', async () => {
      const c = content[0];
      const timestamp = new Date('2020-12-17T11:59:14.098Z');
      await pg('campaigns_players').update({ emailSentAt: timestamp, smsSentAt: timestamp });

      const r = await repository.getPlayerSentContent(pg, 1);

      expect(r).to.deep.containSubset({
        content: [
          {
            name: c.name,
            viewedAt: events[3].timestamp,
            clickedAt: undefined,
            timestamp,
            type: 'email',
            previewUrl: `http://localhost:3013/api/v1/emails/${c.id}/preview?lang=${players[0].languageId}`,
          },
        ],
        pagination: {
          pageIndex: 1,
          pageSize: 10,
          total: 2,
        },
      });
    });
  });

  describe('getLocalizations', () => {
    it('can get localizations for brand', async () => {
      const result = await repository.getLocalizations(pg, { brandId: 'KK' });

      expect(result.length).to.equal(1);
      expect(result[0].id).to.deep.equal(content[10].id);
    });

    it('filters properly by brand', async () => {
      const result = await repository.getLocalizations(pg, { brandId: 'OS' });

      expect(result.length).to.equal(0);
    })
  });
});
