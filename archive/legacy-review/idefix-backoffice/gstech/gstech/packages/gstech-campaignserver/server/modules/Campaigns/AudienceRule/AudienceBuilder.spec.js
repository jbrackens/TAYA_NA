/* eslint-disable no-underscore-dangle */
// @flow
import type { AudienceRuleDraft } from '../../../../types/common';

const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const nock = require('nock');

const AudienceBuilder = require('./AudienceBuilder');
const { countries, deposits, players, campaigns } = require('../../../mockData');
const { cleanDb } = require('../../../utils');

const firstQuery = 9;

// nock.recorder.rec();

nock('http://localhost:3001', { encodedQueryParams: true })
  .get('/api/LD/v1/game-manufacturers/NE')
  .reply(200, {
    id: 'NE',
    name: 'NetEnt',
    parentId: null,
    active: true,
    license: 'MGA',
    blockedCountries: ['DE', 'CZ', 'RS', 'CO'],
  });

describe('AudienceBuilder', () => {
  before(cleanDb);

  describe('Sign operator', () => {
    it('can add < rule', async () => {
      const ab = new AudienceBuilder(pg, campaigns[0]);
      ab.sign('numDeposits', 'players.numDeposits', '<', 2);
      const query = ab.qb;

      expect(query._statements[firstQuery].grouping).to.equal('where');
      expect(query._statements[firstQuery].type).to.equal('whereBasic');
      expect(query._statements[firstQuery].column).to.equal('players.numDeposits');
      expect(query._statements[firstQuery].operator).to.equal('<');
      expect(query._statements[firstQuery].value).to.equal(2);
      await ab.execute();
    });

    it('casts = login to date', async () => {
      const ab = new AudienceBuilder(pg, campaigns[0]);
      ab.sign('login', 'players.lastSeen', '=', '2020-01-10T01:00:00+01:00');
      const query = ab.qb.toString();

      expect(query).to.include(`"players"."lastSeen"::date = '2020-01-10T01:00:00+01:00'::date`);
    });
  });

  describe('csv', () => {
    it('uses plain in with < 70 items', async () => {
      const ab = new AudienceBuilder(pg, campaigns[0]);
      ab.csv(['1@gmail.com', '2@gmail.com']);

      const query = ab.qb.toString();
      expect(query).to.include(
        `and (lower(players.email) in ('1@gmail.com', '2@gmail.com') or lower(players.username) in ('1@gmail.com', '2@gmail.com'))`,
      );
      await ab.execute();
    });

    it('uses "values" with in operator for > 70 items', async () => {
      const ab = new AudienceBuilder(pg, campaigns[0]);
      ab.csv([...new Array<number>(100).keys()].map((k) => `${k}@gmail.com`));

      const query = ab.qb.toString();
      expect(query).to.include(
        // eslint-disable-next-line max-len
        `and (lower(players.email) in (values ('0@gmail.com'),('1@gmail.com'),('2@gmail.com'),('3@gmail.com'),('4@gmail.com'),('5@gmail.com'),('6@gmail.com'),('7@gmail.com'),('8@gmail.com'),('9@gmail.com'),('10@gmail.com'),('11@gmail.com'),('12@gmail.com'),('13@gmail.com'),('14@gmail.com'),('15@gmail.com'),('16@gmail.com'),('17@gmail.com'),('18@gmail.com'),('19@gmail.com'),('20@gmail.com'),('21@gmail.com'),('22@gmail.com'),('23@gmail.com'),('24@gmail.com'),('25@gmail.com'),('26@gmail.com'),('27@gmail.com'),('28@gmail.com'),('29@gmail.com'),('30@gmail.com'),('31@gmail.com'),('32@gmail.com'),('33@gmail.com'),('34@gmail.com'),('35@gmail.com'),('36@gmail.com'),('37@gmail.com'),('38@gmail.com'),('39@gmail.com'),('40@gmail.com'),('41@gmail.com'),('42@gmail.com'),('43@gmail.com'),('44@gmail.com'),('45@gmail.com'),('46@gmail.com'),('47@gmail.com'),('48@gmail.com'),('49@gmail.com'),('50@gmail.com'),('51@gmail.com'),('52@gmail.com'),('53@gmail.com'),('54@gmail.com'),('55@gmail.com'),('56@gmail.com'),('57@gmail.com'),('58@gmail.com'),('59@gmail.com'),('60@gmail.com'),('61@gmail.com'),('62@gmail.com'),('63@gmail.com'),('64@gmail.com'),('65@gmail.com'),('66@gmail.com'),('67@gmail.com'),('68@gmail.com'),('69@gmail.com'),('70@gmail.com'),('71@gmail.com'),('72@gmail.com'),('73@gmail.com'),('74@gmail.com'),('75@gmail.com'),('76@gmail.com'),('77@gmail.com'),('78@gmail.com'),('79@gmail.com'),('80@gmail.com'),('81@gmail.com'),('82@gmail.com'),('83@gmail.com'),('84@gmail.com'),('85@gmail.com'),('86@gmail.com'),('87@gmail.com'),('88@gmail.com'),('89@gmail.com'),('90@gmail.com'),('91@gmail.com'),('92@gmail.com'),('93@gmail.com'),('94@gmail.com'),('95@gmail.com'),('96@gmail.com'),('97@gmail.com'),('98@gmail.com'),('99@gmail.com')) or lower(players.username) in (values ('0@gmail.com'),('1@gmail.com'),('2@gmail.com'),('3@gmail.com'),('4@gmail.com'),('5@gmail.com'),('6@gmail.com'),('7@gmail.com'),('8@gmail.com'),('9@gmail.com'),('10@gmail.com'),('11@gmail.com'),('12@gmail.com'),('13@gmail.com'),('14@gmail.com'),('15@gmail.com'),('16@gmail.com'),('17@gmail.com'),('18@gmail.com'),('19@gmail.com'),('20@gmail.com'),('21@gmail.com'),('22@gmail.com'),('23@gmail.com'),('24@gmail.com'),('25@gmail.com'),('26@gmail.com'),('27@gmail.com'),('28@gmail.com'),('29@gmail.com'),('30@gmail.com'),('31@gmail.com'),('32@gmail.com'),('33@gmail.com'),('34@gmail.com'),('35@gmail.com'),('36@gmail.com'),('37@gmail.com'),('38@gmail.com'),('39@gmail.com'),('40@gmail.com'),('41@gmail.com'),('42@gmail.com'),('43@gmail.com'),('44@gmail.com'),('45@gmail.com'),('46@gmail.com'),('47@gmail.com'),('48@gmail.com'),('49@gmail.com'),('50@gmail.com'),('51@gmail.com'),('52@gmail.com'),('53@gmail.com'),('54@gmail.com'),('55@gmail.com'),('56@gmail.com'),('57@gmail.com'),('58@gmail.com'),('59@gmail.com'),('60@gmail.com'),('61@gmail.com'),('62@gmail.com'),('63@gmail.com'),('64@gmail.com'),('65@gmail.com'),('66@gmail.com'),('67@gmail.com'),('68@gmail.com'),('69@gmail.com'),('70@gmail.com'),('71@gmail.com'),('72@gmail.com'),('73@gmail.com'),('74@gmail.com'),('75@gmail.com'),('76@gmail.com'),('77@gmail.com'),('78@gmail.com'),('79@gmail.com'),('80@gmail.com'),('81@gmail.com'),('82@gmail.com'),('83@gmail.com'),('84@gmail.com'),('85@gmail.com'),('86@gmail.com'),('87@gmail.com'),('88@gmail.com'),('89@gmail.com'),('90@gmail.com'),('91@gmail.com'),('92@gmail.com'),('93@gmail.com'),('94@gmail.com'),('95@gmail.com'),('96@gmail.com'),('97@gmail.com'),('98@gmail.com'),('99@gmail.com')))`,
      );
      await ab.execute();
    });
  });

  describe('withinMinutes', () => {
    it('can add deposit rule', () => {
      const minutes = 7 * 24 * 60;
      const ab = new AudienceBuilder(pg, campaigns[0]);
      ab.withinMinutes('deposits.timestamp', minutes);
      const query = ab.getQueryBuilder();

      expect(query.toString()).to.include(
        `"deposits"."timestamp" > (now() - '${minutes} minutes'::interval)`,
      );
    });

    it('can add register rule', () => {
      const minutes = 5 * 24 * 60;
      const ab = new AudienceBuilder(pg, campaigns[0]);
      ab.withinMinutes('players.createdAt', minutes);
      const query = ab.getQueryBuilder();

      expect(query.toString()).to.include(
        `"players"."createdAt" > (now() - '${minutes} minutes'::interval)`,
      );
    });

    it('works with not', () => {
      const minutes = 24 * 60;
      const ab = new AudienceBuilder(pg, campaigns[0]);
      ab.withinMinutes('campaigns_players.addedAt', minutes, true);
      const query = ab.getQueryBuilder();

      expect(query.toString()).to.include(
        `"campaigns_players"."addedAt" < (now() - '${minutes} minutes'::interval)`,
      );
    });
  });

  describe('otherCampaignReward', () => {
    it('can add rule', () => {
      const ab = new AudienceBuilder(pg, campaigns[0]);
      ab.otherCampaignReward({ campaignId: 1, rewardId: 1 });
      const query = ab.getQueryBuilder();

      expect(query.toString()).to.include(
        '"reward_rules"."campaignId" = 1 and "reward_rules"."rewardId" = 1',
      );
    });
  });

  describe('in', () => {
    it('works with tags', async () => {
      const ab = new AudienceBuilder(pg, campaigns[0]);
      ab.in('players.tags', ['foo']);
      const query = ab.qb;

      expect(query._statements[firstQuery].value.bindings).to.include.members([
        'players.tags',
        'foo',
      ]);
      await ab.execute();
    });
  });

  describe('parseRulesArray', () => {
    it('can parse 1 rule array (sign)', async () => {
      const rules: AudienceRuleDraft[] = [{ name: 'numDeposits', operator: '<', values: 10 }];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.qb;

      expect(query._statements.length).to.equal(firstQuery + 1);
      expect(query._statements[firstQuery].column).to.equal('players.numDeposits');
      expect(query._statements[firstQuery].operator).to.equal(rules[0].operator);
      expect(query._statements[firstQuery].value).to.equal(rules[0].values);
      await ab.execute();
    });

    it('can parse 2 rules array (between, in)', async () => {
      const rules: AudienceRuleDraft[] = [
        {
          name: 'register',
          operator: 'between',
          values: ['2018-01-01', '2018-02-01'],
          not: false,
        },
        { name: 'numDeposits', operator: 'in', values: [1, 2, 3], not: true },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.qb;

      expect(query._statements.length).to.equal(firstQuery + 2);
      expect(query._statements[firstQuery].column).to.equal('players.createdAt');
      expect(query._statements[firstQuery].type).to.equal('whereBetween');
      expect(query._statements[firstQuery].value).to.have.members(rules[0].values);

      expect(query._statements[firstQuery + 1].column).to.equal('players.numDeposits');
      expect(query._statements[firstQuery + 1].type).to.equal('whereIn');
      expect(query._statements[firstQuery + 1].value).to.have.members(rules[1].values);
      expect(query._statements[firstQuery + 1].not).to.equal(true);

      await ab.execute();
    });

    it('can parse 1 rule array (hstore)', async () => {
      const rules: AudienceRuleDraft[] = [
        { name: 'tags', operator: 'in', values: ['foo'], not: false },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.qb;

      expect(query._statements[firstQuery].type).to.equal('whereRaw');
      expect(query._statements[firstQuery].value.bindings).to.include.members([
        'players.tags',
        rules[0].values[0],
      ]);
    });

    it('can parse players belonging to campaigns', async () => {
      const rules: AudienceRuleDraft[] = [
        { name: '', operator: 'otherCampaignsMember', values: { campaignIds: [1] } },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.getQueryBuilder();

      expect(query._statements[firstQuery].type).to.equal('withWrapped');
      const cteQuery = query._statements[firstQuery].value;
      expect(cteQuery._statements).to.containSubset([
        { grouping: 'columns', value: ['playerId'], distinct: true },
        {
          grouping: 'where',
          type: 'whereIn',
          column: 'campaigns_players.campaignId',
          value: [1],
          not: false,
          bool: 'and',
        },
        {
          grouping: 'where',
          type: 'whereBasic',
          column: 'complete',
          operator: '=',
          value: false,
          not: false,
          bool: 'and',
          asColumn: false,
        },
        { grouping: 'where', type: 'whereNull', column: 'removedAt', not: false, bool: 'and' },
      ]);
      await ab.execute();
    });

    it('can parse players not belonging to other campaigns', async () => {
      const rules: AudienceRuleDraft[] = [
        {
          name: '',
          operator: 'otherCampaignsMember',
          values: { campaignIds: [2, 3], state: 'any' },
          not: true,
        },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.getQueryBuilder();
      expect(query.toString()).to.include(
        'select distinct "playerId" from "campaigns_players" where "campaigns_players"."campaignId" in (2, 3)',
      );

      await ab.execute();
    });

    it('can parse players belonging to complete campaigns', async () => {
      const rules: AudienceRuleDraft[] = [
        {
          name: '',
          operator: 'otherCampaignsMember',
          values: { campaignIds: [4], state: 'complete' },
        },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.getQueryBuilder();

      expect(query._statements[firstQuery].type).to.equal('withWrapped');
      const cteQuery = query._statements[firstQuery].value;
      expect(cteQuery._statements).to.containSubset([
        { grouping: 'columns', value: ['playerId'], distinct: true },
        {
          grouping: 'where',
          type: 'whereIn',
          column: 'campaigns_players.campaignId',
          value: [4],
          not: false,
          bool: 'and',
        },
        {
          grouping: 'where',
          type: 'whereBasic',
          column: 'complete',
          operator: '=',
          value: true,
          not: false,
          bool: 'and',
          asColumn: false,
        },
        { grouping: 'where', type: 'whereNull', column: 'removedAt', not: true, bool: 'and' },
      ]);
      await ab.execute();
    });

    it('can parse players not belonging to campaign', async () => {
      const rules: AudienceRuleDraft[] = [
        {
          name: '',
          operator: 'otherCampaignsMember',
          values: { campaignIds: [4], state: 'any', not: true },
        },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.getQueryBuilder();
      expect(query._statements[firstQuery].type).to.equal('withWrapped');
      const cteQuery = query._statements[firstQuery].value;
      expect(cteQuery._statements).to.containSubset([
        { grouping: 'columns', value: ['playerId'], distinct: true },
        {
          grouping: 'where',
          type: 'whereIn',
          column: 'campaigns_players.campaignId',
          value: [4],
          not: false,
          bool: 'and',
        },
      ]);
      await ab.execute();
    });

    it('can parse players that deposited in campaign', async () => {
      const rules: AudienceRuleDraft[] = [{ name: 'campaignDeposit', operator: '=', values: 1 }];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.getQueryBuilder();

      expect(query._statements[firstQuery].type).to.equal('whereBasic');
      expect(query._statements[firstQuery].column).to.equal('campaigns_deposits.campaignId');
      expect(query._statements[firstQuery].value).to.equal(1);
    });

    it('can parse csv rule', async () => {
      const rules: AudienceRuleDraft[] = [{ name: 'csv', operator: 'csv', values: ['a', 'b'] }];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.getQueryBuilder();

      expect(query.toString()).to.include(
        "(lower(players.email) in ('a', 'b') or lower(players.username) in ('a', 'b'))",
      );
    });

    it('can parse login query', async () => {
      const rules: AudienceRuleDraft[] = [{ name: 'login', operator: '<', values: '2020-20-12' }];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.getQueryBuilder();

      expect(query.toString()).to.include('"players"."lastSeen" < \'2020-20-12\'');
    });

    it('can parse language', async () => {
      const rules: AudienceRuleDraft[] = [
        { name: 'language', operator: 'in', values: ['fi', 'en'] },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.getQueryBuilder();

      expect(query.toString()).to.include(' "players"."languageId" in (\'fi\', \'en\')');
    });

    it('can parse contact', async () => {
      const minutes = 7 * 24 * 60;
      const rules: AudienceRuleDraft[] = [
        { name: 'contact', operator: 'withinMinutes', values: minutes },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.getQueryBuilder();

      expect(query.toString()).to.include(
        `"campaigns_players"."emailSentAt" > (now() - '${minutes} minutes'::interval)`,
      );
      await query;
    });

    it('can parse otherCampaignReward', async () => {
      const rules: AudienceRuleDraft[] = [
        { name: '', operator: 'otherCampaignReward', values: { campaignId: 1, rewardId: 1 } },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.getQueryBuilder();

      expect(query.toString()).to.include(
        '"reward_rules"."campaignId" = 1 and "reward_rules"."rewardId" = 1',
      );
    });

    it('can parse landingPage', async () => {
      const rules: AudienceRuleDraft[] = [
        { name: 'landingPage', operator: '=', values: '01landing-page' },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.getQueryBuilder();

      expect(query.toString()).to.include(
        '"players"."registrationLandingPage" = \'01landing-page\'',
      );
    });

    it('can parse gameManufacturer', async () => {
      const rules: AudienceRuleDraft[] = [{ name: '', operator: 'gameManufacturer', values: 'NE' }];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.getQueryBuilder();

      expect(query.toString()).to.include(`"countries"."code" not in ('DE', 'CZ', 'RS', 'CO')`);
    });

    it('can parse deposit', async () => {
      const rules: AudienceRuleDraft[] = [
        {
          name: 'deposit',
          operator: 'between',
          values: ['2022-03-01T00:00.000+02:00', '2022-03-08T00:00.000+02:00'],
        },
        { name: 'depositAmount', operator: '<', values: 5000 },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.getQueryBuilder();

      expect(query.toString()).to.include(
        `exists (select * from "deposits" where "externalPlayerId" = "players"."externalId" and "deposits"."timestamp" between '2022-03-01T00:00.000+02:00' and '2022-03-08T00:00.000+02:00' and "deposits"."convertedAmount" < 5000)`,
      );
      await ab.execute();
    });

    it('can parse deposit with not', async () => {
      const rules: AudienceRuleDraft[] = [
        { name: 'deposit', operator: 'withinMinutes', values: 60, not: true },
        { name: 'depositAmount', operator: '>', values: 5000 },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);
      const query = ab.getQueryBuilder();

      expect(query.toString()).to.include(
        `not exists (select * from "deposits" where "externalPlayerId" = "players"."externalId" and "deposits"."timestamp" > (now() - '60 minutes'::interval) and "deposits"."convertedAmount" > 5000)`,
      );
      await ab.execute();
    });
  });

  describe('execute', () => {
    let p;

    beforeEach(async () => {
      await cleanDb();
      await pg('countries').insert(countries);
      await pg('players').insert({ ...players[0], numDeposits: 10, lastSeen: new Date() });
      // Player to ignore because of the "bonus-abuser" tag
      await pg('players').insert({
        ...players[0],
        id: 1000,
        externalId: 1000,
        numDeposits: 10,
        lastSeen: new Date(),
        tags: '"bonus-abuser" => ""',
      });
      // Player to ignore because of the "campaign-abuser" tag
      await pg('players').insert({
        ...players[0],
        id: 1001,
        externalId: 1001,
        numDeposits: 0,
        lastSeen: new Date(),
        tags: '"campaign-abuser" => ""',
      });
      await pg('players').insert({ ...players[1], brandId: 'OS', numDeposits: 10 });
      p = await pg('players')
        .insert(
          players.map(({ id, externalId, ...rest }) => ({
            id: id + 100,
            externalId: externalId + 100,
            ...rest,
          })),
        )
        .returning('id')
        .then((rows) => rows.map(({ id }) => id));
      await pg('campaigns').insert(campaigns[0]);
      await pg('campaigns').insert({ ...campaigns[1], brandId: 'OS' });
    });

    it('query players only from the same brand as campaign', async () => {
      const rules: AudienceRuleDraft[] = [
        { name: 'numDeposits', operator: '=', values: 10 },
        { name: 'login', operator: '<', values: new Date() },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);
      await ab.parseRulesArray(rules);
      const result = await ab.execute();

      expect(result.length).to.equal(1);
      expect(result[0].brandId).to.equal('KK');
    });

    it('query only players from campaigns_players if it is a migrated campaign', async () => {
      const campaign = campaigns[0];
      await pg('campaigns_players').insert({ campaignId: campaign.id, playerId: p[0] });
      const [c] = await pg('campaigns')
        .where({ id: campaign.id })
        .update({ migrated: true })
        .returning(['*']);

      const rules: AudienceRuleDraft[] = [];
      const ab = new AudienceBuilder(pg, c);
      await ab.parseRulesArray(rules);
      const result = await ab.execute();

      expect(result.length).to.equal(1);
      expect(result[0].id).to.equal(p[0]);
    });

    it('query player that expired from another campaign a week ago', async () => {
      await pg('campaigns_players').insert({
        campaignId: campaigns[0].id,
        playerId: p[0],
        complete: false,
        removedAt: moment().subtract(8, 'days'),
      });
      const ab = new AudienceBuilder(pg, campaigns[1]);
      const rules: AudienceRuleDraft[] = [
        {
          operator: 'otherCampaignsMember',
          name: '',
          values: { campaignIds: [campaigns[0].id], state: 'expired', minutesFrom: 7 * 24 * 60 },
        },
      ];
      await ab.parseRulesArray(rules);

      const result = await ab.execute();

      expect(result.length).to.equal(1);
      expect(result[0].id).to.equal(p[0]);
    });

    it('query players with total deposit amount rule', async () => {
      await pg('deposits').insert({
        paymentId: 1,
        externalPlayerId: p[0],
        timestamp: new Date(),
        amount: 1000,
        convertedAmount: 1000,
        perPlayerCount: 1,
      });
      await pg('deposits').insert({
        paymentId: 2,
        externalPlayerId: p[0],
        timestamp: new Date(),
        amount: 1000,
        convertedAmount: 1000,
        perPlayerCount: 2,
      });
      const rules: AudienceRuleDraft[] = [
        { name: 'totalDepositAmount', operator: '>=', values: 2000 },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);

      await ab.parseRulesArray(rules);

      const result = await ab.execute();
      expect(result.length).to.equal(1);
      expect(result[0].id).to.equal(p[0]);
    });

    it('query players not belonging to other campaign', async () => {
      const [{ id: cId }] = await pg('campaigns')
        .insert({ ...campaigns[0], id: 100, name: 'some other name' })
        .returning('id');
      await pg('campaigns')
        .insert({ ...campaigns[0], id: 101, name: 'some other name 2' })
        .returning('id');
      await pg('campaigns_players').insert({ campaignId: cId, playerId: players[0].id });
      await pg('campaigns_players').insert({ campaignId: cId, playerId: 101 });
      await pg('campaigns_players').insert({
        campaignId: 101,
        playerId: players[0].id,
        removedAt: new Date(),
      });
      await pg('campaigns_players').insert({ campaignId: 101, playerId: 101 });

      const rules: AudienceRuleDraft[] = [
        {
          operator: 'otherCampaignsMember',
          not: true,
          values: { campaignIds: [cId], state: 'any' },
          name: '',
        },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);
      await ab.parseRulesArray(rules);

      const result = await ab.execute();
      expect(result.some(({ id }) => [players[0].id, 101].includes(id))).to.equal(false);
    });

    it('query players that has not deposited for past 30 days', async () => {
      await pg('deposits').insert({ ...deposits[0], timestamp: moment().subtract(40, 'days') });
      await pg('deposits').insert({
        ...deposits[0],
        id: 2,
        paymentId: 123123412,
        perPlayerCount: 2,
        timestamp: moment().subtract(20, 'days'),
      });

      const rules: AudienceRuleDraft[] = [
        { name: 'deposit', operator: 'withinMinutes', values: 60 * 24 * 30, not: true },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);
      await ab.parseRulesArray(rules);

      const result = await ab.execute();
      expect(result.map(({ id }) => id)).to.have.members([101, 102, 103, 104]);
    });

    it('query highrollers (>=50 eur) within 30 days', async () => {
      await pg('deposits').insert({
        ...deposits[0],
        convertedAmount: 1000,
        timestamp: moment().subtract(40, 'days'),
      });
      await pg('deposits').insert({
        ...deposits[0],
        convertedAmount: 1000,
        id: 2,
        paymentId: 123123412,
        perPlayerCount: 2,
        timestamp: moment().subtract(20, 'days'),
      });
      await pg('deposits').insert({
        id: 3,
        paymentId: 123123413,
        perPlayerCount: 1,
        externalPlayerId: 101,
        amount: 5000,
        convertedAmount: 5000,
        timestamp: moment().subtract(20, 'days'),
      });
      await pg('deposits').insert({
        id: 4,
        paymentId: 123123414,
        perPlayerCount: 1,
        externalPlayerId: 102,
        amount: 5000,
        convertedAmount: 5000,
        timestamp: moment().subtract(40, 'days'),
      });

      const rules: AudienceRuleDraft[] = [
        { name: 'deposit', operator: 'withinMinutes', values: 60 * 24 * 30 },
        { name: 'depositAmount', operator: '>=', values: 5000 },
      ];
      const ab = new AudienceBuilder(pg, campaigns[0]);
      await ab.parseRulesArray(rules);

      const result = await ab.execute();
      expect(result.map(({ id }) => id)).to.have.members([101]);
    });
  });
});
