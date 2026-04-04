/* @flow */
const playerCheckWorker = require('./PlayerCheckWorker');
const { players: { testPlayer } } = require('../../../../../scripts/utils/db-data');
const Player = require('../../../players/Player');
const Fraud = require('../../../frauds/Fraud');
const { queryPlayerEvents } = require('../../../players');
const nock = require('nock'); // eslint-disable-line

// nock.recorder.rec();

nock('http://localhost:3009', { encodedQueryParams: true })
  .post('/api/v1/check/multiplesanction', { name: 'Jack Sparrow' })
  .reply(200, { matched: false, metadata: { UN: '2024-04-16', US: '2024-04-15', EU: '2024-04-15' } });

nock('http://localhost:3009', { encodedQueryParams: true })
  .post('/api/v1/check/multiplesanction', { name: 'Shady Person' })
  .reply(200, {
    matched: true,
    metadata: { UN: '2020-11-11', US: '2020-01-01', EU: '2020-01-01' },
    matches: [
      {
        id: 3118,
        score: 68.20918304831616,
        terms: ['shady', 'person'],
        queryTerms: ['shady', 'person'],
        match: {
          shady: ['name', 'aliases'],
          person: ['name'],
        },
        list: 'EU',
        name: 'Shady PERSON',
        reference: 'EU.6969.69',
        aliases: [
          'Shady Shadyavitj PERSONA',
          'Shady Shadyovitj PERSONAGEM',
          'Shady Shadyavich PEOPLE',
          'Шадий Шадявитий ПЕРСОН',
          'Shady Persony',
          'Шадий Персон',
        ],
        addresses: [],
        dateOfBirths: [
          {
            type: 'exact',
            date: '1989-02-01',
          },
        ],
      },
    ],
  });

describe('Player check', () => {
  let player;
  let player2;

  before(async () => {
    player = await Player.create(testPlayer({ countryId: 'FI', currencyId: 'EUR', brandId: 'LD' }));
    player2 = await Player.create(testPlayer({ firstName: 'Shady', lastName: 'Person', countryId: 'FI', currencyId: 'EUR', brandId: 'LD' }));
  });

  it('checks player sanction lists without match', async () => {
    const job: any = {
      data: { playerId: player.id },
    };
    await playerCheckWorker.handleJob(job);
    const events = await queryPlayerEvents(player.id);
    expect(events).to.containSubset([
      {
        type: 'account',
        key: 'sanctionCheck',
        title: 'Checked sanction lists: UN/2024-04-16,US/2024-04-15,EU/2024-04-15. Matches: no',
      }
    ]);
    const frauds = await Fraud.getUnchecked(player.id);
    expect(frauds.length).to.equal(0);
  });

  it('checks player sanction lists with match', async () => {
    const job: any = {
      data: { playerId: player2.id },
    };
    await playerCheckWorker.handleJob(job);
    const frauds = await Fraud.getUnchecked(player2.id);
    expect(frauds).to.containSubset([{
      fraudKey: 'sanction_list_check',
    }]);
  });
});
