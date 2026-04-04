/* @flow */

const pg = require('gstech-core/modules/pg');

const { cleanDb } = require('../utils');
const sendCorrespondence = require('./sendCorrespondence');
const {
  campaigns,
  campaignsContent,
  content,
  contentType,
  campaignsPlayers,
  countries,
  players,
} = require('../mockData');
const { emailQueue, smsQueue } = require('../queues');

describe('sendCorrespondence', () => {
  before(cleanDb);

  it('returns proper result if no candidates', async () => {
    const result = await sendCorrespondence();

    expect(result).to.deep.equal({ sms: 0, email: 0 });
  });

  it('returns amount of campaigns scheduled for sending', (done) => {
    let smsCounter = 0;
    let emailCounter = 0;
    smsQueue.on('global:completed', () => {
      smsCounter += 1;
      if (smsCounter === 2 && emailCounter === 2) done();
    });
    emailQueue.on('global:completed', () => {
      emailCounter += 1;
      if (smsCounter === 2 && emailCounter === 2) done();
    });

    (async () => {
      try {
        await pg('content_type').insert(contentType);
        await pg('content').insert(content);
        await pg('countries').insert(countries);
        const [sO] = await pg('subscription_options')
          .insert({ emails: 'all', smses: 'all' })
          .returning('id');
        expect(sO.id).to.exist();
        await pg('players').insert(
          players.map((p) => ({
            ...p,
            subscriptionOptionsId: sO.id,
            allowSMSPromotions: true,
            allowEmailPromotions: true,
          })),
        );
        await pg('campaigns').insert(campaigns);
        await pg('campaigns_players').insert(campaignsPlayers);
        await pg('campaigns_content').insert(
          campaignsContent.map(({ sendingTime, ...rest }) => ({
            ...rest,
            sendingTime: pg.raw('now()'),
          })),
        );

        const result = await sendCorrespondence();

        expect(result).to.deep.equal({ email: 1, sms: 1 });
      } catch (e) {
        done(e);
      }
    })();
  });
});
