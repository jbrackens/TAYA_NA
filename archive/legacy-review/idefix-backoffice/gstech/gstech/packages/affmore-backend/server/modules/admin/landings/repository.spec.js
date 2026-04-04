/* @flow */
const { DateTime } = require('luxon');
const pg = require('gstech-core/modules/pg');
const repository = require('./repository');

describe('Landings Repository', () => {
  let landingId;
  it('can create landing', async () => {
    const landing = await repository.createLanding(pg, {
      brandId: 'LD',
      landingPage: 'http://page.com',
    }, 0);
    expect(landing).to.deep.equal({
      id: landing.id,
      brandId: 'LD',
      landingPage: 'http://page.com',

      createdBy: 0,
      createdAt: landing.createdAt,
      updatedAt: landing.updatedAt,
    });

    landingId = landing.id;
  });

  it('can update landing', async () => {
    const landing = await repository.updateLanding(pg, landingId, ({
      brandId: 'LD',
      landingPage: 'http://page2.com',
    }));
    expect(landing).to.deep.equal({
      id: landingId,
      brandId: 'LD',
      landingPage: 'http://page2.com',

      createdBy: 0,
      createdAt: landing.createdAt,
      updatedAt: landing.updatedAt,
    });
  });

  it('can delete landing', async () => {
    const count = await repository.deleteLanding(pg, landingId);
    expect(count).to.be.equal(1);

    const landing = await repository.getLanding(pg, landingId);
    expect(landing).to.be.equal(undefined);
  });

  it('can get landing', async () => {
    const landing = await repository.getLanding(pg, 1);
    expect(landing).to.deep.equal({
      id: 1,
      brandId: 'CJ',
      landingPage: 'https://beta.casinojefe.com/en',

      createdBy: 0,
      createdAt: landing && landing.createdAt,
      updatedAt: landing && landing.updatedAt,
    });
  });

  it('can get landings', async () => {
    const landings = await repository.getLandings(pg);
    expect(landings.length).to.be.equal(8);
  });

  it('can get landings by brand', async () => {
    const landings = await repository.getLandings(pg, 'LD');
    expect(landings.length).to.be.equal(2);
  });

  it('can get landings with statistics', async () => {
    const landings = await repository.getLandingsWithStatistics(pg);
    expect(landings).to.deep.equal([{
      id: 1,
      brandId: 'CJ',
      landingPage: 'https://beta.casinojefe.com/en',

      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),

      usages: 0,
    }, {
      id: 2,
      brandId: 'KK',
      landingPage: 'https://beta.kalevalakasino.com/en',

      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),

      usages: 0,
    }, {
      id: 3,
      brandId: 'LD',
      landingPage: 'https://beta.luckydino.com/en',

      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),

      usages: 612,
    }, {
      id: 4,
      brandId: 'OS',
      landingPage: 'https://beta.olaspill.com/en',

      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),

      usages: 0,
    }, {
      id: 5,
      brandId: 'CJ',
      landingPage: 'https://beta.casinojefe.com/custom',

      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),

      usages: 0,
    }, {
      id: 6,
      brandId: 'KK',
      landingPage: 'https://beta.kalevalakasino.com/custom',

      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),

      usages: 0,
    }, {
      id: 7,
      brandId: 'LD',
      landingPage: 'https://beta.luckydino.com/custom',

      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),

      usages: 0,
    }, {
      id: 8,
      brandId: 'OS',
      landingPage: 'https://beta.olaspill.com/custom',

      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),

      usages: 0,
    }]);
  });

  it('can get landings with statistics by brandId', async () => {
    const landings = await repository.getLandingsWithStatistics(pg, 'LD');
    expect(landings).to.deep.equal([{
      id: 3,
      brandId: 'LD',
      landingPage: 'https://beta.luckydino.com/en',

      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),

      usages: 612,
    }, {
      id: 7,
      brandId: 'LD',
      landingPage: 'https://beta.luckydino.com/custom',

      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),

      usages: 0,
    }]);
  });
});
