/* @flow */

const request = require('supertest');

const pg = require('gstech-core/modules/pg');
const superClient = require('gstech-core/modules/superClient');
const ports = require('gstech-core/modules/ports');
const client = require('gstech-core/modules/clients/campaignserver-api');

const app = require('../../app-private');
const { countries, players, subscriptionOptions } = require('../../mockData');
const { cleanDb } = require('../../utils');

describe('Players routes', () => {
  const subscriptionToken = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

  before(async () => {
    await pg('countries').insert(countries);
    await pg('subscription_options').insert(subscriptionOptions);
    await pg('players').insert(players);
    await pg('players')
      .update({ subscriptionToken, subscriptionOptionsId: subscriptionOptions[0].id })
      .where({ id: 1 });
  });

  after(cleanDb);

  describe('updatePlayerSubscriptionOptions', () => {
    it('check for proper uuid token', async () => {
      await request(app)
        .put('/api/v1/players/subscription-options?token=xxx')
        .send({ emails: 'best_offers' })
        .expect(({ body }) => {
          expect(JSON.parse(body.error.message)).to.deep.equal({
            token: 'Token must be a valid GUID',
          });
        })
        .expect(400);
    });

    it('finds user by uuid and updates his subscription options', async () => {
      await request(app)
        .put(`/api/v1/players/subscription-options?token=${subscriptionToken}`)
        .send({ emails: 'new_games' })
        .expect(({ body }) => {
          expect(body.data.ok).to.equal(true);
        })
        .expect(200);

      const result = await pg('subscription_options')
        .where({ id: subscriptionOptions[0].id })
        .first();
      expect(result.emails).to.equal('new_games');
    });

    it('finds user by externalId and updates his subscription options', async () => {
      await request(app)
        .put(`/api/v1/players/subscription-options?playerId=1`)
        .send({ emails: 'best_offers' })
        .expect(({ body }) => {
          expect(body.data.ok).to.equal(true);
        })
        .expect(200);

      const result = await pg('subscription_options')
        .where({ id: subscriptionOptions[0].id })
        .first();
      expect(result.emails).to.equal('best_offers');
    });

    it('finds user by externalId and updates his subscription options (superClient)', async () => {
      await superClient(app, ports.campaignServer.privatePort, client)
        .call((api) =>
          api.updatePlayerSubscriptionOptions({ playerId: 1 }, { emails: 'new_games' }),
        )
        .expect(200, (res) => {
          expect(res.ok).to.equal(true);
        });

      const result = await pg('subscription_options')
        .where({ id: subscriptionOptions[0].id })
        .first();
      expect(result.emails).to.equal('new_games');
    });
  });

  describe('getPlayerSubscriptionOptions', () => {
    const response = {
      data: {
        email: players[0].email,
        playerId: 1,
        emails: 'new_games',
        smses: 'all',
        emailsSnoozed: false,
        smsesSnoozed: false,
      },
    };

    it('gets subscription options by token', async () => {
      await request(app)
        .get(`/api/v1/players/subscription-options?token=${subscriptionToken}`)
        .expect(({ body }) => {
          expect(body).to.deep.equal(response);
        })
        .expect(200);
    });

    it('gets subscription options by playerId', async () => {
      await request(app)
        .get(`/api/v1/players/subscription-options?playerId=1`)
        .expect(({ body }) => {
          expect(body).to.deep.equal(response);
        })
        .expect(200);
    });

    it('gets subscription options by playerId (superClient)', async () => {
      await pg('subscription_options')
        .where({ id: subscriptionOptions[0].id })
        .update({ snoozeEmailsUntil: '2020-10-07T08:56:53.073Z' });

      await superClient(app, ports.campaignServer.privatePort, client)
        .call((api) => api.getPlayerSubscriptionOptions({ playerId: 1 }))
        .expect(200, (res) => {
          expect(res).to.deep.equal({ ...response.data, emailsSnoozed: true });
        });
    });
  });

  describe('snoozePlayerSubscription', () => {
    it('snooze email subscriptions', async () => {
      await request(app)
        .post(`/api/v1/players/subscription-options/snooze?playerId=1`)
        .send({ type: 'email' })
        .expect(({ body }) => {
          expect(body).to.deep.equal({ data: { ok: true } });
        })
        .expect(200);

      const result = await pg('subscription_options')
        .where({ id: subscriptionOptions[0].id })
        .first();
      expect(result.snoozeEmailsUntil).to.not.equal(null);
    });

    it('snooze sms subscriptions', async () => {
      await superClient(app, ports.campaignServer.privatePort, client)
        .call((api) => api.snoozePlayerSubscription({ playerId: 1 }, 'sms'))
        .expect(200, (res) => {
          expect(res).to.deep.equal({ ok: true });
        });

      const result = await pg('subscription_options')
        .where({ id: subscriptionOptions[0].id })
        .first();
      expect(result.snoozeSmsesUntil).to.not.equal(null);
    });

    it('can revert snooze', async () => {
      await superClient(app, ports.campaignServer.privatePort, client)
        .call((api) => api.snoozePlayerSubscription({ playerId: 1 }, 'sms', true))
        .expect(200, (res) => {
          expect(res).to.deep.equal({ ok: true });
        });

      const result = await pg('subscription_options')
        .where({ id: subscriptionOptions[0].id })
        .first();
      expect(result.snoozeSmsesUntil).to.equal(null);
    });
  });
});
