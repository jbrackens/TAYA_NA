/* @flow */

const nock = require('nock');

const client = require('gstech-core/modules/clients/campaignserver-api');
const superClient = require('gstech-core/modules/superClient');
const ports = require('gstech-core/modules/ports');
const pg = require('gstech-core/modules/pg');

const app = require('../../app');
const { cleanDb } = require('../../utils');
const { content, contentType, countries, players } = require('../../mockData');

// nock.recorder.rec();

nock('https://cdn.contentful.com:443', { encodedQueryParams: true })
  .get('/spaces/r4zhhatpe62n/environments/master/entries')
  .query({ content_type: 'localization', locale: '%2A', limit: '1', 'fields.key': 'mailer-footer' })
  .reply(
    200,
     
    {
      sys: {
        type: 'Array',
      },
      total: 1,
      skip: 0,
      limit: 1,
      items: [
        {
          sys: {
            space: {
              sys: {
                type: 'Link',
                linkType: 'Space',
                id: 'r4zhhatpe62n',
              },
            },
            id: '629QO24xMY8TDoaXaaJ07l',
            type: 'Entry',
            createdAt: '2020-05-29T09:39:05.863Z',
            updatedAt: '2020-05-29T14:52:47.975Z',
            environment: {
              sys: {
                id: 'master',
                type: 'Link',
                linkType: 'Environment',
              },
            },
            revision: 3,
            contentType: {
              sys: {
                type: 'Link',
                linkType: 'ContentType',
                id: 'localization',
              },
            },
          },
          fields: {
            key: {
              fi: 'mailer-footer',
            },
            text: {
              en:
                'KalevalaKasino.com is operated by LuckyDino Gaming LTD. Sender LuckyDino Gaming Limited, Office 33, Regent House, 8 Bisazza Street, SLM 1640, Sliema, Malta.\n\nUnsubscribe from future marketing messages {unsubscribe|here}.',
              fi:
                'KalevalaKasino.com sivustoa operoi LuckyDino Gaming LTD. Lähettäjä LuckyDino Gaming Limited, Office 33, Regent House, 8 Bisazza Street, SLM 1640, Sliema, Malta.\n\nMikäli et halua vastaanottaa viestejä jatkossa, paina {link|tästä}.',
            },
          },
        },
      ],
    },
  );

describe('Emails routes', () => {
  before(async () => {
    await cleanDb();
    await pg('countries').insert(countries);
    await pg('players').insert(players);
    await pg('content_type').insert(contentType);
    await pg('content').insert(content);
  });

  describe('sendEmailForExternalCampaign (client)', () => {
    it('can create new campaign and send emails to player', async () => {
      await superClient(app, ports.campaignServer.publicPort, client)
        .call((api) =>
          api.sendEmailForExternalCampaign(
            content[1].name,
            players[0].externalId,
            players[0].brandId,
          ),
        )
        .expect(200, (res) => {
          expect(res.ok).to.equal(true);
        });

      // Wait for queue to process the email
      await new Promise(r => setTimeout(r, 300));

      const campaigns = await pg('campaigns');
      expect(campaigns.length).to.equal(1);
      expect(campaigns[0].name).to.equal(content[1].name);

      const campaignsPlayers = await pg('campaigns_players');
      expect(campaignsPlayers.length).to.equal(1);
      expect(campaignsPlayers[0].campaignId).to.equal(campaigns[0].id);
      expect(campaignsPlayers[0].playerId).to.equal(players[0].id);
      expect(campaignsPlayers[0].emailSentAt).to.not.equal(null);
    });
  });

  describe('sendEmailDirectly (client)', () => {
    it('can send directly an email', async () => {
      await superClient(app, ports.campaignServer.publicPort, client)
        .call((api) =>
          api.sendEmailDirectly({
            mailerId: content[1].name,
            brandId: players[0].brandId,
            email: players[0].email,
            currencyId: players[0].currencyId,
            languageId: players[0].languageId,
            firstName: players[0].firstName,
            values: { pinCode: 123412 },
          }),
        )
        .expect(200, (res) => {
          expect(res.ok).to.equal(true);
        });
    });
  });
});
