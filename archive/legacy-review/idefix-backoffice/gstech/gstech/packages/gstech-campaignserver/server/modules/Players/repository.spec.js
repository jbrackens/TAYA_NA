/* @flow */

import type { Player } from './repository';

const moment = require('moment-timezone');

const pg = require('gstech-core/modules/pg');

const { cleanDb } = require('../../utils');
const { countries } = require('../../mockData');
const {
  createOrUpdatePlayerSubscriptionOptions,
  getPlayer,
  getPlayerSubscriptionToken,
  upsertPlayer,
  snoozePlayerSubscription,
} = require('./repository');

describe('Players repository', () => {
  let player: Player;
  const playerDraft = {
    externalId: 1,
    brandId: 'LD',
    username: 'Username1',
    email: 'e@mail.com',
    firstName: 'Albin',
    mobilePhone: '1113124121',
    countryId: 'FI',
    languageId: 'en',
    currencyId: 'EUR',
    allowEmailPromotions: true,
    allowSMSPromotions: false,
    createdAt: new Date('2019-06-01T07:27:58.422Z'),
    numDeposits: 12,
    gamblingProblem: false,
    potentialGamblingProblem: false,
    tags: ['tag1', 'tag2'],
    segments: ['segment1', 'segment2'],
    testPlayer: false,
    registrationLandingPage: 'page-1',
  };

  before(async () => {
    await pg('countries').insert(countries);
  });

  after(cleanDb);

  describe('upsertPlayer', () => {
    it('can create new player', async () => {
      player = await upsertPlayer(pg, playerDraft);

      expect(player).to.deep.equal({
        ...playerDraft,
        countryId: player.countryId,
        id: player.id,
        invalidEmail: false,
        invalidMobilePhone: false,
        subscriptionToken: player.subscriptionToken,
        subscriptionOptionsId: player.subscriptionOptionsId,
        lastSeen: null,
      });
    });

    it('can update player', async () => {
      const result = await upsertPlayer(pg, { ...playerDraft, tags: ['newTag1'] });

      expect(result.tags).to.have.members(['newTag1']);
      expect(result.id).to.equal(player.id);
    });

    it('can reset invalidEmail flag after update of email', async () => {
      await pg('players').update({ invalidEmail: true }, ['*']).where({ id: player.id });

      const result = await upsertPlayer(pg, { ...playerDraft, email: 'new.email@gmail.com' });

      expect(result.invalidEmail).to.equal(false);
      expect(result.id).to.equal(player.id);
    });

    it('can reset invalidMobilePhone flag after update of mobilePhone', async () => {
      await pg('players').update({ invalidMobilePhone: true }, ['*']).where({ id: player.id });

      const result = await upsertPlayer(pg, { ...playerDraft, mobilePhone: '123123123' });

      expect(result.invalidMobilePhone).to.equal(false);
      expect(result.id).to.equal(player.id);
    });

    it('does not update numDeposits if value is smaller than value currently in db', async () => {
      const result = await upsertPlayer(pg, { ...playerDraft, numDeposits: 11 });

      expect(result.numDeposits).to.equal(playerDraft.numDeposits);
    });

    it('updates players subscription options on allowEmailPromotions false change', async () => {
      const result = await upsertPlayer(pg, {
        ...playerDraft,
        allowEmailPromotions: false,
        allowSMSPromotions: true,
      });

      const subscriptionOptions = await pg('subscription_options')
        .where({ id: result.subscriptionOptionsId })
        .first();
      expect(subscriptionOptions.emails).to.equal('none');
      expect(subscriptionOptions.smses).to.equal('all');
    });

    it('Does not change player subscription options on allowEmailPromotions true change if the emails was not "none"', async () => {
      await pg('subscription_options')
        .where({ id: player.subscriptionOptionsId })
        .update({ emails: 'best_offers' });

      const result = await upsertPlayer(pg, { ...playerDraft, allowEmailPromotions: true });

      const subscriptionOptions = await pg('subscription_options')
        .where({ id: result.subscriptionOptionsId })
        .first();
      expect(subscriptionOptions.emails).to.equal('best_offers');
    });
  });

  describe('getPlayer', () => {
    it('can get player by email', async () => {
      const result = await getPlayer(pg, { email: playerDraft.email });

      expect(result && result.id).to.equal(player.id);
    });
  });

  describe('snoozePlayerSubscription', () => {
    it('insert date 30 days ahead', async () => {
      const result = await snoozePlayerSubscription(pg, player.subscriptionOptionsId || 0, 'email');

      expect(moment(result.snoozeEmailsUntil).date()).to.equal(moment().add(30, 'days').date());
    });
  });

  describe('createOrUpdatePlayerSubscriptionOptions', () => {
    let subscriptionOptionsId;

    it('create subscription options if player does not have them', async () => {
      [player] = await pg('players')
        .where({ id: player.id })
        .update({ subscriptionOptionsId: null })
        .returning('*');

      const so = await createOrUpdatePlayerSubscriptionOptions(pg, player, {
        emails: 'best_offers',
      });

      expect(so).to.deep.equal({
        id: so.id,
        emails: 'best_offers',
        smses: 'all',
        snoozeEmailsUntil: null,
        snoozeSmsesUntil: null,
      });
      subscriptionOptionsId = so.id;
    });

    it('update subscription options if player have them', async () => {
      const result = await createOrUpdatePlayerSubscriptionOptions(
        pg,
        { ...player, subscriptionOptionsId },
        {
          smses: 'new_games',
        },
      );

      expect(result).to.deep.equal({
        id: subscriptionOptionsId,
        emails: 'best_offers',
        smses: 'new_games',
        snoozeEmailsUntil: null,
        snoozeSmsesUntil: null,
      });
    });
  });

  describe('getPlayerSubscriptionToken', () => {
    it('find token by id', async () => {
      const result = await getPlayerSubscriptionToken(pg, { id: player.id });

      expect(result).to.equal(player.subscriptionToken);
    });

    it('find token by email + brandId', async () => {
      const result = await getPlayerSubscriptionToken(pg, {
        email: player.email,
        brandId: player.brandId,
      });

      expect(result).to.equal(player.subscriptionToken);
    });

    it('returns undefined if player not found', async () => {
      const result = await getPlayerSubscriptionToken(pg, { id: 12314 });

      expect(result).to.equal(undefined);
    });
  });
});
