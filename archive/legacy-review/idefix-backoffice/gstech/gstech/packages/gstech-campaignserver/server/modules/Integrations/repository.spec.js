/* @flow */

const pg = require('gstech-core/modules/pg');

const { processEmailReport, publishContent } = require('./repository');
const {
  campaigns,
  campaignsPlayers,
  campaignsContent,
  countries,
  content,
  contentType,
  players,
} = require('../../mockData');
const { cleanDb } = require('../../utils');

describe('Integrations repository', () => {
  before(async () => {
    await cleanDb();
    await pg('countries').insert(countries);
    await pg('players').insert(players);
    await pg('content_type').insert(contentType);
    await pg('content_type').insert({ ...contentType[5], brandId: 'OS', id: 100 });
    await pg('content').insert(content);
    await pg('campaigns').insert(campaigns);
    await pg('campaigns_players').insert(campaignsPlayers);
    await pg('campaigns_content').insert(campaignsContent);
  });

  describe('processEmailReport', () => {
    it('can process successful email report', async () => {
      await processEmailReport(
        ({
          campaignPlayerId: campaignsPlayers[0].id.toString(),
          contentId: content[0].id.toString(),
          email: 'xxxx@gmail.com',
          event: 'delivered',
          response: '250 2.0.0 OK  1604910180 v8si5965775eju.136 - gsmtp ',
        }: any),
      );

      const events: any[] = await pg('events');
      expect(events.length).to.equal(1);
      expect(events[0]).to.deep.containSubset({
        text: 'delivered',
        playerId: campaignsPlayers[0].playerId,
        campaignId: campaignsPlayers[0].campaignId,
        campaignContentId: campaignsContent[1].id,
      });
    });

    it('can process domain block', async () => {
      await processEmailReport(
        ({
          campaignPlayerId: campaignsPlayers[0].id.toString(),
          contentId: content[0].id.toString(),
          email: 'xxxx@gmail.com',
          event: 'bounce',
          reason: `421 4.7.0 [168.245.2.241 15] Our system has detected that this message is suspicious due to the very low reputation of the sending domain. To best protect our users from spam, the message has been blocked. Please visit https://support.google.com/mail/answer/188131 for more information. k185-20020a816fc2000000b002f1a7cbf3c5si958081ywc.57 - gsmtp`,
        }: any),
      );

      const events: any[] = await pg('events');
      expect(events.length).to.equal(2);
      expect(events).to.deep.containSubset([
        {
          text: 'bounced',
          playerId: campaignsPlayers[0].playerId,
          campaignId: campaignsPlayers[0].campaignId,
          campaignContentId: campaignsContent[1].id,
          extras: {
            reason: 'Message blocked for domain of brand KK',
          },
        },
      ]);

      const player = await pg('players').where({ id: campaignsPlayers[0].playerId }).first();
      expect(player.invalidEmail).to.equal(false);
    });
  });

  describe('publishContent', () => {
    it('should be able to process localization', async () => {
      await publishContent(
        {
          metadata: { tags: [] },
          sys: {
            space: { sys: { type: 'Link', linkType: 'Space', id: '3tiyadjidkkt' } },
            id: '3n8wo2yVGkv8LzMGfhQ0gy',
            type: 'Entry',
            createdAt: '2020-05-29T09:23:02.060Z',
            updatedAt: '2021-04-14T16:51:43.448Z',
            environment: { sys: { id: 'master', type: 'Link', linkType: 'Environment' } },
            revision: 5,
            contentType: { sys: { type: 'Link', linkType: 'ContentType', id: 'localization' } },
          },
          fields: {
            key: { nb: 'mailer-footer' },
            text: {
              en:
                'Olaspill.Com is operated by ESPORT ENTERTAINMENT (MALTA) LIMITED, Penthouse Office 13/14, Mannarino Road, Birkirkara BKR 9080, Malta.\n\nUnsubscribe from future marketing messages {link|here}.',
              nb:
                'OlaSpill.com driftes av ESPORT ENTERTAINMENT (MALTA) LIMITED, Penthouse Office 13/14, Mannarino Road, Birkirkara BKR 9080, Malta.\n\nMeld deg av fremtidig markedsføringskommunikasjon {link|her}.',
            },
          },
        },
        'OS',
      );
    });
  });
});
