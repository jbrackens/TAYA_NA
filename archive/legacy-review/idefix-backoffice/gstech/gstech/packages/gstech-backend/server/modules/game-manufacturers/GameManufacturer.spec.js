/* @flow */

const GameManufacturer = require('./GameManufacturer');

describe('GameManufacturer repository', () => {
  const blockedCountries = ['DE', 'BE', 'PL', 'EE'];

  describe('updateGameManufacturer', () => {
    it('can update game manufacturer properly', async () => {
      const result = await GameManufacturer.updateGameManufacturer('YGG', {
        blockedCountries,
        license: 'MTG',
      });

      expect(result.blockedCountries).to.deep.have.members(blockedCountries);
      expect(result.license).to.equal('MTG');
    });
  });

  describe('getGameManufacturer', () => {
    it('should return game data with blocked countries', async () => {
      const result = await GameManufacturer.getGameManufacturer('YGG');

      expect(result).to.deep.equal({
        id: 'YGG',
        name: 'Yggdrasil',
        parentId: null,
        active: true,
        license: 'MTG',
        blockedCountries,
      });
    });

    it('should return empty array for "blockedCountries" if none', async () => {
      const result = await GameManufacturer.getGameManufacturer('SGI');

      expect(result.blockedCountries).to.be.an('array');
      expect(result.blockedCountries.length).to.equal(0);
    });
  });

  describe('getGameManufacturers', () => {
    it('return all non-child active game manufacturers', async () => {
      const result = await GameManufacturer.getGameManufacturers();

      expect(result).to.containSubset([{
        id: 'NE',
        name: 'NetEnt',
        parentId: null,
        active: true,
        license: 'MGA'
      }]);
      expect(result.filter(({ active }) => active === false).length).to.equal(0);
      expect(result.filter(({ parentId }) => parentId !== null).length).to.equal(0);
    });

    it('return game manufacturers not banned in given country', async () => {
      const result = await GameManufacturer.getGameManufacturers('AF');

      expect(result.find(({ id }) => id === 'PNG')).to.equal(undefined);
    });
  });
});
