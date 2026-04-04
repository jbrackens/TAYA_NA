/* @flow */
const logger = require('gstech-core/modules/logger');
const { prepareSearchInstance, MiniSearch } = require('./Sanction');

describe.skip('Sanction module (using real data)', () => {
  describe('Names', () => {
    it('Joins the name correctly', async () => {
      const names = [
        { firstName: 'Abdul', lastName: 'Rahman', expected: 'Abdul Rahman' },
        { firstName: '', lastName: '', expected: '' },
        { firstName: 'Abdul', lastName: '', expected: 'Abdul' },
        { firstName: '', lastName: 'Rahman', expected: 'Rahman' },
        { firstName: undefined, lastName: 'Rahman', expected: 'Rahman' },
        { firstName: null, lastName: 'Rahman', expected: 'Rahman' },
        { firstName: 'Abdul', lastName: undefined, expected: 'Abdul' },
        { firstName: 'Abdul', lastName: null, expected: 'Abdul' },
        { firstName: undefined, lastName: null, expected: '' },
        { firstName: null, lastName: null, expected: '' },
      ];
      names.forEach(({ firstName, lastName, expected }) => {
        const name = [firstName, lastName].filter(Boolean).join(' ').trim();
        logger.debug('Check name joining logic:', { firstName, lastName, name, expected });
        expect(name).to.equal(expected);
      });
    });
  });

  describe('Sample searches', () => {
    before(async () => {
      await prepareSearchInstance();
    });

    it('Search for RI Hak Chol (Unique name)', async () => {
      const ms = MiniSearch.getInstance();
      const result = ms.search('ri hak chol', { combineWith: 'AND' });
      logger.debug('prepareSearchInstance', { result });
      expect(result.length).to.equal(1);
      expect(result[0].name).to.equal('RI Hak Chol');
      expect(result[0].list).to.equal('EU');
      expect(result[0].reference).to.equal('EU.4212.56');
    });

    it('Search for Ivan with Date of Birth', async () => {
      const ms = MiniSearch.getInstance();
      const result = ms.search('Ivan', { combineWith: 'AND' });
      const onlyWithDates = result.filter((item) => item.dateOfBirths.length > 0 && item.dateOfBirths.find((dob) => dob.date === '1976-06-15'));
      const onlyWithoutDates = result.filter((item) => item.dateOfBirths.length === 0);
      logger.debug('Search for Ivan', { count: result.length, filtered: onlyWithDates.length, withoutDates: onlyWithoutDates.length, result, onlyWithDates });
      expect(onlyWithDates.length).to.equal(1);
      expect(onlyWithDates[0].name).to.equal('Ivan GALAVATIJ');
      expect(onlyWithDates[0].list).to.equal('EU');
      expect(onlyWithDates[0].reference).to.equal('EU.9512.87');
    });

    it('Search for Nazih (Single name, no address, no date of birth)', async () => {
      const ms = MiniSearch.getInstance();
      const result = ms.search('Nazih', { combineWith: 'AND' });
      logger.debug('Search for Nazih', { result });
      expect(result.length).to.equal(2);
      expect(result).to.containSubset([{ name: 'Nazih', list: 'EU', reference: 'EU.2629.58' }]);
    });
  });
});
