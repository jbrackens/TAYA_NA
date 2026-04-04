/* @flow */

const pg = require('gstech-core/modules/pg');

const { cleanDb } = require('../../utils');
const repository = require('./repository');
const { countries, players } = require('../../mockData');

describe('Config repository', () => {
  before(cleanDb);

  describe('getUniqueHstoreKeys', () => {
    before(async () => {
      await pg('countries').insert(countries);
      await pg('players').insert(players);
      await pg('players').insert({ ...players[2], id: 10, externalId: 10, brandId: 'CJ' });
    });

    it('returns unique tags from all players', async () => {
      const tags = await repository.getUniqueHstoreKeys(pg, 'tags');

      expect(tags).to.have.members(['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6']);
    });

    it('returns unique segments from all players', async () => {
      const segments = await repository.getUniqueHstoreKeys(pg, 'segments');

      expect(segments).to.have.members(['segment1', 'segment2', 'segment3', 'segment4', 'segment5', 'segment6']);
    });

    it('returns only unique for brand if brand parameter passed', async () => {
      const tags = await repository.getUniqueHstoreKeys(pg, 'tags', 'CJ');

      expect(tags).to.have.members(['tag3', 'tag4']);
    });
  });
});
