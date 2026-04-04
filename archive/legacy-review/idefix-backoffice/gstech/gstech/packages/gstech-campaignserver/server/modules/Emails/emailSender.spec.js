/* @flow */

const nock = require('nock');
const pg = require('gstech-core/modules/pg');

const { sendEmail, sendContentForExternalCampaign } = require('./emailSender');
const { cleanDb } = require('../../utils');
const {
  campaigns,
  campaignsPlayers,
  countries,
  contentType,
  content,
  players,
} = require('../../mockData');

nock('https://api.sendgrid.com:443', { encodedQueryParams: true })
  .post('/v3/mail/send', {
    from: { email: 'noreply@kalevalakasino.com', name: 'Kalevala Kasino' },
    reply_to: { email: 'support@kalevalakasino.com', name: 'Kalevala Kasino' },
    template_id: 'd-6fc7a508574943939a97031e0e22a7c4',
    personalizations: [
      {
        to: [{ email: 'patryk@gmail.com' }],
        dynamic_template_data: {
          content:
            '<p style="color: #666666; font-family: helvetica, sans-serif; font-size: 13px; margin: 10px 0; text-align: left;">en</p>\n',
          footer:
            '<p style="color: #8c8c8c; font-family: helvetica, sans-serif; font-size: 10px; text-align: center;">Sent by LuckyDino Gaming Limited, Office 33, Regent House, 8 Bisazza Street, SLM 1640, Sliema, Malta. Unsubscribe from future marketing messages <a href="https://kalevalakasino.com/en/unsubscribe?email=patryk@gmail.com">here</a>.</p>\n',
          imageUrl: '',
        },
        subject: 'Subject en 1',
        custom_args: {
          campaignId: 1,
          contentId: 1,
        },
      },
    ],
  })
  .reply(202, '');

describe('emailSender', () => {
  before(async () => {
    await cleanDb();
    await pg('content_type').insert(contentType);
    await pg('content').insert(content);
    await pg('campaigns').insert(campaigns);
    await pg('countries').insert(countries);
    await pg('players').insert(players);
    await pg('campaigns_players').insert(campaignsPlayers);
  });

  describe('sendEmail', () => {
    it('can send email', async () => {
      await sendEmail(1, {
        id: 1,
        firstName: 'Patryk Kosiarz',
        currencyId: 'EUR',
        languageId: 'en',
        email: 'patryk@gmail.com',
      }, { campaignPlayerId: 1 });
    });
  });

  describe('sendContentForExternalCampaign', () => {
    let campaignId;
    const playerId = 1;
    const name = 'content-name-1';
    const brandId = 'KK';

    it('Throws error with 403 if email does not exist', async () => {
      await expect(sendContentForExternalCampaign(pg, 'xxx', playerId, brandId)).to.be.rejectedWith(
        {
          message: `Could not find an email of name xxx for brand ${brandId}`,
          httpCode: 403,
        },
      );
    });

    it('Throws error with 403 if player does not exist', async () => {
      await expect(sendContentForExternalCampaign(pg, name, 1111, brandId)).to.be.rejectedWith({
        message: 'Could not find a player of id 1111',
        httpCode: 403,
      });
    });

    it('can create new campaign if does not exist', async () => {
      await sendContentForExternalCampaign(pg, name, playerId, brandId);

      // Wait for queue to process the email
      await new Promise(r => setTimeout(r, 300));

      const cp = await pg('campaigns_players')
        .where({ playerId })
        .whereNot({ campaignId: campaignsPlayers[0].campaignId });
      expect(cp.length).to.equal(1);
      campaignId = cp[0].campaignId;
      expect(cp[0].emailSentAt).to.not.equal(null);

      const cc = await pg('campaigns_content')
        .leftJoin('content_type', 'content_type.id', 'campaigns_content.contentTypeId')
        .where({ campaignId, type: 'email', brandId });
      expect(cc.length).to.equal(1);
    });

    it('can use already created campaign', async () => {
      await sendContentForExternalCampaign(pg, name, 2, brandId);

      // Wait for queue to process the email
      await new Promise(r => setTimeout(r, 300));

      const cp = await pg('campaigns_players')
        .where({ playerId: 2 })
        .whereNot({ campaignId: campaignsPlayers[2].campaignId });
      expect(cp.length).to.equal(1);
      expect(cp[0].campaignId).to.equal(campaignId);
      expect(cp[0].emailSentAt).to.not.equal(null);
    });

    it('do not allow to send email twice', async () => {
      await expect(sendContentForExternalCampaign(pg, name, playerId, brandId)).to.be.rejectedWith({
        message: 'email already sent',
        httpCode: 403,
      });
    });
  });
});
