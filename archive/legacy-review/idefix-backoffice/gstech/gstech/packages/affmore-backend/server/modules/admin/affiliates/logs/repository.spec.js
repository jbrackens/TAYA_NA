/* @flow */
const { DateTime } = require('luxon');

const pg = require('gstech-core/modules/pg');
const repository = require('./repository');

describe('Logs Repository', () => {
  it('can create affiliate log', async () => {
    const logDraft = {
      note: 'Some meaningful note',
    };

    const log = await repository.createAffiliateLog(pg, logDraft, 100000, 0);
    expect(log).to.deep.equal({
      id: log.id,
      affiliateId: 100000,

      ...logDraft,
      attachments: [],

      createdBy: 0,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    });
  });

  it('can get affiliate logs', async () => {
    const logs = await repository.getAffiliateLogs(pg, 3232323);
    expect(logs.slice(Math.max(logs.length - 3, 1))).to.deep.equal([{
      id: 3,
      affiliateId: 3232323,
      note: 'One beautiful note',
      attachments: [],
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 25, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 25, 18, 15, 30).toJSDate(),
    }, {
      id: 2,
      affiliateId: 3232323,
      note: 'One beautiful note',
      attachments: [],
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 15, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 15, 18, 15, 30).toJSDate(),
    }, {
      id: 1,
      affiliateId: 3232323,
      note: 'One beautiful note',
      attachments: [],
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 1, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 1, 18, 15, 30).toJSDate(),
    }]);
  });

  it('can create affiliate log with attachment', async () => {
    const logDraft = {
      note: 'Some meaningful note',
      attachments: ['uploads/test.txt']
    };

    const log = await repository.createAffiliateLog(pg, logDraft, 100000, 0);
    expect(log).to.deep.equal({
      id: log.id,
      affiliateId: 100000,

      ...logDraft,

      createdBy: 0,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    });
  });
});
