/* @flow */
import type { SanctionMatch } from "gstech-core/modules/clients/complianceserver-api";

const path = require('path');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { players: { john } } = require('../../../scripts/utils/db-data');
const Player = require('../players/Player');
const Fraud = require('./Fraud');
const { queryPlayerEvents } = require('../players/PlayerEvent');

describe('Frauds', () => {
  let playerId;
  let playerFraudId: any;

  before(async () => {
    await clean.players();
    const player = await Player.create({ brandId: 'LD', ...john });
    playerId = player.id;
  });

  it('can tag player for fraud', async () => {
    await Fraud.addPlayerFraud(playerId, 'registration_ip_country_mismatch', 'PL', { ipAddress: '1.2.3.4', ipCountry: 'PL' });
  });

  it('ignores second fraud with same fraud id', async () => {
    playerFraudId = await Fraud.addPlayerFraud(playerId, 'registration_ip_country_mismatch', 'PL', { ipAddress: '8.8.8.8', ipCountry: 'PL' });
  });

  it('lists unchecked player frauds', async () => {
    const frauds = await Fraud.getUnchecked(playerId);
    expect(frauds).to.containSubset([{
        fraudKey: 'registration_ip_country_mismatch',
        fraudId: 'PL',
        title: 'Registration IP and country does not match',
        points: 10,
      }]);
  });

  it('gets active fraud points', async () => {
    const points = await Fraud.getFraudPoints(playerId);
    expect(points).to.equal(10);
  });

  it('marks player fraud checked but not cleared', async () => {
    const [{ id }] = await Fraud.getUnchecked(playerId);
    await Fraud.check(id, 1, false);
  });

  it('does not have unchecked fraud points', async () => {
    const frauds = await Fraud.getUnchecked(playerId);
    expect(frauds.length).to.equal(0);
  });

  it('still has same amount of points', async () => {
    const points = await Fraud.getFraudPoints(playerId);
    expect(points).to.equal(10);
  });

  it('returns fraud by id', async () => {
    const fraud = await Fraud.getById(playerFraudId);
    expect(fraud).to.containSubset({
      fraudId: 'PL',
      points: 10,
      details: [
        { key: 'Registration IP', value: '8.8.8.8 (PL)' },
        { key: 'Registration Country', value: 'DE' },
      ],
      title: 'Registration IP and country does not match',
    });
  });

  it('clears fraud points', async () => {
    const [{ id }] = await Fraud.getActive(playerId);
    await Fraud.check(id, 1, true);
  });

  it('adds player events', async () => {
    const events = await queryPlayerEvents(playerId);
    expect(events).to.containSubset([
      {
        title: 'Risk event confirmed "Registration IP and country does not match"',
        handle: 'Test',
      },
      {
        title: 'Risk event triggered "Registration IP and country does not match"',
      },
    ]);
  });

  it('can manually add fraud', async () => {
    await pg.transaction((tx) => Fraud.addFraud(tx, playerId, 'registration_ip_country_mismatch', 'asd', false, 1, '123'));
  });

  describe('Sanctions', () => {
    const commonMatchData: SanctionMatch = {
      id: 204253,
      score: 20.29706314801601,
      terms: ['john', 'doe'],
      queryTerms: ['john', 'doe'],
      match: {
        john: ['name'],
        doe: ['name'],
      },
      list: 'US',
      name: 'John Doe',
      reference: 'US.00000',
      aliases: [],
      addresses: [],
      dateOfBirths: [],
    };

    let currentTestTitle;
    // eslint-disable-next-line func-names
    beforeEach(function (this: any) {
      currentTestTitle = this.currentTest.title;
    });

    beforeEach(async () => {
      await clean.players();
      const player = await Player.create({ brandId: 'LD', ...john });
      playerId = player.id;
      const [rows] = await pg('player_frauds').select('*');
      expect(rows).to.be.undefined();
    });

    it('can sanction player with multiple matches', async () => {
      await Fraud.applyMultipleSanction(playerId, {
        matched: true,
        metadata: { EU: '', UN: '', US: '' },
        matches: [
          { ...commonMatchData, name: 'John Doe', reference: 'US.100111' },
          { ...commonMatchData, name: 'John Doe Smith', reference: 'US.100222' },
          { ...commonMatchData, name: 'John Doe Williams', reference: 'US.100333' },
        ],
      });
      const events = await queryPlayerEvents(playerId);
      expect(events).to.containSubset([{ title: 'Risk event triggered "Person is named on sactions list"' }]);

      const accountStatus = await Player.getAccountStatus(playerId);
      expect(accountStatus).to.containSubset({
        allowGameplay: false,
        allowTransactions: false,
        loginBlocked: true,
      });

      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.containSubset([{ fraudKey: 'sanction_list_check' }]);
      const sanctionFrauds = frauds.filter((f) => f.fraudKey === 'sanction_list_check');
      logger.debug(`${path.basename(__filename)} - ${currentTestTitle}`, { sanctionFrauds });
      expect(sanctionFrauds).length(3);
    });

    it('will not sanction with no matches', async () => {
      await Fraud.applyMultipleSanction(playerId, {
        matched: false,
        metadata: { EU: '', UN: '', US: '' },
      });
      const events = await queryPlayerEvents(playerId);
      expect(events).to.not.containSubset([{ title: 'Risk event triggered "Person is named on sactions list"' }]);

      const accountStatus = await Player.getAccountStatus(playerId);
      expect(accountStatus).to.containSubset({
        allowGameplay: true,
        allowTransactions: true,
        loginBlocked: false,
      });

      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.not.containSubset([{ fraudKey: 'sanction_list_check' }]);
      const sanctionFrauds = frauds.filter((f) => f.fraudKey === 'sanction_list_check');
      logger.debug(`${path.basename(__filename)} - ${currentTestTitle}`, { sanctionFrauds });
      expect(sanctionFrauds).length(0);
    });

    it('can deal with inexistent sanction matches', async () => {
      await Fraud.applyMultipleSanction(playerId, {
        matched: true,
        metadata: { EU: '', UN: '', US: '' },
      });
      const events = await queryPlayerEvents(playerId);
      expect(events).to.not.containSubset([{ title: 'Risk event triggered "Person is named on sactions list"' }]);

      const accountStatus = await Player.getAccountStatus(playerId);
      expect(accountStatus).to.containSubset({
        allowGameplay: true,
        allowTransactions: true,
        loginBlocked: false,
      });

      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.not.containSubset([{ fraudKey: 'sanction_list_check' }]);
      const sanctionFrauds = frauds.filter((f) => f.fraudKey === 'sanction_list_check');
      logger.debug(`${path.basename(__filename)} - ${currentTestTitle}`, { sanctionFrauds });
      expect(sanctionFrauds).length(0);
    });

    it('can deal with empty sanction matches', async () => {
      await Fraud.applyMultipleSanction(playerId, {
        matched: true,
        metadata: { EU: '', UN: '', US: '' },
        matches: [],
      });
      const events = await queryPlayerEvents(playerId);
      expect(events).to.not.containSubset([{ title: 'Risk event triggered "Person is named on sactions list"' }]);

      const accountStatus = await Player.getAccountStatus(playerId);
      expect(accountStatus).to.containSubset({
        allowGameplay: true,
        allowTransactions: true,
        loginBlocked: false,
      });

      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.not.containSubset([{ fraudKey: 'sanction_list_check' }]);
      const sanctionFrauds = frauds.filter((f) => f.fraudKey === 'sanction_list_check');
      logger.debug(`${path.basename(__filename)} - ${currentTestTitle}`, { sanctionFrauds });
      expect(sanctionFrauds).length(0);
    });

    it('can deal with no matches but has filled matches array', async () => {
      await Fraud.applyMultipleSanction(playerId, {
        matched: false,
        metadata: { EU: '', UN: '', US: '' },
        matches: [
          { ...commonMatchData, name: 'John Doe', reference: 'US.100111' },
          { ...commonMatchData, name: 'John Doe Smith', reference: 'US.100222' },
          { ...commonMatchData, name: 'John Doe Williams', reference: 'US.100333' },
        ],
      });
      const events = await queryPlayerEvents(playerId);
      expect(events).to.not.containSubset([{ title: 'Risk event triggered "Person is named on sactions list"' }]);

      const accountStatus = await Player.getAccountStatus(playerId);
      expect(accountStatus).to.containSubset({
        allowGameplay: true,
        allowTransactions: true,
        loginBlocked: false,
        accountSuspended: false,
        accountClosed: false,
      });

      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.not.containSubset([{ fraudKey: 'sanction_list_check' }]);
      const sanctionFrauds = frauds.filter((f) => f.fraudKey === 'sanction_list_check');
      logger.debug(`${path.basename(__filename)} - ${currentTestTitle}`, { sanctionFrauds });
      expect(sanctionFrauds).length(0);
    });

    it('will not sanction again a player based on the same match', async () => {
      await Fraud.applyMultipleSanction(playerId, {
        matched: true,
        metadata: { EU: '', UN: '', US: '' },
        matches: [
          { ...commonMatchData, name: 'John Doe', reference: 'US.100111' },
          { ...commonMatchData, name: 'John Doe Smith', reference: 'US.100222' },
          { ...commonMatchData, name: 'John Doe Williams', reference: 'US.100333' },
        ],
      });
      const events = await queryPlayerEvents(playerId);
      expect(events).to.containSubset([{ title: 'Risk event triggered "Person is named on sactions list"' }]);

      const accountStatus = await Player.getAccountStatus(playerId);
      expect(accountStatus).to.containSubset({
        allowGameplay: false,
        allowTransactions: false,
        loginBlocked: true,
      });

      const fraudKey = 'sanction_list_check';
      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.containSubset([{ fraudKey }]);

      const sanctionFrauds = frauds.filter((f) => f.fraudKey === fraudKey);
      if (!sanctionFrauds) throw new Error('sanction fraud not found');
      for (const fraud of sanctionFrauds) {
        await Fraud.check(fraud.id, 1, true);
      }

      const newFrauds = await Fraud.getUnchecked(playerId);
      expect(newFrauds).to.not.containSubset([{ fraudKey }]);
      await pg('players')
        .update({
          allowTransactions: true,
          allowGameplay: true,
          loginBlocked: false,
        })
        .where({ id: playerId });

      await Fraud.applyMultipleSanction(playerId, {
        matched: true,
        metadata: { EU: '', UN: '', US: '' },
        matches: [
          { ...commonMatchData, name: 'John Doe', reference: 'US.100111' },
          { ...commonMatchData, name: 'John Doe Smith', reference: 'US.100222' },
          { ...commonMatchData, name: 'John Doe Williams', reference: 'US.100333' },
        ],
      });
      const newEvents = await queryPlayerEvents(playerId);
      const sanctionEvents = newEvents.filter((e) => e.title === 'Risk event triggered "Person is named on sactions list"');
      expect(sanctionEvents).to.have.length(3);

      const newAccountStatus = await Player.getAccountStatus(playerId);
      expect(newAccountStatus).to.containSubset({
        allowGameplay: true,
        allowTransactions: true,
        loginBlocked: false,
      });
      const fraudsAfter = await Fraud.getUnchecked(playerId);
      expect(fraudsAfter).to.not.containSubset([{ fraudKey }]);
    });

    it('will sanction a player that was cleared before based on other matches', async () => {
      await Fraud.applyMultipleSanction(playerId, {
        matched: true,
        metadata: { EU: '', UN: '', US: '' },
        matches: [
          { ...commonMatchData, name: 'John Doe', reference: 'US.100111' },
          { ...commonMatchData, name: 'John Doe Smith', reference: 'US.100222' },
          { ...commonMatchData, name: 'John Doe Williams', reference: 'US.100333' },
        ],
      });
      const events = await queryPlayerEvents(playerId);
      expect(events).to.containSubset([{ title: 'Risk event triggered "Person is named on sactions list"' }]);

      const accountStatus = await Player.getAccountStatus(playerId);
      expect(accountStatus).to.containSubset({
        allowGameplay: false,
        allowTransactions: false,
        loginBlocked: true,
      });

      const fraudKey = 'sanction_list_check';
      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.containSubset([{ fraudKey }]);

      const sanctionFrauds = frauds.filter((f) => f.fraudKey === fraudKey);
      if (!sanctionFrauds) throw new Error('sanction fraud not found');
      for (const fraud of sanctionFrauds) {
        await Fraud.check(fraud.id, 1, true);
      }

      const newFrauds = await Fraud.getUnchecked(playerId);
      expect(newFrauds).to.not.containSubset([{ fraudKey }]);
      await pg('players')
        .update({
          allowTransactions: true,
          allowGameplay: true,
          loginBlocked: false,
        })
        .where({ id: playerId });

      await Fraud.applyMultipleSanction(playerId, {
        matched: true,
        metadata: { EU: '', UN: '', US: '' },
        matches: [
          { ...commonMatchData, name: 'John Doe', reference: 'US.100111' },
          { ...commonMatchData, name: 'John Doe Smith', reference: 'US.100222' },
          { ...commonMatchData, name: 'John Doe Williams', reference: 'US.100333' },
          { ...commonMatchData, name: 'John Doe Johson', reference: 'US.100444' },
        ],
      });
      const newEvents = await queryPlayerEvents(playerId);
      const sanctionEvents = newEvents.filter((e) => e.title === 'Risk event triggered "Person is named on sactions list"');
      expect(sanctionEvents).to.have.length(4);

      const newAccountStatus = await Player.getAccountStatus(playerId);
      expect(newAccountStatus).to.containSubset({
        allowGameplay: false,
        allowTransactions: false,
        loginBlocked: true,
      });
      const fraudsAfter = await Fraud.getUnchecked(playerId);
      expect(fraudsAfter).to.containSubset([{ fraudKey }]);
      const sanctionFraudsAfter = fraudsAfter.filter((f) => f.fraudKey === fraudKey);
      expect(sanctionFraudsAfter).length(1);
    });

    it('considers matches as case insensitive', async () => {
      await Fraud.applyMultipleSanction(playerId, {
        matched: true,
        metadata: { EU: '', UN: '', US: '' },
        matches: [
          { ...commonMatchData, name: 'John Doe', reference: 'US.100111' },
          { ...commonMatchData, name: 'John Doe Smith', reference: 'US.100222' },
          { ...commonMatchData, name: 'John Doe Williams', reference: 'US.100333' },
        ],
      });
      const events = await queryPlayerEvents(playerId);
      expect(events).to.containSubset([{ title: 'Risk event triggered "Person is named on sactions list"' }]);

      const accountStatus = await Player.getAccountStatus(playerId);
      expect(accountStatus).to.containSubset({
        allowGameplay: false,
        allowTransactions: false,
        loginBlocked: true,
      });

      const fraudKey = 'sanction_list_check';
      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.containSubset([{ fraudKey }]);

      const sanctionFrauds = frauds.filter((f) => f.fraudKey === fraudKey);
      if (!sanctionFrauds) throw new Error('sanction fraud not found');
      for (const fraud of sanctionFrauds) {
        await Fraud.check(fraud.id, 1, true);
      }

      const newFrauds = await Fraud.getUnchecked(playerId);
      expect(newFrauds).to.not.containSubset([{ fraudKey }]);
      await pg('players')
        .update({
          allowTransactions: true,
          allowGameplay: true,
          loginBlocked: false,
        })
        .where({ id: playerId });

      await Fraud.applyMultipleSanction(playerId, {
        matched: true,
        metadata: { EU: '', UN: '', US: '' },
        matches: [
          { ...commonMatchData, name: 'JOHN DOE', reference: 'US.100111' },
          { ...commonMatchData, name: 'JOHN DOE SMITH', reference: 'US.100222' },
          { ...commonMatchData, name: 'JOHN DOE WILLIAMS', reference: 'US.100333' },
        ],
      });
      const newEvents = await queryPlayerEvents(playerId);
      const sanctionEvents = newEvents.filter((e) => e.title === 'Risk event triggered "Person is named on sactions list"');
      expect(sanctionEvents).to.have.length(3);

      const newAccountStatus = await Player.getAccountStatus(playerId);
      expect(newAccountStatus).to.containSubset({
        allowGameplay: true,
        allowTransactions: true,
        loginBlocked: false,
      });
      const fraudsAfter = await Fraud.getUnchecked(playerId);
      expect(fraudsAfter).to.not.containSubset([{ fraudKey }]);
    });

    it('matches based only on name if no other details are available', async () => {
      await Fraud.applyMultipleSanction(playerId, {
        matched: true,
        metadata: { EU: '', UN: '', US: '' },
        matches: [{ ...commonMatchData, name: 'John Doe', reference: 'US.100111' }],
      });
      const events = await queryPlayerEvents(playerId);
      expect(events).to.containSubset([{ title: 'Risk event triggered "Person is named on sactions list"' }]);

      const accountStatus = await Player.getAccountStatus(playerId);
      expect(accountStatus).to.containSubset({
        allowGameplay: false,
        allowTransactions: false,
        loginBlocked: true,
      });

      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.containSubset([{ fraudKey: 'sanction_list_check' }]);
      const sanctionFrauds = frauds.filter((f) => f.fraudKey === 'sanction_list_check');
      logger.debug(`${path.basename(__filename)} - ${currentTestTitle}`, { sanctionFrauds });
      expect(sanctionFrauds).length(1);
    });

    it('matches based on name and date of birth, if available', async () => {
      await Fraud.applyMultipleSanction(playerId, {
        matched: true,
        metadata: { EU: '', UN: '', US: '' },
        matches: [
          {
            ...commonMatchData,
            name: 'John Doe',
            reference: 'US.100111',
            dateOfBirths: [
              {
                type: 'exact',
                date: john.dateOfBirth,
              },
            ],
          },
        ],
      });
      const events = await queryPlayerEvents(playerId);
      expect(events).to.containSubset([{ title: 'Risk event triggered "Person is named on sactions list"' }]);

      const accountStatus = await Player.getAccountStatus(playerId);
      expect(accountStatus).to.containSubset({
        allowGameplay: false,
        allowTransactions: false,
        loginBlocked: true,
      });

      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.containSubset([{ fraudKey: 'sanction_list_check' }]);
      const sanctionFrauds = frauds.filter((f) => f.fraudKey === 'sanction_list_check');
      logger.debug(`${path.basename(__filename)} - ${currentTestTitle}`, { sanctionFrauds });
      expect(sanctionFrauds).length(1);
    });

    it('matches based on name and country, if available', async () => {
      await Fraud.applyMultipleSanction(playerId, {
        matched: true,
        metadata: { EU: '', UN: '', US: '' },
        matches: [
          {
            ...commonMatchData,
            name: 'John Doe',
            reference: 'US.100111',
            addresses: [{ country: john.countryId }],
          },
        ],
      });
      const events = await queryPlayerEvents(playerId);
      expect(events).to.containSubset([{ title: 'Risk event triggered "Person is named on sactions list"' }]);

      const accountStatus = await Player.getAccountStatus(playerId);
      expect(accountStatus).to.containSubset({
        allowGameplay: false,
        allowTransactions: false,
        loginBlocked: true,
      });

      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.containSubset([{ fraudKey: 'sanction_list_check' }]);
      const sanctionFrauds = frauds.filter((f) => f.fraudKey === 'sanction_list_check');
      logger.debug(`${path.basename(__filename)} - ${currentTestTitle}`, { sanctionFrauds });
      expect(sanctionFrauds).length(1);
    });

    it('matches based on aliases', async () => {
      await Fraud.applyMultipleSanction(playerId, {
        matched: true,
        metadata: { EU: '', UN: '', US: '' },
        matches: [
          {
            ...commonMatchData,
            name: 'John Doe',
            reference: 'US.100111',
            match: {
              john: ['aliases'],
              doe: ['aliases'],
            },
          },
        ],
      });
      const events = await queryPlayerEvents(playerId);
      expect(events).to.containSubset([{ title: 'Risk event triggered "Person is named on sactions list"' }]);

      const accountStatus = await Player.getAccountStatus(playerId);
      expect(accountStatus).to.containSubset({
        allowGameplay: false,
        allowTransactions: false,
        loginBlocked: true,
      });

      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.containSubset([{ fraudKey: 'sanction_list_check' }]);
      const sanctionFrauds = frauds.filter((f) => f.fraudKey === 'sanction_list_check');
      logger.debug(`${path.basename(__filename)} - ${currentTestTitle}`, { sanctionFrauds });
      expect(sanctionFrauds).length(1);
    });

    it('does not match if date of birth available and different', async () => {
      await Fraud.applyMultipleSanction(playerId, {
        matched: true,
        metadata: { EU: '', UN: '', US: '' },
        matches: [
          {
            ...commonMatchData,
            name: 'John Doe',
            reference: 'US.100111',
            dateOfBirths: [
              {
                type: 'exact',
                date: '1994-05-01',
              },
            ],
          },
        ],
      });
      const events = await queryPlayerEvents(playerId);
      expect(events).to.not.containSubset([{ title: 'Risk event triggered "Person is named on sactions list"' }]);

      const accountStatus = await Player.getAccountStatus(playerId);
      expect(accountStatus).to.containSubset({
        allowGameplay: true,
        allowTransactions: true,
        loginBlocked: false,
      });

      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.not.containSubset([{ fraudKey: 'sanction_list_check' }]);
    });

    it('does not match if countries are available and none match', async () => {
      await Fraud.applyMultipleSanction(playerId, {
        matched: true,
        metadata: { EU: '', UN: '', US: '' },
        matches: [
          {
            ...commonMatchData,
            name: 'John Doe',
            reference: 'US.100111',
            addresses: [{ country: 'AF' }, { country: 'SY' }],
          },
        ],
      });
      const events = await queryPlayerEvents(playerId);
      expect(events).to.not.containSubset([{ title: 'Risk event triggered "Person is named on sactions list"' }]);

      const accountStatus = await Player.getAccountStatus(playerId);
      expect(accountStatus).to.containSubset({
        allowGameplay: true,
        allowTransactions: true,
        loginBlocked: false,
      });

      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.not.containSubset([{ fraudKey: 'sanction_list_check' }]);
    });
  });
});
