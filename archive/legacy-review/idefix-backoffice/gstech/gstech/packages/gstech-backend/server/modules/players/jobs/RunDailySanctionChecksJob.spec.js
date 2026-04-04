/* @flow */
const nock = require('nock');
const moment = require('moment-timezone');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const RunDailySanctionChecksJob = require('./RunDailySanctionChecksJob');

const {
  players: { testPlayer },
} = require('../../../../scripts/utils/db-data');
const Player = require('../Player');

// nock.recorder.rec();
// TODO: fix this test
describe.skip('Daily Sanction Checks', () => {
  beforeEach(async () => {
    await clean.players();

    await Player.create(testPlayer({ brandId: 'LD' }));
    nock('http://localhost:3009', { encodedQueryParams: true })
      .post('/api/v1/check/multiplesanction', { name: 'Jack Sparrow' })
      .reply(200, { matched: false, metadata: { UN: '2024-03-21', US: '2024-03-21', EU: '2024-03-04' } });

    await Player.create(testPlayer({ brandId: 'LD', firstName: 'Pablo', lastName: 'Escobar' }));
    await pg('players').update({ lastLogin: moment().subtract({ month: 1 }) });
    nock('http://localhost:3009', { encodedQueryParams: true })
      .post('/api/v1/check/multiplesanction', { name: 'Pablo Escobar' })
      .reply(200, {
        matched: true,
        metadata: { UN: '2024-03-21', US: '2024-03-21', EU: '2024-03-04' },
        matches: [{ name: 'Pablo Emilio Escobar Gaviria', list: 'US' }],
      });

    await Player.create(testPlayer({ brandId: 'LD', firstName: 'Osama' }));
    nock('http://localhost:3009', { encodedQueryParams: true })
      .post('/api/v1/check/multiplesanction', { name: 'Osama Sparrow' })
      .reply(200, {
        matched: false,
        metadata: { UN: '2024-03-21', US: '2024-03-21', EU: '2024-03-04' },
      });

    await Player.create(testPlayer({ brandId: 'LD', firstName: 'Osama', lastName: 'bin Laden' }));
    await pg('players')
      .update({ lastLogin: moment().subtract({ hours: 25 }) })
      .where({ firstName: 'Osama' });
    nock('http://localhost:3009', { encodedQueryParams: true })
      .post('/api/v1/check/multiplesanction', { name: 'Osama bin Laden' })
      .reply(200, {
        matched: true,
        metadata: { UN: '2024-03-21', US: '2024-03-21', EU: '2024-03-04' },
        matches: [
          { name: 'Osama bin Laden-Organisation', list: 'EU' },
          { name: 'Rede de Osama bin Laden', list: 'EU' },
        ],
      });

    await Player.create(testPlayer({ brandId: 'CJ', firstName: 'Raymond', lastName: 'Holt' }));
    nock('http://localhost:3009', { encodedQueryParams: true })
      .post('/api/v1/check/multiplesanction', { name: 'Raymond Holt' })
      .reply(200, {
        matched: false,
        metadata: { UN: '2024-03-21', US: '2024-03-21', EU: '2024-03-04' },
      });

    await Player.create(testPlayer({ brandId: 'CJ', firstName: 'Al', lastName: 'Capone' }));
    nock('http://localhost:3009', { encodedQueryParams: true })
      .post('/api/v1/check/multiplesanction', { name: 'Al Capone' })
      .reply(200, {
        matched: true,
        metadata: { UN: '2024-03-21', US: '2024-03-21', EU: '2024-03-04' },
        matches: [{ name: 'Alphonse Gabriel Capone', list: 'UN' }],
      });
  });

  it('should create a fraud for sanctioned players that were not checked in the last 24h', async () => {
    await RunDailySanctionChecksJob.run();
    const frauds = await pg('player_frauds')
      .innerJoin('players', 'players.id', 'player_frauds.playerId')
      .select('player_frauds.id', 'player_frauds.fraudKey', 'players.firstName', 'players.lastName')
      .where({ fraudKey: 'sanction_list_check', checked: false });
    logger.debug('RunDailySanctionChecksJob Test', { frauds });
    expect(frauds).to.have.length(4);
    expect(frauds).to.containSubset([{ firstName: 'Al', lastName: 'Capone' }]);
    expect(frauds).to.containSubset([{ firstName: 'Pablo', lastName: 'Escobar' }]);
    expect(frauds).to.containSubset([{ firstName: 'Osama', lastName: 'bin Laden' }]);
    expect(frauds).to.not.containSubset([{ firstName: 'Jack', lastName: 'Sparrow' }]);
    expect(frauds).to.not.containSubset([{ firstName: 'Osama', lastName: 'Sparrow' }]);
    expect(frauds).to.not.containSubset([{ firstName: 'Raymond', lastName: 'Holt' }]);
  });

  it('should create sanction check events only for players that were not checked in the last 24h', async () => {
    await RunDailySanctionChecksJob.run();
    const sanctionChecks = await pg('player_events').select('firstName', 'lastName').innerJoin('players', 'players.id', 'player_events.playerId').where({ key: 'sanctionCheck' });
    expect(sanctionChecks).to.have.length(6);
    expect(sanctionChecks).to.containSubset([
      { firstName: 'Jack', lastName: 'Sparrow' },
      { firstName: 'Raymond', lastName: 'Holt' },
      { firstName: 'Al', lastName: 'Capone' },
      { firstName: 'Pablo', lastName: 'Escobar' },
      { firstName: 'Osama', lastName: 'bin Laden' },
      { firstName: 'Osama', lastName: 'Sparrow' },
    ]);
  });

  it('should not check players that were already checked in the last 24h', async () => {
    await RunDailySanctionChecksJob.run();
    const sanctionChecks = await pg('player_events')
      .select('firstName', 'lastName', 'player_events.createdAt')
      .innerJoin('players', 'players.id', 'player_events.playerId')
      .where({ key: 'sanctionCheck' });
    expect(sanctionChecks, 'first check').to.have.length(6);
    const checkTime = sanctionChecks
      .map((sanctionCheck) => sanctionCheck.createdAt)
      .sort()
      .reverse()[0];

    await RunDailySanctionChecksJob.run();
    const sanctionChecksSecondTime = await pg('player_events')
      .select('firstName', 'lastName', 'player_events.createdAt')
      .innerJoin('players', 'players.id', 'player_events.playerId')
      .where({ key: 'sanctionCheck' });
    expect(sanctionChecksSecondTime, 'second check').to.have.length(6);
    const secondCheckTime = sanctionChecksSecondTime
      .map((sanctionCheck) => sanctionCheck.createdAt)
      .sort()
      .reverse()[0];
    expect(checkTime).to.exist();
    expect(secondCheckTime).to.exist();
    expect(checkTime.getTime()).to.be.equal(secondCheckTime.getTime());
  });
});
